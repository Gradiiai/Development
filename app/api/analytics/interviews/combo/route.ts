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



interface ComboAnalytics {
  id: string;
  interviewId: string;
  candidateName: string;
  candidateEmail: string;
  jobPosition: string;
  
  // Overall metrics
  totalQuestions: number;
  answeredQuestions: number;
  overallScore: number;
  totalTimeSpent: number;
  completedAt: string;
  
  // Section-wise breakdown
  behavioralSection: {
    totalQuestions: number;
    answeredQuestions: number;
    averageResponseLength: number;
    score: number;
    timeSpent: number;
  };
  
  mcqSection: {
    totalQuestions: number;
    correctAnswers: number;
    accuracy: number;
    score: number;
    timeSpent: number;
  };
  
  codingSection: {
    totalProblems: number;
    solvedProblems: number;
    testCasesPassed: number;
    totalTestCases: number;
    score: number;
    timeSpent: number;
    languageUsed: string;
  };
  
  // Detailed results
  questionWiseResults: {
    questionId: string;
    question: string;
    type: 'behavioral' | 'mcq' | 'coding';
    answer: string;
    isCorrect?: boolean;
    correctAnswer?: string;
    testCasesPassed?: number;
    totalTestCases?: number;
    timeSpent: number;
    score: number;
  }[];
  
  aiFeedback: {
    overallPerformance: string;
    strengths: string[];
    improvements: string[];
    behavioralAssessment: string;
    technicalAssessment: string;
    codingAssessment: string;
    recommendedRole: string;
    sectionWiseFeedback: {
      section: string;
      feedback: string;
      recommendation: string;
    }[];
  };
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

    // Fetch combo interviews for the company
    const comboInterviews = await db
      .select()
      .from(Interview)
      .where(
        and(
          eq(Interview.companyId, companyId),
          eq(Interview.interviewType, 'combo')
        )
      )
      .orderBy(desc(Interview.createdAt));

    const analyticsData: ComboAnalytics[] = [];

