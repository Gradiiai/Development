import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database/connection";
import { InterviewAnalytics } from "@/lib/database/schema";
import { eq, and } from "drizzle-orm";
import { getServerSessionWithAuth } from "@/auth";;

// POST - Create new analytics record
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await req.json();
    const {
      interviewId,
      interviewType,
      candidateName,
      candidateEmail,
      interviewerEmail,
      scheduledTime,
    } = body;

    // Validate required fields
    if (!interviewId || !interviewType || !interviewerEmail) {
      return NextResponse.json(
        { error: "Missing required fields: interviewId, interviewType, interviewerEmail" },
        { status: 400 }
      );
    }

    // Check if analytics record already exists
    const existingRecord = await db
      .select()
      .from(InterviewAnalytics)
      .where(eq(InterviewAnalytics.interviewId, interviewId))
      .limit(1);

    if (existingRecord.length > 0) {
      return NextResponse.json(
        { error: "Analytics record already exists for this interview" },
        { status: 409 }
      );
    }

    // Insert new analytics record
    const result = await db
      .insert(InterviewAnalytics)
      .values({
        interviewId,
        interviewType,
        candidateName: candidateName || null,
        candidateEmail: candidateEmail || null,
        interviewerEmail,
        scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
        completionStatus: false,
        createdAt: new Date(),
      })
      .returning();

    return NextResponse.json(
      { message: "Analytics record created successfully", data: result[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating analytics record:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Retrieve analytics records
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const interviewerEmail = searchParams.get("interviewerEmail");
    const interviewType = searchParams.get("interviewType");
    const completionStatus = searchParams.get("completionStatus");

    if (!interviewerEmail) {
      return NextResponse.json(
        { error: "interviewerEmail parameter is required" },
        { status: 400 }
      );
    }

    // Build query with all conditions
    let conditions = [];
    conditions.push(eq(InterviewAnalytics.interviewerEmail, interviewerEmail));
    
    if (interviewType) {
      conditions.push(eq(InterviewAnalytics.interviewType, interviewType));
    }

    if (completionStatus !== null) {
      const isCompleted = completionStatus === "true";
      conditions.push(eq(InterviewAnalytics.completionStatus, isCompleted));
    }
    
    // Execute query with all conditions
    const query = db
      .select()
      .from(InterviewAnalytics)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions));

    const analytics = await query;

    return NextResponse.json(
      { data: analytics },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update analytics record
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      interviewId,
      completionStatus,
      completionTime,
      overallRating,
    } = body;

    if (!interviewId) {
      return NextResponse.json(
        { error: "interviewId is required" },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updateData: any = {};
    
    if (completionStatus !== undefined) {
      updateData.completionStatus = completionStatus;
    }
    
    if (completionTime) {
      updateData.completionTime = new Date(completionTime);
    }
    
    if (overallRating) {
      updateData.overallRating = overallRating;
    }

    // If marking as completed and no completion time provided, set current time
    if (completionStatus === true && !completionTime) {
      updateData.completionTime = new Date();
    }

    const result = await db
      .update(InterviewAnalytics)
      .set(updateData)
      .where(eq(InterviewAnalytics.interviewId, interviewId))
      .returning();

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Analytics record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Analytics record updated successfully", data: result[0] },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating analytics record:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}