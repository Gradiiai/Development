import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/database/connection';
import { candidates, jobCampaigns } from '@/lib/database/schema';
import { eq, and, ilike, desc, asc, count } from 'drizzle-orm';
import { withV2Auth, createV2Response, createV2ErrorResponse, validateMethod, parseJsonBody, extractPagination, extractSorting } from '../middleware';

// Validation schemas
const createCandidateSchema = z.object({
  campaignId: z.string().uuid('Invalid campaign ID'),
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email address').max(255),
  phone: z.string().max(50).optional(),
  resumeUrl: z.string().url('Invalid resume URL').max(500).optional(),
  linkedinUrl: z.string().url('Invalid LinkedIn URL').max(500).optional(),
  portfolioUrl: z.string().url('Invalid portfolio URL').max(500).optional(),
  experience: z.string().max(100).optional(),
  currentCompany: z.string().max(255).optional(),
  currentRole: z.string().max(255).optional(),
  skills: z.string().optional(), // JSON string of skills
  source: z.enum(['manual', 'linkedin', 'indeed', 'naukri', 'referral', 'website']).default('manual'),
  expectedSalary: z.number().int().positive().optional(),
  noticePeriod: z.number().int().min(0).optional(), // in days
  location: z.string().max(255).optional(),
  educationLevel: z.string().max(255).optional(),
  educationInstitution: z.string().max(255).optional(),
  notes: z.string().optional()
});

const updateCandidateSchema = createCandidateSchema.partial().omit({ campaignId: true });

/**
 * GET /api/v2/candidates
 * List candidates with filtering, pagination, and sorting
 */
export async function GET(request: NextRequest) {
  // Authenticate and check permissions
  const authResult = await withV2Auth(request, ['candidates:read']);
  
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
      'name', 'email', 'status', 'overallScore', 'appliedAt', 'updatedAt'
    ]);
    if (sortingResult.error) {
      return sortingResult.error;
    }
    const { sortBy, sortOrder } = sortingResult;

    // Build filters
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
      
      conditions.push(eq(candidates.campaignId, campaignId));
    } else {
      // If no specific campaign, filter by company campaigns
      const companyCampaigns = await db.select({ id: jobCampaigns.id })
        .from(jobCampaigns)
        .where(eq(jobCampaigns.companyId, authContext.token.companyId));
      
      const campaignIds = companyCampaigns.map(c => c.id);
      if (campaignIds.length === 0) {
        return createV2Response({
          candidates: [],
          meta: { page, limit, total: 0, total_pages: 0, has_next: false, has_prev: false }
        });
      }
      
      conditions.push(eq(candidates.campaignId, campaignIds[0])); // This needs to be fixed for multiple campaigns
    }

    // Search filter
    const search = searchParams.get('search');
    if (search) {
      conditions.push(ilike(candidates.name, `%${search}%`));
    }

    // Status filter
    const status = searchParams.get('status');
    if (status) {
      conditions.push(eq(candidates.status, status));
    }

    // Source filter
    const source = searchParams.get('source');
    if (source) {
      conditions.push(eq(candidates.source, source));
    }

    // Experience filter
    const experience = searchParams.get('experience');
    if (experience) {
      conditions.push(ilike(candidates.experience, `%${experience}%`));
    }

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(candidates)
      .innerJoin(jobCampaigns, eq(candidates.campaignId, jobCampaigns.id))
      .where(and(...conditions));

    const totalPages = Math.ceil(total / limit);

    // Apply sorting with proper field mapping
    let sortField;
    switch (sortBy) {
      case 'name':
        sortField = candidates.name;
        break;
      case 'email':
        sortField = candidates.email;
        break;
      case 'status':
        sortField = candidates.status;
        break;
      case 'overallScore':
        sortField = candidates.overallScore;
        break;
      case 'updatedAt':
        sortField = candidates.updatedAt;
        break;
      default:
        sortField = candidates.appliedAt;
    }
    const orderByClause = sortOrder === 'asc' ? asc(sortField) : desc(sortField);

    const candidateList = await db
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
        notes: candidates.notes,
        appliedAt: candidates.appliedAt,
        updatedAt: candidates.updatedAt,
        expectedSalary: candidates.expectedSalary,
        noticePeriod: candidates.noticePeriod,
        location: candidates.location,
        educationLevel: candidates.educationLevel,
        educationInstitution: candidates.educationInstitution,
        // Campaign info
        campaignName: jobCampaigns.campaignName,
        jobTitle: jobCampaigns.jobTitle
      })
      .from(candidates)
      .innerJoin(jobCampaigns, eq(candidates.campaignId, jobCampaigns.id))
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    return createV2Response(
      {
        candidates: candidateList,
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
      `Retrieved ${candidateList.length} candidates`
    );

  } catch (error) {
    console.error('Error fetching candidates:', error);
    return createV2ErrorResponse(
      'Failed to fetch candidates',
      'FETCH_ERROR',
      500
    );
  }
}

/**
 * POST /api/v2/candidates
 * Create a new candidate
 */
export async function POST(request: NextRequest) {
  // Validate method
  const methodError = validateMethod(request, ['POST']);
  if (methodError) return methodError;

  // Authenticate and check permissions
  const authResult = await withV2Auth(request, ['candidates:write']);
  
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
    const validatedData = createCandidateSchema.parse(body);

    // Verify campaign exists and belongs to the company
    const campaign = await db.select({ id: jobCampaigns.id })
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

    // Check if candidate with same email already exists for this campaign
    const existingCandidate = await db.select({ id: candidates.id })
      .from(candidates)
      .where(and(
        eq(candidates.email, validatedData.email),
        eq(candidates.campaignId, validatedData.campaignId)
      ))
      .limit(1);

    if (existingCandidate.length > 0) {
      return createV2ErrorResponse(
        'Candidate with this email already exists for this campaign',
        'DUPLICATE_CANDIDATE',
        409
      );
    }

    const [newCandidate] = await db
      .insert(candidates)
      .values({
        ...validatedData,
        status: 'applied',
        overallScore: 0,
        talentFitScore: 0
      })
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
        notes: candidates.notes,
        appliedAt: candidates.appliedAt,
        updatedAt: candidates.updatedAt,
        expectedSalary: candidates.expectedSalary,
        noticePeriod: candidates.noticePeriod,
        location: candidates.location,
        educationLevel: candidates.educationLevel,
        educationInstitution: candidates.educationInstitution
      });

    return createV2Response(
      newCandidate,
      201,
      'Candidate created successfully'
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

    console.error('Error creating candidate:', error);
    return createV2ErrorResponse(
      'Failed to create candidate',
      'CREATE_ERROR',
      500
    );
  }
}