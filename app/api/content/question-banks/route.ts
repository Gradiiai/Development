import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { questionBanks, questionBank } from '@/lib/database/schema';
import { eq, and, desc, ilike } from 'drizzle-orm';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSessionWithAuth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const companyId = session.user.companyId;
    const bankId = params.id;
    
    if (!companyId) {
      return NextResponse.json({ success: true, data: { bank: null, questions: [] } });
    }

    // Get the question bank details
    const [bank] = await db
      .select()
      .from(questionBanks)
      .where(and(
        eq(questionBanks.id, bankId),
        eq(questionBanks.companyId, companyId)
      ));

    if (!bank) {
      return NextResponse.json(
        { success: false, error: 'Question bank not found' },
        { status: 404 }
      );
    }

    // Extract filter parameters
    const questionType = searchParams.get('questionType');
    const search = searchParams.get('search');
    
    // Build where conditions
    const whereConditions = [
      eq(questionBank.questionBankId, bankId),
      eq(questionBank.companyId, companyId),
      eq(questionBank.isActive, true)
    ];

    if (questionType && questionType !== 'all') {
      whereConditions.push(eq(questionBank.questionType, questionType));
    }

    if (search) {
      whereConditions.push(ilike(questionBank.question, `%${search}%`));
    }

    // Get questions in the bank
    const questions = await db
      .select()
      .from(questionBank)
      .where(and(...whereConditions))
      .orderBy(desc(questionBank.createdAt));

    return NextResponse.json({ 
      success: true, 
      data: { 
        bank,
        questions 
      } 
    });
  } catch (error) {
    console.error('Error fetching question bank:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch question bank' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSessionWithAuth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const companyId = session.user.companyId;
    const bankId = params.id;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company ID is required' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.name || !body.category) {
      return NextResponse.json(
        { success: false, error: 'Name and category are required' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { success: false, error: 'Question bank not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updatedBank });
  } catch (error) {
    console.error('Error updating question bank:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update question bank' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSessionWithAuth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const companyId = session.user.companyId;
    const bankId = params.id;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company ID is required' },
        { status: 400 }
      );
    }

    // Soft delete by setting isActive to false
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

    if (!deletedBank) {
      return NextResponse.json(
        { success: false, error: 'Question bank not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: deletedBank });
  } catch (error) {
    console.error('Error deleting question bank:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete question bank' },
      { status: 500 }
    );
  }
}