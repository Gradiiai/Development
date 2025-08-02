import { db } from "@/lib/database/connection";
import { InterviewAnalytics, Interview, CodingInterview, candidateInterviewHistory, candidateUsers } from "@/lib/database/schema";
import { eq, and } from "drizzle-orm";

export interface CreateAnalyticsData {
  interviewId: string;
  interviewType: string;
  candidateName?: string;
  candidateEmail?: string;
  interviewerEmail: string;
  scheduledTime?: Date;
}

export interface UpdateAnalyticsData {
  interviewId: string;
  completionStatus?: boolean;
  completionTime?: Date;
  overallRating?: number;
}

/**
 * Create a new analytics record for an interview
 */
export async function createAnalyticsRecord(data: CreateAnalyticsData) {
  try {
    // Check if record already exists
    const existingRecord = await db
      .select()
      .from(InterviewAnalytics)
      .where(eq(InterviewAnalytics.interviewId, data.interviewId))
      .limit(1);

    if (existingRecord.length > 0) {
      console.log(`Analytics record already exists for interview ${data.interviewId}`);
      return existingRecord[0];
    }

    // Create new record
    const result = await db
      .insert(InterviewAnalytics)
      .values({
        interviewId: data.interviewId,
        interviewType: data.interviewType,
        candidateName: data.candidateName || null,
        candidateEmail: data.candidateEmail || null,
        interviewerEmail: data.interviewerEmail,
        scheduledTime: data.scheduledTime || null,
        completionStatus: false,
        createdAt: new Date(),
      })
      .returning();

    console.log(`Analytics record created for interview ${data.interviewId}`);
    return result[0];
  } catch (error) {
    console.error("Error creating analytics record:", error);
    throw error;
  }
}

/**
 * Update an existing analytics record
 */
export async function updateAnalyticsRecord(data: UpdateAnalyticsData) {
  try {
    const updateData: any = {};
    
    if (data.completionStatus !== undefined) {
      updateData.completionStatus = data.completionStatus;
    }
    
    if (data.completionTime) {
      updateData.completionTime = data.completionTime;
    }
    
    if (data.overallRating) {
      updateData.overallRating = data.overallRating;
    }

    // If marking as completed and no completion time provided, set current time
    if (data.completionStatus === true && !data.completionTime) {
      updateData.completionTime = new Date();
    }

    const result = await db
      .update(InterviewAnalytics)
      .set(updateData)
      .where(eq(InterviewAnalytics.interviewId, data.interviewId))
      .returning();

    if (result.length === 0) {
      console.log(`No analytics record found for interview ${data.interviewId}`);
      return null;
    }

    console.log(`Analytics record updated for interview ${data.interviewId}`);
    return result[0];
  } catch (error) {
    console.error("Error updating analytics record:", error);
    throw error;
  }
}

/**
 * Get analytics record by interview ID
 */
export async function getAnalyticsRecord(interviewId: string) {
  try {
    const result = await db
      .select()
      .from(InterviewAnalytics)
      .where(eq(InterviewAnalytics.interviewId, interviewId))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("Error fetching analytics record:", error);
    throw error;
  }
}

/**
 * Mark interview as completed with optional rating
 */
export async function markInterviewCompleted(
  interviewId: string,
  overallRating?: number
) {
  return updateAnalyticsRecord({
    interviewId,
    completionStatus: true,
    completionTime: new Date(),
    overallRating,
  });
}

/**
 * Check if interview should be auto-completed and mark it as such
 * Updated to use candidateInterviewHistory instead of legacy tables
 */
