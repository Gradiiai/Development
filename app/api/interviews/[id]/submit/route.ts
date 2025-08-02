import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/database/connection";
import { Interview, InterviewAnalytics } from "@/lib/database/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

// Validation schema for interview submission
const submitInterviewSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string(),
    question: z.string(),
    answer: z.string(),
    timeSpent: z.number().optional(),
  })),
  totalTimeSpent: z.number().optional(),
  candidateEmail: z.string().email().optional(),
  candidateName: z.string().optional(),
});

// POST - Submit interview answers
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Validate request body
    const validatedData = submitInterviewSchema.parse(body);
    const { answers, totalTimeSpent, candidateEmail, candidateName } = validatedData;

    // For candidate submissions, we don't require authentication
    // For interviewer submissions, we check authentication
    const session = await auth();
    
    // Get interview from Interview table
    const [interview] = await db
      .select()
      .from(Interview)
      .where(eq(Interview.interviewId, id))
      .limit(1);

    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    // If session exists, verify ownership
    if (session?.user?.id && interview.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Check if interview is in a valid state to submit
    if (interview.interviewStatus === 'completed') {
      return NextResponse.json(
        { error: "Interview has already been completed" },
        { status: 400 }
      );
    }

    if (interview.interviewStatus === 'scheduled') {
      return NextResponse.json(
        { error: "Interview has not been started yet" },
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

    // Calculate basic metrics
    const totalQuestions = answers.length;
    const answeredQuestions = answers.filter(answer => answer.answer.trim().length > 0).length;
    const completionRate = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

    // Prepare answers for storage
    const formattedAnswers = answers.map((answer, index) => ({
      questionId: answer.questionId || `q_${index + 1}`,
      question: answer.question,
      answer: answer.answer,
      timeSpent: answer.timeSpent || 0,
    }));

    // Update interview with submission data
    const updateData: any = {
      interviewStatus: 'completed',
      updatedAt: new Date(),
    };

    // Update candidate info if provided
    if (candidateEmail) {
      updateData.candidateEmail = candidateEmail;
    }
    if (candidateName) {
      updateData.candidateName = candidateName;
    }

    const [updatedInterview] = await db
      .update(Interview)
      .set(updateData)
      .where(eq(Interview.interviewId, id))
      .returning();

    // Update or create analytics record
    try {
      const [existingAnalytics] = await db
        .select()
        .from(InterviewAnalytics)
        .where(eq(InterviewAnalytics.interviewId, id))
        .limit(1);

      const analyticsData = {
        completionStatus: true,
        completionTime: new Date(),
        overallRating: Math.round(completionRate), // Use completion rate as a basic rating
      };

      if (existingAnalytics) {
        await db
          .update(InterviewAnalytics)
          .set(analyticsData)
          .where(eq(InterviewAnalytics.interviewId, id));
      } else {
        await db
          .insert(InterviewAnalytics)
          .values({
            interviewId: id,
            interviewType: interview.interviewType || 'behavioral',
            candidateName: updatedInterview.candidateName || candidateName || 'Unknown',
            candidateEmail: updatedInterview.candidateEmail || candidateEmail || '',
            interviewerEmail: interview.createdBy || '',
            scheduledTime: interview.interviewDate && interview.interviewTime 
              ? new Date(`${interview.interviewDate}T${interview.interviewTime}`)
              : null,
            ...analyticsData,
          });
      }
    } catch (analyticsError) {
      console.error('Error updating analytics:', analyticsError);
      // Continue execution even if analytics fails
    }

    return NextResponse.json({
      success: true,
      message: "Interview submitted successfully",
      data: {
        interviewId: updatedInterview.interviewId,
        status: updatedInterview.interviewStatus,
        completedAt: new Date(), // Use current time as completion time
        totalQuestions,
        answeredQuestions,
        completionRate: Math.round(completionRate),
        totalTimeSpent: totalTimeSpent || 0,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error submitting interview:", error);
    return NextResponse.json(
      { error: "Failed to submit interview" },
      { status: 500 }
    );
  }
}

// GET - Get interview submission status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    // Get interview from Interview table
    const [interview] = await db
      .select()
      .from(Interview)
      .where(eq(Interview.interviewId, id))
      .limit(1);

    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    // If session exists, verify ownership for detailed data
    if (session?.user?.id && interview.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Parse candidate answers - stored in analytics or separate table
    let candidateAnswers: any[] = [];
    // Note: candidateAnswers are not stored in Interview table
    // They would need to be stored in a separate table or in analytics

    // Get analytics data
    const [analytics] = await db
      .select()
      .from(InterviewAnalytics)
      .where(eq(InterviewAnalytics.interviewId, id))
      .limit(1);

    return NextResponse.json({
      success: true,
      data: {
        interviewId: interview.interviewId,
        status: interview.interviewStatus,
        isCompleted: interview.interviewStatus === 'completed',
        completedAt: analytics?.completionTime || null,
        candidateAnswers,
        analytics: analytics ? {
          completionStatus: analytics.completionStatus,
          completionTime: analytics.completionTime,
          overallRating: analytics.overallRating,
          scheduledTime: analytics.scheduledTime,
        } : null,
      },
    });
  } catch (error) {
    console.error("Error getting interview submission status:", error);
    return NextResponse.json(
      { error: "Failed to get submission status" },
      { status: 500 }
    );
  }
}