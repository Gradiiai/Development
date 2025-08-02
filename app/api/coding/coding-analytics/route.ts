import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database/connection";
import { eq, and, desc, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { 
  Interview,
  CodingInterview,
  candidateInterviewHistory
} from "@/lib/database/schema";
import { generateJSONWithOpenAI, AI_CONFIGS } from "@/lib/integrations/ai/openai";

interface CodingAnalytics {
  id: string;
  interviewId: string;
  candidateName: string;
  candidateEmail: string;
  jobPosition: string;
  totalProblems: number;
  solvedProblems: number;
  totalScore: number;
  averageTimePerProblem: number;
  totalTimeSpent: number;
  completedAt: string;
  difficulty: string;
  languageUsed: string;
  problemWiseResults: {
    problemId: string;
    problemTitle: string;
    solution: string;
    testCasesPassed: number;
    totalTestCases: number;
    timeSpent: number;
    difficulty: string;
    language: string;
    isOptimal: boolean;
  }[];
  aiFeedback: {
    overallPerformance: string;
    strengths: string[];
    improvements: string[];
    codeQuality: string;
    algorithmicThinking: string;
    problemWiseFeedback: {
      problemId: string;
      feedback: string;
      recommendation: string;
    }[];
  };
}

interface DashboardStats {
  totalInterviews: number;
  averageScore: number;
  averageTimePerProblem: number;
  completionRate: number;
  topPerformers: number;
  needsImprovement: number;
}

// Using centralized OpenAI configuration from openai-config.ts

export async function GET(request: NextRequest) {
  try {
    // For now, we'll use a simple company ID from query params
    // In production, this should be properly authenticated
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }

    // Fetch coding interviews for the company
    const codingInterviews = await db
      .select()
      .from(Interview)
      .where(
        and(
          eq(Interview.companyId, companyId),
          eq(Interview.interviewType, 'coding')
        )
      )
      .orderBy(desc(Interview.createdAt));

    const analyticsData: CodingAnalytics[] = [];

    for (const interview of codingInterviews) {
      // Get user code answers for this interview
      const userAnswers = await db
        .select()
        .from(candidateInterviewHistory)
        .where(
          and(
            eq(candidateInterviewHistory.interviewId, interview.id.toString()),
            eq(candidateInterviewHistory.interviewType, 'coding')
          )
        );

      if (userAnswers.length === 0) continue;

      // Parse feedback to extract coding data
      const codingData: any[] = [];
      userAnswers.forEach(answer => {
        try {
          const feedback = JSON.parse(answer.feedback || '{}');
          codingData.push({
            question: feedback.question || 'Coding Problem',
            userAnswer: feedback.userAnswer || '',
            score: answer.score || 0
          });
        } catch (e) {
          // Skip invalid feedback JSON
        }
      });

      // Calculate metrics
      const totalProblems = codingData.length;
      const solvedProblems = codingData.filter(answer => 
        answer.score >= 70 // Consider score >= 70 as solved
      ).length;
      
      const totalScore = totalProblems > 0 ? Math.round(
        codingData.reduce((sum, answer) => sum + (answer.score || 0), 0) / totalProblems
      ) : 0;
      
      // Default time values (timeSpent not available in schema)
      const totalTimeSpent = totalProblems * 1800; // Default 30 minutes per problem
      const averageTimePerProblem = 1800; // Default 30 minutes per problem

      // Build problem-wise results
      const problemWiseResults = codingData.map((answer, index) => ({
        problemId: `p_${index}`,
        problemTitle: answer.question,
        solution: answer.userAnswer,
        testCasesPassed: 0, // Not available in schema
        totalTestCases: 0, // Not available in schema
        timeSpent: 1800, // Default 30 minutes
        difficulty: 'Medium', // Default difficulty
        language: answer.language || 'JavaScript',
        isOptimal: answer.rating >= 8 // Consider rating >= 8 as optimal
      }));

      // Generate AI feedback
      const aiFeedback = await generateAIFeedback({
        totalProblems,
        solvedProblems,
        totalScore,
        problemWiseResults,
        candidateName: interview.candidateName || 'Candidate'
      });

      analyticsData.push({
        id: interview.id.toString(),
        interviewId: interview.id.toString(),
        candidateName: interview.candidateName || 'Unknown',
        candidateEmail: interview.candidateEmail || 'unknown@example.com',
        jobPosition: interview.jobPosition || 'Software Developer',
        totalProblems,
        solvedProblems,
        totalScore,
        averageTimePerProblem,
        totalTimeSpent,
        completedAt: interview.createdAt?.toISOString() || new Date().toISOString(),
        difficulty: 'Medium', // Default difficulty
        languageUsed: 'JavaScript', // Default language since not stored in new schema
        problemWiseResults,
        aiFeedback
      });
    }

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error('Error fetching coding analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coding analytics' },
      { status: 500 }
    );
  }
}

async function generateAIFeedback(data: {
  totalProblems: number;
  solvedProblems: number;
  totalScore: number;
  problemWiseResults: any[];
  candidateName: string;
}) {
  try {
    const prompt = `Analyze this coding interview performance and provide detailed feedback:

Candidate: ${data.candidateName}
Total Problems: ${data.totalProblems}
Solved Problems: ${data.solvedProblems}
Overall Score: ${data.totalScore}%

Problem-wise Performance:
${data.problemWiseResults.map(p => 
  `- ${p.problemTitle}: ${p.testCasesPassed}/${p.totalTestCases} test cases passed (${p.language})`
).join('\n')}

Provide feedback in this JSON format:
{
  "overallPerformance": "Brief overall assessment",
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "codeQuality": "Assessment of code quality and best practices",
  "algorithmicThinking": "Assessment of problem-solving approach",
  "problemWiseFeedback": [
    {
      "problemId": "problem_id",
      "feedback": "Specific feedback for this problem",
      "recommendation": "Specific recommendation"
    }
  ]
}`;

    const resultString = await generateJSONWithOpenAI(prompt, AI_CONFIGS.ANALYSIS);
    return JSON.parse(resultString);
  } catch (error) {
    console.error('Error generating AI feedback:', error);
    // Return fallback feedback
    return {
      overallPerformance: `Solved ${data.solvedProblems} out of ${data.totalProblems} problems with ${data.totalScore}% accuracy.`,
      strengths: [
        data.totalScore >= 70 ? "Good problem-solving skills" : "Shows potential in coding",
        "Completed the interview",
        "Demonstrated coding knowledge"
      ],
      improvements: [
        data.totalScore < 70 ? "Focus on algorithm optimization" : "Continue practicing complex problems",
        "Improve test case coverage",
        "Work on time management"
      ],
      codeQuality: data.totalScore >= 70 ? "Good code structure and logic" : "Needs improvement in code organization",
      algorithmicThinking: data.totalScore >= 70 ? "Shows good analytical approach" : "Needs to strengthen problem-solving methodology",
      problemWiseFeedback: data.problemWiseResults.map(p => ({
        problemId: p.problemId,
        feedback: p.isOptimal ? "Well solved with good approach" : "Consider optimizing the solution",
        recommendation: p.isOptimal ? "Try solving similar problems with different approaches" : "Review algorithm fundamentals and practice similar problems"
      }))
    };
  }
}