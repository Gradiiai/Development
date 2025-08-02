import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database/connection";
import { Interview, InterviewAnalytics, candidateInterviewHistory, candidateUsers } from "@/lib/database/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateJSONWithOpenAI, AI_CONFIGS } from "@/lib/integrations/ai/openai";

interface BehavioralAnalytics {
  id: string;
  interviewId: string;
  candidateName: string;
  candidateEmail: string;
  jobPosition: string;
  totalQuestions: number;
  answeredQuestions: number;
  averageResponseLength: number;
  totalTimeSpent: number;
  averageTimePerQuestion: number;
  completedAt: string;
  communicationScore: number;
  leadershipScore: number;
  problemSolvingScore: number;
  teamworkScore: number;
  overallScore: number;
  questionWiseResults: {
    questionId: string;
    question: string;
    answer: string;
    timeSpent: number;
    category: string;
    score: number;
    keywordMatches: string[];
  }[];
  aiFeedback: {
    overallPerformance: string;
    strengths: string[];
    improvements: string[];
    communicationAssessment: string;
    leadershipPotential: string;
    culturalFit: string;
    questionWiseFeedback: {
      questionId: string;
      feedback: string;
      recommendation: string;
    }[];
  };
}

interface DashboardStats {
  totalInterviews: number;
  averageScore: number;
  averageResponseLength: number;
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

    // Fetch completed behavioral interviews from candidateInterviewHistory
    const behavioralInterviews = await db
      .select({
        historyId: candidateInterviewHistory.id,
        interviewId: candidateInterviewHistory.interviewId,
        interviewType: candidateInterviewHistory.interviewType,
        candidateId: candidateInterviewHistory.candidateId,
        feedback: candidateInterviewHistory.feedback,
        score: candidateInterviewHistory.score,
        maxScore: candidateInterviewHistory.maxScore,
        duration: candidateInterviewHistory.duration,
        completedAt: candidateInterviewHistory.completedAt,
        candidateEmail: candidateUsers.email,
        candidateName: candidateUsers.firstName
      })
      .from(candidateInterviewHistory)
      .innerJoin(candidateUsers, eq(candidateInterviewHistory.candidateId, candidateUsers.id))
      .where(
        and(
          eq(candidateInterviewHistory.interviewType, 'behavioral'),
          eq(candidateInterviewHistory.status, 'completed')
        )
      )
      .orderBy(desc(candidateInterviewHistory.completedAt));

    const analyticsData: BehavioralAnalytics[] = [];

    for (const interviewHistory of behavioralInterviews) {
      if (!interviewHistory.feedback) continue;

      let feedbackData: any;
      try {
        feedbackData = JSON.parse(interviewHistory.feedback);
      } catch (error) {
        console.error('Error parsing feedback data:', error);
        continue;
      }

      // Extract answers from feedback
      const answers = feedbackData.answers || [];
      const answersArray = Array.isArray(answers) ? answers : Object.values(answers);

      if (answersArray.length === 0) continue;

      // Calculate metrics from candidateInterviewHistory data
      const totalQuestions = interviewHistory.maxScore || answersArray.length;
      const answeredQuestions = answersArray.filter((answer: any) => 
        answer && (typeof answer === 'string' ? answer.trim().length > 0 : 
          (answer.answer && answer.answer.trim().length > 0))
      ).length;
      
      const averageResponseLength = Math.round(
        answersArray.reduce((sum: number, answer: any) => {
          const answerText = typeof answer === 'string' ? answer : (answer.answer || '');
          return sum + answerText.length;
        }, 0) / totalQuestions
      );
      
      // Use actual duration or default values
      const totalTimeSpent = interviewHistory.duration || (totalQuestions * 300); // Duration in seconds
      const averageTimePerQuestion = Math.round(totalTimeSpent / totalQuestions);

      // Get original interview details for context
      const originalInterview = await db
        .select()
        .from(Interview)
        .where(eq(Interview.interviewId, interviewHistory.interviewId))
        .limit(1);

      const interviewDetails = originalInterview[0];

      // Build question-wise results from feedback data
      const questionWiseResults = answersArray.map((answer: any, index: number) => {
        const answerText = typeof answer === 'string' ? answer : (answer.answer || '');
        const questionText = typeof answer === 'string' ? `Question ${index + 1}` : (answer.question || `Question ${index + 1}`);
        
        return {
          questionId: `q_${index + 1}`,
          question: questionText,
          answer: answerText,
          timeSpent: averageTimePerQuestion,
          category: categorizeQuestion(questionText),
          score: calculateQuestionScore(answerText),
          keywordMatches: extractKeywords(answerText)
        };
      });

      // Calculate behavioral scores from processed answers
      const scores = calculateBehavioralScoresFromHistory(questionWiseResults, interviewHistory.score || 0, interviewHistory.maxScore || totalQuestions);
      
      // Generate AI feedback
      const aiFeedback = await generateAIFeedback({
        totalQuestions,
        answeredQuestions,
        scores,
        questionWiseResults,
        candidateName: interviewHistory.candidateName || 'Candidate'
      });

      analyticsData.push({
        id: interviewHistory.historyId,
        interviewId: interviewHistory.interviewId,
        candidateName: interviewHistory.candidateName || 'Unknown',
        candidateEmail: interviewHistory.candidateEmail || 'unknown@example.com',
        jobPosition: interviewDetails?.jobPosition || 'Position',
        totalQuestions,
        answeredQuestions,
        averageResponseLength,
        totalTimeSpent,
        averageTimePerQuestion,
        completedAt: interviewHistory.completedAt?.toISOString() || new Date().toISOString(),
        communicationScore: scores.communication,
        leadershipScore: scores.leadership,
        problemSolvingScore: scores.problemSolving,
        teamworkScore: scores.teamwork,
        overallScore: scores.overall,
        questionWiseResults,
        aiFeedback
      });
    }

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error('Error fetching behavioral analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch behavioral analytics' },
      { status: 500 }
    );
  }
}

