import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { db } from '@/lib/database/db';
import { interviewRecordings } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';

// GET - Fetch recordings for a candidate
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const interviewId = searchParams.get('interviewId');
    const candidateId = session.user.id;

    let recordings;
    if (interviewId) {
      recordings = await db
        .select()
        .from(interviewRecordings)
        .where(
          and(
            eq(interviewRecordings.candidateId, candidateId),
            eq(interviewRecordings.interviewId, interviewId)
          )
        );
    } else {
      recordings = await db
        .select()
        .from(interviewRecordings)
        .where(eq(interviewRecordings.candidateId, candidateId));
    }

    return NextResponse.json({ recordings });
  } catch (error) {
    console.error('Error fetching recordings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recordings' },
      { status: 500 }
    );
  }
}

// POST - Save recording metadata
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      interviewId,
      questionId,
      questionIndex,
      azureUrl,
      duration,
      fileSize,
      recordingType = 'video'
    } = body;

    if (!azureUrl) {
      return NextResponse.json(
        { error: 'Azure URL is required' },
        { status: 400 }
      );
    }

    const recording = await db
      .insert(interviewRecordings)
      .values({
        candidateId: session.user.id,
        interviewId: interviewId || null,
        questionId: questionId || null,
        questionIndex: questionIndex || null,
        azureUrl,
        duration: duration || null,
        fileSize: fileSize || null,
        recordingType,
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    return NextResponse.json({ 
      success: true, 
      recording: recording[0] 
    });
  } catch (error) {
    console.error('Error saving recording metadata:', error);
    return NextResponse.json(
      { error: 'Failed to save recording metadata' },
      { status: 500 }
    );
  }
}

// DELETE - Delete recording
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const recordingId = searchParams.get('id');

    if (!recordingId) {
      return NextResponse.json(
        { error: 'Recording ID is required' },
        { status: 400 }
      );
    }

    // First get the recording to check ownership and get Azure URL
    const recording = await db
      .select()
      .from(interviewRecordings)
      .where(
        and(
          eq(interviewRecordings.id, recordingId),
          eq(interviewRecordings.candidateId, session.user.id)
        )
      )
      .limit(1);

    if (recording.length === 0) {
      return NextResponse.json(
        { error: 'Recording not found' },
        { status: 404 }
      );
    }

    // TODO: Delete from Azure Storage
    // const azureUrl = recording[0].azureUrl;
    // await azureStorageService.deleteRecording(extractBlobNameFromUrl(azureUrl));

    // Delete from database
    await db
      .delete(interviewRecordings)
      .where(
        and(
          eq(interviewRecordings.id, recordingId),
          eq(interviewRecordings.candidateId, session.user.id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting recording:', error);
    return NextResponse.json(
      { error: 'Failed to delete recording' },
      { status: 500 }
    );
  }
}