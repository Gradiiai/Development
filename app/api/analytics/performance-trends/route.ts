import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
    }

    // Generate mock performance trends for the last 7 days
    const today = new Date();
    const mockPerformanceTrends = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      mockPerformanceTrends.push({
        date: date.toISOString().split('T')[0],
        mcq: Math.floor(Math.random() * 20) + 70, // 70-90% range
        coding: Math.floor(Math.random() * 15) + 75, // 75-90% range
        behavioral: Math.floor(Math.random() * 18) + 72, // 72-90% range
        combo: Math.floor(Math.random() * 16) + 74, // 74-90% range
      });
    }

    return NextResponse.json(mockPerformanceTrends);
  } catch (error) {
    console.error('Error fetching performance trends:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance trends' },
      { status: 500 }
    );
  }
} 