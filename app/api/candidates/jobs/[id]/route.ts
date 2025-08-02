import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-candidate';
import { db } from '@/lib/database/connection';
import { jobCampaigns, companies, candidateUsers, candidateApplications } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: jobId } = await params;

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

    // Get job details with company information
    const [job] = await db
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
      .where(eq(jobCampaigns.id, jobId))
      .limit(1);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Check if job is active and not expired
    if (job.status !== 'active') {
      return NextResponse.json(
        { error: 'Job is no longer active' },
        { status: 404 }
      );
    }

    if (job.applicationDeadline && new Date(job.applicationDeadline) < new Date()) {
      return NextResponse.json(
        { error: 'Application deadline has passed' },
        { status: 404 }
      );
    }

    // Check if candidate has already applied
    let hasApplied = false;
    if (candidateId) {
      const existingApplication = await db
        .select()
        .from(candidateApplications)
        .where(
          and(
            eq(candidateApplications.candidateId, candidateId),
            eq(candidateApplications.campaignId, jobId)
          )
        )
        .limit(1);
      
      hasApplied = existingApplication.length > 0;
    }

    // Transform the data
    const transformedJob = {
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
      hasApplied,
      minExperience: job.minExperience,
      maxExperience: job.maxExperience,
    };

    return NextResponse.json(transformedJob);
  } catch (error) {
    console.error('Error fetching job details for candidate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}