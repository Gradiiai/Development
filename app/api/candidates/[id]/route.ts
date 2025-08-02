import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { candidates, jobCampaigns, candidateApplications, candidateUsers } from '@/lib/database/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Candidate ID is required' },
        { status: 400 }
      );
    }

    // First try to find in old candidates table
    const oldCandidateData = await db
      .select({
        id: candidates.id,
        name: candidates.name,
        email: candidates.email,
        phone: candidates.phone,
        location: candidates.location,
        experience: candidates.experience,
        skills: candidates.skills,
        status: candidates.status,
        appliedDate: candidates.appliedAt,
        resumeUrl: candidates.resumeUrl,
        campaignId: candidates.campaignId,
        overallScore: candidates.overallScore,
        talentFitScore: candidates.talentFitScore,
        source: candidates.source,
        parsedResumeData: candidates.aiParsedData,
        currentCompany: candidates.currentCompany,
        currentRole: candidates.currentRole,
        expectedSalary: candidates.expectedSalary,
        noticePeriod: candidates.noticePeriod,
        notes: candidates.notes,
        campaignName: jobCampaigns.campaignName,
        jobTitle: jobCampaigns.jobTitle,
        department: jobCampaigns.department,
        systemType: sql<string>`'old'`
      })
      .from(candidates)
      .leftJoin(jobCampaigns, eq(candidates.campaignId, jobCampaigns.id))
      .where(
        and(
          eq(candidates.id, id),
          eq(jobCampaigns.companyId, session.user.companyId)
        )
      )
      .limit(1);

    // If not found in old system, try new candidateApplications table
    if (!oldCandidateData || oldCandidateData.length === 0) {
      const newCandidateData = await db
        .select({
          id: candidateApplications.id,
          name: candidateUsers.firstName, // Will be concatenated with lastName
          lastName: candidateUsers.lastName,
          email: candidateUsers.email,
          phone: candidateUsers.phone,
          location: sql<string | null>`null`,
          experience: sql<string | null>`null`,
          skills: sql<string | null>`null`,
          status: candidateApplications.status,
          appliedDate: candidateApplications.appliedAt,
          resumeUrl: sql<string | null>`null`,
          campaignId: candidateApplications.campaignId,
          overallScore: candidateApplications.overallScore,
          talentFitScore: sql<number | null>`null`,
          source: candidateApplications.applicationSource,
          parsedResumeData: sql<string | null>`null`,
          currentCompany: sql<string | null>`null`,
          currentRole: sql<string | null>`null`,
          expectedSalary: candidateApplications.expectedSalary,
          noticePeriod: sql<string | null>`null`,
          notes: candidateApplications.candidateNotes,
          campaignName: jobCampaigns.campaignName,
          jobTitle: jobCampaigns.jobTitle,
          department: jobCampaigns.department,
          systemType: sql<string>`'new'`
        })
        .from(candidateApplications)
        .innerJoin(candidateUsers, eq(candidateApplications.candidateId, candidateUsers.id))
        .innerJoin(jobCampaigns, eq(candidateApplications.campaignId, jobCampaigns.id))
        .where(
          and(
            eq(candidateApplications.id, id),
            eq(jobCampaigns.companyId, session.user.companyId)
          )
        )
        .limit(1);

      if (!newCandidateData || newCandidateData.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Candidate not found' },
          { status: 404 }
        );
      }

      // Handle new system candidate
      const newCandidate = newCandidateData[0];
      const transformedNewCandidate = {
        id: newCandidate.id,
        name: `${newCandidate.name} ${newCandidate.lastName || ''}`.trim(),
        email: newCandidate.email,
        phone: newCandidate.phone,
        location: null,
        experience: null,
        skills: null,
        resumeUrl: null,
        talentFitScore: null,
        parsedResumeData: null,
        currentCompany: null,
        currentRole: null,
        noticePeriod: null,
        source: `${newCandidate.source || 'direct'} (Gradii Portal)`,
        status: newCandidate.status,
        campaignId: newCandidate.campaignId,
        overallScore: newCandidate.overallScore || 0,
        expectedSalary: newCandidate.expectedSalary,
        notes: newCandidate.notes,
        campaignName: newCandidate.campaignName,
        jobTitle: newCandidate.jobTitle,
        department: newCandidate.department,
        systemType: newCandidate.systemType,
        appliedDate: (newCandidate.appliedDate instanceof Date ? newCandidate.appliedDate : new Date()).toISOString(),
        expectedCTC: newCandidate.expectedSalary ? `Rs. ${newCandidate.expectedSalary.toLocaleString()}` : undefined,
        noticePeriodDisplay: '2 months'
      };

      return NextResponse.json({
         success: true,
         data: {
           id: transformedNewCandidate.id,
           name: transformedNewCandidate.name,
           email: transformedNewCandidate.email,
           phone: transformedNewCandidate.phone,
           location: transformedNewCandidate.location,
           experience: transformedNewCandidate.experience,
           skills: transformedNewCandidate.skills,
           status: transformedNewCandidate.status,
           appliedDate: transformedNewCandidate.appliedDate,
           resumeUrl: transformedNewCandidate.resumeUrl,
           campaignId: transformedNewCandidate.campaignId,
           overallScore: transformedNewCandidate.overallScore,
           talentFitScore: transformedNewCandidate.talentFitScore,
           source: transformedNewCandidate.source,
           parsedResumeData: transformedNewCandidate.parsedResumeData,
           currentCompany: transformedNewCandidate.currentCompany,
           currentRole: transformedNewCandidate.currentRole,
           expectedSalary: transformedNewCandidate.expectedSalary,
           expectedCTC: transformedNewCandidate.expectedCTC,
           noticePeriod: transformedNewCandidate.noticePeriodDisplay,
           notes: transformedNewCandidate.notes,
           campaignName: transformedNewCandidate.campaignName,
           jobTitle: transformedNewCandidate.jobTitle,
           department: transformedNewCandidate.department,
           systemType: transformedNewCandidate.systemType
         }
       });
    }

    // Handle old system candidate
    const candidate = oldCandidateData[0];
    const transformedCandidate = {
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      location: candidate.location,
      experience: candidate.experience,
      skills: candidate.skills,
      resumeUrl: candidate.resumeUrl,
      talentFitScore: typeof candidate.talentFitScore === 'number' ? candidate.talentFitScore : 0,
      parsedResumeData: candidate.parsedResumeData,
      currentCompany: candidate.currentCompany,
      currentRole: candidate.currentRole,
      noticePeriod: candidate.noticePeriod,
      source: candidate.source,
      status: candidate.status,
      campaignId: candidate.campaignId,
      overallScore: candidate.overallScore || 0,
      expectedSalary: candidate.expectedSalary,
      notes: candidate.notes,
      campaignName: candidate.campaignName,
      jobTitle: candidate.jobTitle,
      department: candidate.department,
      systemType: candidate.systemType,
      appliedDate: (candidate.appliedDate instanceof Date ? candidate.appliedDate : new Date()).toISOString(),
      expectedCTC: candidate.expectedSalary ? `Rs. ${candidate.expectedSalary.toLocaleString()}` : undefined,
      noticePeriodDisplay: candidate.noticePeriod ? candidate.noticePeriod.toString() : '2 months'
    };

    return NextResponse.json({
      success: true,
      data: {
        id: transformedCandidate.id,
        name: transformedCandidate.name,
        email: transformedCandidate.email,
        phone: transformedCandidate.phone,
        location: transformedCandidate.location,
        experience: transformedCandidate.experience,
        skills: transformedCandidate.skills,
        status: transformedCandidate.status,
        appliedDate: transformedCandidate.appliedDate,
        resumeUrl: transformedCandidate.resumeUrl,
        campaignId: transformedCandidate.campaignId,
        overallScore: transformedCandidate.overallScore,
        talentFitScore: transformedCandidate.talentFitScore,
        source: transformedCandidate.source,
        parsedResumeData: transformedCandidate.parsedResumeData,
        currentCompany: transformedCandidate.currentCompany,
        currentRole: transformedCandidate.currentRole,
        expectedSalary: transformedCandidate.expectedSalary,
        expectedCTC: transformedCandidate.expectedCTC,
        noticePeriod: transformedCandidate.noticePeriodDisplay,
        notes: transformedCandidate.notes,
        campaignName: transformedCandidate.campaignName,
        jobTitle: transformedCandidate.jobTitle,
        department: transformedCandidate.department,
        systemType: transformedCandidate.systemType
      }
    });

  } catch (error) {
    console.error('Error fetching candidate:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Candidate ID is required' },
        { status: 400 }
      );
    }

    // First check if candidate exists in old system
    const existingOldCandidate = await db
      .select({ id: candidates.id })
      .from(candidates)
      .leftJoin(jobCampaigns, eq(candidates.campaignId, jobCampaigns.id))
      .where(
        and(
          eq(candidates.id, id),
          eq(jobCampaigns.companyId, session.user.companyId)
        )
      )
      .limit(1);

    let isOldSystem = existingOldCandidate && existingOldCandidate.length > 0;

    // If not found in old system, check new system
    if (!isOldSystem) {
      const existingNewCandidate = await db
        .select({ id: candidateApplications.id })
        .from(candidateApplications)
        .innerJoin(jobCampaigns, eq(candidateApplications.campaignId, jobCampaigns.id))
        .where(
          and(
            eq(candidateApplications.id, id),
            eq(jobCampaigns.companyId, session.user.companyId)
          )
        )
        .limit(1);

      if (!existingNewCandidate || existingNewCandidate.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Candidate not found' },
          { status: 404 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};
    
    if (body.status) updateData.status = body.status;
    if (body.notes !== undefined) {
      if (isOldSystem) {
        updateData.notes = body.notes;
      } else {
        updateData.candidateNotes = body.notes;
      }
    }
    if (body.talentFitScore !== undefined && isOldSystem) updateData.talentFitScore = body.talentFitScore;
    if (body.overallScore !== undefined) updateData.overallScore = body.overallScore;
    if (body.expectedSalary !== undefined) updateData.expectedSalary = body.expectedSalary;
    if (body.noticePeriod !== undefined && isOldSystem) updateData.noticePeriod = body.noticePeriod;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    if (isOldSystem) {
      updateData.updatedAt = new Date();
      await db
        .update(candidates)
        .set(updateData)
        .where(eq(candidates.id, id));
    } else {
      updateData.lastUpdatedAt = new Date();
      await db
        .update(candidateApplications)
        .set(updateData)
        .where(eq(candidateApplications.id, id));
    }

    return NextResponse.json({
      success: true,
      message: 'Candidate updated successfully'
    });

  } catch (error) {
    console.error('Error updating candidate:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Candidate ID is required' },
        { status: 400 }
      );
    }

    // Verify candidate belongs to the company before deletion
    const existingCandidate = await db
      .select({ id: candidates.id })
      .from(candidates)
      .leftJoin(jobCampaigns, eq(candidates.campaignId, jobCampaigns.id))
      .where(
        and(
          eq(candidates.id, id),
          eq(jobCampaigns.companyId, session.user.companyId)
        )
      )
      .limit(1);

    if (!existingCandidate || existingCandidate.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Candidate not found' },
        { status: 404 }
      );
    }

    // Forward to the comprehensive deletion endpoint
    const deleteResponse = await fetch(`${request.nextUrl.origin}/api/candidates/${id}/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('Cookie') || ''
      }
    });

    if (!deleteResponse.ok) {
      const errorData = await deleteResponse.json().catch(() => ({ error: 'Failed to delete candidate' }));
      return NextResponse.json(
        { success: false, error: errorData.error || 'Failed to delete candidate' },
        { status: deleteResponse.status }
      );
    }

    const result = await deleteResponse.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error deleting candidate:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
