import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/database/connection";
import { Interview, InterviewAnalytics } from "@/lib/database/schema";
import { eq, and } from "drizzle-orm";
import { createAnalyticsRecord } from "@/lib/services/analytics";

// POST - Start an interview
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { candidateEmail } = body;

    // Get interview from Interview table
    const [interview] = await db
      .select()
      .from(Interview)
      .where(
        and(
          eq(Interview.interviewId, id),
          eq(Interview.createdBy, session.user.id)
        )
      )
      .limit(1);

    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    // Check if interview is in a valid state to start
    if (interview.interviewStatus === 'completed') {
      return NextResponse.json(
        { error: "Interview has already been completed" },
        { status: 400 }
      );
    }

    if (interview.interviewStatus === 'started') {
      return NextResponse.json(
        { error: "Interview has already been started" },
        { status: 400 }
      );
    }

    // Verify candidate email if provided
    if (candidateEmail && interview.candidateEmail && interview.candidateEmail !== candidateEmail) {
      return NextResponse.json(
        { error: "Candidate email mismatch" },
        { status: 403 }
      );
    }

    // Update interview status to 'started'
    const [updatedInterview] = await db
      .update(Interview)
      .set({
        interviewStatus: 'started',
        updatedAt: new Date(),
      })
      .where(eq(Interview.interviewId, id))
      .returning();

    // Create analytics record for interview start
    try {
      await createAnalyticsRecord({
        interviewId: id,
        interviewType: interview.interviewType || 'behavioral',
        candidateName: interview.candidateName || candidateEmail?.split('@')[0] || 'Unknown',
        candidateEmail: interview.candidateEmail || candidateEmail || '',
        interviewerEmail: session.user.email || '',
      });
    } catch (analyticsError) {
      console.error('Error creating analytics record:', analyticsError);
      // Continue execution even if analytics fails
    }

    // Parse questions for response
    let parsedQuestions = [];
    try {
      if (typeof interview.interviewQuestions === 'string') {
        parsedQuestions = JSON.parse(interview.interviewQuestions);
      } else if (Array.isArray(interview.interviewQuestions)) {
        parsedQuestions = interview.interviewQuestions;
      }
    } catch (error) {
      console.error('Error parsing interview questions:', error);
      parsedQuestions = [];
    }

    return NextResponse.json({
      success: true,
      message: "Interview started successfully",
      data: {
        ...updatedInterview,
        questions: parsedQuestions,
        title: updatedInterview.jobPosition,
        status: updatedInterview.interviewStatus,
      },
    });
  } catch (error) {
    console.error("Error starting interview:", error);
    return NextResponse.json(
      { error: "Failed to start interview" },
      { status: 500 }
    );
  }
}

// GET - Check if interview can be started
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get interview from Interview table
    const [interview] = await db
      .select()
      .from(Interview)
      .where(
        and(
          eq(Interview.interviewId, id),
          eq(Interview.createdBy, session.user.id)
        )
      )
      .limit(1);

    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    const canStart = interview.interviewStatus === 'scheduled';
    const isStarted = interview.interviewStatus === 'started';
    const isCompleted = interview.interviewStatus === 'completed';

    return NextResponse.json({
      success: true,
      data: {
        canStart,
        isStarted,
        isCompleted,
        status: interview.interviewStatus,
        interviewId: interview.interviewId,
        candidateEmail: interview.candidateEmail,
        candidateName: interview.candidateName,
        jobPosition: interview.jobPosition,
        interviewDate: interview.interviewDate,
        interviewTime: interview.interviewTime,
      },
    });
  } catch (error) {
    console.error("Error checking interview start status:", error);
    return NextResponse.json(
      { error: "Failed to check interview status" },
      { status: 500 }
    );
  }
}