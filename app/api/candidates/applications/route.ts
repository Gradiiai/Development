import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-candidate';
import { db } from '@/lib/database/connection';
import { candidateUsers, candidateApplications, jobCampaigns, companies } from '@/lib/database/schema';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get candidate user
    const candidateUser = await db
      .select()
      .from(candidateUsers)
      .where(eq(candidateUsers.email, session.user.email))
      .limit(1);

    if (!candidateUser.length) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      );
    }

    // Get applications for this candidate
    const applications = await db
      .select({
        id: candidateApplications.id,
        campaignId: candidateApplications.campaignId,
        companyId: candidateApplications.companyId,
        jobTitle: jobCampaigns.jobTitle,
        companyName: companies.name,
        status: candidateApplications.status,
        currentStage: candidateApplications.currentStage,
        appliedDate: candidateApplications.appliedAt,
        lastUpdated: candidateApplications.lastUpdatedAt,
        location: jobCampaigns.location,
        employeeType: jobCampaigns.employeeType,
        salaryMin: jobCampaigns.salaryMin,
        salaryMax: jobCampaigns.salaryMax,
        currency: jobCampaigns.currency,
        jobDescription: jobCampaigns.jobDescription,
        jobRequirements: jobCampaigns.jobRequirements,
        jobBenefits: jobCampaigns.jobBenefits,
        applicationDeadline: jobCampaigns.applicationDeadline,
        companyLogo: companies.logo,
        companyWebsite: companies.website,
        applicationSource: candidateApplications.applicationSource,
        coverLetter: candidateApplications.coverLetter,
        overallScore: candidateApplications.overallScore,
        expectedSalary: candidateApplications.expectedSalary,
        candidateNotes: candidateApplications.candidateNotes,
        isWithdrawn: candidateApplications.isWithdrawn,
      })
      .from(candidateApplications)
      .leftJoin(jobCampaigns, eq(candidateApplications.campaignId, jobCampaigns.id))
      .leftJoin(companies, eq(candidateApplications.companyId, companies.id))
      .where(eq(candidateApplications.candidateId, candidateUser[0].id))
      .orderBy(desc(candidateApplications.appliedAt));

    // Transform the data to match the frontend interface
    const transformedApplications = applications.map(app => ({
      id: app.id,
      campaignId: app.campaignId,
      companyId: app.companyId,
      jobTitle: app.jobTitle || 'Unknown Position',
      companyName: app.companyName || 'Unknown Company',
      location: app.location || 'Remote',
      appliedDate: app.appliedDate,
      status: app.status || 'applied',
      currentStage: app.currentStage,
      jobType: app.employeeType || 'full-time',
      salary: app.salaryMin && app.salaryMax ? `${app.currency || 'INR'} ${app.salaryMin} - ${app.salaryMax}` : null,
      lastUpdate: app.lastUpdated || app.appliedDate,
      jobDescription: app.jobDescription,
      requirements: app.jobRequirements,
      benefits: app.jobBenefits,
      applicationDeadline: app.applicationDeadline,
      companyLogo: app.companyLogo,
      companyWebsite: app.companyWebsite,
      applicationSource: app.applicationSource,
      coverLetter: app.coverLetter,
      overallScore: app.overallScore,
      expectedSalary: app.expectedSalary,
      notes: app.candidateNotes,
      isWithdrawn: app.isWithdrawn,
    }));

    return NextResponse.json(transformedApplications);
  } catch (error) {
    console.error('Error fetching candidate applications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { campaignId, notes } = body;

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    // Get candidate user
    const candidateUser = await db
      .select()
      .from(candidateUsers)
      .where(eq(candidateUsers.email, session.user.email))
      .limit(1);

    if (!candidateUser.length) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      );
    }

    // Check if already applied
    const existingApplication = await db
      .select()
      .from(candidateApplications)
      .where(
        and(
          eq(candidateApplications.candidateId, candidateUser[0].id),
          eq(candidateApplications.campaignId, campaignId)
        )
      )
      .limit(1);

    if (existingApplication.length > 0) {
      return NextResponse.json(
        { error: 'Already applied to this position' },
        { status: 400 }
      );
    }

    // Get company ID from job campaign
    const [jobCampaign] = await db.select({ companyId: jobCampaigns.companyId })
      .from(jobCampaigns)
      .where(eq(jobCampaigns.id, campaignId))
      .limit(1);

    if (!jobCampaign) {
      return NextResponse.json(
        { error: 'Job campaign not found' },
        { status: 404 }
      );
    }

    // Create new application
    const [newApplication] = await db
      .insert(candidateApplications)
      .values({
        candidateId: candidateUser[0].id,
        campaignId,
        companyId: jobCampaign.companyId,
        status: 'applied',
        currentStage: 'application_submitted',
        appliedAt: new Date(),
        lastUpdatedAt: new Date(),
        candidateNotes: notes || '',
        applicationSource: 'direct',
        isWithdrawn: false,
      })
      .returning();

    return NextResponse.json(newApplication, { status: 201 });
  } catch (error) {
    console.error('Error creating application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}