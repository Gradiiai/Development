import { NextRequest } from 'next/server';
import { withV2Auth, createV2Response, createV2ErrorResponse, validateMethod, parseJsonBody, extractPagination, extractSorting } from '../middleware';
import { db } from '@/lib/database/connection';
import { jobCampaigns, companies } from '@/lib/database/schema';
import { eq, and, desc, asc, count, ilike, ne } from 'drizzle-orm';
import { z } from 'zod';

// Validation schemas
const createJobSchema = z.object({
  campaignName: z.string().min(1, 'Campaign name is required').max(255),
  jobTitle: z.string().min(1, 'Job title is required').max(255),
  department: z.string().min(1, 'Department is required').max(255),
  location: z.string().min(1, 'Location is required').max(255),
  employeeType: z.enum(['Full-time', 'Part-time', 'Contract', 'Internship']),
  experienceLevel: z.string().min(1, 'Experience level is required'),
  numberOfOpenings: z.number().int().min(1, 'Must have at least 1 opening'),
  jobDescription: z.string().min(1, 'Job description is required'),
  jobRequirements: z.string().optional(),
  jobBenefits: z.string().optional(),
  jobDuties: z.string().optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  salaryNegotiable: z.boolean().default(false),
  currency: z.string().default('INR'),
});

const updateJobSchema = createJobSchema.partial();

/**
 * GET /api/v2/jobs
 * List all jobs with pagination, filtering, and sorting
 */
export async function GET(request: NextRequest) {
  // Validate authentication and permissions
  const authResult = await withV2Auth(request, ['jobs:read']);
  
  // Handle authentication errors
  if ('error' in authResult && authResult.error) {
    return authResult.error;
  }
  
  // Type guard to ensure we have authContext
  if (!('authContext' in authResult) || !authResult.authContext) {
    return createV2ErrorResponse('Authentication failed', 'AUTH_FAILED', 401);
  }
  
  const authContext = authResult.authContext;

  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = extractPagination(request);
    const sortingResult = extractSorting(request, [
      'campaignName', 'jobTitle', 'createdAt', 'updatedAt', 'applicationDeadline', 'status'
    ]);
    if (sortingResult.error) {
      return sortingResult.error;
    }
    const { sortBy, sortOrder } = sortingResult;

    // Build filters
    const conditions = [
      eq(jobCampaigns.companyId, authContext.token.companyId),
      // Exclude direct interview campaigns
      ne(jobCampaigns.campaignName, 'Direct Interview')
    ];
    
    // Search filter
    const search = searchParams.get('search');
    if (search) {
      conditions.push(ilike(jobCampaigns.jobTitle, `%${search}%`));
    }

    // Status filter
    const status = searchParams.get('status');
    if (status) {
      conditions.push(eq(jobCampaigns.status, status));
    }

    // Employment type filter
    const employmentType = searchParams.get('employment_type');
    if (employmentType) {
      conditions.push(eq(jobCampaigns.employeeType, employmentType));
    }

    // Experience level filter
    const experienceLevel = searchParams.get('experience_level');
    if (experienceLevel) {
      conditions.push(eq(jobCampaigns.experienceLevel, experienceLevel));
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(jobCampaigns)
      .where(and(...conditions));

    const total = totalResult.count;
    const totalPages = Math.ceil(total / limit);

    // Get jobs with pagination and sorting with proper field mapping
    let sortField;
    switch (sortBy) {
      case 'campaignName':
        sortField = jobCampaigns.campaignName;
        break;
      case 'jobTitle':
        sortField = jobCampaigns.jobTitle;
        break;
      case 'status':
        sortField = jobCampaigns.status;
        break;
      case 'updatedAt':
        sortField = jobCampaigns.updatedAt;
        break;
      default:
        sortField = jobCampaigns.createdAt;
    }
    const orderBy = sortOrder === 'asc' ? asc(sortField) : desc(sortField);

    const jobs = await db
      .select({
        id: jobCampaigns.id,
        campaignName: jobCampaigns.campaignName,
        jobTitle: jobCampaigns.jobTitle,
        department: jobCampaigns.department,
        location: jobCampaigns.location,
        employeeType: jobCampaigns.employeeType,
        experienceLevel: jobCampaigns.experienceLevel,
        numberOfOpenings: jobCampaigns.numberOfOpenings,
        jobDescription: jobCampaigns.jobDescription,
        jobRequirements: jobCampaigns.jobRequirements,
        jobBenefits: jobCampaigns.jobBenefits,
        jobDuties: jobCampaigns.jobDuties,
        salaryMin: jobCampaigns.salaryMin,
        salaryMax: jobCampaigns.salaryMax,
        salaryNegotiable: jobCampaigns.salaryNegotiable,
        currency: jobCampaigns.currency,
        status: jobCampaigns.status,
        createdAt: jobCampaigns.createdAt,
        updatedAt: jobCampaigns.updatedAt,
      })
      .from(jobCampaigns)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    const meta = {
      page,
      limit,
      total,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1,
      filters: {
        search: search || null,
        status: status || null,
        employment_type: employmentType || null,
        experience_level: experienceLevel || null,
      },
      sorting: {
        sort_by: sortBy,
        sort_order: sortOrder,
      }
    };

    return createV2Response(
      jobs,
      200,
      `Retrieved ${jobs.length} jobs`,
      meta
    );
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return createV2ErrorResponse(
      'Failed to fetch jobs',
      'FETCH_JOBS_ERROR',
      500
    );
  }
}

