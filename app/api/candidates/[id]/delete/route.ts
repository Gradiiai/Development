import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import {
  candidates,
  candidateScores,
  campaignInterviews,
  interviewRoundResults,
  applicationStatusHistory,
  candidateUsers,
  candidateApplications,
  candidateInterviewHistory,
  candidateNotifications,
  candidateSessions,
  candidateDocuments,
  candidatePreferences,
  fileStorage,
  InterviewAnalytics,
  CodingInterview,
  Interview,
  jobCampaigns
} from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import { azureStorageService } from '@/lib/integrations/storage/azure';

/**
 * DELETE /api/candidates/[id]/delete
 * 
 * Comprehensive candidate deletion that removes all related data:
 * - Candidate record
 * - Candidate scores
 * - Interview records (behavioral, coding, MCQ)
 * - Interview answers and analytics
 * - Campaign interviews
 * - Interview round results
 * - Application status history
 * - Candidate user account (if exists)
 * - Candidate applications
 * - Interview history
 * - Notifications
 * - Sessions
 * - Documents and files
 * - Preferences
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const candidateId = resolvedParams.id;

    if (!candidateId) {
      return NextResponse.json(
        { error: 'Candidate ID is required' },
        { status: 400 }
      );
    }

    // Verify candidate exists and belongs to the company
    const candidateData = await db.select({
      id: candidates.id,
      name: candidates.name,
      email: candidates.email,
      resumeUrl: candidates.resumeUrl,
      campaignId: candidates.campaignId
    })
    .from(candidates)
    .innerJoin(jobCampaigns, eq(candidates.campaignId, jobCampaigns.id))
    .where(
      and(
        eq(candidates.id, candidateId),
        eq(jobCampaigns.companyId, session.user.companyId)
      )
    )
    .limit(1);

    if (candidateData.length === 0) {
      return NextResponse.json(
        { error: 'Candidate not found or access denied' },
        { status: 404 }
      );
    }

    const candidate = candidateData[0];
    const deletionResults = {
      candidateScores: 0,
      campaignInterviews: 0,
      interviewRoundResults: 0,
      applicationStatusHistory: 0,
      interviewRecords: 0,
      userAnswers: 0,
      userCodeAnswers: 0,
      interviewAnalytics: 0,
      candidateUser: 0,
      candidateApplications: 0,
      candidateInterviewHistory: 0,
      candidateNotifications: 0,
      candidateSessions: 0,
      candidateDocuments: 0,
      candidatePreferences: 0,
      fileStorage: 0
    };

    // Start transaction-like deletion process
    console.log(`Starting deletion process for candidate: ${candidate.name} (${candidate.email})`);

    // 1. Delete candidate scores
    const deletedScores = await db.delete(candidateScores)
      .where(eq(candidateScores.candidateId, candidateId))
      .returning({ id: candidateScores.id });
    deletionResults.candidateScores = deletedScores.length;

    // 2. Get all campaign interviews for this candidate to find interview IDs
    const campaignInterviewsData = await db.select({
      id: campaignInterviews.id,
      interviewId: campaignInterviews.interviewId,
      interviewType: campaignInterviews.interviewType
    })
    .from(campaignInterviews)
    .where(eq(campaignInterviews.candidateId, candidateId));

    // 3. Delete interview round results
    const deletedRoundResults = await db.delete(interviewRoundResults)
      .where(eq(interviewRoundResults.candidateId, candidateId))
      .returning({ id: interviewRoundResults.id });
    deletionResults.interviewRoundResults = deletedRoundResults.length;

    // 4. Delete application status history
    const deletedStatusHistory = await db.delete(applicationStatusHistory)
      .where(eq(applicationStatusHistory.candidateId, candidateId))
      .returning({ id: applicationStatusHistory.id });
    deletionResults.applicationStatusHistory = deletedStatusHistory.length;

    // 5. Delete interview records and related data
    for (const campaignInterview of campaignInterviewsData) {
      const interviewId = campaignInterview.interviewId;
      
      // Delete user answers for behavioral interviews
              // UserAnswer deletion moved to candidateInterviewHistory.feedback cleanup
        deletionResults.userAnswers = 0;

      // Delete user code answers for coding interviews
              // UserCodeAnswer deletion moved to candidateInterviewHistory.feedback cleanup  
        deletionResults.userCodeAnswers = 0;

      // Delete interview analytics
      const deletedAnalytics = await db.delete(InterviewAnalytics)
        .where(eq(InterviewAnalytics.interviewId, interviewId))
        .returning({ id: InterviewAnalytics.id });
      deletionResults.interviewAnalytics += deletedAnalytics.length;

      // Delete the actual interview record based on type
      if (campaignInterview.interviewType === 'coding') {
        const deletedCodingInterview = await db.delete(CodingInterview)
          .where(eq(CodingInterview.interviewId, interviewId))
          .returning({ id: CodingInterview.id });
        deletionResults.interviewRecords += deletedCodingInterview.length;
      } else {
        // Behavioral, MCQ, or combo interviews
        const deletedInterview = await db.delete(Interview)
          .where(eq(Interview.interviewId, interviewId))
          .returning({ id: Interview.id });
        deletionResults.interviewRecords += deletedInterview.length;
      }
    }

    // 6. Delete campaign interviews
    const deletedCampaignInterviews = await db.delete(campaignInterviews)
      .where(eq(campaignInterviews.candidateId, candidateId))
      .returning({ id: campaignInterviews.id });
    deletionResults.campaignInterviews = deletedCampaignInterviews.length;

    // 7. Check if candidate has a user account and delete related data
    const candidateUserData = await db.select({ id: candidateUsers.id })
      .from(candidateUsers)
      .where(eq(candidateUsers.email, candidate.email))
      .limit(1);

    if (candidateUserData.length > 0) {
      const candidateUserId = candidateUserData[0].id;

      // Delete candidate applications
      const deletedApplications = await db.delete(candidateApplications)
        .where(eq(candidateApplications.candidateId, candidateUserId))
        .returning({ id: candidateApplications.id });
      deletionResults.candidateApplications = deletedApplications.length;

      // Delete candidate interview history
      const deletedInterviewHistory = await db.delete(candidateInterviewHistory)
        .where(eq(candidateInterviewHistory.candidateId, candidateUserId))
        .returning({ id: candidateInterviewHistory.id });
      deletionResults.candidateInterviewHistory = deletedInterviewHistory.length;

      // Delete candidate notifications
      const deletedNotifications = await db.delete(candidateNotifications)
        .where(eq(candidateNotifications.candidateId, candidateUserId))
        .returning({ id: candidateNotifications.id });
      deletionResults.candidateNotifications = deletedNotifications.length;

      // Delete candidate sessions
      const deletedSessions = await db.delete(candidateSessions)
        .where(eq(candidateSessions.candidateId, candidateUserId))
        .returning({ id: candidateSessions.id });
      deletionResults.candidateSessions = deletedSessions.length;

      // Delete candidate documents
      const deletedDocuments = await db.delete(candidateDocuments)
        .where(eq(candidateDocuments.candidateId, candidateUserId))
        .returning({ id: candidateDocuments.id });
      deletionResults.candidateDocuments = deletedDocuments.length;

      // Delete candidate preferences
      const deletedPreferences = await db.delete(candidatePreferences)
        .where(eq(candidatePreferences.candidateId, candidateUserId))
        .returning({ id: candidatePreferences.id });
      deletionResults.candidatePreferences = deletedPreferences.length;

      // Delete candidate user account
      const deletedUser = await db.delete(candidateUsers)
        .where(eq(candidateUsers.id, candidateUserId))
        .returning({ id: candidateUsers.id });
      deletionResults.candidateUser = deletedUser.length;
    }

    // 8. Delete file storage records related to this candidate
    const deletedFiles = await db.delete(fileStorage)
      .where(
        and(
          eq(fileStorage.entityId, candidateId),
          eq(fileStorage.entityType, 'resume')
        )
      )
      .returning({ id: fileStorage.id });
    deletionResults.fileStorage = deletedFiles.length;

    // 9. Finally, delete the main candidate record
    await db.delete(candidates)
      .where(eq(candidates.id, candidateId));

    // Delete actual files from Azure Blob Storage
    let filesDeletionSuccess = true;
    if (candidate.resumeUrl) {
      try {
        // Extract blob name from the full URL
        const url = new URL(candidate.resumeUrl);
        const blobName = url.pathname.split('/').slice(2).join('/'); // Remove container name from path
        
        const deleted = await azureStorageService.deleteResume(blobName);
        if (!deleted) {
          console.warn(`Failed to delete resume file from storage: ${candidate.resumeUrl}`);
          filesDeletionSuccess = false;
        }
      } catch (error) {
        console.error(`Error deleting resume file from storage: ${candidate.resumeUrl}`, error);
        filesDeletionSuccess = false;
      }
    }

    console.log('Candidate deletion completed:', deletionResults);

    return NextResponse.json({
      success: true,
      message: `Candidate "${candidate.name}" and all related data deleted successfully`,
      deletionSummary: {
        candidateName: candidate.name,
        candidateEmail: candidate.email,
        deletedRecords: deletionResults,
        totalRecordsDeleted: Object.values(deletionResults).reduce((sum, count) => sum + count, 0) + 1, // +1 for main candidate record
        filesDeletionSuccess,
        resumeUrl: candidate.resumeUrl || null
      }
    });

  } catch (error) {
    console.error('Error deleting candidate and related data:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete candidate',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}