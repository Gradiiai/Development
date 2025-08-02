import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from "@/auth";;
import { getQuestions } from '@/lib/database/queries/campaigns';
import { questionBanks, questionBank } from '@/lib/database/schema';
import { db } from '@/lib/database/connection';
import { eq, and, desc, ilike } from 'drizzle-orm';


interface Question {
  id: string;
  category: string;
  difficultyLevel: string;
  [key: string]: any; // For other properties
}

interface QuestionsByCategory {
  [category: string]: Question[];
}

/**
 * GET /api/question-bank/categories
 * 
 * Returns a list of question banks grouped by category for use in interview setup
 * This endpoint is used to populate the question bank dropdown in the interview setup page
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const companyId = session.user.companyId;
    if (!companyId) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Fetch all question banks for the company
const banks = await db
      .select()
      .from(questionBanks)
      .where(
        and(
          eq(questionBanks.companyId, companyId),
          eq(questionBanks.isActive, true)
        )
      );

    // For each bank, get the number of questions and their types
    const bankResults = await Promise.all(
      banks.map(async (bank) => {
        const questions = await db
          .select({
            questionType: questionBank.questionType
          })
          .from(questionBank)
          .where(and(
            eq(questionBank.questionBankId, bank.id),
            eq(questionBank.companyId, companyId),
            eq(questionBank.isActive, true)
          ));

    const typeMap: Record<string, number> = {};
    for (const q of questions) {
      typeMap[q.questionType] = (typeMap[q.questionType] || 0) + 1;
    }

    const questionTypes = Object.entries(typeMap).map(([type, count]) => ({
      type,
      count,
    }));

    return {
      ...bank,
      questionCount: questions.length,
      questionTypes,
        isActive: bank.isActive,

    };
  })
);
    return NextResponse.json({
      success: true,
      data: bankResults
    });
  } catch (error) {
    console.error('Error fetching question banks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch question banks' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get the most common value in an array
 */
function getMostCommonValue<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  
  const counts: Record<string, number> = {};
  
  // Count occurrences of each value
  arr.forEach((value) => {
    const key = String(value);
    counts[key] = (counts[key] || 0) + 1;
  });
  
  // Find the key with the highest count
  let maxCount = 0;
  let mostCommonKey = '';
  
  Object.entries(counts).forEach(([key, count]) => {
    if (count > maxCount) {
      maxCount = count;
      mostCommonKey = key;
    }
  });
  
  // Find the original value that corresponds to the most common key
  const originalValue = arr.find(value => String(value) === mostCommonKey);
  return originalValue !== undefined ? originalValue : arr[0];
}