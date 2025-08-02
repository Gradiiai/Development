import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database/connection";
// UserAnswer import removed - migrated to candidateInterviewHistory
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { markInterviewCompleted } from "@/lib/services/analytics";
import { 
  Interview, 
  CodingInterview,
  candidateInterviewHistory
} from "@/lib/database/schema";

// POST - Mark interview as completed
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await req.json();
    const { interviewId, interviewType, overallRating } = body;

    if (!interviewId || !interviewType) {
      return NextResponse.json(
        { error: "Missing required fields: interviewId, interviewType" },
        { status: 400 }
      );
    }

    // Validate interview type
    if (!['behavioral', 'coding', 'combo'].includes(interviewType)) {
      return NextResponse.json(
        { error: "Invalid interview type. Must be 'behavioral', 'coding', or 'combo'" },
        { status: 400 }
      );
    }

    // Update interview status based on type
    if (interviewType === 'behavioral') {
      // Check if interview exists
      const existingInterview = await db
        .select()
        .from(Interview)
        .where(eq(Interview.interviewId, interviewId))
        .limit(1);

      if (existingInterview.length === 0) {
        return NextResponse.json(
          { error: "Interview not found" },
          { status: 404 }
        );
      }

      // Update interview status to completed
      await db
        .update(Interview)
        .set({ 
          interviewStatus: "completed"
        })
        .where(eq(Interview.interviewId, interviewId));

    } else if (interviewType === 'coding') {
      // Check if coding interview exists
      const existingInterview = await db
        .select()
        .from(CodingInterview)
        .where(eq(CodingInterview.interviewId, interviewId))
        .limit(1);

      if (existingInterview.length === 0) {
        return NextResponse.json(
          { error: "Coding interview not found" },
          { status: 404 }
        );
      }

      // Update coding interview status to completed
      await db
        .update(CodingInterview)
        .set({ 
          interviewStatus: "completed"
        })
        .where(eq(CodingInterview.interviewId, interviewId));

    } else if (interviewType === 'combo') {
      // Check if combo interview exists
      const existingInterview = await db
        .select()
        .from(Interview)
        .where(eq(Interview.interviewId, interviewId))
        .limit(1);

      if (existingInterview.length === 0) {
        return NextResponse.json(
          { error: "Combo interview not found" },
          { status: 404 }
        );
      }

      // Update combo interview status to completed
      await db
        .update(Interview)
        .set({ 
          interviewStatus: "completed"
        })
        .where(eq(Interview.interviewId, interviewId));
    }

    // Update analytics record
    try {
      await markInterviewCompleted(interviewId, overallRating);
    } catch (analyticsError) {
      console.error("Failed to update analytics:", analyticsError);
      // Don't fail the completion if analytics update fails
    }

    return NextResponse.json(
      { 
        message: "Interview marked as completed successfully",
        interviewId,
        completedAt: new Date().toISOString()
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error completing interview:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Check if interview is completed
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const interviewId = searchParams.get("interviewId");
    const interviewType = searchParams.get("interviewType");

    if (!interviewId || !interviewType) {
      return NextResponse.json(
        { error: "Missing required parameters: interviewId, interviewType" },
        { status: 400 }
      );
    }

    let isCompleted = false;
    let interviewData = null;

    if (interviewType === 'behavioral') {
      const result = await db
        .select()
        .from(Interview)
        .where(eq(Interview.interviewId, interviewId))
        .limit(1);
      
      if (result.length > 0) {
        interviewData = result[0];
        isCompleted = result[0].interviewStatus === 'completed';
      }
    } else if (interviewType === 'coding') {
      const result = await db
        .select()
        .from(CodingInterview)
        .where(eq(CodingInterview.interviewId, interviewId))
        .limit(1);
      
      if (result.length > 0) {
        interviewData = result[0];
        isCompleted = result[0].interviewStatus === 'completed';
      }
    } else if (interviewType === 'combo') {
      const result = await db
        .select()
        .from(Interview)
        .where(eq(Interview.interviewId, interviewId))
        .limit(1);
      
      if (result.length > 0) {
        interviewData = result[0];
        isCompleted = result[0].interviewStatus === 'completed';
      }
    }

    if (!interviewData) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        interviewId,
        isCompleted,
        status: interviewData.interviewStatus,
        interviewType
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error checking interview completion:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}