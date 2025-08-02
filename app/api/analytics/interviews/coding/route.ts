import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';
import { eq, and, desc, sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { 
  Interview,
  CodingInterview,
  candidateInterviewHistory
} from '@/lib/database/schema';
import { generateJSONWithOpenAI, AI_CONFIGS } from "@/lib/integrations/ai/openai";

interface CodingAnalytics {
  id: string;
  interviewId: string;
  candidateName: string;
  candidateEmail: string;
  jobPosition: string;
  language: string;
  totalProblems: number;
  solvedProblems: number;
  jobDescription: string;
  totalScore: number;
  averageTimePerProblem: number;
  totalTimeSpent: number;
  completedAt: string;
  difficulty: string;
  problemWiseResults: {
    problemId: string;
    problem: string;
    solution: string;
    testCasesPassed: number;
    totalTestCases: number;
    timeSpent: number;
    score: number;
    codeQuality: number;
    approach: string;
  }[];
  aiFeedback: {
    overallPerformance: string;
    strengths: string[];
    improvements: string[];
    codeQualityAssessment: string;
    algorithmicThinking: string;
    problemSolvingApproach: string;
    problemWiseFeedback: {
      problemId: string;
      feedback: string;
      recommendation: string;
    }[];
  };
}

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
      // Get code answers for this interview from candidateInterviewHistory
      const codeAnswers = await db
        .select()
        .from(candidateInterviewHistory)
        .where(eq(candidateInterviewHistory.interviewId, interview.interviewId));

      if (codeAnswers.length === 0) continue;

      // Calculate metrics
      const totalProblems = codeAnswers.length;
      const solvedProblems = codeAnswers.filter(answer => 
        (answer.score || 0) >= 70 // Consider score >= 70% as solved
      ).length;
      
      const totalScore = codeAnswers.length > 0 ? Math.round(
        codeAnswers.reduce((sum, answer) => sum + (answer.score || 0), 0) / codeAnswers.length
      ) : 0;
      
      // Default time values (not available in schema)
      const averageTimePerProblem = 1800; // Default 30 minutes per problem
      const totalTimeSpent = totalProblems * averageTimePerProblem;

      // Build problem-wise results
      const problemWiseResults = codeAnswers.map(answer => {
        // Parse feedback to extract code and score
        let parsedFeedback: any = {};
        try {
          parsedFeedback = answer.feedback ? JSON.parse(answer.feedback) : {};
        } catch {
          parsedFeedback = {};
        }
        
        return {
          problemId: answer.id.toString(),
          problem: parsedFeedback.question || 'Coding Problem',
          solution: parsedFeedback.userAnswer || '',
          testCasesPassed: 0, // Not available in schema
          totalTestCases: 0, // Not available in schema
          timeSpent: averageTimePerProblem,
          score: answer.score || 0,
          codeQuality: Math.floor((answer.score || 0) / 10),
          approach: extractApproach(parsedFeedback.userAnswer || ''),
        };
      });

      // Generate AI feedback
      const aiFeedback = await generateAIFeedback({
        totalProblems,
        solvedProblems,
        totalScore,
        language: codeAnswers[0]?.programmingLanguage || 'JavaScript', // Use actual language or default
        problemWiseResults,
        candidateName: interview.candidateName || 'Candidate'
      });

      analyticsData.push({
        id: interview.id.toString(),
        interviewId: interview.id.toString(),
        candidateName: interview.candidateName || 'Unknown',
        candidateEmail: interview.candidateEmail || 'unknown@example.com',
        jobPosition: interview.jobPosition || 'Position',
        language: 'JavaScript', // Default language since not stored in candidateInterviewHistory
        totalProblems,
        solvedProblems,
        jobDescription: interview.jobDescription || 'Job Description',
        totalScore,
        averageTimePerProblem,
        totalTimeSpent,
        completedAt: interview.createdAt?.toISOString() || new Date().toISOString(),
        difficulty: 'medium', // Default difficulty
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

function extractApproach(code: string): string {
  // Simple approach detection based on code patterns
  const lowerCode = code.toLowerCase();
  
  if (lowerCode.includes('recursion') || lowerCode.includes('recursive')) {
    return 'Recursive';
  }
  if (lowerCode.includes('for') || lowerCode.includes('while')) {
    return 'Iterative';
  }
  if (lowerCode.includes('dp') || lowerCode.includes('dynamic')) {
    return 'Dynamic Programming';
  }
  if (lowerCode.includes('bfs') || lowerCode.includes('breadth')) {
    return 'BFS';
  }
  if (lowerCode.includes('dfs') || lowerCode.includes('depth')) {
    return 'DFS';
  }
  
  return 'Standard';
}

async function generateAIFeedback(data: {
  totalProblems: number;
  solvedProblems: number;
  totalScore: number;
  language: string;
  problemWiseResults: any[];
  candidateName: string;
}) {
  try {
    const prompt = `Analyze this coding interview performance and provide detailed feedback:

Candidate: ${data.candidateName}
Language: ${data.language}
Total Problems: ${data.totalProblems}
Solved Problems: ${data.solvedProblems}
Total Score: ${data.totalScore}%

Problem-wise Performance:
${data.problemWiseResults.map(p => 
  `- Problem: ${p.problem.substring(0, 50)}... (Score: ${p.score}%, Quality: ${p.codeQuality}/10)`
).join('\n')}

Provide feedback in this JSON format:
{
  "overallPerformance": "Brief overall assessment",
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "codeQualityAssessment": "Assessment of code quality and style",
  "algorithmicThinking": "Assessment of algorithmic thinking",
  "problemSolvingApproach": "Assessment of problem-solving methodology",
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
      overallPerformance: `Solved ${data.solvedProblems} out of ${data.totalProblems} problems with ${data.totalScore}% overall score in ${data.language}.`,
      strengths: [
        data.totalScore >= 70 ? "Strong problem-solving skills" : "Shows coding potential",
        "Completed the coding assessment",
        `Good ${data.language} knowledge`
      ],
      improvements: [
        data.totalScore < 70 ? "Practice more algorithmic problems" : "Continue refining advanced techniques",
        "Focus on code optimization and efficiency",
        "Improve test case coverage and edge case handling"
      ],
      codeQualityAssessment: data.totalScore >= 70 ? "Good code structure and readability" : "Needs improvement in code organization and clarity",
      algorithmicThinking: data.totalScore >= 70 ? "Demonstrates solid algorithmic understanding" : "Needs to strengthen algorithmic foundations",
      problemSolvingApproach: data.totalScore >= 70 ? "Systematic approach to problem-solving" : "Practice breaking down problems into smaller components",
      problemWiseFeedback: data.problemWiseResults.map(p => ({
        problemId: p.problemId,
        feedback: p.score >= 70 ? "Well-implemented solution with good logic" : "Consider alternative approaches and optimize for better performance",
        recommendation: p.score >= 70 ? "Great work! Try similar problems to reinforce concepts" : "Review the problem requirements and practice similar patterns"
      }))
    };
  }
}