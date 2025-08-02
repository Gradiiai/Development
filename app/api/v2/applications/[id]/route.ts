import { NextRequest } from 'next/server';
import { db } from '@/lib/database/connection';
import { candidates, jobCampaigns } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import {
  withV2Auth,
  createV2Response,
  createV2ErrorResponse,
  validateMethod,
  parseJsonBody
} from '../../middleware';

// Validation schema for application updates
const updateApplicationSchema = z.object({
  status: z.enum(['applied', 'screening', 'interview', 'offer', 'hired', 'rejected']).optional(),
  notes: z.string().optional(),
  overallScore: z.number().min(0).max(100).optional(),
  talentFitScore: z.number().min(0).max(100).optional(),
  expectedSalary: z.number().min(0).optional(),
  noticePeriod: z.string().optional(),
  location: z.string().optional(),
  educationLevel: z.string().optional(),
  educationInstitution: z.string().optional()
});

// GET /api/v2/applications/{id}
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Authenticate and check permissions
  const authResult = await withV2Auth(request, ['applications:read']);
  
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
    const resolvedParams = await params;
    const applicationId = resolvedParams.id;

    if (!applicationId) {
      return createV2ErrorResponse('Application ID is required', 'INVALID_ID', 400);
    }

    // Get application (candidate) with related campaign data
    const application = await db
      .select({
        id: candidates.id,
        campaignId: candidates.campaignId,
        name: candidates.name,
        email: candidates.email,
        phone: candidates.phone,
        resumeUrl: candidates.resumeUrl,
        linkedinUrl: candidates.linkedinUrl,
        portfolioUrl: candidates.portfolioUrl,
        experience: candidates.experience,
        currentCompany: candidates.currentCompany,
        currentRole: candidates.currentRole,
        skills: candidates.skills,
        source: candidates.source,
        status: candidates.status,
        overallScore: candidates.overallScore,
        talentFitScore: candidates.talentFitScore,
        aiParsedData: candidates.aiParsedData,
        notes: candidates.notes,
        appliedAt: candidates.appliedAt,
        updatedAt: candidates.updatedAt,
        lastContactedAt: candidates.lastContactedAt,
        expectedSalary: candidates.expectedSalary,
        noticePeriod: candidates.noticePeriod,
        location: candidates.location,
        educationLevel: candidates.educationLevel,
        educationInstitution: candidates.educationInstitution,
        // Campaign info
        campaignName: jobCampaigns.campaignName,
        jobTitle: jobCampaigns.jobTitle,
        companyId: jobCampaigns.companyId
      })
      .from(candidates)
      .innerJoin(jobCampaigns, eq(candidates.campaignId, jobCampaigns.id))
      .where(and(
        eq(candidates.id, applicationId),
        eq(jobCampaigns.companyId, authContext.token.companyId)
      ))
      .limit(1);

    if (!application.length) {
      return createV2ErrorResponse('Application not found', 'APPLICATION_NOT_FOUND', 404);
    }

    // Parse skills if it's a JSON string
    const applicationData = application[0];
    if (applicationData.skills && typeof applicationData.skills === 'string') {
      try {
        applicationData.skills = JSON.parse(applicationData.skills);
      } catch (e) {
        // Keep as string if parsing fails
      }
    }

    return createV2Response(applicationData, 200, 'Application retrieved successfully');
  } catch (error) {
    console.error('Error fetching application:', error);
    return createV2ErrorResponse('Failed to fetch application', 'FETCH_ERROR', 500);
  }
}

// PUT /api/v2/applications/{id}
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Authenticate and check permissions
  const authResult = await withV2Auth(request, ['applications:write']);
  
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
    const resolvedParams = await params;
    const applicationId = resolvedParams.id;

    if (!applicationId) {
      return createV2ErrorResponse('Application ID is required', 'INVALID_ID', 400);
    }

    // Validate request method
    const methodValidation = validateMethod(request, ['PUT']);
    if (methodValidation) return methodValidation;

    // Parse and validate request body
    const bodyResult = await parseJsonBody(request);
    if (bodyResult.error) {
      return bodyResult.error;
    }

    const validationResult = updateApplicationSchema.safeParse(bodyResult.body);
    if (!validationResult.success) {
      return createV2ErrorResponse(
        'Invalid request data',
        'VALIDATION_ERROR',
        400,
        validationResult.error.errors
      );
    }

    const validatedData = validationResult.data;

    // Check if application exists and belongs to company
    const existingApplication = await db
      .select({ id: candidates.id })
      .from(candidates)
      .innerJoin(jobCampaigns, eq(candidates.campaignId, jobCampaigns.id))
      .where(and(
        eq(candidates.id, applicationId),
        eq(jobCampaigns.companyId, authContext.token.companyId)
      ))
      .limit(1);

    if (!existingApplication.length) {
      return createV2ErrorResponse('Application not found', 'APPLICATION_NOT_FOUND', 404);
    }

    // Update application (candidate)
    const updateData: any = {
      ...validatedData,
      updatedAt: new Date()
    };

    const [updatedApplication] = await db
      .update(candidates)
      .set(updateData)
      .where(eq(candidates.id, applicationId))
      .returning({
        id: candidates.id,
        campaignId: candidates.campaignId,
        name: candidates.name,
        email: candidates.email,
        phone: candidates.phone,
        resumeUrl: candidates.resumeUrl,
        linkedinUrl: candidates.linkedinUrl,
        portfolioUrl: candidates.portfolioUrl,
        experience: candidates.experience,
        currentCompany: candidates.currentCompany,
        currentRole: candidates.currentRole,
        skills: candidates.skills,
        source: candidates.source,
        status: candidates.status,
        overallScore: candidates.overallScore,
        talentFitScore: candidates.talentFitScore,
        aiParsedData: candidates.aiParsedData,
        notes: candidates.notes,
        appliedAt: candidates.appliedAt,
        updatedAt: candidates.updatedAt,
        lastContactedAt: candidates.lastContactedAt,
        expectedSalary: candidates.expectedSalary,
        noticePeriod: candidates.noticePeriod,
        location: candidates.location,
        educationLevel: candidates.educationLevel,
        educationInstitution: candidates.educationInstitution
      });

    return createV2Response(updatedApplication, 200, 'Application updated successfully');
  } catch (error) {
    console.error('Error updating application:', error);
    return createV2ErrorResponse('Failed to update application', 'UPDATE_ERROR', 500);
  }
}