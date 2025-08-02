import { NextRequest } from 'next/server';
import { withV2Auth, createV2Response, createV2ErrorResponse, validateMethod, parseJsonBody } from '../../middleware';
import { db } from '@/lib/database/db';
import { candidates, jobCampaigns } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for updating candidates
const updateCandidateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  resumeUrl: z.string().url().optional(),
  linkedinUrl: z.string().url().optional(),
  portfolioUrl: z.string().url().optional(),
  githubUrl: z.string().url().optional(),
  skills: z.array(z.string()).optional(),
  experience: z.number().min(0).optional(),
  expectedSalary: z.number().min(0).optional(),
  noticePeriod: z.string().optional(),
  location: z.string().optional(),
  educationLevel: z.string().optional(),
  educationInstitution: z.string().optional(),
  status: z.enum(['applied', 'screening', 'interview', 'offer', 'hired', 'rejected']).optional()
});

/**
 * GET /api/v2/candidates/{id}
 * Get a specific candidate by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Authenticate and check permissions
  const authResult = await withV2Auth(request, ['candidates:read']);
  
  if ('error' in authResult && authResult.error) {
    return authResult.error;
  }
  
  if (!('authContext' in authResult) || !authResult.authContext) {
    return createV2ErrorResponse('Authentication failed', 'AUTH_FAILED', 401);
  }
  
  const authContext = authResult.authContext;

  try {
    const resolvedParams = await params;
    const candidateId = resolvedParams.id;

    // Fetch candidate and verify it belongs to a campaign owned by the company
    const candidate = await db
      .select({
        id: candidates.id,
        name: candidates.name,
        email: candidates.email,
        phone: candidates.phone,
        resumeUrl: candidates.resumeUrl,
        linkedinUrl: candidates.linkedinUrl,
        portfolioUrl: candidates.portfolioUrl,
        // githubUrl field doesn't exist in schema
        skills: candidates.skills,
        experience: candidates.experience,
        expectedSalary: candidates.expectedSalary,
        noticePeriod: candidates.noticePeriod,
        location: candidates.location,
        educationLevel: candidates.educationLevel,
        educationInstitution: candidates.educationInstitution,
        status: candidates.status,
        appliedAt: candidates.appliedAt,
        updatedAt: candidates.updatedAt,
        // Campaign info
        campaignId: candidates.campaignId,
        campaignName: jobCampaigns.campaignName,
        jobTitle: jobCampaigns.jobTitle
      })
      .from(candidates)
      .innerJoin(jobCampaigns, eq(candidates.campaignId, jobCampaigns.id))
      .where(and(
        eq(candidates.id, candidateId),
        eq(jobCampaigns.companyId, authContext.token.companyId)
      ))
      .limit(1);

    if (candidate.length === 0) {
      return createV2ErrorResponse(
        'Candidate not found',
        'CANDIDATE_NOT_FOUND',
        404
      );
    }

    return createV2Response(
      candidate[0],
      200,
      'Candidate retrieved successfully'
    );

  } catch (error) {
    console.error('Error fetching candidate:', error);
    return createV2ErrorResponse(
      'Failed to fetch candidate',
      'FETCH_CANDIDATE_ERROR',
      500
    );
  }
}

/**
 * PUT /api/v2/candidates/{id}
 * Update a specific candidate by ID
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Validate method
  const methodError = validateMethod(request, ['PUT']);
  if (methodError) return methodError;

  // Authenticate and check permissions
  const authResult = await withV2Auth(request, ['candidates:write']);
  
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
    const candidateId = resolvedParams.id;
    const validatedData = updateCandidateSchema.parse(body);

    // Verify candidate exists and belongs to a campaign owned by the company
    const existingCandidate = await db
      .select({ id: candidates.id })
      .from(candidates)
      .innerJoin(jobCampaigns, eq(candidates.campaignId, jobCampaigns.id))
      .where(and(
        eq(candidates.id, candidateId),
        eq(jobCampaigns.companyId, authContext.token.companyId)
      ))
      .limit(1);

    if (existingCandidate.length === 0) {
      return createV2ErrorResponse(
        'Candidate not found',
        'CANDIDATE_NOT_FOUND',
        404
      );
    }

    // Update candidate - handle skills array conversion
    const updateData: any = {
      ...validatedData,
      updatedAt: new Date()
    };
    
    // Convert skills array to JSON string if provided
    if (validatedData.skills) {
      updateData.skills = JSON.stringify(validatedData.skills);
    }
    
    const [updatedCandidate] = await db
      .update(candidates)
      .set(updateData)
      .where(eq(candidates.id, candidateId))
      .returning({
        id: candidates.id,
        name: candidates.name,
        email: candidates.email,
        phone: candidates.phone,
        resumeUrl: candidates.resumeUrl,
        linkedinUrl: candidates.linkedinUrl,
        portfolioUrl: candidates.portfolioUrl,
        // githubUrl field doesn't exist in schema
        skills: candidates.skills,
        experience: candidates.experience,
        expectedSalary: candidates.expectedSalary,
        noticePeriod: candidates.noticePeriod,
        location: candidates.location,
        educationLevel: candidates.educationLevel,
        educationInstitution: candidates.educationInstitution,
        status: candidates.status,
        appliedAt: candidates.appliedAt,
        updatedAt: candidates.updatedAt,
      });

    return createV2Response(
      updatedCandidate,
      200,
      'Candidate updated successfully'
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

    console.error('Error updating candidate:', error);
    return createV2ErrorResponse(
      'Failed to update candidate',
      'UPDATE_CANDIDATE_ERROR',
      500
    );
  }
}

/**
 * DELETE /api/v2/candidates/{id}
 * Delete a specific candidate by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Validate method
  const methodError = validateMethod(request, ['DELETE']);
  if (methodError) return methodError;

  // Authenticate and check permissions
  const authResult = await withV2Auth(request, ['candidates:write']);
  
  if ('error' in authResult && authResult.error) {
    return authResult.error;
  }
  
  if (!('authContext' in authResult) || !authResult.authContext) {
    return createV2ErrorResponse('Authentication failed', 'AUTH_FAILED', 401);
  }
  
  const authContext = authResult.authContext;

  try {
    const resolvedParams = await params;
    const candidateId = resolvedParams.id;

    // Verify candidate exists and belongs to a campaign owned by the company
    const existingCandidate = await db
      .select({ id: candidates.id })
      .from(candidates)
      .innerJoin(jobCampaigns, eq(candidates.campaignId, jobCampaigns.id))
      .where(and(
        eq(candidates.id, candidateId),
        eq(jobCampaigns.companyId, authContext.token.companyId)
      ))
      .limit(1);

    if (existingCandidate.length === 0) {
      return createV2ErrorResponse(
        'Candidate not found',
        'CANDIDATE_NOT_FOUND',
        404
      );
    }

    // Delete candidate
    await db
      .delete(candidates)
      .where(eq(candidates.id, candidateId));

    return createV2Response(
      { id: candidateId },
      200,
      'Candidate deleted successfully'
    );

  } catch (error) {
    console.error('Error deleting candidate:', error);
    return createV2ErrorResponse(
      'Failed to delete candidate',
      'DELETE_CANDIDATE_ERROR',
      500
    );
  }
}