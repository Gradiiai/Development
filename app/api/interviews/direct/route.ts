import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database/connection";
import { Interview } from "@/lib/database/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import moment from 'moment';
import { createAnalyticsRecord } from '@/lib/services/analytics';
// Removed auto-registration import

// Schema for creating direct interviews
const createDirectInterviewSchema = z.object({
  jobPosition: z.string().min(1, "Job position is required"),
  jobDescription: z.string().min(1, "Job description is required"),
  yearsOfExperience: z.number().min(0, "Years of experience must be non-negative"),
  candidateName: z.string().min(1, "Candidate name is required"),
  candidateEmail: z.string().email("Valid email is required"),
  interviewDate: z.string().min(1, "Interview date is required"),
  interviewTime: z.string().min(1, "Interview time is required"),
  resumeText: z.string().optional(),
  interviewType: z.enum(['behavioral', 'mcq', 'coding', 'combo']).default('behavioral'),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const interviewId = searchParams.get("interviewId");
    const userId = session.user.id;

    // If specific interview ID is requested
    if (interviewId) {
      const interview = await db
        .select()
        .from(Interview)
        .where(
          and(
            eq(Interview.interviewId, interviewId),
            eq(Interview.createdBy, userId),
            sql`${Interview.campaignId} IS NULL` // Ensure only direct interviews
          )
        )
        .limit(1);

      if (interview.length === 0) {
        return NextResponse.json({ error: "Interview not found" }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        interview: interview[0]
      });
    }

    // Get all direct interviews for the user (only those with campaignId = null)
    const interviews = await db
      .select({
        id: Interview.id,
        interviewId: Interview.interviewId,
        candidateName: Interview.candidateName,
        candidateEmail: Interview.candidateEmail,
        jobPosition: Interview.jobPosition,
        jobDescription: Interview.jobDescription,
        jobExperience: Interview.jobExperience,
        interviewDate: Interview.interviewDate,
        interviewTime: Interview.interviewTime,
        interviewStatus: Interview.interviewStatus,
        interviewLink: Interview.interviewLink,
        linkExpiryTime: Interview.linkExpiryTime,
        interviewType: Interview.interviewType,
        fileData: Interview.fileData,
        createdAt: Interview.createdAt,
        updatedAt: Interview.updatedAt,
      })
      .from(Interview)
      .where(and(
        eq(Interview.createdBy, userId),
        sql`${Interview.campaignId} IS NULL` // Ensure only direct interviews (no campaign association)
      ))
      .orderBy(desc(Interview.createdAt));

    // Transform the data to match the expected format
    const transformedInterviews = interviews.map(interview => ({
      id: interview.id,
      interviewId: interview.interviewId,
      candidateName: interview.candidateName,
      candidateEmail: interview.candidateEmail,
      jobPosition: interview.jobPosition,
      jobDescription: interview.jobDescription,
      jobExperience: interview.jobExperience || '0',
      interviewDate: interview.interviewDate,
      interviewTime: interview.interviewTime,
      interviewStatus: interview.interviewStatus,
      interviewLink: interview.interviewLink,
      linkExpiryTime: interview.linkExpiryTime,
      interviewType: interview.interviewType || 'behavioral',
      fileData: interview.fileData,
      createdAt: interview.createdAt,
      updatedAt: interview.updatedAt,
      createdBy: userId
    }));

    return NextResponse.json({
      success: true,
      interviews: transformedInterviews
    });
  } catch (error) {
    console.error("Error fetching direct interviews:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const interviewId = searchParams.get('interviewId');

    if (!interviewId) {
      return NextResponse.json({ error: 'Interview ID is required' }, { status: 400 });
    }

    // Delete the interview
    const deletedInterview = await db
      .delete(Interview)
      .where(and(
        eq(Interview.interviewId, interviewId),
        eq(Interview.createdBy, session.user.id)
      ))
      .returning();

    if (deletedInterview.length === 0) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Interview deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting direct interview:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createDirectInterviewSchema.parse(body);

    // Generate unique interview ID
    const interviewId = uuidv4();

    // Generate simple direct interview link without token
    const interviewLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/candidate/interview/${interviewId}/lobby?email=${encodeURIComponent(validatedData.candidateEmail)}`;

    // Calculate link expiry time (3 hours after interview start)
    const interviewDateTime = moment(`${validatedData.interviewDate} ${validatedData.interviewTime}`);
    const linkExpiryTime = interviewDateTime.add(3, 'hours').toDate();

    // Generate questions based on interview type with enhanced error handling
    let interviewQuestions;
    const questionsFormData = new FormData();
    questionsFormData.append('jobPosition', validatedData.jobPosition);
    questionsFormData.append('jobDescription', validatedData.jobDescription);
    questionsFormData.append('yearsOfExperience', validatedData.yearsOfExperience.toString());
    if (validatedData.resumeText) {
      questionsFormData.append('resumeText', validatedData.resumeText);
    }

    // Generate questions based on interview type
    let questionsEndpoint;
    switch (validatedData.interviewType) {
      case 'behavioral':
        questionsEndpoint = '/api/ai/generate-behavioral';
        break;
      case 'mcq':
        questionsEndpoint = '/api/ai/generate-mcq';
        break;
      case 'coding':
        questionsEndpoint = '/api/ai/generate-coding';
        break;
      case 'combo':
        questionsEndpoint = '/api/ai/generate-combo';
        break;
      default:
        questionsEndpoint = '/api/ai/generate-behavioral';
    }

    const questionsResponse = await fetch(`${process.env.NEXTAUTH_URL}${questionsEndpoint}`, {
      method: 'POST',
      body: questionsFormData,
    });

    if (!questionsResponse.ok) {
      const errorText = await questionsResponse.text();
      console.error(`Failed to generate ${validatedData.interviewType} questions:`, errorText);
      return NextResponse.json(
        { 
          error: "Failed to generate interview questions", 
          message: `AI service is currently unavailable. Please try again later.`,
          details: `${validatedData.interviewType} question generation failed`
        },
        { status: 503 }
      );
    }

    const questionsResult = await questionsResponse.json();
    
    if (!questionsResult.questions || !Array.isArray(questionsResult.questions)) {
      console.error('Invalid questions format received:', questionsResult);
      return NextResponse.json(
        { 
          error: "Invalid questions format", 
          message: "AI service returned invalid data. Please try again later."
        },
        { status: 503 }
      );
    }
    
    interviewQuestions = questionsResult.questions;

    // Save interview to database
    // Explicitly set campaignId to null to ensure isolation from campaign interviews
    const [interview] = await db.insert(Interview).values({
      interviewId,
      interviewQuestions: JSON.stringify(interviewQuestions),
      jobPosition: validatedData.jobPosition,
      jobDescription: validatedData.jobDescription,
      jobExperience: validatedData.yearsOfExperience.toString(),
      candidateName: validatedData.candidateName,
      candidateEmail: validatedData.candidateEmail,
      interviewDate: validatedData.interviewDate,
      interviewTime: validatedData.interviewTime,
      interviewType: validatedData.interviewType,
      createdBy: session.user.id,
      linkExpiryTime,
      interviewLink,
      companyId: session.user.companyId!,
      campaignId: null, // Explicitly set to null for direct interviews
    }).returning();

    // Create analytics record
    if (session.user.email) {
      await createAnalyticsRecord({
        interviewId,
        interviewType: validatedData.interviewType,
        candidateName: validatedData.candidateName,
        candidateEmail: validatedData.candidateEmail,
        interviewerEmail: session.user.email,
        scheduledTime: new Date(`${validatedData.interviewDate}T${validatedData.interviewTime}`),
      });
    }

    // Note: Candidate registration is handled separately
    const isNewCandidate = true; // Assume new candidate for direct interviews

    // Send interview invitation email with error handling
    try {
      const emailBaseUrl = process.env.NODE_ENV === 'production' ? 'http://localhost:3000' : process.env.NEXTAUTH_URL;
      const emailResponse = await fetch(`${emailBaseUrl}/api/interviews/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidateName: validatedData.candidateName,
          candidateEmail: validatedData.candidateEmail,
          jobPosition: validatedData.jobPosition,
          companyName: 'Gradii',
          interviewDate: validatedData.interviewDate,
          interviewTime: validatedData.interviewTime,
          interviewMode: 'Online',
          interviewLink: interviewLink,
          interviewType: validatedData.interviewType,
          additionalInfo: `This is a ${validatedData.interviewType} interview focusing on your skills and experience.`,
          isNewCandidate: isNewCandidate,
        }),
      });

      if (!emailResponse.ok) {
        console.error('Failed to send interview invitation email');
        // Continue with the response even if email fails
      }
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Continue with the response even if email fails
    }

    return NextResponse.json({
      success: true,
      interview: {
        id: interview.id,
        interviewId: interview.interviewId,
        candidateName: interview.candidateName,
        candidateEmail: interview.candidateEmail,
        jobPosition: interview.jobPosition,
        interviewDate: interview.interviewDate,
        interviewTime: interview.interviewTime,
        interviewType: interview.interviewType,
        interviewLink: interview.interviewLink,
        linkExpiryTime: interview.linkExpiryTime,
        questionsGenerated: interviewQuestions.length
      },
      message: 'Direct interview created successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating direct interview:", error);
    return NextResponse.json(
      { error: "Internal server error", message: "Failed to create interview. Please try again." },
      { status: 500 }
    );
  }
}