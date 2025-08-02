import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';
import { Interview } from '@/lib/database/schema';
import { auth } from '@/auth';
import { desc, eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import moment from 'moment';
import { createAnalyticsRecord } from '@/lib/services/analytics';
// Removed auto-registration import
import { getQuestions } from '@/lib/database/queries/campaigns';

// Schema for creating combo interviews
const createComboInterviewSchema = z.object({
  jobPosition: z.string().min(1, "Job position is required"),
  jobDescription: z.string().min(1, "Job description is required"),
  yearsOfExperience: z.number().min(0, "Years of experience must be non-negative"),
  candidateName: z.string().min(1, "Candidate name is required"),
  candidateEmail: z.string().email("Valid email is required"),
  interviewDate: z.string().min(1, "Interview date is required"),
  interviewTime: z.string().min(1, "Interview time is required"),
  totalQuestions: z.number().min(1, "Total questions must be at least 1"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  resumeText: z.string().optional(),
  campaignId: z.string().optional(),
  questionBank: z.string().optional(),
  useQuestionBank: z.boolean().optional(),
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
            eq(Interview.createdBy, userId),
            eq(Interview.interviewType, 'combo')
          )
        )
        .limit(1);

      if (interview.length === 0) {
        return NextResponse.json({ error: "Combo interview not found" }, { status: 404 });
      }

      return NextResponse.json(interview[0]);
    }

    // Get all combo interviews for the user
    const interviews = await db
      .select()
      .from(Interview)
      .where(
        and(
          eq(Interview.createdBy, userId),
          eq(Interview.interviewType, 'combo')
        )
      )
      .orderBy(desc(Interview.createdAt));

    return NextResponse.json(interviews);
  } catch (error) {
    console.error("Error fetching combo interviews:", error);
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

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createComboInterviewSchema.parse(body);

    // Generate unique interview ID
    const interviewId = uuidv4();

    // Generate simple direct interview link without token
    const interviewLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/candidate/interview/${interviewId}/lobby?email=${encodeURIComponent(validatedData.candidateEmail)}`;

    // Calculate link expiry time (3 hours after interview start)
    const interviewDateTime = moment(`${validatedData.interviewDate} ${validatedData.interviewTime}`);
    const linkExpiryTime = interviewDateTime.add(3, 'hours').toDate();

    let interviewQuestions;

    // Check if we should use question bank or AI generation
    if (validatedData.useQuestionBank && (validatedData.questionBank || validatedData.campaignId)) {
      // Use question bank - for combo, get a mix of different question types
      const totalQuestions = validatedData.totalQuestions;
      
      try {
        // Get mixed questions from question bank (behavioral, mcq, and coding)
        const [behavioralResult, mcqResult] = await Promise.all([
          getQuestions({
            companyId: session.user.companyId!,
            questionBankId: validatedData.questionBank,
            questionType: 'behavioral',
            difficultyLevel: validatedData.difficultyLevel || validatedData.difficulty
          }),
          getQuestions({
            companyId: session.user.companyId!,
            questionBankId: validatedData.questionBank,
            questionType: 'mcq',
            difficultyLevel: validatedData.difficultyLevel || validatedData.difficulty
          })
        ]);

        const allQuestions = [];
        
        // Add behavioral questions
        if (behavioralResult.success && behavioralResult.data) {
          allQuestions.push(...behavioralResult.data);
        }
        
        // Add MCQ questions
        if (mcqResult.success && mcqResult.data) {
          allQuestions.push(...mcqResult.data);
        }

        if (allQuestions.length > 0) {
          // Shuffle and select the required number of questions
          const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
          const selectedQuestions = shuffled.slice(0, totalQuestions);
          
          // Transform to interview format
          interviewQuestions = selectedQuestions.map((q, index) => ({
            id: index + 1,
            question: q.question,
            type: q.questionType,
            category: q.category,
            difficulty: q.difficultyLevel,
            ...(q.questionType === 'mcq' && {
              options: q.multipleChoiceOptions,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation
            }),
            ...(q.questionType === 'behavioral' && {
              expectedAnswer: q.expectedAnswer,
              sampleAnswer: q.sampleAnswer,
              scoringRubric: q.scoringRubric
            }),
            skills: q.skills,
            competencies: q.competencies,
            timeToAnswer: q.timeToAnswer
          }));

          console.log(`Using question bank for campaign ${validatedData.campaignId}: ${selectedQuestions.length} combo questions retrieved`);
        } else {
          // Fallback to AI if no questions found in bank
          console.log(`No combo questions found in question bank, falling back to AI generation`);
          throw new Error('No combo questions found in question bank');
        }
      } catch (error) {
        console.error('Error retrieving combo questions from bank:', error);
        // Fallback to AI generation while maintaining campaign context
        console.log(`Falling back to AI generation for campaign ${validatedData.campaignId} due to question bank error`);
        console.log(`Campaign context maintained: ${validatedData.jobPosition} - ${validatedData.jobDescription}`);
        validatedData.useQuestionBank = false;
      }
    }
    
    if (!validatedData.useQuestionBank) {
      // Generate combo questions using AI
      const questionsFormData = new FormData();
      questionsFormData.append('jobPosition', validatedData.jobPosition);
      questionsFormData.append('jobDescription', validatedData.jobDescription);
      questionsFormData.append('yearsOfExperience', validatedData.yearsOfExperience.toString());
      questionsFormData.append('totalQuestions', validatedData.totalQuestions.toString());
      questionsFormData.append('difficulty', validatedData.difficulty);
      if (validatedData.resumeText) {
        questionsFormData.append('resumeText', validatedData.resumeText);
      }

      // Use localhost in development, production URL in production
      const baseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : process.env.NEXTAUTH_URL;
      const questionsResponse = await fetch(`${baseUrl}/api/ai/generate-combo`, {
        method: 'POST',
        body: questionsFormData,
      });

      if (!questionsResponse.ok) {
        const errorText = await questionsResponse.text();
        console.error('Failed to generate combo questions:', errorText);
        return NextResponse.json(
          { 
            error: "Failed to generate interview questions", 
            message: "AI service is currently unavailable. Please try again later.",
            details: "Combo question generation failed"
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
      console.log('Generated combo questions using AI');
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
      interviewType: 'combo',
      createdBy: session.user.id,
      linkExpiryTime,
      interviewLink,
      companyId: session.user.companyId!,
    });

    // Create analytics record
    if (session.user.email) {
      await createAnalyticsRecord({
        interviewId,
        interviewType: 'combo',
        candidateName: validatedData.candidateName,
        candidateEmail: validatedData.candidateEmail,
        interviewerEmail: session.user.email,
        scheduledTime: new Date(`${validatedData.interviewDate}T${validatedData.interviewTime}`),
      });
    }

    // Set default for new candidate flag
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
        interviewType: 'combo',
        additionalInfo: `This is a comprehensive combo interview with ${validatedData.totalQuestions} questions at ${validatedData.difficulty} difficulty level, combining behavioral, MCQ, and coding questions.`,
        isNewCandidate: isNewCandidate,
      }),
    });

    if (!emailResponse.ok) {
      console.error('Failed to send interview invitation email');
      // Don't fail the entire process if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Combo interview created successfully',
      interviewId,
      interviewLink,
    });
  } catch (error) {
    console.error('Error creating combo interview:', error);
    
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

    const { searchParams } = new URL(request.url);
    const interviewId = searchParams.get("interviewId");
    const body = await request.json();
    const validatedData = createComboInterviewSchema.parse(body);
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
          eq(Interview.createdBy, userId),
          eq(Interview.interviewType, 'combo')
        )
      )
      .limit(1);

    if (existingInterview.length === 0) {
      return NextResponse.json({ error: "Combo interview not found" }, { status: 404 });
    }

    // Calculate link expiry time (3 hours after interview start)
    const interviewDateTime = moment(`${validatedData.interviewDate} ${validatedData.interviewTime}`);
    const linkExpiryTime = interviewDateTime.add(3, 'hours').toDate();

    // Update the interview
    await db
      .update(Interview)
      .set({
        jobPosition: validatedData.jobPosition,
        jobDescription: validatedData.jobDescription,
        jobExperience: validatedData.yearsOfExperience.toString(),
        candidateName: validatedData.candidateName,
        candidateEmail: validatedData.candidateEmail,
        interviewDate: validatedData.interviewDate,
        interviewTime: validatedData.interviewTime,
        linkExpiryTime,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(Interview.interviewId, interviewId),
          eq(Interview.createdBy, userId)
        )
      );

    return NextResponse.json({ success: true, message: "Combo interview updated successfully" });
  } catch (error) {
    console.error("Error updating combo interview:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
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
    await db
      .delete(Interview)
      .where(
        and(
          eq(Interview.interviewId, interviewId),
          eq(Interview.createdBy, userId),
          eq(Interview.interviewType, 'combo')
        )
      );

    return NextResponse.json({ success: true, message: "Combo interview deleted successfully" });
  } catch (error) {
    console.error("Error deleting combo interview:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}