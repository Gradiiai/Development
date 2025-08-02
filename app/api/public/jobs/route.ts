import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';
import { jobCampaigns, companies } from '@/lib/database/schema';
import { eq, and, desc, sql, or, ilike, ne } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const search = searchParams.get('search') || '';
    const location = searchParams.get('location') || '';
    const department = searchParams.get('department') || '';
    const experienceLevel = searchParams.get('experienceLevel') || '';
    const employmentType = searchParams.get('employmentType') || '';
    const isRemote = searchParams.get('isRemote');
    const salaryMin = searchParams.get('salaryMin');
    const salaryMax = searchParams.get('salaryMax');

    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [
      eq(jobCampaigns.status, 'active'),
      // Exclude direct interview campaigns
      ne(jobCampaigns.campaignName, 'Direct Interview'),
      // Only show jobs that haven't passed their application deadline
      or(
        sql`${jobCampaigns.applicationDeadline} IS NULL`,
        sql`${jobCampaigns.applicationDeadline} > NOW()`
      )
    ];

    // Add search filters
    if (search) {
      conditions.push(
        or(
          ilike(jobCampaigns.jobTitle, `%${search}%`),
          ilike(jobCampaigns.campaignName, `%${search}%`),
          ilike(jobCampaigns.jobDescription, `%${search}%`),
          ilike(companies.name, `%${search}%`)
        )
      );
    }

    if (location) {
      conditions.push(ilike(jobCampaigns.location, `%${location}%`));
    }

    if (department) {
      conditions.push(eq(jobCampaigns.department, department));
    }

    if (experienceLevel) {
      conditions.push(eq(jobCampaigns.experienceLevel, experienceLevel));
    }

    if (employmentType) {
      conditions.push(eq(jobCampaigns.employeeType, employmentType));
    }

    if (isRemote === 'true') {
      conditions.push(eq(jobCampaigns.isRemote, true));
    }

    if (salaryMin) {
      conditions.push(sql`${jobCampaigns.salaryMin} >= ${parseInt(salaryMin)}`);
    }

    if (salaryMax) {
      conditions.push(sql`${jobCampaigns.salaryMax} <= ${parseInt(salaryMax)}`);
    }

    // Get total count for pagination
    const [totalCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(jobCampaigns)
      .leftJoin(companies, eq(jobCampaigns.companyId, companies.id))
      .where(and(...conditions));

    // Get jobs with company information
    const jobs = await db
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
        companyIndustry: companies.industry,
        companySize: companies.size,
        createdAt: jobCampaigns.createdAt,
        minExperience: jobCampaigns.minExperience,
        maxExperience: jobCampaigns.maxExperience,
      })
      .from(jobCampaigns)
      .leftJoin(companies, eq(jobCampaigns.companyId, companies.id))
      .where(and(...conditions))
      .orderBy(desc(jobCampaigns.createdAt))
      .limit(limit)
      .offset(offset);

    // Transform the data
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
      companyIndustry: job.companyIndustry,
      companySize: job.companySize,
      createdAt: job.createdAt.toISOString(),
      minExperience: job.minExperience,
      maxExperience: job.maxExperience,
    }));

    return NextResponse.json({
      jobs: transformedJobs,
      pagination: {
        page,
        limit,
        total: totalCount.count,
        totalPages: Math.ceil(totalCount.count / limit),
        hasNext: page < Math.ceil(totalCount.count / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching public jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}