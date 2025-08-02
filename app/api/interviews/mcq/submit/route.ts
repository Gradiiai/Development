import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';
import { Interview, InterviewAnalytics } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import { createAnalyticsRecord, updateAnalyticsRecord } from '@/lib/services/analytics';
import { generateJSONWithOpenAI, AI_CONFIGS } from '@/lib/integrations/ai/openai';

type MCQAnswer = {
  questionIndex: number;
  selectedOptionId: string;
  confidence: number;
  timeSpent: number;
  timestamp: Date;
};

type SubmissionData = {
  interviewId: string;
  candidateEmail: string;
  answers: MCQAnswer[];
  completedAt: Date;
  totalTimeSpent: number;
};

export async function POST(request: NextRequest) {
  try {
    const body: SubmissionData = await request.json();
    const { interviewId, candidateEmail, answers, completedAt, totalTimeSpent } = body;

    // Validate required fields
    if (!interviewId || !candidateEmail || !answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find the interview
    const interview = await db
      .select()
      .from(Interview)
      .where(eq(Interview.interviewId, interviewId))
      .limit(1);

    if (interview.length === 0) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      );
    }

    const interviewData = interview[0];

    // Verify candidate email matches
    if (interviewData.candidateEmail !== candidateEmail) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    // Parse existing questions to calculate score
    let questions = [];
    try {
      questions = JSON.parse(interviewData.interviewQuestions || '[]');
    } catch (error) {
      console.error('Error parsing interview questions:', error);
      return NextResponse.json(
        { error: 'Invalid interview data' },
        { status: 500 }
      );
    }

    // Calculate score and detailed results
    let correctAnswers = 0;
    const detailedResults = answers.map((answer, index) => {
      const question = questions[answer.questionIndex];
      if (!question || !question.options) {
        return {
          questionIndex: answer.questionIndex,
          question: question?.Question || 'Unknown question',
          selectedAnswer: 'Unknown',
          correctAnswer: 'Unknown',
          isCorrect: false,
          confidence: answer.confidence,
          timeSpent: answer.timeSpent,
          explanation: question?.explanation || 'No explanation available'
        };
      }

      const selectedOption = question.options.find((opt: any) => opt.id === answer.selectedOptionId);
      const correctOption = question.options.find((opt: any) => opt.isCorrect === true);
      const isCorrect = selectedOption?.isCorrect === true;
      
      if (isCorrect) {
        correctAnswers++;
      }

      return {
        questionIndex: answer.questionIndex,
        question: question.question || question.Question,
        selectedAnswer: selectedOption?.text || 'No answer selected',
        correctAnswer: correctOption?.text || 'Unknown',
        isCorrect,
        confidence: answer.confidence,
        timeSpent: answer.timeSpent,
        explanation: question.explanation || 'No explanation available'
      };
    });

    const totalQuestions = questions.length;
    const scorePercentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    const averageConfidence = answers.length > 0 
      ? Math.round(answers.reduce((sum, answer) => sum + answer.confidence, 0) / answers.length * 10) / 10
      : 0;

    // Prepare feedback based on performance
    let performanceFeedback = '';
    if (scorePercentage >= 80) {
      performanceFeedback = 'Excellent performance! You demonstrated strong knowledge and understanding.';
    } else if (scorePercentage >= 60) {
      performanceFeedback = 'Good performance! You showed solid understanding with room for improvement in some areas.';
    } else if (scorePercentage >= 40) {
      performanceFeedback = 'Fair performance. Consider reviewing the topics covered and strengthening your knowledge base.';
    } else {
      performanceFeedback = 'There is significant room for improvement. We recommend additional study and practice in the relevant areas.';
    }

    // Generate AI-powered feedback
    const aiFeedback = await generateAIFeedback(detailedResults, scorePercentage, averageConfidence, totalTimeSpent);

    // Create comprehensive feedback object
    const feedback = {
      score: {
        correct: correctAnswers,
        total: totalQuestions,
        percentage: scorePercentage
      },
      performance: {
        averageConfidence,
        totalTimeSpent,
        averageTimePerQuestion: totalQuestions > 0 ? Math.round(totalTimeSpent / totalQuestions) : 0
      },
      summary: performanceFeedback,
      detailedResults,
      completedAt: new Date(completedAt).toISOString(),
      recommendations: generateRecommendations(scorePercentage, averageConfidence, detailedResults),
      aiAnalysis: aiFeedback
    };

    // Update the interview record with results
    await db
      .update(Interview)
      .set({
        updatedAt: new Date()
      })
      .where(eq(Interview.interviewId, interviewId));

    // Create or update analytics record
    try {
      await createAnalyticsRecord({
        interviewId,
        interviewType: 'mcq',
        candidateName: candidateEmail.split('@')[0], // Extract name from email
        candidateEmail,
        interviewerEmail: interviewData.createdBy || '',
      });
      
      await updateAnalyticsRecord({
        interviewId,
        completionStatus: true,
        overallRating: Math.round(scorePercentage / 20), // Convert to 1-5 scale
      });
    } catch (analyticsError) {
      console.error('Error creating analytics:', analyticsError);
      // Continue execution even if analytics fails
    }

    return NextResponse.json({
      success: true,
      message: 'Interview submitted successfully',
      results: {
        score: scorePercentage,
        correctAnswers,
        totalQuestions,
        feedback: performanceFeedback,
        detailedFeedback: feedback // Only visible to admin/company
      }
    });

  } catch (error) {
    console.error('Error submitting MCQ interview:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateRecommendations(score: number, confidence: number, results: any[]): string[] {
  const recommendations: string[] = [];

  // Score-based recommendations
  if (score < 60) {
    recommendations.push('Focus on strengthening fundamental concepts in the subject area');
    recommendations.push('Consider additional study materials and practice exercises');
  } else if (score < 80) {
    recommendations.push('Good foundation, but work on areas where you answered incorrectly');
    recommendations.push('Review explanations for missed questions to understand concepts better');
  } else {
    recommendations.push('Excellent knowledge demonstrated! Continue to stay updated with latest developments');
  }

  // Confidence-based recommendations
  if (confidence < 3) {
    recommendations.push('Work on building confidence through more practice and preparation');
  } else if (confidence > 4.5) {
    recommendations.push('Great confidence level! Ensure it aligns with actual performance');
  }

  // Time-based recommendations
  const quickAnswers = results.filter(r => r.timeSpent < 30).length;
  const slowAnswers = results.filter(r => r.timeSpent > 90).length;
  
  if (quickAnswers > results.length * 0.5) {
    recommendations.push('Consider taking more time to carefully read and analyze questions');
  }
  
  if (slowAnswers > results.length * 0.3) {
    recommendations.push('Work on improving response time through practice and familiarity with question types');
  }

  return recommendations;
}

async function generateAIFeedback(detailedResults: any[], scorePercentage: number, averageConfidence: number, totalTimeSpent: number) {
  try {
    const prompt = `You are an expert interview analyst. Provide constructive, professional feedback for MCQ interview performance. Focus on actionable insights.

Analyze this MCQ interview performance and provide detailed feedback:

Overall Score: ${scorePercentage}%
Average Confidence: ${averageConfidence}/5
Total Time: ${Math.round(totalTimeSpent / 60)} minutes
Questions Answered: ${detailedResults.length}

Detailed Results:
${detailedResults.map((result, index) => 
  `Q${index + 1}: ${result.isCorrect ? 'Correct' : 'Incorrect'} | Confidence: ${result.confidence}/5 | Time: ${result.timeSpent}s`
).join('\n')}

Provide analysis in this JSON format:
{
  "overallPerformance": "Brief overall assessment",
  "strengths": ["strength1", "strength2"],
  "areasForImprovement": ["area1", "area2"],
  "timeManagement": "Assessment of time usage",
  "confidenceAnalysis": "Analysis of confidence vs accuracy",
  "recommendations": ["recommendation1", "recommendation2"]
}`;

    const result = await generateJSONWithOpenAI(prompt, AI_CONFIGS.ANALYSIS);
    return result || generateFallbackFeedback(scorePercentage, averageConfidence);
  } catch (error) {
    console.error('Error generating AI feedback:', error);
    return generateFallbackFeedback(scorePercentage, averageConfidence);
  }
}

function generateFallbackFeedback(scorePercentage: number, averageConfidence: number) {
  return {
    overallPerformance: scorePercentage >= 70 ? "Good performance with solid understanding" : "Performance shows room for improvement",
    strengths: scorePercentage >= 70 ? ["Demonstrates good knowledge base", "Shows understanding of key concepts"] : ["Attempted all questions", "Shows engagement with the material"],
    areasForImprovement: scorePercentage < 70 ? ["Review fundamental concepts", "Practice more questions"] : ["Focus on areas with incorrect answers"],
    timeManagement: "Review time allocation strategies",
    confidenceAnalysis: averageConfidence > 3.5 ? "Good confidence level" : "Work on building confidence through practice",
    recommendations: ["Continue practicing", "Review explanations for missed questions"]
  };
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}