function calculateBehavioralScoresFromHistory(questionWiseResults: any[], actualScore: number, maxScore: number) {
  // Calculate scores based on candidateInterviewHistory data and question analysis
  const scores = {
    communication: 0,
    leadership: 0,
    problemSolving: 0,
    teamwork: 0,
    overall: 0
  };

  // Use actual score as baseline and distribute across categories
  const basePercentage = maxScore > 0 ? (actualScore / maxScore) * 100 : 0;
  
  questionWiseResults.forEach(result => {
    const category = result.category;
    const questionScore = result.score;
    
    switch (category) {
      case 'communication':
        scores.communication += questionScore;
        break;
      case 'leadership':
        scores.leadership += questionScore;
        break;
      case 'problem-solving':
        scores.problemSolving += questionScore;
        break;
      case 'teamwork':
        scores.teamwork += questionScore;
        break;
      default:
        // Distribute equally among all categories for general questions
        scores.communication += questionScore * 0.25;
        scores.leadership += questionScore * 0.25;
        scores.problemSolving += questionScore * 0.25;
        scores.teamwork += questionScore * 0.25;
    }
  });

  // Average the scores
  const questionCount = questionWiseResults.length || 1;
  scores.communication = Math.round(scores.communication / questionCount);
  scores.leadership = Math.round(scores.leadership / questionCount);
  scores.problemSolving = Math.round(scores.problemSolving / questionCount);
  scores.teamwork = Math.round(scores.teamwork / questionCount);
  scores.overall = Math.round(basePercentage);

  return scores;
}

// Keep legacy function for backward compatibility (but not used in new implementation)
function calculateBehavioralScores(userAnswers: any[]) {
  const scores = {
    communication: 0,
    leadership: 0,
    problemSolving: 0,
    teamwork: 0,
    overall: 0
  };

  userAnswers.forEach(answer => {
    const responseLength = answer.userAnswer?.length || 0;
    const category = categorizeQuestion(answer.question || '');
    const baseScore = Math.min(100, Math.max(0, (responseLength / 10) + 20));
    
    switch (category) {
      case 'communication':
        scores.communication += baseScore;
        break;
      case 'leadership':
        scores.leadership += baseScore;
        break;
      case 'problem-solving':
        scores.problemSolving += baseScore;
        break;
      case 'teamwork':
        scores.teamwork += baseScore;
        break;
      default:
        scores.communication += baseScore * 0.25;
        scores.leadership += baseScore * 0.25;
        scores.problemSolving += baseScore * 0.25;
        scores.teamwork += baseScore * 0.25;
    }
  });

  const questionCount = userAnswers.length || 1;
  scores.communication = Math.round(scores.communication / questionCount);
  scores.leadership = Math.round(scores.leadership / questionCount);
  scores.problemSolving = Math.round(scores.problemSolving / questionCount);
  scores.teamwork = Math.round(scores.teamwork / questionCount);
  scores.overall = Math.round((scores.communication + scores.leadership + scores.problemSolving + scores.teamwork) / 4);

  return scores;
}

