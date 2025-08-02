import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';
import { eq, and, desc, sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { 
  Interview,
  candidateInterviewHistory
} from '@/lib/database/schema';

interface MCQAnalytics {
  id: string;
  interviewId: string;
  candidateName: string;
  candidateEmail: string;
  jobPosition: string;
  totalQuestions: number;
  correctAnswers: number;
  totalScore: number;
  averageTimePerQuestion: number;
  totalTimeSpent: number;
  completedAt: string;
  difficulty: string;
  sectionWiseAccuracy: {
    technical: number;
    behavioral: number;
    logical: number;
  };
  questionWiseResults: {
    questionId: string;
    question: string;
    selectedAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    timeSpent: number;
    confidence: number;
    difficulty: string;
    category: string;
  }[];
  aiFeedback: {
    overallPerformance: string;
    strengths: string[];
    improvements: string[];
    questionWiseFeedback: {
      questionId: string;
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
        { error: 'Company ID required' },
        { status: 400 }
      );
    }

    // Fetch MCQ interviews for the company
    const mcqInterviews = await db
      .select()
      .from(Interview)
      .where(
        and(
          eq(Interview.companyId, companyId),
          eq(Interview.interviewType, 'mcq')
        )
      )
      .orderBy(desc(Interview.createdAt));

    const analyticsData: MCQAnalytics[] = [];

    for (const interview of mcqInterviews) {
      try {
        // Get user answers for this interview from candidateInterviewHistory table
        const userAnswers = await db
          .select()
          .from(candidateInterviewHistory)
          .where(
            and(
              eq(candidateInterviewHistory.interviewId, interview.interviewId),
              eq(candidateInterviewHistory.interviewType, 'mcq')
            )
          );

        // Skip if no answers found
        if (userAnswers.length === 0) continue;

        // Parse feedback to extract MCQ data
        const mcqData: any[] = [];
        userAnswers.forEach(answer => {
          try {
            const feedback = JSON.parse(answer.feedback || '{}');
            mcqData.push({
              question: feedback.question || '',
              userAnswer: feedback.userAnswer || '',
              correctAnswer: feedback.correctAnswer || '',
              score: answer.score || 0
            });
          } catch (e) {
            // Skip invalid feedback JSON
          }
        });

        // Calculate metrics from parsed MCQ data
        const totalQuestions = mcqData.length;
        const correctAnswers = mcqData.filter(answer => 
          answer.userAnswer.toLowerCase().trim() === answer.correctAnswer.toLowerCase().trim()
        ).length;
        const totalScore = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
        
        // For now, we'll use default values for time-related metrics
        // These would need to be stored in the database for accurate tracking
        const averageTimePerQuestion = 45; // Default 45 seconds per question
        const totalTimeSpent = totalQuestions * averageTimePerQuestion;

        // Calculate section-wise accuracy (simplified)
        const sectionWiseAccuracy = {
          technical: totalScore,
          behavioral: totalScore,
          logical: totalScore
        };

        // Generate AI feedback
        const aiFeedback = await generateAIFeedback({
          candidateName: interview.candidateName || 'Unknown',
          jobPosition: interview.jobPosition || 'Unknown',
          totalScore,
          correctAnswers,
          totalQuestions,
          averageTimePerQuestion,
          sectionWiseAccuracy,
          questionWiseResults: mcqData
        });

        const questionWiseResults = mcqData.map((answer, index) => ({
          questionId: `q_${index}`,
          question: answer.question,
          selectedAnswer: answer.userAnswer,
          correctAnswer: answer.correctAnswer,
          isCorrect: answer.userAnswer.toLowerCase().trim() === answer.correctAnswer.toLowerCase().trim(),
          timeSpent: averageTimePerQuestion,
          confidence: 80, // Default confidence
          difficulty: 'medium',
          category: 'general'
        }));

        analyticsData.push({
          id: interview.id.toString(),
          interviewId: interview.interviewId,
          candidateName: interview.candidateName || 'Unknown',
          candidateEmail: interview.candidateEmail || 'Unknown',
          jobPosition: interview.jobPosition || 'Unknown',
          totalQuestions,
          correctAnswers,
          totalScore,
          averageTimePerQuestion,
          totalTimeSpent,
          completedAt: interview.createdAt?.toISOString() || new Date().toISOString(),
          difficulty: 'medium',
          sectionWiseAccuracy,
          questionWiseResults,
          aiFeedback
        });
      } catch (error) {
        console.error(`Error processing interview ${interview.id}:`, error);
        continue;
      }
    }

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error('Error fetching MCQ analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function calculateSectionWiseAccuracy(answers: any[]) {
  const sections = {
    technical: { correct: 0, total: 0 },
    behavioral: { correct: 0, total: 0 },
    logical: { correct: 0, total: 0 }
  };

  answers.forEach(answer => {
    const category = answer.category?.toLowerCase() || 'technical';
    const sectionKey = ['technical', 'behavioral', 'logical'].includes(category) 
      ? category as keyof typeof sections
      : 'technical';
    
    sections[sectionKey].total++;
    if (answer.isCorrect) {
      sections[sectionKey].correct++;
    }
  });

  return {
    technical: sections.technical.total > 0 
      ? Math.round((sections.technical.correct / sections.technical.total) * 100) 
      : 0,
    behavioral: sections.behavioral.total > 0 
      ? Math.round((sections.behavioral.correct / sections.behavioral.total) * 100) 
      : 0,
    logical: sections.logical.total > 0 
      ? Math.round((sections.logical.correct / sections.logical.total) * 100) 
      : 0
  };
}

async function generateAIFeedback(data: {
  candidateName: string;
  jobPosition: string;
  totalScore: number;
  correctAnswers: number;
  totalQuestions: number;
  averageTimePerQuestion: number;
  sectionWiseAccuracy: any;
  questionWiseResults: any[];
}) {
  try {
    // Generate comprehensive AI feedback based on performance
    const overallPerformance = generateOverallPerformance(data);
    const strengths = generateStrengths(data);
    const improvements = generateImprovements(data);
    const questionWiseFeedback = generateQuestionWiseFeedback(data.questionWiseResults);

    return {
      overallPerformance,
      strengths,
      improvements,
      questionWiseFeedback
    };
  } catch (error) {
    console.error('Error generating AI feedback:', error);
    return {
      overallPerformance: 'Unable to generate feedback at this time.',
      strengths: ['Performance analysis pending'],
      improvements: ['Detailed analysis pending'],
      questionWiseFeedback: []
    };
  }
}

function generateOverallPerformance(data: any): string {
  const { totalScore, averageTimePerQuestion, sectionWiseAccuracy } = data;
  
  let performance = '';
  
  if (totalScore >= 90) {
    performance = `Exceptional performance with ${totalScore}% accuracy. Demonstrates strong technical competency and excellent problem-solving skills.`;
  } else if (totalScore >= 80) {
    performance = `Strong performance with ${totalScore}% accuracy. Shows good understanding of core concepts with room for minor improvements.`;
  } else if (totalScore >= 70) {
    performance = `Good performance with ${totalScore}% accuracy. Solid foundation with some areas needing attention.`;
  } else if (totalScore >= 60) {
    performance = `Average performance with ${totalScore}% accuracy. Basic understanding present but requires significant improvement.`;
  } else {
    performance = `Below average performance with ${totalScore}% accuracy. Needs substantial improvement in fundamental concepts.`;
  }
  
  // Add time analysis
  if (averageTimePerQuestion < 30) {
    performance += ' Excellent time management with quick decision-making.';
  } else if (averageTimePerQuestion < 60) {
    performance += ' Good time management with reasonable pace.';
  } else {
    performance += ' Time management needs improvement - consider practicing under time constraints.';
  }
  
  return performance;
}

function generateStrengths(data: any): string[] {
  const { totalScore, sectionWiseAccuracy, averageTimePerQuestion } = data;
  const strengths: string[] = [];
  
  if (totalScore >= 80) {
    strengths.push('Strong overall problem-solving ability');
  }
  
  if (sectionWiseAccuracy.technical >= 80) {
    strengths.push('Excellent technical knowledge and skills');
  }
  
  if (sectionWiseAccuracy.behavioral >= 80) {
    strengths.push('Strong understanding of behavioral concepts');
  }
  
  if (sectionWiseAccuracy.logical >= 80) {
    strengths.push('Excellent logical reasoning and analytical thinking');
  }
  
  if (averageTimePerQuestion < 45) {
    strengths.push('Efficient time management and quick decision-making');
  }
  
  if (strengths.length === 0) {
    strengths.push('Shows potential for improvement with focused practice');
  }
  
  return strengths;
}

function generateImprovements(data: any): string[] {
  const { totalScore, sectionWiseAccuracy, averageTimePerQuestion } = data;
  const improvements: string[] = [];
  
  if (sectionWiseAccuracy.technical < 70) {
    improvements.push('Focus on strengthening technical knowledge and core concepts');
  }
  
  if (sectionWiseAccuracy.behavioral < 70) {
    improvements.push('Improve understanding of behavioral and soft skill concepts');
  }
  
  if (sectionWiseAccuracy.logical < 70) {
    improvements.push('Practice logical reasoning and analytical problem-solving');
  }
  
  if (averageTimePerQuestion > 90) {
    improvements.push('Work on time management and decision-making speed');
  }
  
  if (totalScore < 60) {
    improvements.push('Review fundamental concepts and practice regularly');
  }
  
  if (improvements.length === 0) {
    improvements.push('Continue practicing to maintain and improve current performance level');
  }
  
  return improvements;
}

function generateQuestionWiseFeedback(questionResults: any[]) {
  return questionResults.map((result, index) => {
    let feedback = '';
    let recommendation = '';
    
    if (result.isCorrect) {
      if (result.timeSpent < 30) {
        feedback = 'Excellent! Quick and accurate response.';
        recommendation = 'Maintain this level of efficiency.';
      } else if (result.timeSpent < 60) {
        feedback = 'Good job! Correct answer with reasonable time.';
        recommendation = 'Try to improve response time slightly.';
      } else {
        feedback = 'Correct answer but took considerable time.';
        recommendation = 'Practice similar questions to improve speed.';
      }
    } else {
      if (result.timeSpent < 30) {
        feedback = 'Quick response but incorrect answer.';
        recommendation = 'Take more time to carefully analyze the question.';
      } else {
        feedback = 'Incorrect answer despite adequate time spent.';
        recommendation = `Review concepts related to ${result.category} questions.`;
      }
    }
    
    return {
      questionId: result.questionId,
      feedback,
      recommendation
    };
  });
}