export async function checkAndAutoCompleteInterview(
  interviewId: string,
  interviewType: 'behavioral' | 'coding' | 'combo',
  candidateEmail: string
) {
  try {
    // Get candidate
    const candidateUser = await db
      .select()
      .from(candidateUsers)
      .where(eq(candidateUsers.email, candidateEmail))
      .limit(1);

    if (candidateUser.length === 0) {
      console.warn("Candidate not found for email:", candidateEmail);
      return false;
    }

    const candidate = candidateUser[0];

    // Check if interview is already completed in candidateInterviewHistory
    const historyRecord = await db
      .select()
      .from(candidateInterviewHistory)
      .where(
        and(
          eq(candidateInterviewHistory.candidateId, candidate.id),
          eq(candidateInterviewHistory.interviewId, interviewId)
        )
      )
      .limit(1);

    if (historyRecord.length === 0) {
      console.warn("No interview history found for interview:", interviewId);
      return false;
    }

    const history = historyRecord[0];
    
    // If already completed, mark analytics as completed
    if (history.status === 'completed') {
      await markInterviewCompleted(interviewId, history.score || undefined);
      console.log(`Interview ${interviewId} already completed with status: ${history.status}`);
      return true;
    }

    // Check if we have answers to determine completion
    let shouldComplete = false;
    let totalQuestions = 0;
    let answeredQuestions = 0;

    if (history.feedback) {
      try {
        const feedbackData = JSON.parse(history.feedback);
        
        // If feedback contains structured answers, check completion
        if (feedbackData.answers) {
          const answers = Array.isArray(feedbackData.answers) ? feedbackData.answers : Object.values(feedbackData.answers);
          answeredQuestions = answers.filter((answer: any) => 
            answer && (typeof answer === 'string' ? answer.trim().length > 0 : true)
          ).length;
          totalQuestions = feedbackData.maxScore || answers.length;
          shouldComplete = answeredQuestions >= totalQuestions && totalQuestions > 0;
        }
      } catch (e) {
        console.error("Error parsing feedback data:", e);
      }
    }

    // Get interview details to verify question count
    if (interviewType === 'behavioral' || interviewType === 'combo') {
      const interview = await db
        .select()
        .from(Interview)
        .where(eq(Interview.interviewId, interviewId))
        .limit(1);

      if (interview.length > 0) {
        try {
          const questionsData = interview[0].interviewQuestions;
          if (questionsData) {
            const questions = JSON.parse(questionsData);
            const expectedQuestions = Array.isArray(questions) ? questions.length : 0;
            if (expectedQuestions > 0) {
              totalQuestions = expectedQuestions;
              shouldComplete = answeredQuestions >= totalQuestions;
            }
          }
        } catch (e) {
          console.error("Error parsing interview questions:", e);
        }

        // Update interview status if should complete
        if (shouldComplete && interview[0].interviewStatus !== 'completed') {
          await db
            .update(Interview)
            .set({ interviewStatus: "completed" })
            .where(eq(Interview.interviewId, interviewId));
        }
      }
    } else if (interviewType === 'coding') {
      const interview = await db
        .select()
        .from(CodingInterview)
        .where(eq(CodingInterview.interviewId, interviewId))
        .limit(1);

      if (interview.length > 0) {
        try {
          const questionsData = interview[0].codingQuestions;
          if (questionsData) {
            const questions = JSON.parse(questionsData);
            const expectedQuestions = Array.isArray(questions) ? questions.length : 0;
            if (expectedQuestions > 0) {
              totalQuestions = expectedQuestions;
              shouldComplete = answeredQuestions >= totalQuestions;
            }
          }
        } catch (e) {
          console.error("Error parsing coding questions:", e);
        }

        // Update coding interview status if should complete
        if (shouldComplete && interview[0].interviewStatus !== 'completed') {
          await db
            .update(CodingInterview)
            .set({ interviewStatus: "completed" })
            .where(eq(CodingInterview.interviewId, interviewId));
        }
      }
    }

    // Update candidateInterviewHistory and analytics if completed
    if (shouldComplete && history.status !== 'completed') {
      await db
        .update(candidateInterviewHistory)
        .set({ 
          status: 'completed',
          completedAt: new Date()
        })
        .where(eq(candidateInterviewHistory.id, history.id));

      await markInterviewCompleted(interviewId, history.score || undefined);
      console.log(`Auto-completed ${interviewType} interview ${interviewId}`);
    }

    return shouldComplete;
  } catch (error) {
    console.error("Error checking interview completion:", error);
    return false;
  }
}

/**
 * Get analytics summary for an interviewer
 */
export async function getInterviewerAnalytics(interviewerEmail: string) {
  try {
    const analytics = await db
      .select()
      .from(InterviewAnalytics)
      .where(eq(InterviewAnalytics.interviewerEmail, interviewerEmail));

    const summary = {
      totalInterviews: analytics.length,
      completedInterviews: analytics.filter(a => a.completionStatus).length,
      pendingInterviews: analytics.filter(a => !a.completionStatus).length,
      averageRating: 0,
      interviewTypes: {} as Record<string, number>,
    };

    // Calculate average rating
    const ratingsWithValues = analytics.filter(a => a.overallRating !== null);
    if (ratingsWithValues.length > 0) {
      summary.averageRating = ratingsWithValues.reduce(
        (sum, a) => sum + (typeof a.overallRating === 'string' ? parseFloat(a.overallRating) : (a.overallRating ?? 0)),
        0
      ) / ratingsWithValues.length;
    }

    // Count by interview types
    analytics.forEach(a => {
      summary.interviewTypes[a.interviewType] = 
        (summary.interviewTypes[a.interviewType] || 0) + 1;
    });

    return summary;
  } catch (error) {
    console.error("Error fetching interviewer analytics:", error);
    throw error;
  }
}