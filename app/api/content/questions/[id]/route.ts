import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from "@/auth";;
import {
  updateQuestion,
  deleteQuestion
} from '@/lib/database/queries/campaigns';

// PUT /api/question-bank/[id]
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSessionWithAuth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const id = params.id;
    const body = await req.json();

    // Validate required fields
    if (!body.questionType || !body.category || !body.difficultyLevel || !body.question) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Process scoring rubric if provided
    let scoringRubric = undefined;
    if (body.scoringRubric) {
      try {
        scoringRubric = JSON.parse(body.scoringRubric);
      } catch (e) {
        return NextResponse.json(
          { success: false, error: 'Invalid scoring rubric format' },
          { status: 400 }
        );
      }
    }

    const questionData = {
      questionType: body.questionType,
      category: body.category,
      difficultyLevel: body.difficultyLevel,
      question: body.question,
      expectedAnswer: body.expectedAnswer || undefined,
      sampleAnswer: body.sampleAnswer || undefined,
      scoringRubric,
      tags: body.tags || undefined,
    };

    const result = await updateQuestion(id, questionData);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in PUT /api/question-bank/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update question' },
      { status: 500 }
    );
  }
}

// DELETE /api/question-bank/[id]
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSessionWithAuth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const id = params.id;
    const result = await deleteQuestion(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in DELETE /api/question-bank/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete question' },
      { status: 500 }
    );
  }
}