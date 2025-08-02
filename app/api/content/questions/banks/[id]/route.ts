import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { questionBanks, questionBank } from '@/lib/database/schema';
import { eq, and, desc, ilike } from 'drizzle-orm';
import { checkQuestionBankDependencies } from '@/lib/services/question-bank-dependencies';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const bankId = params.id;
    const companyId = session.user.companyId;

    if (!companyId) {
      return NextResponse.json({ success: true, data: { bank: null, questions: [] } });
    }

    const [bank] = await db
      .select()
      .from(questionBanks)
      .where(and(
        eq(questionBanks.id, bankId),
        eq(questionBanks.companyId, companyId)
      ));

    if (!bank) {
      return NextResponse.json({ success: false, error: 'Question bank not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const questionType = searchParams.get('questionType');
    const search = searchParams.get('search');

    const whereConditions = [
      eq(questionBank.questionBankId, bankId),
      eq(questionBank.companyId, companyId),
      eq(questionBank.isActive, true),
    ];

    if (questionType && questionType !== 'all') {
      whereConditions.push(eq(questionBank.questionType, questionType));
    }

    if (search) {
      whereConditions.push(ilike(questionBank.question, `%${search}%`));
    }

    const questions = await db
      .select()
      .from(questionBank)
      .where(and(...whereConditions))
      .orderBy(desc(questionBank.createdAt));

    return NextResponse.json({ success: true, data: { bank, questions } });
  } catch (error) {
    console.error('Error fetching question bank:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch question bank' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const params = await context.params;
    const bankId = params.id;
    const companyId = session.user.companyId;

    if (!body.name || !body.category) {
      return NextResponse.json({ success: false, error: 'Name and category are required' }, { status: 400 });
    }

    const [updatedBank] = await db
      .update(questionBanks)
      .set({
        name: body.name,
        description: body.description || null,
        category: body.category,
        tags: body.tags || null,
        isPublic: body.isPublic || false,
        updatedAt: new Date(),
      })
      .where(and(
        eq(questionBanks.id, bankId),
        eq(questionBanks.companyId, companyId)
      ))
      .returning();

    if (!updatedBank) {
      return NextResponse.json({ success: false, error: 'Question bank not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedBank });
  } catch (error) {
    console.error('Error updating question bank:', error);
    return NextResponse.json({ success: false, error: 'Failed to update question bank' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const bankId = params.id;
    const companyId = session.user.companyId;

    if (!companyId) {
      return NextResponse.json({ success: false, error: 'Company ID not found' }, { status: 400 });
    }

    // Check for dependencies before deletion
    const dependencyInfo = await checkQuestionBankDependencies(bankId, companyId);
    
    if (!dependencyInfo.canDelete) {
      return NextResponse.json({ 
        success: false, 
        error: 'Cannot delete question bank',
        details: {
          message: 'This question bank cannot be deleted because it is currently in use.',
          blockingReasons: dependencyInfo.blockingReasons,
          dependencies: dependencyInfo.dependencies,
          activeCampaigns: dependencyInfo.activeCampaigns,
          totalInterviews: dependencyInfo.totalInterviews
        }
      }, { status: 409 }); // 409 Conflict
    }

    // Check if the question bank exists and belongs to the company
    const [existingBank] = await db
      .select()
      .from(questionBanks)
      .where(and(
        eq(questionBanks.id, bankId),
        eq(questionBanks.companyId, companyId)
      ))
      .limit(1);

    if (!existingBank) {
      return NextResponse.json({ success: false, error: 'Question bank not found' }, { status: 404 });
    }

    // Soft delete the question bank
    const [deletedBank] = await db
      .update(questionBanks)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(and(
        eq(questionBanks.id, bankId),
        eq(questionBanks.companyId, companyId)
      ))
      .returning();

    return NextResponse.json({ 
      success: true, 
      data: deletedBank,
      message: 'Question bank deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting question bank:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete question bank' }, { status: 500 });
  }
}
