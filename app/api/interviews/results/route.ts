import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';
import { campaignInterviews, candidates, jobCampaigns, Interview, candidateInterviewHistory, candidateUsers, candidateApplications, companies } from '@/lib/database/schema';
// Unified interviews table removed - you only use Direct and Campaign interviews
import { eq, and, desc, or, sql } from 'drizzle-orm';
import { auth } from '@/auth';

// GET /api/interviews/results
export async function GET(request: NextRequest) {
  try {
    // Authenticate using session
    const session = await auth();
    
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all completed campaign interviews
    const campaignInterviewsData = await db
      .select({
        id: campaignInterviews.id,
        candidateId: campaignInterviews.candidateId,
        interviewId: campaignInterviews.interviewId,
        interviewType: campaignInterviews.interviewType,
        status: campaignInterviews.status,
        scheduledAt: campaignInterviews.scheduledAt,
        completedAt: campaignInterviews.completedAt,
        score: campaignInterviews.score,
        feedback: campaignInterviews.feedback,
        // Candidate info
        candidateName: candidates.name,
        candidateEmail: candidates.email,
        // Campaign info
        campaignId: jobCampaigns.id,
        campaignName: jobCampaigns.campaignName,
        jobTitle: jobCampaigns.jobTitle,
        sourceType: sql<string>`'campaign'`
      })
      .from(campaignInterviews)
      .innerJoin(candidates, eq(campaignInterviews.candidateId, candidates.id))
      .innerJoin(jobCampaigns, eq(candidates.campaignId, jobCampaigns.id))
      .where(and(
        eq(jobCampaigns.companyId, session.user.companyId),
        eq(campaignInterviews.status, 'completed')
      ))
      .orderBy(desc(campaignInterviews.completedAt));

    // Get all completed direct interviews from the Interview table (behavioral, combo)
    // Only get interviews where campaignId is null to ensure proper isolation
    const directInterviewsData = await db
      .select({
        id: Interview.id,
        candidateId: Interview.candidateEmail, // Use email as candidate identifier
        interviewId: Interview.interviewId,
        interviewType: Interview.interviewType,
        status: Interview.interviewStatus,
        scheduledAt: Interview.createdAt, // Use created date as scheduled
        completedAt: Interview.updatedAt, // Use updated date as completed for now
        score: sql<number>`NULL`, // Direct interviews don't have scores yet
        feedback: sql<string>`NULL`,
        // Candidate info (from email in direct interviews)
        candidateName: Interview.candidateName,
        candidateEmail: Interview.candidateEmail,
        // Direct interview info
        campaignId: Interview.id, // Use interview ID as campaign ID for direct
        campaignName: sql<string>`'Direct Interview'`,
        jobTitle: Interview.jobPosition,
        sourceType: sql<string>`'direct'`
      })
      .from(Interview)
      .where(and(
        eq(Interview.companyId, session.user.companyId),
        eq(Interview.interviewStatus, 'completed'),
        sql`${Interview.campaignId} IS NULL` // Ensure only direct interviews (no campaign association)
      ))
      .orderBy(desc(Interview.updatedAt));

    // Note: Unified interviews table is not currently used in your system
    // Since you only use Campaign and Direct interviews, we'll skip the unified table
    const newInterviewsData: any[] = [];

    // Get completed interviews from candidateInterviewHistory (internal candidate interviews)
    const candidateHistoryData = await db
      .select({
        id: candidateInterviewHistory.id,
        candidateId: candidateUsers.email,
        interviewId: candidateInterviewHistory.interviewId,
        interviewType: candidateInterviewHistory.interviewType,
        status: candidateInterviewHistory.status,
        scheduledAt: candidateInterviewHistory.startedAt,
        completedAt: candidateInterviewHistory.completedAt,
        score: candidateInterviewHistory.score,
        feedback: candidateInterviewHistory.feedback,
        // Candidate info
        candidateName: sql<string>`CONCAT(${candidateUsers.firstName}, ' ', ${candidateUsers.lastName})`,
        candidateEmail: candidateUsers.email,
        // Campaign info (if available)
        campaignId: candidateApplications.campaignId,
        campaignName: jobCampaigns.campaignName,
        jobTitle: sql<string>`COALESCE(${jobCampaigns.jobTitle}, 'Interview')`,
        sourceType: sql<string>`'candidate'`
      })
      .from(candidateInterviewHistory)
      .innerJoin(candidateUsers, eq(candidateInterviewHistory.candidateId, candidateUsers.id))
      .leftJoin(candidateApplications, eq(candidateInterviewHistory.applicationId, candidateApplications.id))
      .leftJoin(jobCampaigns, eq(candidateApplications.campaignId, jobCampaigns.id))
      .leftJoin(companies, eq(jobCampaigns.companyId, companies.id))
      .where(and(
        eq(candidateInterviewHistory.status, 'completed'),
        or(
          eq(companies.id, session.user.companyId),
          sql`${candidateApplications.campaignId} IS NULL` // Include direct interviews without campaigns
        )
      ))
      .orderBy(desc(candidateInterviewHistory.completedAt));

    // Combine and process all interviews
    const allInterviews = [...campaignInterviewsData, ...directInterviewsData, ...newInterviewsData, ...candidateHistoryData];

    console.log(`Found ${allInterviews.length} completed interviews:`, {
      campaign: campaignInterviewsData.length,
      direct: directInterviewsData.length,
      candidateHistory: candidateHistoryData.length
    });

    // Process each interview to calculate summary statistics
    const results = await Promise.all(
      allInterviews.map(async (interview) => {
        // Get answers for this interview - handle both types
        let answers: any[] = [];
        let codeAnswers: any[] = [];

        try {
          if (interview.sourceType === 'direct') {
            // For direct interviews, answers might be stored differently
            const interviewAnswers = 'answers' in interview ? interview.answers : null;
            console.log(`Processing direct interview ${interview.interviewId}. Raw answers:`, typeof interviewAnswers, interviewAnswers);
            
            if (interviewAnswers && typeof interviewAnswers === 'object') {
              answers = Object.entries(interviewAnswers).map(([questionId, answer]) => ({
                id: questionId,
                answer: answer,
                questionId: questionId
              }));
            }
          } else {
            // For campaign interviews, get from candidateInterviewHistory
            const interviewIdString = interview.interviewId ? String(interview.interviewId) : '';
            const historyRecords = await db
              .select()
              .from(candidateInterviewHistory)
              .where(eq(candidateInterviewHistory.interviewId, interviewIdString));
              
            if (historyRecords.length > 0 && historyRecords[0].feedback) {
              try {
                const feedbackData = JSON.parse(historyRecords[0].feedback);
                console.log(`Processing campaign interview ${interview.interviewId}. Parsed feedback:`, typeof feedbackData, feedbackData);
                
                // Handle different feedback structures
                if (feedbackData.answers) {
                  // If answers is an object with numeric keys, convert to array
                  if (typeof feedbackData.answers === 'object' && !Array.isArray(feedbackData.answers)) {
                    answers = Object.keys(feedbackData.answers)
                      .sort((a, b) => Number(a) - Number(b))
                      .map(key => feedbackData.answers[key]);
                  } else {
                    answers = Array.isArray(feedbackData.answers) ? feedbackData.answers : [];
                  }
                } else if (typeof feedbackData === 'object' && !feedbackData.answers) {
                  // Handle case where feedback is directly the answers object
                  const keys = Object.keys(feedbackData).filter(key => !isNaN(Number(key)));
                  if (keys.length > 0) {
                    answers = keys
                      .sort((a, b) => Number(a) - Number(b))
                      .map(key => feedbackData[key]);
                  } else {
                    answers = [];
                  }
                } else {
                  answers = [];
                }
                
                codeAnswers = []; // Code answers are mixed in with regular answers in new system
                console.log(`Campaign interview answers array:`, Array.isArray(answers), answers.length);
              } catch (error) {
                console.error('Error parsing feedback data:', error);
                answers = [];
                codeAnswers = [];
              }
            } else {
              console.log(`No feedback found for campaign interview ${interview.interviewId}`);
              answers = [];
              codeAnswers = [];
            }
          }
        } catch (err) {
          console.error('Error fetching answers for interview:', interview.id, err);
        }

        // Calculate statistics
        const totalQuestions = answers.length + codeAnswers.length;
        const totalAnswers = answers.length;
        const totalCodeAnswers = codeAnswers.length;
        
        // Calculate time-based metrics
        const scheduledTime = new Date(interview.scheduledAt || Date.now());
        const completedTime = interview.completedAt ? new Date(interview.completedAt) : new Date();
        const totalTimeSpent = Math.max(0, Math.floor((completedTime.getTime() - scheduledTime.getTime()) / (1000 * 60))); // minutes
        const averageTimePerQuestion = totalQuestions > 0 ? totalTimeSpent / totalQuestions : 0;

        // Calculate performance metrics
        const averageRating = interview.score || 0;
        const accuracy = totalQuestions > 0 ? ((interview.score || 0) / 100) * 100 : 0;
        const timeEfficiency = averageTimePerQuestion > 0 ? Math.min(100, (5 / averageTimePerQuestion) * 100) : 0;
        const completionRate = totalQuestions > 0 ? (totalAnswers / totalQuestions) * 100 : 0;

        const performanceMetrics = {
          accuracy,
          averageRating,
          timeEfficiency,
          completionRate
        };

        // Generate AI analytics for each interview
        const generateAIAnalytics = (interviewType: string, answers: any[], codeAnswers: any[], performanceMetrics: any) => {
          // Default analytics structure that matches frontend expectations
          const defaultAnalytics = {
            strengths: [] as string[],
            improvements: [] as string[],
            recommendations: [] as string[],
            overallAssessment: '',
            technicalSkills: [] as string[],
            softSkills: [] as string[],
            nextSteps: [] as string[]
          };

          // Generate basic analytics based on interview type and performance
          if (interviewType === 'behavioral') {
            defaultAnalytics.overallAssessment = `Based on ${answers.length} behavioral interview answers with average rating ${performanceMetrics.averageRating}/5, the candidate demonstrates varying levels of communication skills and problem-solving approach.`;
            defaultAnalytics.strengths = performanceMetrics.averageRating >= 3.5 ? 
              ['Good communication skills', 'Clear problem-solving approach', 'Relevant experience shared'] : 
              ['Attempted to answer questions', 'Showed engagement'];
            defaultAnalytics.improvements = performanceMetrics.averageRating < 3.5 ? 
              ['More specific examples needed', 'Better structure in responses', 'Improved clarity in communication'] : 
              ['Could provide more detailed examples', 'Consider adding quantifiable results'];
            defaultAnalytics.recommendations = ['Practice behavioral interview questions', 'Prepare specific examples using STAR method', 'Focus on measurable outcomes'];
            defaultAnalytics.softSkills = ['Communication', 'Problem-solving', 'Adaptability'];
            defaultAnalytics.nextSteps = ['Review behavioral responses', 'Consider technical assessment if applicable'];
          } else if (interviewType === 'mcq') {
            defaultAnalytics.overallAssessment = `Based on ${answers.length} MCQ answers with ${(performanceMetrics.accuracy) * 10}% accuracy, the candidate shows ${performanceMetrics.accuracy >= 70 ? 'good' : 'limited'} technical knowledge.`;
            defaultAnalytics.strengths = performanceMetrics.accuracy >= 70 ? 
              ['Good technical knowledge', 'Strong foundational understanding', 'Accurate problem identification'] : 
              ['Basic understanding of concepts', 'Attempted all questions'];
            defaultAnalytics.improvements = performanceMetrics.accuracy < 70 ? 
              ['Strengthen fundamental concepts', 'Practice more technical questions', 'Review key topics'] : 
              ['Deepen advanced concepts', 'Stay updated with latest practices'];
            defaultAnalytics.recommendations = ['Continue technical learning', 'Practice more coding challenges', 'Review incorrect answers'];
            defaultAnalytics.technicalSkills = ['Technical fundamentals', 'Problem analysis', 'Knowledge application'];
            defaultAnalytics.nextSteps = ['Technical skill development', 'Consider practical coding assessment'];
          } else if (interviewType === 'coding') {
            defaultAnalytics.overallAssessment = `Based on ${codeAnswers.length} coding solutions with average rating ${performanceMetrics.averageRating}/5, the candidate shows ${performanceMetrics.averageRating >= 3.5 ? 'strong' : 'developing'} algorithmic thinking.`;
            defaultAnalytics.strengths = performanceMetrics.averageRating >= 3.5 ? 
              ['Good algorithmic thinking', 'Clean code structure', 'Proper problem-solving approach'] : 
              ['Basic coding ability', 'Attempted solutions', 'Shows logical thinking'];
            defaultAnalytics.improvements = performanceMetrics.averageRating < 3.5 ? 
              ['Strengthen algorithmic skills', 'Improve code efficiency', 'Better error handling'] : 
              ['Optimize for edge cases', 'Enhance code documentation', 'Consider time complexity'];
            defaultAnalytics.recommendations = ['Practice coding problems daily', 'Study algorithms and data structures', 'Code review sessions'];
            defaultAnalytics.technicalSkills = ['Algorithm design', 'Code implementation', 'Problem decomposition'];
            defaultAnalytics.nextSteps = ['Advanced coding challenges', 'System design discussion'];
          } else if (interviewType === 'combo') {
            defaultAnalytics.overallAssessment = `Based on ${answers.length} general answers and ${codeAnswers.length} coding solutions, the candidate demonstrates balanced technical and soft skills.`;
            defaultAnalytics.strengths = ['Versatile skill set', 'Both technical and communication abilities', 'Comprehensive problem-solving approach'];
            defaultAnalytics.improvements = ['Continue developing both technical and soft skills', 'Balance between depth and breadth'];
            defaultAnalytics.recommendations = ['Maintain skill balance', 'Focus on areas needing improvement', 'Consider specialized training'];
            defaultAnalytics.technicalSkills = ['Programming', 'System thinking', 'Technical communication'];
            defaultAnalytics.softSkills = ['Communication', 'Adaptability', 'Problem-solving'];
            defaultAnalytics.nextSteps = ['Comprehensive skill assessment', 'Role-specific evaluation'];
          }

          return defaultAnalytics;
        };

        // Get video recording URLs for this interview
        const getVideoRecordingUrls = async (interviewId: string, answersArray: any[]) => {
          try {
            // Use Azure blob storage metadata or database records
            const baseUrl = process.env.AZURE_STORAGE_RECORDINGS_URL || '';
            
            // Safely handle answers array - ensure it's actually an array
            const safeAnswers = Array.isArray(answersArray) ? answersArray : [];
            
            return {
              fullInterview: `${baseUrl}/interviews/${interviewId}/video-full-interview.webm`,
              audioRecordings: safeAnswers.map((_, index) => ({
                questionIndex: index,
                url: `${baseUrl}/interviews/${interviewId}/audio/question-${index}-audio.webm`
              }))
            };
          } catch (error) {
            console.error('Error getting video recording URLs:', error);
            return { fullInterview: null, audioRecordings: [] };
          }
        };

        const recordingUrls = await getVideoRecordingUrls(interview.interviewId, answers);

        // Generate AI analytics for Direct and Campaign interviews
        let analytics = generateAIAnalytics(interview.interviewType || 'unknown', answers, codeAnswers, performanceMetrics);

        return {
          interview: {
            id: interview.id,
            candidateName: interview.candidateName,
            jobPosition: interview.jobTitle,
            interviewType: interview.interviewType,
            completedAt: interview.completedAt,
            duration: totalTimeSpent,
            candidateId: interview.candidateId,
            campaignId: interview.campaignId
          },
          summary: {
            totalQuestions,
            averageRating: Math.round(averageRating * 100) / 100,
            totalAnswers: answers.length,
            totalCodeAnswers: codeAnswers.length,
            totalTimeSpent,
            averageTimePerQuestion,
            performanceMetrics
          },
          videoRecordings: {
            fullInterview: recordingUrls.fullInterview,
            audioRecordings: recordingUrls.audioRecordings,
            hasRecordings: !!(recordingUrls.fullInterview || recordingUrls.audioRecordings.length > 0)
          },
          analytics,
          approvalStatus: 'pending' // Default status, can be enhanced later
        };
      })
    );

    // Calculate dashboard statistics
    const stats = {
      totalInterviews: results.length,
      averageScore: results.length > 0 ? 
        results.reduce((sum, r) => sum + r.summary.performanceMetrics.averageRating, 0) / results.length * 20 : 0,
      completionRate: results.length > 0 ? 
        results.reduce((sum, r) => sum + r.summary.performanceMetrics.completionRate, 0) / results.length : 0,
      totalCandidates: new Set(results.map(r => r.interview.candidateName)).size
    };

    return NextResponse.json({
      results,
      stats,
      pagination: {
        total: results.length,
        page: 1,
        limit: 100
      }
    });

  } catch (error) {
    console.error('Error fetching interview results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch interview results' },
      { status: 500 }
    );
  }
}