import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from "@/auth";;
import { createScoringParameter, getScoringParameters } from '@/lib/database/queries/campaigns';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      campaignId,
      parameterName,
      parameterType,
      weight,
      minScore,
      maxScore,
      description,
      criteria
    } = body;

    // Validate required fields
    if (!campaignId || !parameterName || !parameterType || weight === undefined || minScore === undefined || maxScore === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await createScoringParameter({
      campaignId,
      parameterName,
      parameterType,
      weight: parseFloat(weight),
      proficiencyLevel: description,
      isRequired: true
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('Error in scoring parameters API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    const result = await getScoringParameters(campaignId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('Error in scoring parameters GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}