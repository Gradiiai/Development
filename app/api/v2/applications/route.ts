import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/database/connection';
import { candidateApplications, candidates, jobCampaigns, candidateUsers } from '@/lib/database/schema';
import { eq, and, ilike, desc, asc, count } from 'drizzle-orm';
import { withV2Auth, createV2Response, createV2ErrorResponse, validateMethod, parseJsonBody, extractPagination, extractSorting } from '../middleware';

// Validation schemas
const createApplicationSchema = z.object({
  candidateId: z.string().uuid('Invalid candidate ID'),
  campaignId: z.string().uuid('Invalid campaign ID'),
  applicationSource: z.string().min(1, 'Application source is required').max(100),
  coverLetter: z.string().optional(),
  customAnswers: z.string().optional(),
  resumeVersion: z.string().optional(),
  expectedSalary: z.number().int().min(0).optional(),
  candidateNotes: z.string().optional()
});

const updateApplicationSchema = createApplicationSchema.partial();

/**
 * GET /api/v2/applications
 * List applications with filtering, pagination, and sorting
 */
export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = extractPagination(request);
    const sortingResult = extractSorting(request, [
      'appliedAt', 'status', 'expectedSalary', 'createdAt', 'updatedAt'
    ]);
    if (sortingResult.error) {
      return sortingResult.error;
    }
    const { sortBy, sortOrder } = sortingResult;

    // Build filters - only show applications for company's campaigns
    const conditions = [];
    
    // Filter by campaign if specified
    const campaignId = searchParams.get('campaign_id');
    if (campaignId) {
      // Verify campaign belongs to the company
      const campaign = await db.select({ id: jobCampaigns.id })
        .from(jobCampaigns)
        .where(and(
          eq(jobCampaigns.id, campaignId),
          eq(jobCampaigns.companyId, authContext.token.companyId)
        ))
        .limit(1);
      
      if (campaign.length === 0) {
        return createV2ErrorResponse('Campaign not found or access denied', 'CAMPAIGN_NOT_FOUND', 404);
      }
      
      conditions.push(eq(candidateApplications.campaignId, campaignId));
    } else {
      // Filter by company campaigns
      conditions.push(eq(jobCampaigns.companyId, authContext.token.companyId));
    }

    // Filter by candidate if specified
    const candidateId = searchParams.get('candidate_id');
    if (candidateId) {
      conditions.push(eq(candidateApplications.candidateId, candidateId));
    }

    // Status filter
    const status = searchParams.get('status');
    if (status) {
      conditions.push(eq(candidateApplications.status, status));
    }

    // Source filter
    const source = searchParams.get('source');
    if (source) {
      conditions.push(eq(candidateApplications.applicationSource, source));
    }

    // Search filter (candidate name or email)
    const search = searchParams.get('search');
    if (search) {
      conditions.push(ilike(candidateUsers.firstName, `%${search}%`));
    }

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(candidateApplications)
      .innerJoin(candidateUsers, eq(candidateApplications.candidateId, candidateUsers.id))
      .innerJoin(jobCampaigns, eq(candidateApplications.campaignId, jobCampaigns.id))
      .where(and(...conditions));

    const totalPages = Math.ceil(total / limit);

    // Apply sorting with proper field mapping
    let sortField;
    switch (sortBy) {
      case 'appliedAt':
        sortField = candidateApplications.appliedAt;
        break;
      case 'status':
        sortField = candidateApplications.status;
        break;
      case 'expectedSalary':
        sortField = candidateApplications.expectedSalary;
        break;
      case 'updatedAt':
        sortField = candidateApplications.lastUpdatedAt;
        break;
      default:
        sortField = candidateApplications.appliedAt;
    }
    const orderByClause = sortOrder === 'asc' ? asc(sortField) : desc(sortField);

    const applicationList = await db
      .select({
        id: candidateApplications.id,
        candidateId: candidateApplications.candidateId,
        campaignId: candidateApplications.campaignId,
        companyId: candidateApplications.companyId,
        applicationSource: candidateApplications.applicationSource,
        status: candidateApplications.status,
        currentStage: candidateApplications.currentStage,
        appliedAt: candidateApplications.appliedAt,
        lastUpdatedAt: candidateApplications.lastUpdatedAt,
        coverLetter: candidateApplications.coverLetter,
        customAnswers: candidateApplications.customAnswers,
        resumeVersion: candidateApplications.resumeVersion,
        overallScore: candidateApplications.overallScore,
        recruiterNotes: candidateApplications.recruiterNotes,
        candidateNotes: candidateApplications.candidateNotes,
        rejectionReason: candidateApplications.rejectionReason,
        offerDetails: candidateApplications.offerDetails,
        expectedSalary: candidateApplications.expectedSalary,
        negotiatedSalary: candidateApplications.negotiatedSalary,
        startDate: candidateApplications.startDate,
        isWithdrawn: candidateApplications.isWithdrawn,
        withdrawnAt: candidateApplications.withdrawnAt,
        withdrawnReason: candidateApplications.withdrawnReason,
        // Candidate info
        candidateFirstName: candidateUsers.firstName,
        candidateLastName: candidateUsers.lastName,
        candidateEmail: candidateUsers.email,
        candidatePhone: candidateUsers.phone,
        // Campaign info
        campaignName: jobCampaigns.campaignName,
        jobTitle: jobCampaigns.jobTitle,
        department: jobCampaigns.department,
        location: jobCampaigns.location
      })
      .from(candidateApplications)
      .innerJoin(candidateUsers, eq(candidateApplications.candidateId, candidateUsers.id))
      .innerJoin(jobCampaigns, eq(candidateApplications.campaignId, jobCampaigns.id))
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    return createV2Response(
      {
        applications: applicationList,
        meta: {
          page,
          limit,
          total,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_prev: page > 1
        }
      },
      200,
      `Retrieved ${applicationList.length} applications`
    );

  } catch (error) {
    console.error('Error fetching applications:', error);
    return createV2ErrorResponse(
      'Failed to fetch applications',
      'FETCH_ERROR',
      500
    );
  }
}

