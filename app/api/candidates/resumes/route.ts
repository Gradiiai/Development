import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { candidates, jobCampaigns } from '@/lib/database/schema';
import { eq, and, or, ilike, desc, count } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const standaloneCandidateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  email: z.string().email('Valid email is required').max(255, 'Email too long'),
  phone: z.string().optional(),
  location: z.string().optional(),
});

// GET - Fetch standalone candidates (not tied to campaigns)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query conditions
    const conditions = [];
    
    // Add filter for standalone candidates by joining with jobCampaigns
    // to find candidates in the "Resume Upload - Standalone" campaign
    const standaloneCampaign = await db.select({ id: jobCampaigns.id })
      .from(jobCampaigns)
      .where(
        and(
          eq(jobCampaigns.companyId, session.user.companyId),
          eq(jobCampaigns.campaignName, 'Resume Upload - Standalone')
        )
      )
      .limit(1);
    
    if (standaloneCampaign.length > 0) {
      conditions.push(eq(candidates.campaignId, standaloneCampaign[0].id));
    } else {
      // If no standalone campaign exists, return empty results
      return NextResponse.json({
        success: true,
        candidates: [],
        pagination: {
          total: 0,
          limit,
          offset,
          hasMore: false
        },
        message: 'No standalone candidates found'
      });
    }

    // Add search filter if provided
    if (search) {
      conditions.push(
        or(
          ilike(candidates.name, `%${search}%`),
          ilike(candidates.email, `%${search}%`)
        )
      );
    }

    const result = await db.select({
      id: candidates.id,
      name: candidates.name,
      email: candidates.email,
      phone: candidates.phone,
      location: candidates.location,
      resumeUrl: candidates.resumeUrl,
      aiParsedData: candidates.aiParsedData,
      overallScore: candidates.overallScore,
      createdAt: candidates.appliedAt,
      updatedAt: candidates.updatedAt,
    })
    .from(candidates)
    .where(and(...conditions))
    .limit(limit)
    .offset(offset)
    .orderBy(desc(candidates.appliedAt));

    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: count() })
      .from(candidates)
      .where(and(...conditions));
    
    const totalCount = totalCountResult[0].count;

    return NextResponse.json({
      success: true,
      candidates: result,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: totalCount > offset + limit
      },
      message: 'Standalone candidates retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching standalone candidates:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch candidates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Create a new standalone candidate
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    let requestData;
    try {
      requestData = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON data provided' },
        { status: 400 }
      );
    }

    // Validate request data
    const validation = standaloneCandidateSchema.safeParse(requestData);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        },
        { status: 400 }
      );
    }

    const { name, email, phone, location } = validation.data;

    // Check if candidate with this email already exists in the company
    const existingCandidate = await db.select()
      .from(candidates)
      .innerJoin(jobCampaigns, eq(candidates.campaignId, jobCampaigns.id))
      .where(
        and(
          eq(candidates.email, email.toLowerCase().trim()),
          eq(jobCampaigns.companyId, session.user.companyId)
        )
      )
      .limit(1);

    if (existingCandidate.length > 0) {
      return NextResponse.json(
        { error: 'A candidate with this email already exists' },
        { status: 409 }
      );
    }

    // Create new standalone candidate
    const candidateId = uuidv4();
    
    // For standalone candidates, we need to create a special campaign or handle null campaignId
    // Since the schema requires campaignId to be NOT NULL and reference jobCampaigns,
    // we'll create a default "Resume Upload" campaign for this company if it doesn't exist
    let defaultCampaignId;
    try {
      // Check if a default resume-upload campaign exists for this company
      const existingCampaign = await db.select()
        .from(jobCampaigns)
        .where(
          and(
            eq(jobCampaigns.companyId, session.user.companyId),
            eq(jobCampaigns.campaignName, 'Resume Upload - Standalone')
          )
        )
        .limit(1);
      
      if (existingCampaign.length > 0) {
        defaultCampaignId = existingCampaign[0].id;
      } else {
        // Create a default campaign for standalone candidates
        const defaultCampaign = await db.insert(jobCampaigns)
          .values({
            campaignName: 'Resume Upload - Standalone',
            jobTitle: 'General Position',
            department: 'General',
            location: 'Various',
            experienceLevel: 'Any',
            employeeType: 'Full-time',
            numberOfOpenings: 999,
            jobDescription: 'Default campaign for standalone resume uploads',
            status: 'active',
            createdBy: session.user.id!,
            companyId: session.user.companyId!,
          })
          .returning({ id: jobCampaigns.id });
        
        defaultCampaignId = defaultCampaign[0].id;
      }
    } catch (campaignError) {
      console.error('Error handling default campaign:', campaignError);
      return NextResponse.json(
        { error: 'Failed to setup default campaign for standalone candidates' },
        { status: 500 }
      );
    }

    const candidateData = {
      id: candidateId,
      campaignId: defaultCampaignId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || null,
      location: location?.trim() || null,
      source: 'manual_standalone',
      status: 'applied',
      appliedAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.insert(candidates)
      .values(candidateData)
      .returning({
        id: candidates.id,
        name: candidates.name,
        email: candidates.email,
        phone: candidates.phone,
        location: candidates.location,
        resumeUrl: candidates.resumeUrl,
        aiParsedData: candidates.aiParsedData,
        overallScore: candidates.overallScore,
        createdAt: candidates.appliedAt,
        updatedAt: candidates.updatedAt,
      });

    if (result.length === 0) {
      throw new Error('Failed to create candidate in database');
    }

    return NextResponse.json({
      success: true,
      candidate: result[0],
      message: 'Standalone candidate created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating standalone candidate:', error);
    return NextResponse.json(
      {
        error: 'Failed to create candidate',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT - Update an existing standalone candidate
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    let requestData;
    try {
      requestData = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON data provided' },
        { status: 400 }
      );
    }

    const { id, ...updateData } = requestData;
    if (!id) {
      return NextResponse.json(
        { error: 'Candidate ID is required' },
        { status: 400 }
      );
    }

    // Validate update data
    const validation = standaloneCandidateSchema.partial().safeParse(updateData);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        },
        { status: 400 }
      );
    }

    // Check if candidate exists and belongs to the company
    const existingCandidate = await db.select({
        id: candidates.id,
        campaignId: candidates.campaignId
      })
      .from(candidates)
      .innerJoin(jobCampaigns, eq(candidates.campaignId, jobCampaigns.id))
      .where(
        and(
          eq(candidates.id, id),
          eq(jobCampaigns.companyId, session.user.companyId),
          eq(jobCampaigns.campaignName, 'Resume Upload - Standalone')
        )
      )
      .limit(1);

    if (existingCandidate.length === 0) {
      return NextResponse.json(
        { error: 'Candidate not found or access denied' },
        { status: 404 }
      );
    }

    // Check for email conflicts if email is being updated
    if (validation.data.email) {
      const emailConflict = await db.select({ id: candidates.id })
        .from(candidates)
        .innerJoin(jobCampaigns, eq(candidates.campaignId, jobCampaigns.id))
        .where(
          and(
            eq(candidates.email, validation.data.email.toLowerCase().trim()),
            eq(jobCampaigns.companyId, session.user.companyId)
          )
        )
        .limit(1);

      if (emailConflict.length > 0 && emailConflict[0].id !== id) {
        return NextResponse.json(
          { error: 'Email is already used by another candidate' },
          { status: 409 }
        );
      }
    }

    // Prepare update data
    const updateFields: any = {
      updatedAt: new Date(),
    };

    if (validation.data.name) {
      updateFields.name = validation.data.name.trim();
    }
    if (validation.data.email) {
      updateFields.email = validation.data.email.toLowerCase().trim();
    }
    if (validation.data.phone !== undefined) {
      updateFields.phone = validation.data.phone?.trim() || null;
    }
    if (validation.data.location !== undefined) {
      updateFields.location = validation.data.location?.trim() || null;
    }

    // Update candidate
    const result = await db.update(candidates)
      .set(updateFields)
      .where(
        and(
          eq(candidates.id, id),
          eq(candidates.campaignId, existingCandidate[0].campaignId)
        )
      )
      .returning({
        id: candidates.id,
        name: candidates.name,
        email: candidates.email,
        phone: candidates.phone,
        location: candidates.location,
        resumeUrl: candidates.resumeUrl,
        aiParsedData: candidates.aiParsedData,
        overallScore: candidates.overallScore,
        createdAt: candidates.appliedAt,
        updatedAt: candidates.updatedAt,
      });

    if (result.length === 0) {
      throw new Error('Failed to update candidate in database');
    }

    return NextResponse.json({
      success: true,
      candidate: result[0],
      message: 'Candidate updated successfully'
    });

  } catch (error) {
    console.error('Error updating standalone candidate:', error);
    return NextResponse.json(
      {
        error: 'Failed to update candidate',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete a standalone candidate
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const candidateId = searchParams.get('id');

    if (!candidateId) {
      return NextResponse.json(
        { error: 'Candidate ID is required' },
        { status: 400 }
      );
    }

    // Check if candidate exists and belongs to the company
    const existingCandidate = await db.select({
        id: candidates.id,
        resumeUrl: candidates.resumeUrl,
        name: candidates.name,
        campaignId: candidates.campaignId
      })
      .from(candidates)
      .innerJoin(jobCampaigns, eq(candidates.campaignId, jobCampaigns.id))
      .where(
        and(
          eq(candidates.id, candidateId),
          eq(jobCampaigns.companyId, session.user.companyId),
          eq(jobCampaigns.campaignName, 'Resume Upload - Standalone')
        )
      )
      .limit(1);

    if (existingCandidate.length === 0) {
      return NextResponse.json(
        { error: 'Candidate not found or access denied' },
        { status: 404 }
      );
    }

    // TODO: Delete resume file from Azure Blob Storage if exists
    // if (existingCandidate[0].resumeUrl) {
    //   try {
    //     await azureStorageService.deleteResume(resumeFileName);
    //   } catch (storageError) {
    //     console.warn('Failed to delete resume file from storage:', storageError);
    //     // Continue with database deletion even if file deletion fails
    //   }
    // }

    // Delete candidate from database
    await db.delete(candidates)
      .where(
        and(
          eq(candidates.id, candidateId),
          eq(candidates.campaignId, existingCandidate[0].campaignId)
        )
      );

    return NextResponse.json({
      success: true,
      message: `Candidate "${existingCandidate[0].name}" deleted successfully`
    });

  } catch (error) {
    console.error('Error deleting standalone candidate:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete candidate',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}