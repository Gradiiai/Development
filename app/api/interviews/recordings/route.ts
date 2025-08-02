import { NextRequest, NextResponse } from 'next/server';
import { azureStorageService } from '@/lib/integrations/storage/azure';
import { db } from '@/lib/database/connection';
// UserAnswer import removed - migrated to candidateInterviewHistory
import { eq, and, desc, sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { 
  Interview,
  CodingInterview,
  candidateInterviewHistory
} from '@/lib/database/schema';

// POST - Upload interview recording
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const recordingFile = formData.get('recording') as File;
    const interviewId = formData.get('interviewId') as string;
    const questionIndex = formData.get('questionIndex') as string;
    const recordingType = formData.get('recordingType') as string; // 'video' or 'audio'

    if (!recordingFile) {
      return NextResponse.json({ error: 'No recording file provided' }, { status: 400 });
    }

    if (!interviewId) {
      return NextResponse.json({ error: 'Interview ID is required' }, { status: 400 });
    }

    // Verify interview exists and user has access
    const interview = await db
      .select()
      .from(Interview)
      .where(eq(Interview.interviewId, interviewId))
      .limit(1);

    if (!interview || interview.length === 0) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileExtension = recordingFile.name.split('.').pop() || 'webm';
    const fileName = questionIndex 
      ? `${recordingType}-question-${questionIndex}-${timestamp}.${fileExtension}`
      : `${recordingType}-${timestamp}.${fileExtension}`;

    let uploadUrl: string;

    try {
      // Upload based on recording type
      if (recordingType === 'audio') {
        uploadUrl = await azureStorageService.uploadAudioRecording(
          recordingFile,
          fileName,
          interviewId,
          questionIndex ? parseInt(questionIndex) : undefined
        );
      } else {
        uploadUrl = await azureStorageService.uploadRecording(
          recordingFile,
          fileName,
          interviewId
        );
      }

      // Update user answer with recording URL if questionIndex is provided
      if (questionIndex) {
        try {
          const questionIndexNum = parseInt(questionIndex);
          
          // Find the user answer for this question
          const userAnswers = await db
            .select()
            .from(candidateInterviewHistory)
            .where(
              and(
                eq(candidateInterviewHistory.interviewId, interviewId),
                eq(candidateInterviewHistory.candidateId, session.user.id ?? '')
              )
            );

          if (userAnswers && userAnswers.length > 0) {
            // For behavioral interviews, we typically have one record with all questions in feedback JSON
            const interviewRecord = userAnswers[0];
            
            if (interviewRecord) {
              const answerId = interviewRecord.id;
              
              // Note: candidateInterviewHistory table doesn't have recordingUrl field
              // Recording URL is stored separately in Azure Blob Storage
              console.log(`Recording uploaded for interview ${interviewId}, question ${questionIndexNum}:`, uploadUrl);
            }
          }
        } catch (updateError) {
          console.error('Error updating user answer with recording URL:', updateError);
          // Don't fail the upload if we can't update the answer
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Recording uploaded successfully',
        data: {
          recordingUrl: uploadUrl,
          fileName,
          interviewId,
          questionIndex,
          recordingType,
          uploadedAt: new Date().toISOString()
        }
      });

    } catch (uploadError) {
      console.error('Error uploading recording to Azure Blob Storage:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload recording to cloud storage' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in interview recording upload:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - List recordings for an interview
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const interviewId = searchParams.get('interviewId');

    if (!interviewId) {
      return NextResponse.json({ error: 'Interview ID is required' }, { status: 400 });
    }

    // Verify interview exists and user has access
    const interview = await db
      .select()
      .from(Interview)
      .where(eq(Interview.interviewId, interviewId))
      .limit(1);

    if (!interview || interview.length === 0) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    try {
      const recordings = await azureStorageService.listInterviewRecordings(interviewId);
      
      const recordingDetails = recordings.map(blobName => {
        const url = azureStorageService.getRecordingUrl(blobName);
        const parts = blobName.split('/');
        const fileName = parts[parts.length - 1];
        
        return {
          blobName,
          fileName,
          url,
          type: blobName.includes('/audio/') ? 'audio' : 'video'
        };
      });

      return NextResponse.json({
        success: true,
        data: {
          interviewId,
          recordings: recordingDetails,
          totalRecordings: recordingDetails.length
        }
      });

    } catch (listError) {
      console.error('Error listing recordings:', listError);
      return NextResponse.json(
        { error: 'Failed to list recordings' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in get interview recordings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a specific recording
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const blobName = searchParams.get('blobName');
    const interviewId = searchParams.get('interviewId');

    if (!blobName || !interviewId) {
      return NextResponse.json({ error: 'Blob name and interview ID are required' }, { status: 400 });
    }

    // Verify interview exists and user has access
    const interview = await db
      .select()
      .from(Interview)
      .where(eq(Interview.interviewId, interviewId))
      .limit(1);

    if (!interview || interview.length === 0) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    try {
      const deleted = await azureStorageService.deleteRecording(blobName);
      
      if (deleted) {
        return NextResponse.json({
          success: true,
          message: 'Recording deleted successfully',
          data: { blobName, interviewId }
        });
      } else {
        return NextResponse.json(
          { error: 'Failed to delete recording' },
          { status: 500 }
        );
      }

    } catch (deleteError) {
      console.error('Error deleting recording:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete recording' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in delete interview recording:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}