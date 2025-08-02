import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { createCandidate, getCandidates, getCandidatesByCompany } from '@/lib/database/queries/campaigns';
import { z } from 'zod';

const candidateSchema = z.object({
  campaignId: z.string().min(1, 'Campaign ID is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  resumeUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  portfolioUrl: z.string().optional(),
  experience: z.string().optional(),
  currentCompany: z.string().optional(),
  currentRole: z.string().optional(),
  skills: z.string().optional(),
  source: z.string().min(1, 'Source is required'),
  aiParsedData: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = candidateSchema.parse(body);

    // Combine firstName and lastName into name for the database function
    const candidateData = {
      ...validatedData,
      name: `${validatedData.firstName} ${validatedData.lastName}`.trim()
    };
    
    // Remove firstName and lastName as they're not expected by createCandidate
    const { firstName, lastName, ...dataForDb } = candidateData;

    const result = await createCandidate(dataForDb);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/candidates:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const companyId = searchParams.get('companyId');
    const status = searchParams.get('status') || undefined;
    const source = searchParams.get('source') || undefined;
    const search = searchParams.get('search') || undefined;
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // If companyId is provided, get all candidates for the company
    if (companyId) {
      const filters = {
        status,
        source,
        search,
        campaignId: campaignId || undefined
      };
      
      // Remove undefined values from filters
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof typeof filters] === undefined) {
          delete filters[key as keyof typeof filters];
        }
      });
      
      const result = await getCandidatesByCompany(companyId, Object.keys(filters).length > 0 ? filters : undefined);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        );
      }

      return NextResponse.json(result.data);
    }
    
    // If campaignId is provided, get candidates for specific campaign
    if (campaignId) {
      const result = await getCandidates(campaignId, limit, offset, status);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        candidates: result.data
      });
    }

    return NextResponse.json(
      { error: 'Either campaignId or companyId is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in GET /api/candidates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/candidates?id=candidateId
 * 
 * Deletes a candidate and all related data using the comprehensive deletion endpoint
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
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

    // Import and call the delete function directly
    const { DELETE: deleteCandidate } = await import('../[id]/delete/route');
    const response = await deleteCandidate(request, { params: Promise.resolve({ id: candidateId }) });
    
    return response;

  } catch (error) {
    console.error('Error in DELETE /api/candidates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}