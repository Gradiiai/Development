// /api/question-bank/banks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { questionCollections, questions } from '@/lib/database/schema';
import { eq, and, desc, count } from 'drizzle-orm';

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

    // First get all question collections
    const collections = await db
      .select()
      .from(questionCollections)
      .where(and(
        eq(questionCollections.companyId, companyId),
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
    if (!companyId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Required fields missing' },
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
        isPublic: isPublic || false,
        collectionType,
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
