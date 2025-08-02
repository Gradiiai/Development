import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';
import { Interview } from '@/lib/database/schema';
// Unified interviews table removed - you only use Direct and Campaign interviews
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get('video') as File;
    const interviewId = formData.get('interviewId') as string;
    const candidateEmail = formData.get('candidateEmail') as string;
    const interviewType = formData.get('interviewType') as string;

    if (!videoFile || !interviewId || !candidateEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: video, interviewId, candidateEmail' },
        { status: 400 }
      );
    }

    // Convert video to buffer
    const buffer = Buffer.from(await videoFile.arrayBuffer());
    const videoSize = buffer.length;
    
    console.log(`Processing video upload:`, {
      interviewId,
      candidateEmail,
      interviewType,
      videoSize: `${(videoSize / 1024 / 1024).toFixed(2)}MB`,
      fileName: videoFile.name
    });

    // For now, we'll store video metadata in the database
    // In production, you'd upload to cloud storage (AWS S3, Azure Blob, etc.)
    const videoMetadata = {
      fileName: videoFile.name,
      fileSize: videoSize,
      mimeType: videoFile.type,
      uploadedAt: new Date().toISOString(),
      candidateEmail,
      interviewType
    };

    // Update the interview record with video metadata
    try {
      // Try updating the Interview table (Direct interviews)
      const existingInterview = await db
        .select()
        .from(Interview)
        .where(eq(Interview.interviewId, interviewId))
        .limit(1);

      if (existingInterview.length > 0) {
        // Store video metadata in fileData field as JSON
        await db
          .update(Interview)
          .set({ 
            fileData: JSON.stringify(videoMetadata),
            updatedAt: new Date()
          })
          .where(eq(Interview.interviewId, interviewId));
      }

      console.log('Video metadata saved to database');

      // TODO: In production, upload the actual video file to cloud storage
      // Example for AWS S3:
      // const uploadResult = await uploadToS3(buffer, `interviews/${interviewId}/recording.webm`);
      // const videoUrl = uploadResult.Location;

      return NextResponse.json({
        success: true,
        message: 'Video upload successful',
        metadata: videoMetadata
      });

    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save video metadata' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Video upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process video upload' },
      { status: 500 }
    );
  }
} 