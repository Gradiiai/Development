import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';
import { jobCampaigns, companies } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId } = await params;

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    // Fetch job campaign details with company information
    const jobDetails = await db
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
        createdAt: jobCampaigns.createdAt,
        minExperience: jobCampaigns.minExperience,
        maxExperience: jobCampaigns.maxExperience,
        companyName: companies.name,
        companyLogo: companies.logo,
        companyWebsite: companies.website,
      })
      .from(jobCampaigns)
      .innerJoin(companies, eq(jobCampaigns.companyId, companies.id))
      .where(
        and(
          eq(jobCampaigns.id, campaignId),
          eq(jobCampaigns.status, 'active') // Only show active campaigns
        )
      )
      .limit(1);

    if (jobDetails.length === 0) {
      return NextResponse.json(
        { error: 'Job not found or no longer active' },
        { status: 404 }
      );
    }

    const job = jobDetails[0];

    // Check if application deadline has passed
    if (job.applicationDeadline) {
      const deadline = new Date(job.applicationDeadline);
      const now = new Date();
      if (now > deadline) {
        return NextResponse.json(
          { error: 'Application deadline has passed' },
          { status: 410 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      job: job
    });
  } catch (error) {
    console.error('Error fetching public job details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}