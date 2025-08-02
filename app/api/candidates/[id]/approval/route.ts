import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/db';
import { candidateUsers, candidateApplications } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/auth';
import { CandidateNotificationService } from '@/lib/services/notifications/candidateNotifications';



// Enhanced approval workflow with additional actions
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      action, 
      notes, 
      interviewId, 
      campaignId, 
      nextRoundDetails, 
      interviewDate,
      feedbackToCandidate,
      scheduleMeeting,
      meetingDetails,
      priority = 'normal'
    } = await request.json();
    
    const candidateId = resolvedParams.id;

    if (!action || !['approve', 'reject', 'next_round', 'schedule_interview', 'send_feedback', 'request_documents'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    let status: string;
    let notificationStatus: 'approved' | 'rejected' | 'next_round' | 'feedback_sent' | 'documents_requested' | 'interview_scheduled';
    
    // Map new status types to compatible notification types
    let compatibleNotificationStatus: 'approved' | 'rejected' | 'next_round';

    switch (action) {
      case 'approve':
        status = 'approved';
        notificationStatus = 'approved';
        compatibleNotificationStatus = 'approved';
        break;
      case 'reject':
        status = 'rejected';
        notificationStatus = 'rejected';
        compatibleNotificationStatus = 'rejected';
        break;
      case 'next_round':
        status = 'in_progress';
        notificationStatus = 'next_round';
        compatibleNotificationStatus = 'next_round';
        break;
      case 'schedule_interview':
        status = 'interview_scheduled';
        notificationStatus = 'interview_scheduled';
        compatibleNotificationStatus = 'next_round'; // Map to next_round for legacy compatibility
        break;
      case 'send_feedback':
        status = 'feedback_provided';
        notificationStatus = 'feedback_sent';
        compatibleNotificationStatus = 'approved'; // Map to approved for legacy compatibility
        break;
      case 'request_documents':
        status = 'documents_requested';
        notificationStatus = 'documents_requested';
        compatibleNotificationStatus = 'next_round'; // Map to next_round for legacy compatibility
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Get campaign ID if not provided
    let finalCampaignId = campaignId;
    if (!finalCampaignId) {
      // Always get campaignId from candidateApplications table since candidateUsers doesn't have this field
      const [application] = await db
        .select({ campaignId: candidateApplications.campaignId })
        .from(candidateApplications)
        .where(eq(candidateApplications.candidateId, candidateId))
        .limit(1);
      finalCampaignId = application?.campaignId;
    }

    if (!finalCampaignId) {
      return NextResponse.json({ error: 'Campaign ID not found' }, { status: 400 });
    }

    // Update candidateApplications table with enhanced data
    const updateData: any = {
      status,
      recruiterNotes: notes || null,
      rejectionReason: action === 'reject' ? notes : null,
      lastUpdatedAt: new Date(),
    };

    // Add additional data based on action type
    if (action === 'next_round' && nextRoundDetails) {
      updateData.nextRoundDetails = JSON.stringify(nextRoundDetails);
    }
    if (action === 'schedule_interview' && meetingDetails) {
      updateData.interviewDetails = JSON.stringify(meetingDetails);
    }
    if (action === 'send_feedback' && feedbackToCandidate) {
      updateData.candidateFeedback = feedbackToCandidate;
    }

    await db
      .update(candidateApplications)
      .set(updateData)
      .where(
        and(
          eq(candidateApplications.candidateId, candidateId),
          eq(candidateApplications.campaignId, finalCampaignId)
        )
      );

    // Send enhanced notification to candidate
    try {
      const notificationData: any = {
        rejectionReason: action === 'reject' ? notes : undefined,
        nextRoundDetails: action === 'next_round' ? nextRoundDetails : undefined,
        interviewDate: action === 'next_round' && interviewDate ? new Date(interviewDate) : undefined,
        feedbackMessage: action === 'send_feedback' ? feedbackToCandidate : undefined,
        meetingDetails: action === 'schedule_interview' ? meetingDetails : undefined,
        priority,
        actionTakenBy: session.user.name || session.user.email,
        actionTakenAt: new Date().toISOString()
      };

      await CandidateNotificationService.sendStatusNotification(
        candidateId,
        compatibleNotificationStatus,
        finalCampaignId,
        notificationData
      );
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError);
      // Don't fail the main operation if notification fails
    }

    // Generate action summary for response
    const actionMessages = {
      approve: 'Candidate approved for position',
      reject: `Candidate rejected${notes ? ': ' + notes : ''}`,
      next_round: 'Candidate moved to next interview round',
      schedule_interview: 'Interview scheduled with candidate',
      send_feedback: 'Feedback sent to candidate',
      request_documents: 'Additional documents requested from candidate'
    };

    return NextResponse.json({
      message: actionMessages[action as keyof typeof actionMessages],
      status,
      action,
      notificationSent: true,
      timestamp: new Date().toISOString(),
      candidateId,
      campaignId: finalCampaignId
    });

  } catch (error) {
    console.error('Error updating candidate status:', error);
    return NextResponse.json(
      { error: 'Failed to update candidate status' },
      { status: 500 }
    );
  }
}

// Keep original PUT method for backward compatibility
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, reason, table = 'candidates', campaignId, nextRoundDetails, interviewDate } = await request.json();
    const candidateId = resolvedParams.id;

    if (!action || !['approve', 'reject', 'next_round'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Forward to new POST method with mapped parameters
    const newRequest = new NextRequest(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({
        action,
        notes: reason,
        campaignId,
        nextRoundDetails,
        interviewDate
      })
    });

    return POST(newRequest, { params });

  } catch (error) {
    console.error('Error in PUT method:', error);
    return NextResponse.json(
      { error: 'Failed to update candidate status' },
      { status: 500 }
    );
  }
}