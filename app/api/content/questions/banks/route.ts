// /api/question-bank/banks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { questionBanks, questionBank } from '@/lib/database/schema';
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

    const banks = await db
      .select({
        id: questionBanks.id,
        name: questionBanks.name,
        description: questionBanks.description,
        category: questionBanks.category,
        subCategory: questionBanks.subCategory,
        tags: questionBanks.tags,
        isActive: questionBanks.isActive,
        isPublic: questionBanks.isPublic,
        isTemplate: questionBanks.isTemplate,
        questionCount: count(questionBank.id),
        usageCount: questionBanks.usageCount,
        lastUsedAt: questionBanks.lastUsedAt,
        createdAt: questionBanks.createdAt,
        updatedAt: questionBanks.updatedAt,
      })
      .from(questionBanks)
      .leftJoin(questionBank, eq(questionBanks.id, questionBank.questionBankId))
      .where(and(
        eq(questionBanks.companyId, companyId),
        eq(questionBanks.isActive, true)
      ))
      .groupBy(questionBanks.id, questionBanks.usageCount, questionBanks.lastUsedAt)
      .orderBy(desc(questionBanks.createdAt));

    return NextResponse.json({ success: true, data: banks });
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
    const { name, category, subCategory, description, tags, isPublic, isTemplate } = body;
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

    const [newBank] = await db
      .insert(questionBanks)
      .values({
        companyId,
        createdBy: userId,
        name,
        description: description || null,
        category,
        subCategory: subCategory || null,
        tags: tags || null,
        isPublic: isPublic || false,
        isTemplate: isTemplate || false,
        questionCount: 0,
        usageCount: 0,
      })
      .returning();

    return NextResponse.json({ success: true, data: newBank });
  } catch (error) {
    console.error('Error creating question bank:', error);
    return NextResponse.json({ success: false, error: 'Failed to create question bank' }, { status: 500 });
  }
}