/**
 * POST /api/v2/applications
 * Create a new application
 */
export async function POST(request: NextRequest) {
  // Validate method
  const methodError = validateMethod(request, ['POST']);
  if (methodError) return methodError;

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

  // Parse and validate request body
  const { body, error: parseError } = await parseJsonBody(request);
  if (parseError) return parseError;

  try {
    const validatedData = createApplicationSchema.parse(body);

    // Verify candidate exists
    const candidate = await db
      .select({
        id: candidateUsers.id,
        firstName: candidateUsers.firstName,
        lastName: candidateUsers.lastName,
        email: candidateUsers.email
      })
      .from(candidateUsers)
      .where(eq(candidateUsers.id, validatedData.candidateId))
      .limit(1);

    if (candidate.length === 0) {
      return createV2ErrorResponse(
        'Candidate not found',
        'CANDIDATE_NOT_FOUND',
        404
      );
    }

    // Verify campaign exists and belongs to the company
    const campaign = await db
      .select({
        id: jobCampaigns.id,
        campaignName: jobCampaigns.campaignName,
        jobTitle: jobCampaigns.jobTitle
      })
      .from(jobCampaigns)
      .where(and(
        eq(jobCampaigns.id, validatedData.campaignId),
        eq(jobCampaigns.companyId, authContext.token.companyId)
      ))
      .limit(1);

    if (campaign.length === 0) {
      return createV2ErrorResponse(
        'Campaign not found or access denied',
        'CAMPAIGN_NOT_FOUND',
        404
      );
    }

    // Check if application already exists for this candidate and campaign
    const existingApplication = await db
      .select({ id: candidateApplications.id })
      .from(candidateApplications)
      .where(and(
        eq(candidateApplications.candidateId, validatedData.candidateId),
        eq(candidateApplications.campaignId, validatedData.campaignId)
      ))
      .limit(1);

    if (existingApplication.length > 0) {
      return createV2ErrorResponse(
        'Application already exists for this candidate and campaign',
        'DUPLICATE_APPLICATION',
        409
      );
    }

    const [newApplication] = await db
      .insert(candidateApplications)
      .values({
        candidateId: validatedData.candidateId,
        campaignId: validatedData.campaignId,
        companyId: authContext.token.companyId,
        applicationSource: validatedData.applicationSource,
        status: 'applied',
        appliedAt: new Date(),
        lastUpdatedAt: new Date(),
        coverLetter: validatedData.coverLetter || null,
        customAnswers: validatedData.customAnswers || null,
        resumeVersion: validatedData.resumeVersion || null,
        expectedSalary: validatedData.expectedSalary || null,
        candidateNotes: validatedData.candidateNotes || null,
        overallScore: 0,
        isWithdrawn: false
      })
      .returning({
        id: candidateApplications.id,
        candidateId: candidateApplications.candidateId,
        campaignId: candidateApplications.campaignId,
        companyId: candidateApplications.companyId,
        applicationSource: candidateApplications.applicationSource,
        status: candidateApplications.status,
        appliedAt: candidateApplications.appliedAt,
        lastUpdatedAt: candidateApplications.lastUpdatedAt,
        coverLetter: candidateApplications.coverLetter,
        customAnswers: candidateApplications.customAnswers,
        resumeVersion: candidateApplications.resumeVersion,
        expectedSalary: candidateApplications.expectedSalary,
        candidateNotes: candidateApplications.candidateNotes,
        overallScore: candidateApplications.overallScore
      });

    return createV2Response(
      {
        ...newApplication,
        candidate: {
          id: candidate[0].id,
          firstName: candidate[0].firstName,
          lastName: candidate[0].lastName,
          email: candidate[0].email
        },
        campaign: {
          id: campaign[0].id,
          name: campaign[0].campaignName,
          jobTitle: campaign[0].jobTitle
        }
      },
      201,
      'Application created successfully'
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createV2ErrorResponse(
        'Validation failed',
        'VALIDATION_ERROR',
        400,
        { errors: error.errors }
      );
    }

    console.error('Error creating application:', error);
    return createV2ErrorResponse(
      'Failed to create application',
      'CREATE_ERROR',
      500
    );
  }
}