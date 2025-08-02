import { NextRequest } from 'next/server';
import { withV2Auth, createV2Response, createV2ErrorResponse, validateMethod, parseJsonBody } from '../../middleware';
import { db } from '@/lib/database/db';
import { jobCampaigns } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for updating jobs
const updateJobSchema = z.object({
  campaignName: z.string().min(1).max(255).optional(),
  jobTitle: z.string().min(1).max(255).optional(),
  department: z.string().min(1).max(255).optional(),
  location: z.string().min(1).max(255).optional(),
  employeeType: z.enum(['full-time', 'part-time', 'contract', 'internship']).optional(),
  experienceLevel: z.enum(['entry', 'mid', 'senior', 'executive']).optional(),
  numberOfOpenings: z.number().int().min(1).optional(),
  jobDescription: z.string().optional(),
  jobRequirements: z.string().optional(),
  jobBenefits: z.string().optional(),
  jobDuties: z.string().optional(),
  salaryMin: z.number().min(0).optional(),
  salaryMax: z.number().min(0).optional(),
  salaryNegotiable: z.boolean().optional(),
  currency: z.string().length(3).optional(),
  applicationDeadline: z.string().datetime().optional(),
  status: z.enum(['draft', 'active', 'paused', 'closed']).optional()
});

/**
 * GET /api/v2/jobs/{id}
 * Get a specific job by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Authenticate and check permissions
  const authResult = await withV2Auth(request, ['jobs:read']);
  
  if ('error' in authResult && authResult.error) {
    return authResult.error;
  }
  
  if (!('authContext' in authResult) || !authResult.authContext) {
    return createV2ErrorResponse('Authentication failed', 'AUTH_FAILED', 401);
  }
  
  const authContext = authResult.authContext;

  try {
    const resolvedParams = await params;
    const jobId = resolvedParams.id;

    // Fetch job and verify it belongs to the company
    const job = await db
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
        applicationDeadline: jobCampaigns.applicationDeadline,
        status: jobCampaigns.status,
        createdAt: jobCampaigns.createdAt,
        updatedAt: jobCampaigns.updatedAt,
      })
      .from(jobCampaigns)
      .where(and(
        eq(jobCampaigns.id, jobId),
        eq(jobCampaigns.companyId, authContext.token.companyId)
      ))
      .limit(1);

    if (job.length === 0) {
      return createV2ErrorResponse(
        'Job not found',
        'JOB_NOT_FOUND',
        404
      );
    }

    return createV2Response(
      job[0],
      200,
      'Job retrieved successfully'
    );

  } catch (error) {
    console.error('Error fetching job:', error);
    return createV2ErrorResponse(
      'Failed to fetch job',
      'FETCH_JOB_ERROR',
      500
    );
  }
}

/**
 * PUT /api/v2/jobs/{id}
 * Update a specific job by ID
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Validate method
  const methodError = validateMethod(request, ['PUT']);
  if (methodError) return methodError;

  // Authenticate and check permissions
  const authResult = await withV2Auth(request, ['jobs:write']);
  
  if ('error' in authResult && authResult.error) {
    return authResult.error;
  }
  
  if (!('authContext' in authResult) || !authResult.authContext) {
    return createV2ErrorResponse('Authentication failed', 'AUTH_FAILED', 401);
  }
  
  const authContext = authResult.authContext;

  // Parse and validate request body
  const { body, error: bodyError } = await parseJsonBody(request);
  if (bodyError) return bodyError;

  try {
    const resolvedParams = await params;
    const jobId = resolvedParams.id;
    const validatedData = updateJobSchema.parse(body);

    // Verify job exists and belongs to the company
    const existingJob = await db
      .select({ id: jobCampaigns.id })
      .from(jobCampaigns)
      .where(and(
        eq(jobCampaigns.id, jobId),
        eq(jobCampaigns.companyId, authContext.token.companyId)
      ))
      .limit(1);

    if (existingJob.length === 0) {
      return createV2ErrorResponse(
        'Job not found',
        'JOB_NOT_FOUND',
        404
      );
    }

    // Update job
    const updateData: any = {
      ...validatedData,
      updatedAt: new Date()
    };
    
    // Convert applicationDeadline string to Date if provided
    if (validatedData.applicationDeadline) {
      updateData.applicationDeadline = new Date(validatedData.applicationDeadline);
    }
    
    const [updatedJob] = await db
      .update(jobCampaigns)
      .set(updateData)
      .where(and(
        eq(jobCampaigns.id, jobId),
        eq(jobCampaigns.companyId, authContext.token.companyId)
      ))
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
        applicationDeadline: jobCampaigns.applicationDeadline,
        status: jobCampaigns.status,
        createdAt: jobCampaigns.createdAt,
        updatedAt: jobCampaigns.updatedAt,
      });

    return createV2Response(
      updatedJob,
      200,
      'Job updated successfully'
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createV2ErrorResponse(
        'Invalid request data',
        'VALIDATION_ERROR',
        400,
        error.errors
      );
    }

    console.error('Error updating job:', error);
    return createV2ErrorResponse(
      'Failed to update job',
      'UPDATE_JOB_ERROR',
      500
    );
  }
}

/**
 * DELETE /api/v2/jobs/{id}
 * Delete a specific job by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Validate method
  const methodError = validateMethod(request, ['DELETE']);
  if (methodError) return methodError;

  // Authenticate and check permissions
  const authResult = await withV2Auth(request, ['jobs:write']);
  
  if ('error' in authResult && authResult.error) {
    return authResult.error;
  }
  
  if (!('authContext' in authResult) || !authResult.authContext) {
    return createV2ErrorResponse('Authentication failed', 'AUTH_FAILED', 401);
  }
  
  const authContext = authResult.authContext;

  try {
    const resolvedParams = await params;
    const jobId = resolvedParams.id;

    // Verify job exists and belongs to the company
    const existingJob = await db
      .select({ id: jobCampaigns.id })
      .from(jobCampaigns)
      .where(and(
        eq(jobCampaigns.id, jobId),
        eq(jobCampaigns.companyId, authContext.token.companyId)
      ))
      .limit(1);

    if (existingJob.length === 0) {
      return createV2ErrorResponse(
        'Job not found',
        'JOB_NOT_FOUND',
        404
      );
    }

    // Delete job
    await db
      .delete(jobCampaigns)
      .where(and(
        eq(jobCampaigns.id, jobId),
        eq(jobCampaigns.companyId, authContext.token.companyId)
      ));

    return createV2Response(
      { id: jobId },
      200,
      'Job deleted successfully'
    );

  } catch (error) {
    console.error('Error deleting job:', error);
    return createV2ErrorResponse(
      'Failed to delete job',
      'DELETE_JOB_ERROR',
      500
    );
  }
}