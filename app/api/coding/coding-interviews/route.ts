import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';
import { CodingInterview } from '@/lib/database/schema';
import { getServerSessionWithAuth } from '@/auth';
import { desc, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import moment from 'moment';
import { createAnalyticsRecord } from '@/lib/services/analytics';

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
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
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
    const session = await getServerSessionWithAuth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createCodingInterviewSchema.parse(body);

    // Generate coding questions using the AI API
    const formData = new FormData();
    formData.append('topic', validatedData.interviewTopic);
    formData.append('totalQuestions', '3'); // Default to 3 coding questions
    formData.append('difficulty', validatedData.difficultyLevel);

    const questionsResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/ai/generate-coding`, {
      method: 'POST',
      body: formData,
    });

    if (!questionsResponse.ok) {
      throw new Error('Failed to generate coding questions');
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

    const generatedQuestions = JSON.parse(cleanJsonQuestion);

    // Generate a unique ID for the interview
    const interviewId = uuidv4();
    
    // Generate simple direct interview link without token
    const interviewLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/candidate/interview/${interviewId}/lobby?email=${encodeURIComponent(validatedData.candidateEmail)}`;
    
    // Calculate link expiry time (3 hours after the interview date and time)
    const interviewDateTime = moment(`${validatedData.interviewDate} ${validatedData.interviewTime}`);
    const linkExpiryTime = interviewDateTime.add(3, 'hours').toDate();

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

    // Send coding interview invitation email
    try {
      const emailResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/interviews/send-email`, {
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
        }),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json();
        console.error("Failed to send coding interview email:", errorData);
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
    const session = await getServerSessionWithAuth();
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

    const questionsResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/ai/generate-coding`, {
      method: 'POST',
      body: formData,
    });

    if (!questionsResponse.ok) {
      throw new Error('Failed to generate coding questions');
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

    const generatedQuestions = JSON.parse(cleanJsonQuestion);

    // Calculate link expiry time (3 hours after the interview date and time)
    const interviewDateTime = moment(`${validatedData.interviewDate} ${validatedData.interviewTime}`);
    const linkExpiryTime = interviewDateTime.add(3, 'hours').toDate();

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
    const session = await getServerSessionWithAuth();
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