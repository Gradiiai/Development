import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/database/connection";
import { Interview, InterviewAnalytics } from "@/lib/database/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";

// Valid interview types and statuses
const VALID_TYPES = ['behavioral', 'coding', 'mcq', 'combo'] as const;
const VALID_STATUSES = ['scheduled', 'started', 'completed', 'cancelled'] as const;

// Schema for updating interviews
const updateInterviewSchema = z.object({
  jobPosition: z.string().min(1).max(255).optional(),
  jobDescription: z.string().optional(),
  jobExperience: z.string().optional(),
  interviewQuestions: z.string().optional(), // JSON string
  interviewStatus: z.enum(VALID_STATUSES).optional(),
  candidateEmail: z.string().email().optional(),
  candidateName: z.string().optional(),
  interviewDate: z.string().optional(),
  interviewTime: z.string().optional(),
});

// Helper function to generate secure tokens
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Interview logging removed - unified system not used
async function logInterviewAction(interviewId: string, action: string, details?: any) {
  // Log to console for debugging
  console.log(`Interview ${action}:`, { interviewId, details });
}

// GET - Fetch a specific interview
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

    // Get interview from Interview table (using interviewId)
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

    // Parse questions if they're stored as JSON string
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

    // Log the view action
    await logInterviewAction(id, 'view', { userId: session.user.id, questionsCount: parsedQuestions.length });

    return NextResponse.json({
      success: true,
      data: {
        ...interview,
        questions: parsedQuestions, // Parsed questions array
        title: interview.jobPosition, // Map jobPosition to title for compatibility
        status: interview.interviewStatus, // Map interviewStatus to status for compatibility
      },
    });
  } catch (error) {
    console.error("Error fetching interview:", error);
    return NextResponse.json(
      { error: "Failed to fetch interview" },
      { status: 500 }
    );
  }
}

// PUT - Update a specific interview
export async function PUT(
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
    const validatedData = updateInterviewSchema.parse(body);

    // Check if interview exists and belongs to user
    const [existingInterview] = await db
      .select()
      .from(Interview)
      .where(
        and(
          eq(Interview.interviewId, id),
          eq(Interview.createdBy, session.user.id)
        )
      )
      .limit(1);

    if (!existingInterview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    // Prevent updates to started or completed interviews
    if (existingInterview.interviewStatus === 'started' || existingInterview.interviewStatus === 'completed') {
      return NextResponse.json(
        { error: "Cannot update interview that has been started or completed" },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (validatedData.jobPosition !== undefined) updateData.jobPosition = validatedData.jobPosition;
    if (validatedData.jobDescription !== undefined) updateData.jobDescription = validatedData.jobDescription;
    if (validatedData.jobExperience !== undefined) updateData.jobExperience = validatedData.jobExperience;
    if (validatedData.interviewQuestions !== undefined) updateData.interviewQuestions = validatedData.interviewQuestions;
    if (validatedData.interviewStatus !== undefined) updateData.interviewStatus = validatedData.interviewStatus;
    if (validatedData.candidateName !== undefined) updateData.candidateName = validatedData.candidateName;
    if (validatedData.interviewDate !== undefined) updateData.interviewDate = validatedData.interviewDate;
    if (validatedData.interviewTime !== undefined) updateData.interviewTime = validatedData.interviewTime;
    
    // If candidate email changes, update it
    if (validatedData.candidateEmail !== undefined && validatedData.candidateEmail !== existingInterview.candidateEmail) {
      updateData.candidateEmail = validatedData.candidateEmail;
    }

    // Update the interview
    const [updatedInterview] = await db
      .update(Interview)
      .set(updateData)
      .where(eq(Interview.interviewId, id))
      .returning();

    // Log the update
    await logInterviewAction(id, 'update', { 
      userId: session.user.id, 
      changes: Object.keys(updateData) 
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updatedInterview,
        questions: typeof updatedInterview.interviewQuestions === 'string' 
          ? JSON.parse(updatedInterview.interviewQuestions) 
          : updatedInterview.interviewQuestions,
        title: updatedInterview.jobPosition, // Map for compatibility
        status: updatedInterview.interviewStatus, // Map for compatibility
      },
      message: "Interview updated successfully",
    });
  } catch (error) {
    console.error("Error updating interview:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update interview" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a specific interview
export async function DELETE(
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

    // Check if interview exists and belongs to user
    const [existingInterview] = await db
      .select()
      .from(Interview)
      .where(
        and(
          eq(Interview.interviewId, id),
          eq(Interview.createdBy, session.user.id)
        )
      )
      .limit(1);

    if (!existingInterview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    // Prevent deletion of started or completed interviews
    if (existingInterview.interviewStatus === 'started' || existingInterview.interviewStatus === 'completed') {
      return NextResponse.json(
        { error: "Cannot delete interview that has been started or completed" },
        { status: 400 }
      );
    }

    // Delete the interview
    await db
      .delete(Interview)
      .where(eq(Interview.interviewId, id));

    // Log the deletion
    await logInterviewAction(id, 'delete', { 
      jobPosition: existingInterview.jobPosition,
      userId: session.user.id 
    });

    return NextResponse.json({
      success: true,
      message: "Interview deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting interview:", error);
    return NextResponse.json(
      { error: "Failed to delete interview" },
      { status: 500 }
    );
  }
}