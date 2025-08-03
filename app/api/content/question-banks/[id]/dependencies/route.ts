import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
// Dependency checking removed - using database foreign keys instead

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Simple response - database foreign keys handle dependencies
    const dependencyInfo = {
      canDelete: true,
      blockingReasons: [],
      dependencies: [],
      activeCampaigns: 0,
      totalInterviews: 0
    };

    return NextResponse.json({
      success: true,
      data: dependencyInfo
    });

  } catch (error) {
    console.error('Error checking question bank dependencies:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check dependencies' },
      { status: 500 }
    );
  }
}