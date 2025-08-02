import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { checkQuestionBankDependencies } from '@/lib/services/question-bank-dependencies';

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

    const dependencyInfo = await checkQuestionBankDependencies(
      id,
      session.user.companyId
    );

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