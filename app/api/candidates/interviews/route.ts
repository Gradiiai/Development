import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-candidate';
import { db } from '@/lib/database/connection';
import { candidateUsers, candidateInterviewHistory, candidateApplications, CodingInterview, Interview } from '@/lib/database/schema';
import { eq, or, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get candidate user
    const candidateUser = await db
      .select()
      .from(candidateUsers)
      .where(eq(candidateUsers.email, session.user.email))
      .limit(1);

    if (!candidateUser.length) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    // Fetch interviews from candidateInterviewHistory
    const historyInterviews = await db
      .select({
        id: candidateInterviewHistory.id,
        applicationId: candidateInterviewHistory.applicationId,
        interviewId: candidateInterviewHistory.interviewId,
        interviewType: candidateInterviewHistory.interviewType,
        roundNumber: candidateInterviewHistory.roundNumber,
        roundName: candidateInterviewHistory.roundName,
        scheduledAt: candidateInterviewHistory.scheduledAt,
        startedAt: candidateInterviewHistory.startedAt,
        completedAt: candidateInterviewHistory.completedAt,
        status: candidateInterviewHistory.status,
        duration: candidateInterviewHistory.duration,
        score: candidateInterviewHistory.score,
        maxScore: candidateInterviewHistory.maxScore,
        passed: candidateInterviewHistory.passed,
        feedback: candidateInterviewHistory.feedback,
        candidateExperience: candidateInterviewHistory.candidateExperience,
        candidateRating: candidateInterviewHistory.candidateRating,
        interviewerName: candidateInterviewHistory.interviewerName,
        interviewerEmail: candidateInterviewHistory.interviewerEmail,
        interviewLink: candidateInterviewHistory.interviewLink,
        preparationMaterials: candidateInterviewHistory.preparationMaterials,
        nextSteps: candidateInterviewHistory.nextSteps,
        createdAt: candidateInterviewHistory.createdAt,
        updatedAt: candidateInterviewHistory.updatedAt,
      })
      .from(candidateInterviewHistory)
      .where(eq(candidateInterviewHistory.candidateId, candidateUser[0].id))
      .orderBy(candidateInterviewHistory.scheduledAt);

    // Fetch coding interviews for the candidate
    const codingInterviews = await db
      .select({
        id: CodingInterview.id,
        interviewId: CodingInterview.interviewId,
        interviewType: sql<string>`'coding'`,
        interviewTopic: CodingInterview.interviewTopic,
        difficultyLevel: CodingInterview.difficultyLevel,
        programmingLanguage: CodingInterview.programmingLanguage,
        timeLimit: CodingInterview.timeLimit,
        candidateName: CodingInterview.candidateName,
        candidateEmail: CodingInterview.candidateEmail,
        interviewDate: CodingInterview.interviewDate,
        interviewTime: CodingInterview.interviewTime,
        interviewStatus: CodingInterview.interviewStatus,
        interviewLink: CodingInterview.interviewLink,
        linkExpiryTime: CodingInterview.linkExpiryTime,
        createdAt: CodingInterview.createdAt,
        updatedAt: CodingInterview.updatedAt,
      })
      .from(CodingInterview)
      .where(eq(CodingInterview.candidateEmail, session.user.email))
      .orderBy(CodingInterview.createdAt);

    // Fetch regular interviews for the candidate
    const regularInterviews = await db
      .select({
        id: Interview.id,
        interviewId: Interview.interviewId,
        interviewType: Interview.interviewType,
        jobPosition: Interview.jobPosition,
        jobDescription: Interview.jobDescription,
        jobExperience: Interview.jobExperience,
        candidateName: Interview.candidateName,
        candidateEmail: Interview.candidateEmail,
        interviewDate: Interview.interviewDate,
        interviewTime: Interview.interviewTime,
        interviewStatus: Interview.interviewStatus,
        interviewLink: Interview.interviewLink,
        linkExpiryTime: Interview.linkExpiryTime,
        createdAt: Interview.createdAt,
        updatedAt: Interview.updatedAt,
      })
      .from(Interview)
      .where(eq(Interview.candidateEmail, session.user.email))
      .orderBy(Interview.createdAt);

    // Combine all interviews
    const allInterviews = {
      historyInterviews,
      codingInterviews,
      regularInterviews
    };

    return NextResponse.json({ interviews: allInterviews });
  } catch (error) {
    console.error('Error fetching interviews:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get candidate user
    const candidateUser = await db
      .select()
      .from(candidateUsers)
      .where(eq(candidateUsers.email, session.user.email))
      .limit(1);

    if (!candidateUser.length) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      applicationId,
      interviewId,
      interviewType,
      roundNumber,
      roundName,
      scheduledAt,
      status = 'scheduled',
      interviewLink,
      preparationMaterials
    } = body;

    // Validate that the application belongs to the candidate
    const application = await db
      .select()
      .from(candidateApplications)
      .where(eq(candidateApplications.id, applicationId))
      .limit(1);

    if (!application.length || application[0].candidateId !== candidateUser[0].id) {
      return NextResponse.json({ error: 'Application not found or unauthorized' }, { status: 404 });
    }

    // Create new interview record
    const newInterview = await db
      .insert(candidateInterviewHistory)
      .values({
        candidateId: candidateUser[0].id,
        applicationId,
        interviewId,
        interviewType,
        roundNumber,
        roundName,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status,
        interviewLink,
        preparationMaterials,
      })
      .returning();

    return NextResponse.json({ interview: newInterview[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating interview:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}