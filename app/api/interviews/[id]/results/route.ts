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
    console.log(`Fetching individual interview results for ID: ${id}, Company: ${session.user.companyId}`);

    // Primary approach: Look in candidateInterviewHistory with proper company access control
    const candidateHistory = await db
      .select({
        // Interview History fields
        historyId: candidateInterviewHistory.id,
        interviewId: candidateInterviewHistory.interviewId,
        interviewType: candidateInterviewHistory.interviewType,
        status: candidateInterviewHistory.status,
        score: candidateInterviewHistory.score,
        maxScore: candidateInterviewHistory.maxScore,
        duration: candidateInterviewHistory.duration,
        feedback: candidateInterviewHistory.feedback,
        completedAt: candidateInterviewHistory.completedAt,
        startedAt: candidateInterviewHistory.startedAt,
        passed: candidateInterviewHistory.passed,
        programmingLanguage: candidateInterviewHistory.programmingLanguage,
        
        // Candidate info
        candidateId: candidateUsers.id,
        candidateName: sql<string>`CONCAT(${candidateUsers.firstName}, ' ', COALESCE(${candidateUsers.lastName}, ''))`,
        candidateEmail: candidateUsers.email,
        
        // Campaign info (for campaign-based interviews)
        applicationId: candidateInterviewHistory.applicationId,
        campaignId: jobCampaigns.id,
        campaignName: jobCampaigns.campaignName,
        jobTitle: jobCampaigns.jobTitle,
        companyName: companies.name,
        
        // Direct interview info
        directInterviewTitle: sql<string>`COALESCE(${Interview.jobPosition}, ${CodingInterview.interviewTopic})`,
        directInterviewCompanyId: sql<string>`COALESCE(${Interview.companyId}, ${CodingInterview.companyId})`,
        directInterviewName: sql<string>`COALESCE(${Interview.candidateName}, ${CodingInterview.candidateName})`,
        directInterviewEmail: sql<string>`COALESCE(${Interview.candidateEmail}, ${CodingInterview.candidateEmail})`,
        directProgrammingLanguage: CodingInterview.programmingLanguage,
        directDifficultyLevel: CodingInterview.difficultyLevel
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

    if (candidateHistory.length === 0) {
      console.log(`No interview found in candidateInterviewHistory for ID: ${id}`);
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    const historyRecord = candidateHistory[0];
    console.log(`Found interview: ${historyRecord.interviewType} (${historyRecord.interviewId})`);

    // Determine interview source and get correct metadata
    const isCampaignInterview = !!historyRecord.applicationId;
    const candidateName = historyRecord.candidateName || historyRecord.directInterviewName || 'Unknown Candidate';
    const candidateEmail = historyRecord.candidateEmail || historyRecord.directInterviewEmail;
    const jobTitle = historyRecord.jobTitle || historyRecord.directInterviewTitle || 'Interview';
    const programmingLanguage = historyRecord.programmingLanguage || historyRecord.directProgrammingLanguage;
    const difficultyLevel = historyRecord.directDifficultyLevel;

    // Parse answers from feedback field
    let answers: any[] = [];
    let detailedAnswers: any[] = [];
    
    if (historyRecord.feedback) {
      try {
        const parsed = JSON.parse(historyRecord.feedback);
        console.log(`Parsing feedback for interview ${historyRecord.interviewId}:`, typeof parsed);
        
        // Handle different feedback structures
        if (parsed.answers && Array.isArray(parsed.answers)) {
          // New structure with detailed answers array
          detailedAnswers = parsed.answers;
        } else if (parsed.answers && typeof parsed.answers === 'object') {
          // Object format with numeric keys - convert to array
          const keys = Object.keys(parsed.answers).sort((a, b) => Number(a) - Number(b));
          detailedAnswers = keys.map(key => parsed.answers[key]);
        } else if (Array.isArray(parsed)) {
          // Direct array format
          detailedAnswers = parsed;
        } else if (typeof parsed === 'object') {
          // Handle legacy formats or single answer objects
          const keys = Object.keys(parsed).filter(key => !isNaN(Number(key)));
          if (keys.length > 0) {
            detailedAnswers = keys.sort((a, b) => Number(a) - Number(b)).map(key => parsed[key]);
          } else {
            console.warn('Unknown feedback structure:', parsed);
            detailedAnswers = [];
          }
        }

        // Normalize answer structure
        answers = detailedAnswers.map((answer: any, index: number) => ({
          id: answer.id || (index + 1).toString(),
          question: answer.question || answer.questionText || answer.problemDescription || `Question ${index + 1}`,
          userAnswer: answer.userAnswer || answer.selectedOption || answer.answer || answer.response || answer.code || 'No answer provided',
          correctAnswer: answer.correctAnswer || answer.correctOption || undefined,
          isCorrect: answer.isCorrect !== undefined ? answer.isCorrect : undefined,
          rating: answer.rating || answer.score || undefined,
          feedback: answer.feedback || answer.aiAnalysis || answer.aiExplanation || undefined,
          language: answer.language || answer.programmingLanguage || programmingLanguage || undefined,
          type: answer.type || historyRecord.interviewType || 'behavioral',
          timeSpent: answer.timeSpent || answer.timeTaken || undefined,
          scoringBreakdown: answer.scoringBreakdown || undefined,
          maxScore: answer.maxScore || 1,
          difficulty: answer.difficulty || difficultyLevel || undefined,
          testCases: answer.testCases || undefined,
          codeOutput: answer.codeOutput || answer.output || undefined
        }));
        
        console.log(`Processed ${answers.length} detailed answers for interview ${historyRecord.interviewId}`);
      } catch (e) {
        console.error('Error parsing interview feedback:', e);
        answers = [];
      }
    }

    // Calculate summary metrics
    const totalQuestions = answers.length;
    const totalAnswered = answers.filter(a => 
      a.userAnswer && a.userAnswer !== 'No answer provided' && a.userAnswer.trim() !== ''
    ).length;
    const completionRate = totalQuestions > 0 ? Math.round((totalAnswered / totalQuestions) * 100) : 0;
    const accuracy = (historyRecord.maxScore && historyRecord.score && historyRecord.maxScore > 0) 
      ? Math.round((historyRecord.score / historyRecord.maxScore) * 100) 
      : 0;

    // Calculate average time per question
    const answersWithTime = answers.filter(a => a.timeSpent && a.timeSpent > 0);
    const averageTimePerQuestion = answersWithTime.length > 0 
      ? answersWithTime.reduce((sum, a) => sum + (a.timeSpent || 0), 0) / answersWithTime.length 
      : 0;

    // Generate analytics
    const analytics = {
      questionTypes: answers.reduce((types: any, answer: any) => {
        const type = answer.type || 'unknown';
        types[type] = (types[type] || 0) + 1;
        return types;
      }, {}),
      correctAnswers: answers.filter(a => a.isCorrect === true).length,
      incorrectAnswers: answers.filter(a => a.isCorrect === false).length,
      averageRating: (() => {
        const answersWithRating = answers.filter(a => a.rating && a.rating > 0);
        return answersWithRating.length > 0 
          ? answersWithRating.reduce((sum, a) => sum + (a.rating || 0), 0) / answersWithRating.length 
          : 0;
      })(),
      programmingLanguages: answers
        .filter(a => a.language)
        .reduce((langs: any, answer: any) => {
          langs[answer.language] = (langs[answer.language] || 0) + 1;
          return langs;
        }, {}),
      difficultyDistribution: answers
        .filter(a => a.difficulty)
        .reduce((diff: any, answer: any) => {
          diff[answer.difficulty] = (diff[answer.difficulty] || 0) + 1;
          return diff;
        }, {})
    };

    const results = {
      interview: {
        id: historyRecord.historyId,
        interviewId: historyRecord.interviewId,
        type: historyRecord.interviewType,
        title: `${jobTitle} - ${historyRecord.interviewType} Interview`,
        candidateEmail,
        candidateName,
        status: historyRecord.status,
        score: historyRecord.score,
        maxScore: historyRecord.maxScore,
        completedAt: historyRecord.completedAt,
        startedAt: historyRecord.startedAt,
        duration: historyRecord.duration,
        passed: historyRecord.passed,
        programmingLanguage,
        difficultyLevel,
        sourceType: isCampaignInterview ? 'campaign' : 'direct',
        campaignName: historyRecord.campaignName || 'Direct Interview',
        answers: answers
      },
      answers: answers,
      summary: {
        totalQuestions,
        totalAnswered,
        score: historyRecord.score || 0,
        maxScore: historyRecord.maxScore || 0,
        completionRate,
        averageTimePerQuestion,
        totalTimeSpent: historyRecord.duration || 0,
        accuracy,
        performanceLevel: accuracy >= 70 ? 'good' : accuracy >= 50 ? 'average' : 'needs improvement'
      },
      analytics
    };

    console.log(`Returning detailed results for interview ${historyRecord.interviewId} with ${answers.length} answers`);
    return NextResponse.json(results);

  } catch (error) {
    console.error('Error fetching individual interview results:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}