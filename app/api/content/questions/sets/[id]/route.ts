import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from "@/auth";
import { getQuestions } from '@/lib/database/queries/campaigns';

interface Question {
  id: string;
  category: string;
  questionType: string;
  difficultyLevel: string;
  [key: string]: any;
}

interface QuestionSet {
  type: string;
  count: number;
  difficulties: {
    easy: number;
    medium: number;
    hard: number;
  };
}

/**
 * GET /api/content/questions/sets/[id]
 * 
 * Returns question sets (MCQ, coding, behavioral, combo) for a specific question bank
 * This endpoint is used to populate the question type dropdown after selecting a bank
 * 
 * Migrated from: /api/question-bank/[id]/question-sets
 */
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const companyId = session.user.companyId;
    const params = await context.params;
    const bankId = params.id;
    
    // Check if companyId exists to prevent UUID parsing errors
    if (!companyId) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Get all questions for the company
    const result = await getQuestions({ companyId });
    
    if (!result.success || !result.data) {
      return NextResponse.json(result);
    }

    // Extract category from bankId (format: "category-index")
    const category = bankId.split('-').slice(0, -1).join('-').replace(/-/g, ' ');
    const categoryCapitalized = category.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');

    // Filter questions by category
    const categoryQuestions = result.data.filter((question: Question) => 
      question.category.toLowerCase() === categoryCapitalized.toLowerCase()
    );

    // Group questions by type and difficulty
    const questionSets: { [key: string]: QuestionSet } = {};
    
    categoryQuestions.forEach((question: Question) => {
      const type = question.questionType || 'general';
      const difficulty = question.difficultyLevel || 'medium';
      
      if (!questionSets[type]) {
        questionSets[type] = {
          type,
          count: 0,
          difficulties: {
            easy: 0,
            medium: 0,
            hard: 0
          }
        };
      }
      
      questionSets[type].count++;
      if (difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard') {
        questionSets[type].difficulties[difficulty]++;
      }
    });

    // Convert to array and format for frontend
    const formattedQuestionSets = Object.values(questionSets).map(set => ({
      id: `${bankId}-${set.type}`,
      name: `${set.type.toUpperCase()} Questions`,
      type: set.type,
      count: set.count,
      difficulties: set.difficulties,
      description: `${set.count} ${set.type} questions available`
    }));

    return NextResponse.json({
      success: true,
      data: formattedQuestionSets
    });
  } catch (error) {
    console.error('Error in GET /api/content/questions/sets/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch question sets' },
      { status: 500 }
    );
  }
} 