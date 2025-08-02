import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';
import { 
  candidateUsers, 
  candidateInterviewHistory, 
  CodingInterview, 
  Interview, 
  interviewSetups, 
  jobCampaigns, 
  companies,
  InterviewAnalytics
  // interviews and interviewLogs removed - unified system not used
} from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';

// GET - Check interview completion status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const candidateEmail = searchParams.get('email');

    if (!candidateEmail) {
      return NextResponse.json(
        { error: 'Missing required parameter: email' },
        { status: 400 }
      );
    }

    // Get candidate user
    const candidateUser = await db
      .select()
      .from(candidateUsers)
      .where(eq(candidateUsers.email, candidateEmail))
      .limit(1);

    if (!candidateUser.length) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      );
    }

    const candidate = candidateUser[0];

    // Check interview completion status
    const interview = await db
      .select()
      .from(candidateInterviewHistory)
      .where(
        and(
          eq(candidateInterviewHistory.candidateId, candidate.id),
          eq(candidateInterviewHistory.interviewId, id)
        )
      )
      .limit(1);

    if (interview.length === 0) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      );
    }

    const interviewData = interview[0];

    // Get additional interview details from Interview table
    let interviewDetails: {
      jobPosition: string;
      companyId: string;
      interviewQuestions: string;
      companyName?: string;
    } | null = null;
    
    try {
      const interviewRecord = await db
        .select({
          jobPosition: Interview.jobPosition,
          companyId: Interview.companyId,
          interviewQuestions: Interview.interviewQuestions
        })
        .from(Interview)
        .where(eq(Interview.interviewId, id))
        .limit(1);
      
      if (interviewRecord.length > 0) {
        interviewDetails = { ...interviewRecord[0] };
        
        // Get company name
        const companyRecord = await db
          .select({ name: companies.name })
          .from(companies)
          .where(eq(companies.id, interviewDetails.companyId))
          .limit(1);
        
        if (companyRecord.length > 0) {
          interviewDetails.companyName = companyRecord[0].name;
        }
      }
    } catch (err) {
      console.log('Could not fetch additional interview details:', err);
    }

    // Parse feedback if available
    let parsedFeedback = null;
    if (interviewData.feedback) {
      try {
        parsedFeedback = JSON.parse(interviewData.feedback);
      } catch (err) {
        console.log('Could not parse feedback JSON:', err);
      }
    }

    // Parse interview questions to match with answers
    let interviewQuestions = [];
    if (interviewDetails?.interviewQuestions) {
      try {
        interviewQuestions = JSON.parse(interviewDetails.interviewQuestions);
      } catch (err) {
        console.log('Could not parse interview questions:', err);
      }
    }

    // Create structured answers array
    const structuredAnswers = (() => {
      if (!parsedFeedback?.answers || !interviewQuestions.length) return [];
      
      let candidateAnswers = [];
      
      // Convert answers object to array if needed
      if (typeof parsedFeedback.answers === 'object' && !Array.isArray(parsedFeedback.answers)) {
        candidateAnswers = Object.keys(parsedFeedback.answers)
          .sort((a, b) => Number(a) - Number(b))
          .map(key => parsedFeedback.answers[key]);
      } else if (Array.isArray(parsedFeedback.answers)) {
        candidateAnswers = parsedFeedback.answers;
      }
      
      // Match answers with questions
       return candidateAnswers.map((selectedAnswer: any, index: number) => {
         const question = interviewQuestions[index];
         if (!question) return null;
         
         const selectedOption = question.options?.[selectedAnswer];
         const correctAnswer = question.options?.[question.correctAnswer] || question.answer;
         const isCorrect = selectedAnswer === question.correctAnswer;
         
         return {
           questionId: `q_${index}`,
           question: question.question || question.Question || '',
           selectedAnswer: selectedOption || `Option ${selectedAnswer + 1}`,
           correctAnswer: correctAnswer || '',
           isCorrect: isCorrect,
           timeSpent: 60, // Default time per question
           marks: isCorrect ? 1 : 0,
           maxMarks: 1
         };
       }).filter((answer: any) => Boolean(answer));
    })();

    return NextResponse.json({
      success: true,
      data: {
        id: id,
        title: interviewDetails?.jobPosition || 'Interview',
        companyName: interviewDetails?.companyName || 'Company',
        jobTitle: interviewDetails?.jobPosition || 'Position',
        interviewId: id,
        candidateId: candidate.id,
        status: interviewData.status,
        completedAt: interviewData.completedAt,
        startedAt: interviewData.startedAt,
        actualDuration: interviewData.duration,
        interviewType: interviewData.interviewType || 'MCQ',
        score: interviewData.score,
        maxScore: interviewData.maxScore,
        passed: interviewData.passed,
        isCompleted: interviewData.status === 'completed',
        hasAnswers: !!interviewData.feedback,
        feedback: parsedFeedback,
        answers: structuredAnswers,
        questions: interviewQuestions,
        timeSpent: parsedFeedback?.timeSpent || 0,
        totalQuestions: structuredAnswers.length,
        correctAnswers: structuredAnswers.filter((a: any) => a.isCorrect).length
      }
    });

  } catch (error) {
    console.error('Error checking interview completion status:', error);
    return NextResponse.json(
      { error: 'Failed to check interview status' },
      { status: 500 }
    );
  }
}