function categorizeQuestion(question: string): string {
  const lowerQuestion = question.toLowerCase();
  
  if (lowerQuestion.includes('lead') || lowerQuestion.includes('manage') || lowerQuestion.includes('decision')) {
    return 'leadership';
  }
  if (lowerQuestion.includes('team') || lowerQuestion.includes('collaborate') || lowerQuestion.includes('work with')) {
    return 'teamwork';
  }
  if (lowerQuestion.includes('problem') || lowerQuestion.includes('challenge') || lowerQuestion.includes('difficult')) {
    return 'problem-solving';
  }
  if (lowerQuestion.includes('communicate') || lowerQuestion.includes('explain') || lowerQuestion.includes('present')) {
    return 'communication';
  }
  
  return 'general';
}

function calculateQuestionScore(answer: string): number {
  // Simple scoring based on response quality indicators
  const length = answer.length;
  const hasExamples = /example|instance|time when|situation/.test(answer.toLowerCase());
  const hasStructure = /first|second|then|finally|because|therefore/.test(answer.toLowerCase());
  
  let score = Math.min(40, length / 10); // Base score from length
  if (hasExamples) score += 30;
  if (hasStructure) score += 30;
  
  return Math.min(100, Math.round(score));
}

function extractKeywords(answer: string): string[] {
  const keywords = [
    'leadership', 'teamwork', 'communication', 'problem-solving', 'collaboration',
    'initiative', 'responsibility', 'achievement', 'challenge', 'solution',
    'improvement', 'innovation', 'efficiency', 'quality', 'deadline'
  ];
  
  return keywords.filter(keyword => 
    answer.toLowerCase().includes(keyword)
  );
}

async function generateAIFeedback(data: {
  totalQuestions: number;
  answeredQuestions: number;
  scores: any;
  questionWiseResults: any[];
  candidateName: string;
}) {
  try {
    const prompt = `Analyze this behavioral interview performance and provide detailed feedback:

Candidate: ${data.candidateName}
Total Questions: ${data.totalQuestions}
Answered Questions: ${data.answeredQuestions}
Communication Score: ${data.scores.communication}%
Leadership Score: ${data.scores.leadership}%
Problem Solving Score: ${data.scores.problemSolving}%
Teamwork Score: ${data.scores.teamwork}%
Overall Score: ${data.scores.overall}%

Question-wise Performance:
${data.questionWiseResults.map(q => 
  `- ${q.category}: Score ${q.score}% (${q.answer.length} chars)`
).join('\n')}

Provide feedback in this JSON format:
{
  "overallPerformance": "Brief overall assessment",
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "communicationAssessment": "Assessment of communication skills",
  "leadershipPotential": "Assessment of leadership qualities",
  "culturalFit": "Assessment of cultural fit",
  "questionWiseFeedback": [
    {
      "questionId": "question_id",
      "feedback": "Specific feedback for this question",
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
      overallPerformance: `Answered ${data.answeredQuestions} out of ${data.totalQuestions} questions with ${data.scores.overall}% overall score.`,
      strengths: [
        data.scores.overall >= 70 ? "Strong communication skills" : "Shows potential in behavioral responses",
        "Completed the interview",
        "Demonstrated relevant experience"
      ],
      improvements: [
        data.scores.overall < 70 ? "Provide more detailed examples" : "Continue developing leadership skills",
        "Use more structured responses (STAR method)",
        "Include specific metrics and outcomes"
      ],
      communicationAssessment: data.scores.communication >= 70 ? "Clear and articulate communication" : "Needs improvement in clarity and structure",
      leadershipPotential: data.scores.leadership >= 70 ? "Shows strong leadership qualities" : "Developing leadership potential",
      culturalFit: data.scores.teamwork >= 70 ? "Good team collaboration skills" : "Needs to demonstrate better teamwork examples",
      questionWiseFeedback: data.questionWiseResults.map(q => ({
        questionId: q.questionId,
        feedback: q.score >= 70 ? "Well-structured response with good examples" : "Consider providing more specific examples and details",
        recommendation: q.score >= 70 ? "Continue using this approach for similar questions" : "Practice the STAR method (Situation, Task, Action, Result) for better responses"
      }))
    };
  }
}