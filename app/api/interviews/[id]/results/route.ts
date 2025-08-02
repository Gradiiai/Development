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

    // If not found in legacy system, try candidateInterviewHistory
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
        // Candidate info
        candidateEmail: candidateUsers.email,
        candidateName: candidateUsers.firstName
      })
      .from(candidateInterviewHistory)
      .innerJoin(candidateUsers, eq(candidateInterviewHistory.candidateId, candidateUsers.id))
      .leftJoin(candidateApplications, eq(candidateInterviewHistory.applicationId, candidateApplications.id))
      .leftJoin(jobCampaigns, eq(candidateApplications.campaignId, jobCampaigns.id))
      .leftJoin(companies, eq(jobCampaigns.companyId, companies.id))
      .where(and(
        or(
          eq(candidateInterviewHistory.id, id),
          eq(candidateInterviewHistory.interviewId, id)
        ),
        eq(candidateInterviewHistory.status, 'completed'),
        or(
          eq(companies.id, session.user.companyId),
          sql`${candidateApplications.campaignId} IS NULL` // Include direct interviews without campaigns
        )
      ))
      .limit(1);

    if (candidateHistory.length > 0) {
      const historyRecord = candidateHistory[0];
      
      // Parse answers from feedback field
      let answers = [];
      if (historyRecord.feedback) {
        try {
          const parsed = JSON.parse(historyRecord.feedback);
          answers = parsed.answers || parsed || [];
        } catch (e) {
          console.error('Error parsing interview feedback:', e);
        }
      }

      const results = {
        interview: {
          id: historyRecord.id,
          type: historyRecord.interviewType,
          title: `${historyRecord.interviewType} Interview`,
          candidateEmail: historyRecord.candidateEmail,
          status: historyRecord.status,
          score: historyRecord.score,
          maxScore: historyRecord.maxScore,
          completedAt: historyRecord.completedAt,
          answers: answers
        },
        answers: answers,
        summary: {
          totalQuestions: Array.isArray(answers) ? answers.length : 0,
          score: historyRecord.score || 0,
          maxScore: historyRecord.maxScore || 0,
          completionRate: historyRecord.status === 'completed' ? 100 : 0
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