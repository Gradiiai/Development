// /api/question-bank/banks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { questionCollections, questions } from '@/lib/database/schema';
import { eq, and, desc, count, or, isNull } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const companyId = session.user.companyId;
    if (!companyId) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Get question collections that the user can access:
    // 1. Their own company's question banks
    // 2. Public question banks from other companies  
    // 3. System templates (companyId = null)
    const collections = await db
      .select()
      .from(questionCollections)
      .where(and(
        or(
          eq(questionCollections.companyId, companyId), // Own company
          eq(questionCollections.isPublic, true), // Public banks
          isNull(questionCollections.companyId) // System templates
        ),
        eq(questionCollections.isActive, true)
      ))
      .orderBy(desc(questionCollections.createdAt));

    // For each collection, get question counts by type
    const collectionsWithQuestionTypes = await Promise.all(
      collections.map(async (collection) => {
        // Get all questions for this collection
        const collectionQuestions = await db
          .select({
            questionType: questions.questionType
          })
          .from(questions)
          .where(and(
            eq(questions.collectionId, collection.id),
            eq(questions.companyId, companyId),
            eq(questions.isActive, true)
          ));

        // Count questions by type
        const typeMap: Record<string, number> = {};
        for (const q of collectionQuestions) {
          typeMap[q.questionType] = (typeMap[q.questionType] || 0) + 1;
        }

        const questionTypes = Object.entries(typeMap).map(([type, count]) => ({
          type,
          count,
        }));

        return {
          id: collection.id,
          name: collection.name,
          description: collection.description,
          category: collection.category,
          subCategory: collection.subCategory,
          tags: collection.tags,
          isActive: collection.isActive,
          isPublic: collection.isPublic,
          collectionType: collection.collectionType,
          questionCount: collectionQuestions.length,
          questionTypes, // Add question types with counts
          usageCount: collection.usageCount,
          lastUsedAt: collection.lastUsedAt,
          createdAt: collection.createdAt,
          updatedAt: collection.updatedAt,
        };
      })
    );

    return NextResponse.json({ success: true, data: collectionsWithQuestionTypes });
  } catch (error) {
    console.error('Error fetching question banks:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch question banks' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, category, subCategory, description, tags, isPublic, collectionType = 'custom' } = body;
    const companyId = session.user.companyId;
    const userId = session.user.id;

    if (!name || !category) {
      return NextResponse.json({ success: false, error: 'Name and category are required' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // For super admins, allow creating system-wide question banks (companyId can be null)
    if (!companyId && session.user.role !== 'super-admin') {
      return NextResponse.json(
        { success: false, error: 'Company ID is required for non-admin users' },
        { status: 400 }
      );
    }

    const [newCollection] = await db
      .insert(questionCollections)
      .values({
        companyId,
        createdBy: userId,
        name,
        description: description || null,
        category,
        subCategory: subCategory || null,
        tags: tags ? JSON.stringify(Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim())) : null,
        isPublic: isPublic || (session.user.role === 'super-admin'), // Auto-mark super admin question banks as public
        collectionType: session.user.role === 'super-admin' ? 'system_template' : collectionType,
        questionCount: 0,
        usageCount: 0,
      })
      .returning();

    return NextResponse.json({ success: true, data: newCollection });
  } catch (error) {
    console.error('Error creating question bank:', error);
    return NextResponse.json({ success: false, error: 'Failed to create question bank' }, { status: 500 });
  }
}
