import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { questionCollections, questions } from '@/lib/database/schema';
import { eq, and, desc, ilike, or, isNull } from 'drizzle-orm';
import { validateCompanyId } from '@/lib/api/utils';
// Dependency checking removed - using database foreign keys instead

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const bankId = params.id;
    
    const companyValidation = validateCompanyId(session.user.companyId);
    if (!companyValidation.success) {
      return companyValidation.response;
    }
    const companyId = companyValidation.companyId;

    const [collection] = await db
      .select()
      .from(questionCollections)
      .where(and(
        eq(questionCollections.id, bankId),
        or(
          eq(questionCollections.companyId, companyId), // Own company
          eq(questionCollections.isPublic, true), // Public banks
          isNull(questionCollections.companyId) // System templates
        )
      ));

    if (!collection) {
      return NextResponse.json({ success: false, error: 'Question collection not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const questionType = searchParams.get('questionType');
    const search = searchParams.get('search');

    // Since we already verified collection access above, just get questions from this collection
    const whereConditions = [
      eq(questions.collectionId, bankId),
      eq(questions.isActive, true),
    ];

    if (questionType && questionType !== 'all') {
      whereConditions.push(eq(questions.questionType, questionType));
    }

    if (search) {
      whereConditions.push(ilike(questions.question, `%${search}%`));
    }

    const collectionQuestions = await db
      .select()
      .from(questions)
      .where(and(...whereConditions))
      .orderBy(desc(questions.createdAt));

    return NextResponse.json({ success: true, data: { collection, questions: collectionQuestions } });
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
    
    const companyValidation = validateCompanyId(session.user.companyId);
    if (!companyValidation.success) {
      return companyValidation.response;
    }
    const companyId = companyValidation.companyId;

    if (!body.name || !body.category) {
      return NextResponse.json({ success: false, error: 'Name and category are required' }, { status: 400 });
    }

    const [updatedCollection] = await db
      .update(questionCollections)
      .set({
        name: body.name,
        description: body.description || null,
        category: body.category,
        subCategory: body.subCategory || null,
        tags: body.tags ? JSON.stringify(Array.isArray(body.tags) ? body.tags : body.tags.split(',').map((t: string) => t.trim())) : null,
        isPublic: body.isPublic || false,
        collectionType: body.collectionType || 'custom',
        updatedAt: new Date(),
      })
      .where(and(
        eq(questionCollections.id, bankId),
        eq(questionCollections.companyId, companyId)
      ))
      .returning();

    if (!updatedCollection) {
      return NextResponse.json({ success: false, error: 'Question collection not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedCollection });
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
    
    const companyValidation = validateCompanyId(session.user.companyId);
    if (!companyValidation.success) {
      return companyValidation.response;
    }
    const companyId = companyValidation.companyId;

    // Simple deletion - database foreign keys will prevent issues

    // Check if the question collection exists and belongs to the company
    const [existingCollection] = await db
      .select()
      .from(questionCollections)
      .where(and(
        eq(questionCollections.id, bankId),
        eq(questionCollections.companyId, companyId)
      ))
      .limit(1);

    if (!existingCollection) {
      return NextResponse.json({ success: false, error: 'Question collection not found' }, { status: 404 });
    }

    // Soft delete the question collection
    const [deletedCollection] = await db
      .update(questionCollections)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(and(
        eq(questionCollections.id, bankId),
        eq(questionCollections.companyId, companyId)
      ))
      .returning();

    return NextResponse.json({ 
      success: true, 
      data: deletedCollection,
      message: 'Question collection deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting question bank:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete question bank' }, { status: 500 });
  }
}
