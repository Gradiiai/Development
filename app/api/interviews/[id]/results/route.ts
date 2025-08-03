import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/database/connection';
import { 
  candidateInterviewHistory, 
  candidateUsers,
  candidateApplications,
  jobCampaigns,
  companies,
  Interview,
  CodingInterview 
} from '@/lib/database/schema';
import { eq, and, or, sql } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Skip unified interviews table since you only use Campaign and Direct interviews
    // Go directly to legacy Interview table check
    const legacyInterview = await db
      .select()
      .from(Interview)
      .where(and(
        eq(Interview.interviewId, id),
        eq(Interview.companyId, session.user.companyId),
        eq(Interview.interviewStatus, 'completed')
      ))
      .limit(1);

    if (legacyInterview.length > 0) {
      const interview = legacyInterview[0];
      
      // For legacy interviews, we need to parse the questions and create mock answers
      let questions = [];
      let answers = [];
      
      try {
        if (interview.interviewQuestions) {
          questions = JSON.parse(interview.interviewQuestions);
          // Create placeholder answers since legacy interviews don't store detailed answers
          answers = questions.map((q: any, index: number) => ({
            id: index + 1,
            question: q.question || q,
            answer: "Answer completed", // Legacy interviews don't store detailed answers
            questionId: index + 1
          }));
        }
      } catch (e) {
        console.error('Error parsing legacy interview questions:', e);
      }

      const results = {
        interview: {
          id: interview.interviewId,
          type: interview.interviewType || 'behavioral',
          title: `${interview.jobPosition} Interview`,
          candidateEmail: interview.candidateEmail,
          candidateName: interview.candidateName,
          status: interview.interviewStatus,
          score: null, // Legacy interviews don't have scores
          maxScore: null,
          completedAt: interview.updatedAt,
          answers: answers
        },
        answers: answers,
        summary: {
          totalQuestions: questions.length,
          score: 0,
          maxScore: 0,
          completionRate: interview.interviewStatus === 'completed' ? 100 : 0
        }
      };

      return NextResponse.json(results);
    }

    // If not found in legacy Interview table, try legacy CodingInterview table
    const legacyCodingInterview = await db
      .select()
      .from(CodingInterview)
      .where(and(
        eq(CodingInterview.interviewId, id),
        eq(CodingInterview.companyId, session.user.companyId),
        eq(CodingInterview.interviewStatus, 'completed')
      ))
      .limit(1);

    if (legacyCodingInterview.length > 0) {
      const interview = legacyCodingInterview[0];
      
      // For legacy coding interviews, we need to parse the questions and create mock answers
      let questions = [];
      let answers = [];
      
      try {
        if (interview.codingQuestions) {
          questions = JSON.parse(interview.codingQuestions);
          // Create placeholder answers since legacy interviews don't store detailed answers
          answers = questions.map((q: any, index: number) => ({
            id: index + 1,
            question: q.question || q.problemDescription || q,
            answer: "Code solution completed", // Legacy interviews don't store detailed answers
            questionId: index + 1,
            language: interview.programmingLanguage
          }));
        }
      } catch (e) {
        console.error('Error parsing legacy coding interview questions:', e);
      }

      const results = {
        interview: {
          id: interview.interviewId,
          type: 'coding',
          title: `${interview.interviewTopic} Coding Interview`,
          candidateEmail: interview.candidateEmail,
          candidateName: interview.candidateName,
          status: interview.interviewStatus,
          score: null, // Legacy interviews don't have scores
          maxScore: null,
          completedAt: interview.updatedAt,
          answers: answers,
          programmingLanguage: interview.programmingLanguage,
          difficultyLevel: interview.difficultyLevel
        },
        answers: answers,
        summary: {
          totalQuestions: questions.length,
          score: 0,
          maxScore: 0,
          completionRate: interview.interviewStatus === 'completed' ? 100 : 0
        }
      };

      return NextResponse.json(results);
    }

    // If not found in legacy system, try candidateInterviewHistory with proper company access control
    const candidateHistory = await db
      .select({
        id: candidateInterviewHistory.id,
        candidateId: candidateInterviewHistory.candidateId,
        interviewId: candidateInterviewHistory.interviewId,
        interviewType: candidateInterviewHistory.interviewType,
        status: candidateInterviewHistory.status,
        score: candidateInterviewHistory.score,
        maxScore: candidateInterviewHistory.maxScore,
        feedback: candidateInterviewHistory.feedback,
        completedAt: candidateInterviewHistory.completedAt,
        duration: candidateInterviewHistory.duration,
        // Candidate info
        candidateEmail: candidateUsers.email,
        candidateName: sql<string>`CONCAT(${candidateUsers.firstName}, ' ', COALESCE(${candidateUsers.lastName}, ''))`,
        // Company verification
        companyId: sql<string>`COALESCE(${companies.id}, ${Interview.companyId}, ${CodingInterview.companyId})`
      })
      .from(candidateInterviewHistory)
      .innerJoin(candidateUsers, eq(candidateInterviewHistory.candidateId, candidateUsers.id))
      .leftJoin(candidateApplications, eq(candidateInterviewHistory.applicationId, candidateApplications.id))
      .leftJoin(jobCampaigns, eq(candidateApplications.campaignId, jobCampaigns.id))
      .leftJoin(companies, eq(jobCampaigns.companyId, companies.id))
      .leftJoin(Interview, eq(candidateInterviewHistory.interviewId, Interview.interviewId))
      .leftJoin(CodingInterview, eq(candidateInterviewHistory.interviewId, CodingInterview.interviewId))
      .where(and(
        or(
          eq(candidateInterviewHistory.id, id),
          eq(candidateInterviewHistory.interviewId, id)
        ),
        eq(candidateInterviewHistory.status, 'completed'),
        // Ensure user can only see results from their company
        or(
          eq(companies.id, session.user.companyId), // Campaign interviews
          eq(Interview.companyId, session.user.companyId), // Direct interviews
          eq(CodingInterview.companyId, session.user.companyId) // Direct coding interviews
        )
      ))
      .limit(1);

    if (candidateHistory.length > 0) {
      const historyRecord = candidateHistory[0];
      
      // Parse answers from feedback field with detailed structure
      let answers = [];
      let detailedAnswers = [];
      
      if (historyRecord.feedback) {
        try {
          const parsed = JSON.parse(historyRecord.feedback);
          console.log('Parsed feedback structure:', parsed);
          
          // Handle different feedback structures
          if (parsed.answers && Array.isArray(parsed.answers)) {
            // New structure with detailed answers
            detailedAnswers = parsed.answers.map((answer: any, index: number) => ({
              id: answer.id || (index + 1).toString(),
              question: answer.question || answer.questionText || `Question ${index + 1}`,
              userAnswer: answer.userAnswer || answer.selectedOption || answer.answer || answer.response || 'No answer provided',
              correctAnswer: answer.correctAnswer || answer.correctOption || undefined,
              isCorrect: answer.isCorrect !== undefined ? answer.isCorrect : undefined,
              rating: answer.rating || answer.score || undefined,
              feedback: answer.feedback || answer.aiAnalysis || undefined,
              language: answer.language || answer.programmingLanguage || undefined,
              type: answer.type || historyRecord.interviewType || 'behavioral',
              timeSpent: answer.timeSpent || answer.timeTaken || undefined,
              scoringBreakdown: answer.scoringBreakdown || undefined,
              maxScore: answer.maxScore || 1
            }));
            answers = detailedAnswers;
          } else if (parsed.answers && typeof parsed.answers === 'object') {
            // Object format with numeric keys
            const keys = Object.keys(parsed.answers).sort((a, b) => Number(a) - Number(b));
            detailedAnswers = keys.map((key, index) => {
              const answer = parsed.answers[key];
              return {
                id: key,
                question: answer.question || answer.questionText || `Question ${index + 1}`,
                userAnswer: answer.userAnswer || answer.selectedOption || answer.answer || answer.response || 'No answer provided',
                correctAnswer: answer.correctAnswer || answer.correctOption || undefined,
                isCorrect: answer.isCorrect !== undefined ? answer.isCorrect : undefined,
                rating: answer.rating || answer.score || undefined,
                feedback: answer.feedback || answer.aiAnalysis || undefined,
                language: answer.language || answer.programmingLanguage || undefined,
                type: answer.type || historyRecord.interviewType || 'behavioral',
                timeSpent: answer.timeSpent || answer.timeTaken || undefined,
                scoringBreakdown: answer.scoringBreakdown || undefined,
                maxScore: answer.maxScore || 1
              };
            });
            answers = detailedAnswers;
          } else if (Array.isArray(parsed)) {
            // Direct array format
            detailedAnswers = parsed.map((answer: any, index: number) => ({
              id: answer.id || (index + 1).toString(),
              question: answer.question || answer.questionText || `Question ${index + 1}`,
              userAnswer: answer.userAnswer || answer.selectedOption || answer.answer || answer.response || 'No answer provided',
              correctAnswer: answer.correctAnswer || answer.correctOption || undefined,
              isCorrect: answer.isCorrect !== undefined ? answer.isCorrect : undefined,
              rating: answer.rating || answer.score || undefined,
              feedback: answer.feedback || answer.aiAnalysis || undefined,
              language: answer.language || answer.programmingLanguage || undefined,
              type: answer.type || historyRecord.interviewType || 'behavioral',
              timeSpent: answer.timeSpent || answer.timeTaken || undefined,
              scoringBreakdown: answer.scoringBreakdown || undefined,
              maxScore: answer.maxScore || 1
            }));
            answers = detailedAnswers;
          } else {
            // Fallback: treat as single answer or unknown structure
            console.warn('Unknown feedback structure:', parsed);
            answers = [];
          }
          
          console.log(`Processed ${answers.length} detailed answers for interview ${historyRecord.id}`);
        } catch (e) {
          console.error('Error parsing interview feedback:', e);
          answers = [];
        }
      }

      const results = {
        interview: {
          id: historyRecord.id,
          type: historyRecord.interviewType,
          title: `${historyRecord.interviewType} Interview`,
          candidateEmail: historyRecord.candidateEmail,
          candidateName: historyRecord.candidateName,
          status: historyRecord.status,
          score: historyRecord.score,
          maxScore: historyRecord.maxScore,
          completedAt: historyRecord.completedAt,
          duration: historyRecord.duration,
          answers: answers
        },
        answers: answers,
        summary: {
          totalQuestions: Array.isArray(answers) ? answers.length : 0,
          totalAnswered: Array.isArray(answers) ? answers.filter(a => a.userAnswer && a.userAnswer !== 'No answer provided').length : 0,
          score: historyRecord.score || 0,
          maxScore: historyRecord.maxScore || 0,
          completionRate: Array.isArray(answers) && answers.length > 0 
            ? Math.round((answers.filter(a => a.userAnswer && a.userAnswer !== 'No answer provided').length / answers.length) * 100)
            : (historyRecord.status === 'completed' ? 100 : 0),
          averageTimePerQuestion: Array.isArray(answers) && answers.length > 0 
            ? answers.filter(a => a.timeSpent).reduce((sum, a) => sum + (a.timeSpent || 0), 0) / answers.filter(a => a.timeSpent).length || 0
            : 0,
          totalTimeSpent: historyRecord.duration || 0,
          accuracy: historyRecord.maxScore > 0 ? Math.round((historyRecord.score / historyRecord.maxScore) * 100) : 0
        },
        analytics: {
          questionTypes: Array.isArray(answers) ? 
            answers.reduce((types: any, answer) => {
              types[answer.type] = (types[answer.type] || 0) + 1;
              return types;
            }, {}) : {},
          correctAnswers: Array.isArray(answers) ? answers.filter(a => a.isCorrect === true).length : 0,
          incorrectAnswers: Array.isArray(answers) ? answers.filter(a => a.isCorrect === false).length : 0,
          averageRating: Array.isArray(answers) && answers.length > 0 ?
            answers.filter(a => a.rating).reduce((sum, a) => sum + (a.rating || 0), 0) / answers.filter(a => a.rating).length || 0
            : 0
        }
      };

      return NextResponse.json(results);
    }

    // Interview not found
    return NextResponse.json({ error: 'Interview not found' }, { status: 404 });

  } catch (error) {
    console.error('Error fetching interview results:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}