// POST - Complete interview with full data submission
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { candidateEmail, answers, totalQuestions, answeredQuestions, interviewType, videoRecordingUrl } = body;

    // Basic validation
    if (!candidateEmail || !answers) {
      return NextResponse.json(
        { error: 'Missing required fields: candidateEmail and answers' },
        { status: 400 }
      );
    }

    // Get candidate user
    const candidateUser = await db
      .select()
      .from(candidateUsers)
      .where(eq(candidateUsers.email, candidateEmail))
      .limit(1);

    if (!candidateUser.length) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      );
    }

    const candidate = candidateUser[0];

    // Since you only use Campaign and Direct interviews, skip unified system
    // Go directly to legacy (Direct/Campaign) system handling
    return await handleLegacyInterviewCompletion(id, candidate, body);

  } catch (error) {
    console.error('Error completing interview:', error);
    return NextResponse.json(
      { error: 'Failed to complete interview' },
      { status: 500 }
    );
  }
}

// Direct and Campaign interview completion handler
async function handleLegacyInterviewCompletion(interviewId: string, candidate: any, body: any) {
  const { candidateEmail, answers, interviewDuration, programmingLanguage } = body;

  // Update interview history with completion
  try {
    const interview = await db
      .select()
      .from(candidateInterviewHistory)
      .where(
        and(
          eq(candidateInterviewHistory.candidateId, candidate.id),
          eq(candidateInterviewHistory.interviewId, interviewId)
        )
      )
      .limit(1);

    if (interview.length === 0) {
      return NextResponse.json(
        { error: 'Interview history not found' },
        { status: 404 }
      );
    }

    // Check if interview is already completed
    if (interview[0].status === 'completed') {
      return NextResponse.json(
        { error: 'Interview has already been completed and cannot be resubmitted' },
        { status: 400 }
      );
    }

    // Update the interview history with completion data
    await db
      .update(candidateInterviewHistory)
      .set({
        status: 'completed',
        completedAt: new Date(),
        feedback: JSON.stringify(answers),
        duration: interviewDuration || 30,
        // Add other completion data as needed
      })
      .where(
        and(
          eq(candidateInterviewHistory.candidateId, candidate.id),
          eq(candidateInterviewHistory.interviewId, interviewId)
        )
      );

    return NextResponse.json({
      success: true,
      message: 'Interview completed successfully',
      data: {
        interviewId,
        status: 'completed',
        completedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error in handleLegacyInterviewCompletion:', error);
    return NextResponse.json(
      { error: 'Failed to complete interview' },
      { status: 500 }
    );
  }
}