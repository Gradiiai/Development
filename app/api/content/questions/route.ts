import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from "@/auth";;
import {
  createQuestion,
  getQuestions,
  updateQuestion,
  deleteQuestion
} from '@/lib/database/queries/campaigns';

// GET /api/question-bank
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const companyId = session.user.companyId;
    
    // Check if companyId exists to prevent UUID parsing errors
    if (!companyId) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Extract filter parameters
    const questionBankId = searchParams.get('questionBankId') || undefined;
    const questionType = searchParams.get('questionType') || undefined;
    const category = searchParams.get('category') || undefined;
    const difficultyLevel = searchParams.get('difficultyLevel') || undefined;
    const search = searchParams.get('search') || undefined;
    const tags = searchParams.get('tags') || undefined;

    const filters = {
      questionBankId,
      questionType,
      category,
      difficultyLevel,
      search,
      tags
    };

    const result = await getQuestions({
      companyId,
      questionBankId,
      questionType,
      category,
      difficultyLevel,
      search,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/question-bank:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}

// POST /api/question-bank
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const companyId = session.user.companyId;
    const userId = session.user.id || '';

    // Check if companyId exists to prevent UUID parsing errors
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company ID is required' },
        { status: 400 }
      );
    }

    // Validate required fields including questionBankId
    if (!body.questionBankId || !body.questionType || !body.category || !body.difficultyLevel || !body.question) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields (questionBankId, questionType, category, difficultyLevel, question)' },
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
      questionBankId: body.questionBankId,
      companyId,
      createdBy: userId,
      questionType: body.questionType,
      category: body.category,
      difficultyLevel: body.difficultyLevel,
      question: body.question,
      expectedAnswer: body.expectedAnswer || undefined,
      sampleAnswer: body.sampleAnswer || undefined,
      scoringRubric,
      tags: body.tags || undefined,
    };

    const result = await createQuestion(questionData);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in POST /api/question-bank:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create question' },
      { status: 500 }
    );
  }
}