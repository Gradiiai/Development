import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';
import { CodingInterview } from '@/lib/database/schema';
import { auth } from '@/auth';
import { desc, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import moment from 'moment';
import { createAnalyticsRecord } from '@/lib/services/analytics';
import { getQuestions } from '@/lib/database/queries/campaigns';

// Schema for creating coding interviews
const createCodingInterviewSchema = z.object({
  interviewTopic: z.string().min(1),
  difficultyLevel: z.string().min(1),
  problemDescription: z.string().min(1),
  timeLimit: z.number().min(15).max(180),
  programmingLanguage: z.string().min(1),
  candidateName: z.string().min(1),
  candidateEmail: z.string().email(),
  interviewDate: z.string().min(1),
  interviewTime: z.string().min(1),
  campaignId: z.string().optional(),
  questionBank: z.string().optional(),
  useQuestionBank: z.boolean().optional(),
  numberOfQuestions: z.number().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const interviewId = searchParams.get('interviewId');

    if (interviewId) {
      // Get specific coding interview
      const interview = await db
        .select()
        .from(CodingInterview)
        .where(eq(CodingInterview.interviewId, interviewId))
        .limit(1);

      if (interview.length === 0) {
        return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: interview[0] });
    }

    // Get all coding interviews for the user
    const interviews = await db
      .select()
      .from(CodingInterview)
      .where(eq(CodingInterview.createdBy, session.user.id))
      .orderBy(desc(CodingInterview.id));

    return NextResponse.json({ success: true, data: interviews });
  } catch (error) {
    console.error('Error fetching coding interviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coding interviews' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createCodingInterviewSchema.parse(body);

    let codingQuestions;

    // Check if we should use question bank or AI generation
    if (validatedData.useQuestionBank && (validatedData.questionBank || validatedData.campaignId)) {
      // Use question bank
      const numberOfQuestions = validatedData.numberOfQuestions || 3;
      
      try {
        // Get coding questions from question bank
        const questionsResult = await getQuestions({
          companyId: session.user.companyId!,
          collectionId: validatedData.questionBank,
          questionType: 'coding',
          difficultyLevel: validatedData.difficultyLevel
        });

        if (questionsResult.success && questionsResult.data && questionsResult.data.length > 0) {
          // Shuffle and select the required number of questions
          const availableQuestions = questionsResult.data;
          const shuffled = [...availableQuestions].sort(() => 0.5 - Math.random());
          const selectedQuestions = shuffled.slice(0, numberOfQuestions);
          
          // Transform to coding interview format
          codingQuestions = selectedQuestions.map((q, index) => ({
            id: index + 1,
            question: q.question,
            type: 'coding',
            category: q.category,
            difficulty: q.difficultyLevel,
            expectedAnswer: q.expectedAnswer,
            sampleAnswer: q.sampleAnswer,
            scoringRubric: q.scoringRubric,
            skills: q.skills,
            competencies: q.competencies,
            timeToAnswer: q.timeToAnswer
          }));

          console.log(`Using question bank for campaign ${validatedData.campaignId}: ${selectedQuestions.length} coding questions retrieved`);
        } else {
          // Fallback to AI if no questions found in bank
          console.log(`No coding questions found in question bank, falling back to AI generation`);
          throw new Error('No coding questions found in question bank');
        }
      } catch (error) {
        console.error('Error retrieving coding questions from bank:', error);
        // Fallback to AI generation while maintaining campaign context
        console.log(`Falling back to AI generation for campaign ${validatedData.campaignId} due to question bank error`);
        console.log(`Campaign context maintained: ${validatedData.interviewTopic} - ${validatedData.problemDescription}`);
        validatedData.useQuestionBank = false;
      }
    }
    
    if (!validatedData.useQuestionBank) {
      // Generate coding questions using the AI API
      const formData = new FormData();
      formData.append('topic', validatedData.interviewTopic);
      formData.append('totalQuestions', (validatedData.numberOfQuestions || 3).toString());
      formData.append('difficulty', validatedData.difficultyLevel);

      // Use localhost in development, production URL in production
      const baseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : process.env.NEXTAUTH_URL;
      const questionsResponse = await fetch(`${baseUrl}/api/ai/generate-coding`, {
        method: 'POST',
        body: formData,
      });

      if (!questionsResponse.ok) {
        const errorText = await questionsResponse.text();
        console.error('Failed to generate coding questions:', errorText);
        return NextResponse.json(
          { 
            error: "Failed to generate interview questions", 
            message: "AI service is currently unavailable. Please try again later.",
            details: "Coding question generation failed"
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
      
      codingQuestions = questionsResult.questions;
      console.log('Generated coding questions using AI');
    }

    // Use the questions we prepared (either from question bank or AI)
    const generatedQuestions = codingQuestions;

    // Generate a unique ID for the interview
    const interviewId = uuidv4();
    
    // Generate simple interview link (authentication handled by candidate dashboard)
    const baseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : process.env.NEXTAUTH_URL;
    const interviewLink = `${baseUrl}/candidate/interview/${interviewId}/lobby?email=${encodeURIComponent(validatedData.candidateEmail)}`;
    
    // Calculate link expiry time (24 hours after the interview date and time)
    const interviewDateTime = moment(`${validatedData.interviewDate} ${validatedData.interviewTime}`);
    const linkExpiryTime = interviewDateTime.add(24, 'hours').toDate();

    // Save to database
    const dbResult = await db
      .insert(CodingInterview)
      .values({
        interviewId: interviewId,
        codingQuestions: JSON.stringify(generatedQuestions),
        interviewTopic: validatedData.interviewTopic.trim(),
        difficultyLevel: validatedData.difficultyLevel,
        problemDescription: validatedData.problemDescription.trim(),
        timeLimit: validatedData.timeLimit,
        programmingLanguage: validatedData.programmingLanguage,
        candidateName: validatedData.candidateName,
        candidateEmail: validatedData.candidateEmail,
        interviewDate: validatedData.interviewDate,
        interviewTime: validatedData.interviewTime,
        interviewStatus: "scheduled",
        interviewLink: interviewLink,
        linkExpiryTime: linkExpiryTime,
        createdBy: session.user.id,
        companyId: session.user.companyId || "00000000-0000-0000-0000-000000000000",
      })
      .returning({ insertedId: CodingInterview.interviewId });

    // Create analytics record
    try {
      const interviewDateTimeForAnalytics = moment(`${validatedData.interviewDate}T${validatedData.interviewTime}`).toDate();
      await createAnalyticsRecord({
        interviewId: interviewId,
        interviewType: "coding",
        candidateName: validatedData.candidateName,
        candidateEmail: validatedData.candidateEmail,
        interviewerEmail: session.user.id,
        scheduledTime: interviewDateTimeForAnalytics,
      });
    } catch (analyticsError) {
      console.error("Failed to create analytics record:", analyticsError);
      // Don't fail the interview creation if analytics fails
    }

    // Set default for new candidate flag
    let isNewCandidate = false;

    // Send coding interview invitation email
    try {
              // Use localhost in development, production URL in production
    const emailBaseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : process.env.NEXTAUTH_URL;
    const emailResponse = await fetch(`${emailBaseUrl}/api/interviews/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Cookie': request.headers.get('cookie') || '',
        },
        body: JSON.stringify({
          candidateName: validatedData.candidateName,
          candidateEmail: validatedData.candidateEmail,
          jobPosition: `${validatedData.interviewTopic} - Coding Interview`,
          interviewDate: validatedData.interviewDate,
          interviewTime: validatedData.interviewTime,
          interviewLink: interviewLink,
          companyName: "Gradii",
          interviewMode: "Online Coding Platform",
          interviewType: "coding",
          additionalInfo: `Difficulty: ${validatedData.difficultyLevel} | Language: ${validatedData.programmingLanguage} | Duration: ${validatedData.timeLimit} minutes`,
          isNewCandidate: isNewCandidate,
        }),
      });

      if (!emailResponse.ok) {
        console.error("Failed to send coding interview email:", {
          status: emailResponse.status,
          statusText: emailResponse.statusText
        });
        try {
          const errorData = await emailResponse.text();
          console.error("Email response body:", errorData);
        } catch (parseError) {
          console.error("Could not read email error response:", parseError);
        }
      } else {
        try {
          const result = await emailResponse.json();
          console.log("Email sent successfully:", result);
        } catch (parseError) {
          console.error("Could not parse email success response:", parseError);
        }
      }
    } catch (emailError) {
      console.error("Error sending coding interview email:", emailError);
    }

    return NextResponse.json({
      success: true,
      data: {
        interviewId: dbResult[0].insertedId,
        interviewLink: interviewLink,
      },
    });
  } catch (error) {
    console.error('Error creating coding interview:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create coding interview' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const interviewId = searchParams.get('interviewId');

    if (!interviewId) {
      return NextResponse.json({ error: 'Interview ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = createCodingInterviewSchema.parse(body);

    // Verify the interview belongs to the user
    const existingInterview = await db
      .select()
      .from(CodingInterview)
      .where(eq(CodingInterview.interviewId, interviewId))
      .limit(1);

    if (existingInterview.length === 0) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    if (existingInterview[0].createdBy !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Generate coding questions using the AI API
    const formData = new FormData();
    formData.append('topic', validatedData.interviewTopic);
    formData.append('totalQuestions', '3'); // Default to 3 coding questions
    formData.append('difficulty', validatedData.difficultyLevel);

    // Use localhost in development, production URL in production
    const baseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : process.env.NEXTAUTH_URL;
    const questionsResponse = await fetch(`${baseUrl}/api/ai/generate-coding`, {
      method: 'POST',
      body: formData,
    });

    if (!questionsResponse.ok) {
      const errorText = await questionsResponse.text();
      console.error('Failed to generate coding questions:', errorText);
      return NextResponse.json(
        { 
          error: "Failed to generate interview questions", 
          message: "AI service is currently unavailable. Please try again later.",
          details: "Coding question generation failed"
        },
        { status: 503 }
      );
    }

    // Handle streaming response
    const reader = questionsResponse.body?.getReader();
    let result = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += new TextDecoder().decode(value);
      }
    }

    // Parse and clean the response
    const cleanJsonQuestion = result
      .replace(/```json\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();

    let generatedQuestions;
    try {
      generatedQuestions = JSON.parse(cleanJsonQuestion);
      
      if (!Array.isArray(generatedQuestions)) {
        throw new Error('Questions must be an array');
      }
    } catch (parseError) {
      console.error('Failed to parse coding questions:', parseError);
      return NextResponse.json(
        { 
          error: "Invalid questions format", 
          message: "AI service returned invalid data. Please try again later."
        },
        { status: 503 }
      );
    }

    // Calculate link expiry time (24 hours after the interview date and time)
    const interviewDateTime = moment(`${validatedData.interviewDate} ${validatedData.interviewTime}`);
    const linkExpiryTime = interviewDateTime.add(24, 'hours').toDate();

    // Update the interview
    await db
      .update(CodingInterview)
      .set({
        codingQuestions: JSON.stringify(generatedQuestions),
        interviewTopic: validatedData.interviewTopic.trim(),
        difficultyLevel: validatedData.difficultyLevel,
        problemDescription: validatedData.problemDescription.trim(),
        timeLimit: validatedData.timeLimit,
        programmingLanguage: validatedData.programmingLanguage,
        candidateName: validatedData.candidateName,
        candidateEmail: validatedData.candidateEmail,
        interviewDate: validatedData.interviewDate,
        interviewTime: validatedData.interviewTime,
        linkExpiryTime: linkExpiryTime,
        updatedAt: new Date(),
      })
      .where(eq(CodingInterview.interviewId, interviewId));

    return NextResponse.json({
      success: true,
      message: 'Interview updated successfully',
    });
  } catch (error) {
    console.error('Error updating coding interview:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update coding interview' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const interviewId = searchParams.get('interviewId');

    if (!interviewId) {
      return NextResponse.json({ error: 'Interview ID is required' }, { status: 400 });
    }

    // Verify the interview belongs to the user
    const interview = await db
      .select()
      .from(CodingInterview)
      .where(eq(CodingInterview.interviewId, interviewId))
      .limit(1);

    if (interview.length === 0) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    if (interview[0].createdBy !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete the interview
    await db
      .delete(CodingInterview)
      .where(eq(CodingInterview.interviewId, interviewId));

    return NextResponse.json({ success: true, message: 'Interview deleted successfully' });
  } catch (error) {
    console.error('Error deleting coding interview:', error);
    return NextResponse.json(
      { error: 'Failed to delete coding interview' },
      { status: 500 }
    );
  }
}