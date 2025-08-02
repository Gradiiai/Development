import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { createInterviewSetup, getInterviewSetups } from '@/lib/database/queries/campaigns';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      campaignId,
      roundName,
      roundType,
      timeLimit,
      numberOfQuestions,
      difficulty,
      passingScore,
      instructions,
      roundOrder
    } = body;

    // Validate required fields
    if (!campaignId || !roundName || !roundType || timeLimit === undefined || numberOfQuestions === undefined || passingScore === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await createInterviewSetup({
      campaignId,
      roundNumber: roundOrder ? parseInt(roundOrder) : 1,
      roundName,
      interviewType: roundType,
      timeLimit: parseInt(timeLimit),
      numberOfQuestions: parseInt(numberOfQuestions),
      difficultyLevel: difficulty,
      instructions,
      passingScore: parseInt(passingScore)
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
    console.error('Error in interview setup API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
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

    const result = await getInterviewSetups(campaignId);

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
    console.error('Error in interview setup GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}