    for (const interview of comboInterviews) {
      // Get all answers from candidateInterviewHistory
      const allAnswers = await db
        .select()
        .from(candidateInterviewHistory)
        .where(eq(candidateInterviewHistory.interviewId, interview.interviewId));

      // Separate behavioral/MCQ and coding answers
      const behavioralMcqAnswers = allAnswers.filter(answer => answer.interviewType === 'mcq');
      const codeAnswers = allAnswers.filter(answer => answer.interviewType === 'coding');

      if (behavioralMcqAnswers.length === 0 && codeAnswers.length === 0) continue;

      // Parse feedback to extract behavioral and MCQ data
      const behavioralAnswers: any[] = [];
      const mcqAnswers: any[] = [];
      
      behavioralMcqAnswers.forEach(answer => {
        try {
          const feedback = JSON.parse(answer.feedback || '{}');
          if (feedback.type === 'behavioral') {
            behavioralAnswers.push({
              userAnswer: feedback.userAnswer || '',
              question: feedback.question || '',
              score: answer.score || 0
            });
          } else if (feedback.type === 'mcq') {
            mcqAnswers.push({
              userAnswer: feedback.userAnswer || '',
              correctAnswer: feedback.correctAnswer || '',
              question: feedback.question || '',
              score: answer.score || 0
            });
          }
        } catch (e) {
          // Skip invalid feedback JSON
        }
      });

      // Calculate behavioral metrics
      const behavioralSection = {
        totalQuestions: behavioralAnswers.length,
        answeredQuestions: behavioralAnswers.filter(a => a.userAnswer && a.userAnswer.trim().length > 0).length,
        averageResponseLength: behavioralAnswers.length > 0 ? Math.round(
          behavioralAnswers.reduce((sum, a) => sum + (a.userAnswer?.length || 0), 0) / behavioralAnswers.length
        ) : 0,
        score: calculateBehavioralScore(behavioralAnswers),
        timeSpent: behavioralAnswers.length * 300 // Default 5 minutes per question
      };

      // Calculate MCQ metrics
      const mcqSection = {
        totalQuestions: mcqAnswers.length,
        correctAnswers: mcqAnswers.filter(a => a.userAnswer === a.correctAnswer).length,
        accuracy: mcqAnswers.length > 0 ? Math.round(
          (mcqAnswers.filter(a => a.userAnswer === a.correctAnswer).length / mcqAnswers.length) * 100
        ) : 0,
        score: mcqAnswers.length > 0 ? Math.round(
          (mcqAnswers.filter(a => a.userAnswer === a.correctAnswer).length / mcqAnswers.length) * 100
        ) : 0,
        timeSpent: mcqAnswers.length * 60 // Default 1 minute per question
      };

      // Calculate coding metrics
      const codingSection = {
        totalProblems: codeAnswers.length,
        solvedProblems: codeAnswers.filter(a => (a.score || 0) >= 70).length, // Consider score >= 70 as solved
        testCasesPassed: 0, // Not available in schema
        totalTestCases: 0, // Not available in schema
        score: codeAnswers.length > 0 ? Math.round(
          codeAnswers.reduce((sum, a) => sum + (a.score || 0), 0) / codeAnswers.length
        ) : 0,
        timeSpent: codeAnswers.length * 1800, // 30 min default per problem
        languageUsed: 'JavaScript' // Default language as it's not stored in candidateInterviewHistory
      };

      // Calculate overall metrics
      const totalQuestions = behavioralSection.totalQuestions + mcqSection.totalQuestions + codingSection.totalProblems;
      const answeredQuestions = behavioralSection.answeredQuestions + mcqSection.totalQuestions + codingSection.totalProblems;
      
      // Weighted overall score (behavioral: 30%, MCQ: 30%, coding: 40%)
      const overallScore = Math.round(
        (behavioralSection.score * 0.3) + 
        (mcqSection.score * 0.3) + 
        (codingSection.score * 0.4)
      );
      
      const totalTimeSpent = behavioralSection.timeSpent + mcqSection.timeSpent + codingSection.timeSpent;

      // Build question-wise results
      const questionWiseResults = [
        ...behavioralAnswers.map((answer, index) => ({
          questionId: `behavioral_${index}`,
          question: answer.question || 'Behavioral Question',
          type: 'behavioral' as const,
          answer: answer.userAnswer || '',
          timeSpent: 300, // Default 5 minutes per question
          score: answer.score || calculateQuestionScore(answer.userAnswer || '', 'behavioral')
        })),
        ...mcqAnswers.map((answer, index) => ({
          questionId: `mcq_${index}`,
          question: answer.question || 'MCQ Question',
          type: 'mcq' as const,
          answer: answer.userAnswer || '',
          isCorrect: answer.userAnswer === answer.correctAnswer,
          correctAnswer: answer.correctAnswer || '',
          timeSpent: 60, // Default 1 minute per question
          score: answer.userAnswer === answer.correctAnswer ? 100 : 0
        })),
        ...codeAnswers.map((answer, index) => {
          let question = 'Coding Problem';
          let userAnswer = '';
          try {
            const feedback = JSON.parse(answer.feedback || '{}');
            question = feedback.question || 'Coding Problem';
            userAnswer = feedback.userAnswer || '';
          } catch (e) {
            // Use defaults if feedback parsing fails
          }
          return {
            questionId: `coding_${index}`,
            question,
            type: 'coding' as const,
            answer: userAnswer,
            testCasesPassed: 0, // Not available in schema
            totalTestCases: 0, // Not available in schema
            timeSpent: 1800, // 30 min default
            score: answer.score || 0
          };
        })
      ];

      // Generate AI feedback
      const aiFeedback = await generateAIFeedback({
        behavioralSection,
        mcqSection,
        codingSection,
        overallScore,
        questionWiseResults,
        candidateName: interview.candidateName || 'Candidate'
      });

      analyticsData.push({
        id: interview.id.toString(),
        interviewId: interview.id.toString(),
        candidateName: interview.candidateName || 'Unknown',
        candidateEmail: interview.candidateEmail || 'unknown@example.com',
        jobPosition: interview.jobPosition || 'Position',
        totalQuestions,
        answeredQuestions,
        overallScore,
        totalTimeSpent,
        completedAt: interview.createdAt?.toISOString() || new Date().toISOString(),
        behavioralSection,
        mcqSection,
        codingSection,
        questionWiseResults,
        aiFeedback
      });
    }

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error('Error fetching combo analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch combo analytics' },
      { status: 500 }
    );
  }
}

function calculateBehavioralScore(answers: any[]): number {
  if (answers.length === 0) return 0;
  
  const totalScore = answers.reduce((sum, answer) => {
    const responseLength = answer.userAnswer?.length || 0;
    return sum + Math.min(100, Math.max(0, (responseLength / 10) + 20));
  }, 0);
  
  return Math.round(totalScore / answers.length);
}

