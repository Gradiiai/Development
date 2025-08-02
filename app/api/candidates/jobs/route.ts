import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-candidate';
import { db } from '@/lib/database/connection';
import { jobCampaigns, companies, candidateUsers, candidateApplications } from '@/lib/database/schema';
import { eq, desc, and, isNull, or, gte, ne } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get candidate user to check for existing applications
    const candidateUser = await db
      .select()
      .from(candidateUsers)
      .where(eq(candidateUsers.email, session.user.email))
      .limit(1);

    let candidateId = null;
    if (candidateUser.length > 0) {
      candidateId = candidateUser[0].id;
    }

    // Get all active job campaigns with company information
    const jobsQuery = db
      .select({
        id: jobCampaigns.id,
        campaignName: jobCampaigns.campaignName,
        jobTitle: jobCampaigns.jobTitle,
        department: jobCampaigns.department,
        location: jobCampaigns.location,
        experienceLevel: jobCampaigns.experienceLevel,
        employeeType: jobCampaigns.employeeType,
        salaryMin: jobCampaigns.salaryMin,
        salaryMax: jobCampaigns.salaryMax,
        currency: jobCampaigns.currency,
        numberOfOpenings: jobCampaigns.numberOfOpenings,
        jobDescription: jobCampaigns.jobDescription,
        jobRequirements: jobCampaigns.jobRequirements,
        jobBenefits: jobCampaigns.jobBenefits,
        requiredSkills: jobCampaigns.requiredSkills,
        applicationDeadline: jobCampaigns.applicationDeadline,
        isRemote: jobCampaigns.isRemote,
        isHybrid: jobCampaigns.isHybrid,
        companyName: companies.name,
        companyLogo: companies.logo,
        companyWebsite: companies.website,
        createdAt: jobCampaigns.createdAt,
        status: jobCampaigns.status,
        minExperience: jobCampaigns.minExperience,
        maxExperience: jobCampaigns.maxExperience,
      })
      .from(jobCampaigns)
      .leftJoin(companies, eq(jobCampaigns.companyId, companies.id))
      .where(
        and(
          eq(jobCampaigns.status, 'active'),
          // Exclude direct interview campaigns
          ne(jobCampaigns.campaignName, 'Direct Interview'),
          or(
            isNull(jobCampaigns.applicationDeadline),
            gte(jobCampaigns.applicationDeadline, new Date())
          )
        )
      )
      .orderBy(desc(jobCampaigns.createdAt));

    const jobs = await jobsQuery;

    // If candidate exists, check which jobs they've already applied to
    let appliedJobIds: string[] = [];
    if (candidateId) {
      const applications = await db
        .select({ campaignId: candidateApplications.campaignId })
        .from(candidateApplications)
        .where(eq(candidateApplications.candidateId, candidateId));
      
      appliedJobIds = applications.map(app => app.campaignId);
    }

    // Transform the data and add application status
    const transformedJobs = jobs.map(job => ({
      id: job.id,
      campaignName: job.campaignName,
      jobTitle: job.jobTitle,
      department: job.department,
      location: job.location,
      experienceLevel: job.experienceLevel,
      employeeType: job.employeeType,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      currency: job.currency || 'INR',
      numberOfOpenings: job.numberOfOpenings,
      jobDescription: job.jobDescription,
      jobRequirements: job.jobRequirements,
      jobBenefits: job.jobBenefits,
      requiredSkills: job.requiredSkills || '[]',
      applicationDeadline: job.applicationDeadline?.toISOString(),
      isRemote: job.isRemote,
      isHybrid: job.isHybrid,
      companyName: job.companyName || 'Unknown Company',
      companyLogo: job.companyLogo,
      companyWebsite: job.companyWebsite,
      createdAt: job.createdAt.toISOString(),
      hasApplied: appliedJobIds.includes(job.id),
      minExperience: job.minExperience,
      maxExperience: job.maxExperience,
    }));

    return NextResponse.json(transformedJobs);
  } catch (error) {
    console.error('Error fetching jobs for candidates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}