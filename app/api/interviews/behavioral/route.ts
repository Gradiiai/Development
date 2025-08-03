import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database/connection";
import { Interview, users } from "@/lib/database/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/auth";
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import moment from 'moment';
import { createAnalyticsRecord } from '@/lib/services/analytics';
// Removed auto-registration import
import { getQuestions } from '@/lib/database/queries/campaigns';

// Schema for creating behavioral interviews
const createBehavioralInterviewSchema = z.object({
  jobPosition: z.string().min(1, "Job position is required"),
  jobDescription: z.string().min(1, "Job description is required"),
  yearsOfExperience: z.number().min(0, "Years of experience must be non-negative"),
  candidateName: z.string().min(1, "Candidate name is required"),
  candidateEmail: z.string().email("Valid email is required"),
  interviewDate: z.string().min(1, "Interview date is required"),
  interviewTime: z.string().min(1, "Interview time is required"),
  resumeText: z.string().optional(),
  campaignId: z.string().optional(),
  questionBank: z.string().optional(),
  useQuestionBank: z.boolean().optional(),
  numberOfQuestions: z.number().optional(),
  difficultyLevel: z.string().optional(),
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
            eq(Interview.createdBy, userId)
          )
        )
        .limit(1);

      if (interview.length === 0) {
        return NextResponse.json({ error: "Interview not found" }, { status: 404 });
      }

      return NextResponse.json(interview[0]);
    }

    // Get all behavioral interviews for the user
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
      .where(eq(Interview.createdBy, userId))
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

    return NextResponse.json(transformedInterviews);
  } catch (error) {
    console.error("Error fetching behavioral interviews:", error);
    return NextResponse.json(
      { error: "Internal server error" },
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

    // Verify user exists in database
    const userExists = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (userExists.length === 0) {
      console.error(`User not found in database: ${session.user.id}`);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createBehavioralInterviewSchema.parse(body);

    // Generate unique interview ID
    const interviewId = uuidv4();

    // Generate simple direct interview link without token
    const interviewLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/candidate/interview/${interviewId}/lobby?email=${encodeURIComponent(validatedData.candidateEmail)}`;

    // Calculate link expiry time (24 hours after interview)
    const interviewDateTime = moment(`${validatedData.interviewDate} ${validatedData.interviewTime}`);
    const linkExpiryTime = interviewDateTime.add(24, 'hours').toDate();

    let interviewQuestions;

    // Check if we should use question bank or AI generation
    if (validatedData.useQuestionBank && (validatedData.questionBank || validatedData.campaignId)) {
      // Use question bank
      const numberOfQuestions = validatedData.numberOfQuestions || 5;
      
      try {
        // Get questions from question bank
        const questionsResult = await getQuestions({
          companyId: session.user.companyId!,
          collectionId: validatedData.questionBank,
          questionType: 'behavioral',
          difficultyLevel: validatedData.difficultyLevel
        });

        if (questionsResult.success && questionsResult.data && questionsResult.data.length > 0) {
          // Shuffle and select the required number of questions
          const availableQuestions = questionsResult.data;
          const shuffled = [...availableQuestions].sort(() => 0.5 - Math.random());
          const selectedQuestions = shuffled.slice(0, numberOfQuestions);
          
          // Transform to interview format
          interviewQuestions = selectedQuestions.map((q, index) => ({
            id: index + 1,
            question: q.question,
            type: 'behavioral',
            category: q.category,
            difficulty: q.difficultyLevel,
            expectedAnswer: q.expectedAnswer,
            sampleAnswer: q.sampleAnswer,
            scoringRubric: q.scoringRubric,
            skills: q.skills,
            competencies: q.competencies,
            timeToAnswer: q.timeToAnswer
          }));

          console.log(`Using question bank for campaign ${validatedData.campaignId}: ${selectedQuestions.length} questions retrieved`);
        } else {
          // Fallback to AI if no questions found in bank
          console.log(`No questions found in question bank, falling back to AI generation`);
          throw new Error('No questions found in question bank');
        }
      } catch (error) {
        console.error('Error retrieving questions from bank:', error);
        // Fallback to AI generation while maintaining campaign context
        console.log(`Falling back to AI generation for campaign ${validatedData.campaignId} due to question bank error`);
        console.log(`Campaign context maintained: ${validatedData.jobPosition} - ${validatedData.jobDescription}`);
        validatedData.useQuestionBank = false;
      }
    }
    
    if (!validatedData.useQuestionBank) {
      // Generate behavioral questions using AI
      const questionsFormData = new FormData();
      questionsFormData.append('jobPosition', validatedData.jobPosition);
      questionsFormData.append('jobDescription', validatedData.jobDescription);
      questionsFormData.append('yearsOfExperience', validatedData.yearsOfExperience.toString());
      if (validatedData.resumeText) {
        questionsFormData.append('resumeText', validatedData.resumeText);
      }

      // Use localhost in development, production URL in production
      const baseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : process.env.NEXTAUTH_URL;
      const questionsResponse = await fetch(`${baseUrl}/api/ai/generate-behavioral`, {
        method: 'POST',
        body: questionsFormData,
      });

      if (!questionsResponse.ok) {
        const errorText = await questionsResponse.text();
        console.error('Failed to generate behavioral questions:', errorText);
        return NextResponse.json(
          { 
            error: "Failed to generate interview questions", 
            message: "AI service is currently unavailable. Please try again later.",
            details: "Behavioral question generation failed"
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
      console.log('Generated behavioral questions using AI');
    }

    // Save interview to database
    await db.insert(Interview).values({
      interviewId,
      interviewQuestions: JSON.stringify(interviewQuestions),
      jobPosition: validatedData.jobPosition,
      jobDescription: validatedData.jobDescription,
      jobExperience: validatedData.yearsOfExperience.toString(),
      candidateName: validatedData.candidateName,
      candidateEmail: validatedData.candidateEmail,
      interviewDate: validatedData.interviewDate,
      interviewTime: validatedData.interviewTime,
      interviewType: 'behavioral',
      createdBy: session.user.id,
      linkExpiryTime,
      interviewLink,
      companyId: session.user.companyId!,
    });

    // Create analytics record
    if (session.user.email) {
      await createAnalyticsRecord({
        interviewId,
        interviewType: 'behavioral',
        candidateName: validatedData.candidateName,
        candidateEmail: validatedData.candidateEmail,
        interviewerEmail: session.user.email,
        scheduledTime: new Date(`${validatedData.interviewDate}T${validatedData.interviewTime}`),
      });
    }

    // Removed auto-registration logic
    let isNewCandidate = false;

    // Send interview invitation email
    // Use localhost in development, production URL in production
    const emailBaseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : process.env.NEXTAUTH_URL;
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
        interviewType: 'behavioral',
        additionalInfo: 'This is a behavioral interview focusing on your experiences and soft skills.',
        isNewCandidate: isNewCandidate,
      }),
    });

    if (!emailResponse.ok) {
      console.error('Failed to send interview invitation email');
      // Don't fail the entire process if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Behavioral interview created successfully',
      interviewId,
      interviewLink,
    });
  } catch (error) {
    console.error('Error creating behavioral interview:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      interviewId,
      jobPosition,
      jobDescription,
      jobExperience,
      candidateName,
      candidateEmail,
      interviewDate,
      interviewTime,
      interviewType
    } = body;
    const userId = session.user.id;

    if (!interviewId) {
      return NextResponse.json({ error: "Interview ID is required" }, { status: 400 });
    }

    // Check if interview exists and belongs to user
    const existingInterview = await db
      .select()
      .from(Interview)
      .where(
        and(
          eq(Interview.interviewId, interviewId),
          eq(Interview.createdBy, userId)
        )
      )
      .limit(1);

    if (existingInterview.length === 0) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    // Update the interview
    await db
      .update(Interview)
      .set({
        jobPosition,
        jobDescription,
        jobExperience,
        candidateName,
        candidateEmail,
        interviewDate,
        interviewTime,
        interviewType: interviewType || 'behavioral',
        updatedAt: new Date()
      })
      .where(
        and(
          eq(Interview.interviewId, interviewId),
          eq(Interview.createdBy, userId)
        )
      );

    return NextResponse.json({ success: true, message: "Interview updated successfully" });
  } catch (error) {
    console.error("Error updating behavioral interview:", error);
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
    const interviewId = searchParams.get("interviewId");
    const userId = session.user.id;

    if (!interviewId) {
      return NextResponse.json({ error: "Interview ID is required" }, { status: 400 });
    }

    // Delete the interview
    const result = await db
      .delete(Interview)
      .where(
        and(
          eq(Interview.interviewId, interviewId),
          eq(Interview.createdBy, userId)
        )
      );

    return NextResponse.json({ success: true, message: "Interview deleted successfully" });
  } catch (error) {
    console.error("Error deleting behavioral interview:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}