function calculateQuestionScore(answer: string, type: string): number {
  if (type === 'behavioral') {
    const length = answer.length;
    const hasExamples = /example|instance|time when|situation/.test(answer.toLowerCase());
    const hasStructure = /first|second|then|finally|because|therefore/.test(answer.toLowerCase());
    
    let score = Math.min(40, length / 10);
    if (hasExamples) score += 30;
    if (hasStructure) score += 30;
    
    return Math.min(100, Math.round(score));
  }
  
  return 0;
}

async function generateAIFeedback(data: {
  behavioralSection: any;
  mcqSection: any;
  codingSection: any;
  overallScore: number;
  questionWiseResults: any[];
  candidateName: string;
}) {
  try {
    const prompt = `Analyze this comprehensive combo interview performance and provide detailed feedback:

Candidate: ${data.candidateName}
Overall Score: ${data.overallScore}%

Behavioral Section:
- Questions: ${data.behavioralSection.totalQuestions}
- Answered: ${data.behavioralSection.answeredQuestions}
- Score: ${data.behavioralSection.score}%
- Avg Response Length: ${data.behavioralSection.averageResponseLength} chars

MCQ Section:
- Questions: ${data.mcqSection.totalQuestions}
- Correct: ${data.mcqSection.correctAnswers}
- Accuracy: ${data.mcqSection.accuracy}%

Coding Section:
- Problems: ${data.codingSection.totalProblems}
- Solved: ${data.codingSection.solvedProblems}
- Test Cases: ${data.codingSection.testCasesPassed}/${data.codingSection.totalTestCases}
- Score: ${data.codingSection.score}%
- Language: ${data.codingSection.languageUsed}

Provide feedback in this JSON format:
{
  "overallPerformance": "Brief overall assessment",
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "behavioralAssessment": "Assessment of behavioral responses",
  "technicalAssessment": "Assessment of MCQ performance",
  "codingAssessment": "Assessment of coding skills",
  "recommendedRole": "Recommended role based on performance",
  "sectionWiseFeedback": [
    {
      "section": "Behavioral",
      "feedback": "Specific feedback for behavioral section",
      "recommendation": "Specific recommendation"
    },
    {
      "section": "MCQ",
      "feedback": "Specific feedback for MCQ section",
      "recommendation": "Specific recommendation"
    },
    {
      "section": "Coding",
      "feedback": "Specific feedback for coding section",
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
      overallPerformance: `Comprehensive interview with ${data.overallScore}% overall performance across behavioral, technical, and coding assessments.`,
      strengths: [
        data.overallScore >= 70 ? "Well-rounded candidate with strong overall performance" : "Shows potential across multiple areas",
        "Completed comprehensive assessment",
        "Demonstrated diverse skill set"
      ],
      improvements: [
        data.overallScore < 70 ? "Focus on strengthening weaker areas" : "Continue developing advanced skills",
        "Practice integrated problem-solving",
        "Improve time management across sections"
      ],
      behavioralAssessment: data.behavioralSection.score >= 70 ? "Strong communication and behavioral responses" : "Needs improvement in behavioral responses and examples",
      technicalAssessment: data.mcqSection.accuracy >= 70 ? "Good technical knowledge" : "Needs to strengthen technical fundamentals",
      codingAssessment: data.codingSection.score >= 70 ? "Strong coding and problem-solving skills" : "Needs improvement in coding implementation and algorithm design",
      recommendedRole: data.overallScore >= 80 ? "Senior level position" : data.overallScore >= 60 ? "Mid-level position" : "Junior level position with mentoring",
      sectionWiseFeedback: [
        {
          section: "Behavioral",
          feedback: data.behavioralSection.score >= 70 ? "Excellent communication and behavioral responses" : "Needs more structured responses with specific examples",
          recommendation: "Practice STAR method for behavioral questions"
        },
        {
          section: "MCQ",
          feedback: data.mcqSection.accuracy >= 70 ? "Good technical knowledge base" : "Review fundamental concepts and practice more",
          recommendation: "Focus on areas with lower accuracy"
        },
        {
          section: "Coding",
          feedback: data.codingSection.score >= 70 ? "Strong problem-solving and implementation skills" : "Practice algorithm design and implementation",
          recommendation: "Solve more coding problems and focus on test case coverage"
        }
      ]
    };
  }
}