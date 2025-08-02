import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from "@/auth";
import { getCandidatesByCampaign } from '@/lib/database/queries/campaigns';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: campaignId } = await params;
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const status = searchParams.get('status') || undefined;
    const source = searchParams.get('source') || undefined;
    const search = searchParams.get('search') || undefined;
    const minScore = searchParams.get('minScore') ? parseInt(searchParams.get('minScore')!) : undefined;
    const maxScore = searchParams.get('maxScore') ? parseInt(searchParams.get('maxScore')!) : undefined;

    // Build filters object
    const filters = {
      status,
      source,
      search,
      minScore,
      maxScore
    };

    // Remove undefined values
    Object.keys(filters).forEach(key => {
      if (filters[key as keyof typeof filters] === undefined) {
        delete filters[key as keyof typeof filters];
      }
    });

    const result = await getCandidatesByCampaign(campaignId, Object.keys(filters).length > 0 ? filters : undefined);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch candidates' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error: any) {
    console.error('Error fetching campaign candidates:', error);
    
    // Handle specific database connection errors
    if (error?.message?.includes('Connect Timeout') || error?.code === 'UND_ERR_CONNECT_TIMEOUT') {
      return NextResponse.json(
        { 
          error: 'Database connection timeout. Please try again in a moment.',
          code: 'DB_TIMEOUT'
        },
        { status: 503 }
      );
    }
    
    if (error?.message?.includes('fetch failed') || error?.code === 'ENOTFOUND') {
      return NextResponse.json(
        { 
          error: 'Unable to connect to database. Please check your connection.',
          code: 'DB_CONNECTION_FAILED'
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}