import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { getAllCandidatesByCompany } from '@/lib/database/queries/campaigns';

/**
 * GET /api/candidates
 * Fetch all candidates for a company
 */
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
    const companyId = searchParams.get('companyId');
    const status = searchParams.get('status') || undefined;
    const source = searchParams.get('source') || undefined;
    const search = searchParams.get('search') || undefined;
    const campaignId = searchParams.get('campaignId') || undefined;

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }

    // Build filters object
    const filters = {
      status,
      source,
      search,
      campaignId
    };
    
    // Remove undefined values from filters
    Object.keys(filters).forEach(key => {
      if (filters[key as keyof typeof filters] === undefined) {
        delete filters[key as keyof typeof filters];
      }
    });
    
    const result = await getAllCandidatesByCompany(
      companyId, 
      Object.keys(filters).length > 0 ? filters : undefined
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // Return the candidates array directly as expected by the frontend
    return NextResponse.json(result.data);

  } catch (error) {
    console.error('Error in GET /api/candidates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}