/**
 * POST /api/v2/jobs
 * Create a new job
 */
export async function POST(request: NextRequest) {
  // Validate method
  const methodError = validateMethod(request, ['POST']);
  if (methodError) return methodError;

  // Validate authentication and permissions
  const authResult = await withV2Auth(request, ['jobs:write']);
  
  // Handle authentication errors
  if ('error' in authResult && authResult.error) {
    return authResult.error;
  }
  
  // Type guard to ensure we have authContext
  if (!('authContext' in authResult) || !authResult.authContext) {
    return createV2ErrorResponse('Authentication failed', 'AUTH_FAILED', 401);
  }
  
  const authContext = authResult.authContext;

  // Parse and validate request body
  const { body, error: bodyError } = await parseJsonBody(request);
  if (bodyError) return bodyError;

  try {
    const validatedData = createJobSchema.parse(body);

    // Create job
    const [newJob] = await db
      .insert(jobCampaigns)
      .values({
        ...validatedData,
        companyId: authContext.token.companyId,
        createdBy: authContext.token.id,
        status: 'draft',
      })
      .returning({
        id: jobCampaigns.id,
        campaignName: jobCampaigns.campaignName,
        jobTitle: jobCampaigns.jobTitle,
        department: jobCampaigns.department,
        location: jobCampaigns.location,
        employeeType: jobCampaigns.employeeType,
        experienceLevel: jobCampaigns.experienceLevel,
        numberOfOpenings: jobCampaigns.numberOfOpenings,
        jobDescription: jobCampaigns.jobDescription,
        jobRequirements: jobCampaigns.jobRequirements,
        jobBenefits: jobCampaigns.jobBenefits,
        jobDuties: jobCampaigns.jobDuties,
        salaryMin: jobCampaigns.salaryMin,
        salaryMax: jobCampaigns.salaryMax,
        salaryNegotiable: jobCampaigns.salaryNegotiable,
        currency: jobCampaigns.currency,
        status: jobCampaigns.status,
        createdAt: jobCampaigns.createdAt,
        updatedAt: jobCampaigns.updatedAt,
      });

    return createV2Response(
      newJob,
      201,
      'Job created successfully'
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createV2ErrorResponse(
        'Invalid job data',
        'VALIDATION_ERROR',
        400,
        error.errors
      );
    }

    console.error('Error creating job:', error);
    return createV2ErrorResponse(
      'Failed to create job',
      'CREATE_JOB_ERROR',
      500
    );
  }
}