import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-candidate";
import { db } from "@/lib/database/connection";
import { candidateUsers, candidateProfiles, candidateDocuments, candidateInterviewHistory, candidateApplications, jobCampaigns, companies, CodingInterview, Interview, campaignInterviews, interviewSetups, candidates } from "@/lib/database/schema";
// Unified interviews table removed - you only use Direct and Campaign interviews
import { eq, and, desc, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // Get the candidate session
    const session = await auth();
    
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Ensure the user has candidate role
    if (session.user.role !== "candidate") {
      return NextResponse.json(
        { success: false, error: "Access denied. Candidate role required." },
        { status: 403 }
      );
    }

    const candidateEmail = session.user.email;

    // Get candidate user
    const candidateUser = await db
      .select()
      .from(candidateUsers)
      .where(eq(candidateUsers.email, candidateEmail))
      .limit(1);

    if (!candidateUser.length) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    const candidate = candidateUser[0];

    // Find corresponding old candidate record by email for campaign interviews
    const oldCandidateRecord = await db
      .select({ id: candidates.id })
      .from(candidates)
      .where(eq(candidates.email, candidateEmail))
      .limit(1);

    const oldCandidateId = oldCandidateRecord.length > 0 ? oldCandidateRecord[0].id : null;
    
    // Debug logging for troubleshooting
    console.log(`🔍 Dashboard lookup for ${candidateEmail}:`, {
      candidateUserId: candidate.id,
      oldCandidateId,
      hasOldRecord: oldCandidateRecord.length > 0
    });

    // Get candidate's resume from documents (Azure storage)
    const resumeDocuments = await db
      .select({
        id: candidateDocuments.id,
        documentName: candidateDocuments.documentName,
        fileUrl: candidateDocuments.fileUrl,
        uploadedAt: candidateDocuments.uploadedAt,
        isDefault: candidateDocuments.isDefault,
        version: candidateDocuments.version
      })
      .from(candidateDocuments)
      .where(
        and(
          eq(candidateDocuments.candidateId, candidate.id),
          eq(candidateDocuments.documentType, "resume")
        )
      )
      .orderBy(desc(candidateDocuments.isDefault), desc(candidateDocuments.uploadedAt))
      .limit(5);

    // Get scheduled interviews from history (both campaign-based and direct interviews)
    const historyInterviews = await db
      .select({
        id: candidateInterviewHistory.id,
        interviewId: candidateInterviewHistory.interviewId,
        interviewType: candidateInterviewHistory.interviewType,
        roundNumber: candidateInterviewHistory.roundNumber,
        roundName: candidateInterviewHistory.roundName,
        scheduledAt: candidateInterviewHistory.scheduledAt,
        status: candidateInterviewHistory.status,
        interviewLink: candidateInterviewHistory.interviewLink,
        companyName: companies.name,
        jobTitle: jobCampaigns.jobTitle,
        campaignName: jobCampaigns.campaignName,
        applicationId: candidateInterviewHistory.applicationId // To distinguish direct vs campaign interviews
      })
      .from(candidateInterviewHistory)
      .leftJoin(candidateApplications, eq(candidateInterviewHistory.applicationId, candidateApplications.id))
      .leftJoin(jobCampaigns, eq(candidateApplications.campaignId, jobCampaigns.id))
      .leftJoin(companies, eq(candidateApplications.companyId, companies.id))
      .where(
        and(
          eq(candidateInterviewHistory.candidateId, candidate.id),
          eq(candidateInterviewHistory.status, "scheduled")
        )
      )
      .orderBy(candidateInterviewHistory.scheduledAt);

    // Get coding interviews for this candidate
    const codingInterviews = await db
      .select({
        id: CodingInterview.id,
        interviewId: CodingInterview.interviewId,
        interviewTopic: CodingInterview.interviewTopic,
        difficultyLevel: CodingInterview.difficultyLevel,
        programmingLanguage: CodingInterview.programmingLanguage,
        candidateEmail: CodingInterview.candidateEmail,
        interviewDate: CodingInterview.interviewDate,
        interviewTime: CodingInterview.interviewTime,
        interviewStatus: CodingInterview.interviewStatus,
        interviewLink: CodingInterview.interviewLink,
        createdAt: CodingInterview.createdAt
      })
      .from(CodingInterview)
      .where(
        and(
          eq(CodingInterview.candidateEmail, candidateEmail),
          eq(CodingInterview.interviewStatus, "scheduled")
        )
      )
      .orderBy(CodingInterview.createdAt);

    // Get scheduled interviews from Interview table (direct interviews only)
    // Filter by campaignId being null to ensure proper isolation
    const directScheduledInterviews = await db
      .select({
        id: Interview.id,
        interviewId: Interview.interviewId,
        interviewType: Interview.interviewType,
        jobPosition: Interview.jobPosition,
        candidateEmail: Interview.candidateEmail,
        interviewDate: Interview.interviewDate,
        interviewTime: Interview.interviewTime,
        interviewStatus: Interview.interviewStatus,
        interviewLink: Interview.interviewLink,
        createdAt: Interview.createdAt
      })
      .from(Interview)
      .where(
        and(
          eq(Interview.candidateEmail, candidateEmail),
          eq(Interview.interviewStatus, "scheduled"),
          sql`${Interview.campaignId} IS NULL` // Ensure only direct interviews
        )
      )
      .orderBy(Interview.createdAt);

    // Get scheduled interviews from campaignInterviews table (only if old candidate ID exists)
     const campaignScheduledInterviews = oldCandidateId ? await db
       .select({
         id: campaignInterviews.id,
         interviewId: campaignInterviews.interviewId,
         campaignId: campaignInterviews.campaignId,
         setupId: campaignInterviews.setupId,
         scheduledAt: campaignInterviews.scheduledAt,
         status: campaignInterviews.status,
         interviewType: campaignInterviews.interviewType,
         interviewLink: campaignInterviews.interviewLink,
         candidateNotes: campaignInterviews.candidateNotes,
         timezone: campaignInterviews.timezone,
         companyName: companies.name,
         jobTitle: jobCampaigns.jobTitle,
         campaignName: jobCampaigns.campaignName,
         roundName: interviewSetups.roundName,
         timeLimit: interviewSetups.timeLimit,
         difficultyLevel: interviewSetups.difficultyLevel
       })
       .from(campaignInterviews)
       .innerJoin(jobCampaigns, eq(campaignInterviews.campaignId, jobCampaigns.id))
       .innerJoin(companies, eq(jobCampaigns.companyId, companies.id))
       .leftJoin(interviewSetups, eq(campaignInterviews.setupId, interviewSetups.id))
       .where(
         and(
           eq(campaignInterviews.candidateId, oldCandidateId),
           eq(campaignInterviews.status, "scheduled")
         )
       )
       .orderBy(campaignInterviews.scheduledAt) : [];

    // Debug logging for campaign interviews
    console.log(`📅 Found ${campaignScheduledInterviews.length} campaign interviews for candidate ${candidateEmail}:`, 
      campaignScheduledInterviews.map(interview => ({
        id: interview.id,
        interviewType: interview.interviewType,
        status: interview.status,
        hasLink: !!interview.interviewLink,
        scheduledAt: interview.scheduledAt,
        jobTitle: interview.jobTitle
      }))
    );

    // Combine all interviews
    const allInterviews = [
      ...historyInterviews.map(interview => ({
        id: interview.id,
        interviewId: interview.interviewId,
        type: interview.interviewType,
        round: interview.roundNumber,
        roundName: interview.roundName,
        scheduledAt: interview.scheduledAt,
        status: interview.status,
        company: interview.companyName || 'Direct Interview', // Default for direct interviews
        jobTitle: interview.jobTitle || 'Direct Interview', // Default for direct interviews
        campaignName: interview.campaignName || 'Direct Interview', // Default for direct interviews
        canStart: interview.interviewLink && interview.status === "scheduled",
        interviewLink: interview.interviewLink,
        isDirect: !interview.applicationId // Flag to identify direct interviews
      })),
      ...codingInterviews.map(interview => ({
        id: interview.id,
        interviewId: interview.interviewId,
        type: 'coding',
        round: 1,
        roundName: 'Coding Interview',
        scheduledAt: interview.interviewDate && interview.interviewTime ? new Date(interview.interviewDate + ' ' + interview.interviewTime).toISOString() : new Date().toISOString(),
        status: interview.interviewStatus,
        company: 'Company',
        jobTitle: interview.interviewTopic || 'Coding Interview',
        campaignName: `${interview.programmingLanguage} - ${interview.difficultyLevel}`,
        canStart: interview.interviewLink && interview.interviewStatus === "scheduled",
        interviewLink: interview.interviewLink
      })),
      ...directScheduledInterviews.map((interview: any) => ({
        id: interview.id,
        interviewId: interview.interviewId,
        type: interview.interviewType,
        round: 1,
        roundName: 'Interview',
        scheduledAt: interview.interviewDate && interview.interviewTime ? new Date(interview.interviewDate + ' ' + interview.interviewTime).toISOString() : new Date().toISOString(),
        status: interview.interviewStatus,
        company: 'Company',
        jobTitle: interview.jobPosition || 'Interview',
        campaignName: 'Interview',
        canStart: interview.interviewLink && interview.interviewStatus === "scheduled",
        interviewLink: interview.interviewLink
      })),
      ...campaignScheduledInterviews.map(interview => {
        const canStart = interview.interviewLink && interview.status === "scheduled";
        console.log(`🎯 Campaign interview ${interview.id}: canStart=${canStart}, hasLink=${!!interview.interviewLink}, status=${interview.status}`);
        
        return {
          id: interview.id,
          interviewId: interview.interviewId,
          type: interview.interviewType,
          round: 1,
          roundName: interview.roundName || 'Interview',
          scheduledAt: interview.scheduledAt,
          status: interview.status,
          company: interview.companyName,
          jobTitle: interview.jobTitle,
          campaignName: interview.campaignName,
          canStart: canStart,
          interviewLink: interview.interviewLink,
          timeLimit: interview.timeLimit,
          difficultyLevel: interview.difficultyLevel,
          timezone: interview.timezone
        };
      })
    ];

    // Sort by scheduled date
    allInterviews.sort((a, b) => {
      const dateA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
      const dateB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
      return dateA - dateB;
    });

    // Final debug log
    console.log(`✅ Dashboard returning ${allInterviews.length} total interviews for ${candidateEmail}:`, 
      allInterviews.map(interview => ({
        id: interview.id,
        type: interview.type,
        canStart: interview.canStart,
        hasLink: !!interview.interviewLink,
        status: interview.status
      }))
    );

    // Return minimalist dashboard data
    return NextResponse.json({
      success: true,
      data: {
        candidate: {
          id: candidate.id,
          name: `${candidate.firstName} ${candidate.lastName}`,
          email: candidate.email,
          profileImage: candidate.profileImage
        },
        resume: resumeDocuments.length > 0 ? {
          id: resumeDocuments[0].id,
          name: resumeDocuments[0].documentName,
          url: resumeDocuments[0].fileUrl,
          uploadedAt: resumeDocuments[0].uploadedAt,
          version: resumeDocuments[0].version
        } : null,
        interviews: allInterviews
      }
    });

  } catch (error) {
    console.error("Candidate dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}