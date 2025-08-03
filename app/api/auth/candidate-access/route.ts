import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database/connection";
import { candidateAccess } from "@/lib/database/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";

const createAccessSchema = z.object({
  candidateEmail: z.string().email(),
  interviewId: z.string(),
  interviewType: z.enum(["behavioral", "coding", "mcq", "combo"]),
  expiresInHours: z.number().min(1).max(168).default(24), // 1 hour to 7 days
});

const validateAccessSchema = z.object({
  token: z.string(),
  candidateEmail: z.string().email(),
});

// Create temporary access token for candidate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { candidateEmail, interviewId, interviewType, expiresInHours } = createAccessSchema.parse(body);

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    // Create access record
    const accessRecord = await db
      .insert(candidateAccess)
      .values({
        token,
        candidateEmail,
        interviewId,
        interviewType,
        expiresAt,
      })
      .returning({
        id: candidateAccess.id,
        token: candidateAccess.token,
        expiresAt: candidateAccess.expiresAt,
      });

    return NextResponse.json({
      success: true,
      accessToken: accessRecord[0].token,
      expiresAt: accessRecord[0].expiresAt,
      interviewLink: `${process.env.NEXT_PUBLIC_APP_URL}/interview/${interviewType}/${interviewId}?token=${accessRecord[0].token}&email=${encodeURIComponent(candidateEmail)}`,
    });
  } catch (error) {
    console.error("Create candidate access error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Validate candidate access token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const candidateEmail = searchParams.get('email');

    if (!token || !candidateEmail) {
      return NextResponse.json(
        { error: "Token and email are required" },
        { status: 400 }
      );
    }

    const { token: validToken, candidateEmail: validEmail } = validateAccessSchema.parse({
      token,
      candidateEmail,
    });

    // Find and validate access record
    const accessRecord = await db
      .select()
      .from(candidateAccess)
      .where(eq(candidateAccess.token, validToken))
      .limit(1);

    if (accessRecord.length === 0) {
      return NextResponse.json(
        { error: "Invalid access token" },
        { status: 401 }
      );
    }

    const record = accessRecord[0];

    // Check if token has expired
    if (new Date() > record.expiresAt) {
      return NextResponse.json(
        { error: "Access token has expired" },
        { status: 401 }
      );
    }

    // Check if email matches
    if (record.candidateEmail !== validEmail) {
      return NextResponse.json(
        { error: "Email does not match" },
        { status: 401 }
      );
    }

    // Check if already used (optional - you might want to allow multiple uses)
    // if (record.usedAt) {
    //   return NextResponse.json(
    //     { error: "Access token has already been used" },
    //     { status: 401 }
    //   );
    // }

    // Mark as used (optional)
    await db
      .update(candidateAccess)
      .set({ usedAt: new Date() })
      .where(eq(candidateAccess.id, record.id));

    return NextResponse.json({
      valid: true,
      interviewId: record.interviewId,
      interviewType: record.interviewType,
      candidateEmail: record.candidateEmail,
      expiresAt: record.expiresAt,
    });
  } catch (error) {
    console.error("Validate candidate access error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}