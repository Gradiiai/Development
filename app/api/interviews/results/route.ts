import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';
import { candidateInterviewHistory, candidateUsers, candidateApplications, jobCampaigns, companies, Interview, CodingInterview } from '@/lib/database/schema';
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

    console.log(`Fetching interview results for company: ${session.user.companyId}`);

    // Primary source: candidateInterviewHistory with proper company filtering
    const completedInterviews = await db
      .select({
        // Interview History fields
        historyId: candidateInterviewHistory.id,
        interviewId: candidateInterviewHistory.interviewId,
        interviewType: candidateInterviewHistory.interviewType,
        status: candidateInterviewHistory.status,
        score: candidateInterviewHistory.score,
        maxScore: candidateInterviewHistory.maxScore,
        duration: candidateInterviewHistory.duration,
        feedback: candidateInterviewHistory.feedback,
        completedAt: candidateInterviewHistory.completedAt,
        startedAt: candidateInterviewHistory.startedAt,
        passed: candidateInterviewHistory.passed,
        
        // Candidate info
        candidateId: candidateUsers.id,
        candidateName: sql<string>`CONCAT(${candidateUsers.firstName}, ' ', COALESCE(${candidateUsers.lastName}, ''))`,
        candidateEmail: candidateUsers.email,
        
        // Campaign info (for campaign-based interviews)
        applicationId: candidateInterviewHistory.applicationId,
        campaignId: jobCampaigns.id,
        campaignName: jobCampaigns.campaignName,
        jobTitle: jobCampaigns.jobTitle,
        companyName: companies.name,
        
        // Interview source info
        directInterviewCompanyId: sql<string>`COALESCE(${Interview.companyId}, ${CodingInterview.companyId})`,
        directInterviewTitle: sql<string>`COALESCE(${Interview.jobPosition}, ${CodingInterview.interviewTopic})`,
        directInterviewName: sql<string>`COALESCE(${Interview.candidateName}, ${CodingInterview.candidateName})`,
        directInterviewEmail: sql<string>`COALESCE(${Interview.candidateEmail}, ${CodingInterview.candidateEmail})`
      })
      .from(candidateInterviewHistory)
      .innerJoin(candidateUsers, eq(candidateInterviewHistory.candidateId, candidateUsers.id))
      .leftJoin(candidateApplications, eq(candidateInterviewHistory.applicationId, candidateApplications.id))
      .leftJoin(jobCampaigns, eq(candidateApplications.campaignId, jobCampaigns.id))
      .leftJoin(companies, eq(jobCampaigns.companyId, companies.id))
      .leftJoin(Interview, eq(candidateInterviewHistory.interviewId, Interview.interviewId))
      .leftJoin(CodingInterview, eq(candidateInterviewHistory.interviewId, CodingInterview.interviewId))
      .where(and(
        eq(candidateInterviewHistory.status, 'completed'),
        or(
          // Campaign interviews: company matches through job campaign
          eq(companies.id, session.user.companyId),
          // Direct interviews: company matches through interview table
          eq(Interview.companyId, session.user.companyId),
          eq(CodingInterview.companyId, session.user.companyId)
        )
      ))
      .orderBy(desc(candidateInterviewHistory.completedAt));

    console.log(`Found ${completedInterviews.length} completed interviews in candidateInterviewHistory`);

    // Process each interview to create unified result structure
    const results = completedInterviews.map((interview) => {
      // Determine if this is a campaign or direct interview
      const isCampaignInterview = !!interview.applicationId;
      const sourceType = isCampaignInterview ? 'campaign' : 'direct';
      
      // Get the correct candidate name and job title
      const candidateName = interview.candidateName || interview.directInterviewName || 'Unknown Candidate';
      const jobTitle = interview.jobTitle || interview.directInterviewTitle || 'Interview';
      const campaignName = interview.campaignName || 'Direct Interview';

      // Parse answers from feedback
        let answers: any[] = [];
      let totalQuestions = 0;
      let answeredQuestions = 0;
      
      if (interview.feedback) {
        try {
          const feedbackData = JSON.parse(interview.feedback);
          
                if (feedbackData.answers && Array.isArray(feedbackData.answers)) {
            answers = feedbackData.answers;
                } else if (feedbackData.answers && typeof feedbackData.answers === 'object') {
            // Convert object format to array
            answers = Object.values(feedbackData.answers);
                } else if (Array.isArray(feedbackData)) {
            answers = feedbackData;
          }
          
          totalQuestions = answers.length;
          answeredQuestions = answers.filter(a => 
            a.answer || a.userAnswer || a.selectedOption || a.response
          ).length;
          
              } catch (error) {
          console.error(`Error parsing feedback for interview ${interview.interviewId}:`, error);
              answers = [];
        }
      }

      // Calculate performance metrics
      const completionRate = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;
      const accuracy = (interview.maxScore && interview.score && interview.maxScore > 0) 
        ? (interview.score / interview.maxScore) * 100 
        : 0;

        return {
          interview: {
          id: interview.historyId,
          interviewId: interview.interviewId,
          candidateName,
          candidateEmail: interview.candidateEmail,
          jobPosition: jobTitle,
            interviewType: interview.interviewType,
            completedAt: interview.completedAt,
          duration: interview.duration || 0,
            candidateId: interview.candidateId,
          campaignId: interview.campaignId || interview.interviewId,
          sourceType
          },
          summary: {
            totalQuestions,
          totalAnswered: answeredQuestions,
          averageRating: interview.score || 0,
          totalTimeSpent: interview.duration || 0,
          averageTimePerQuestion: totalQuestions > 0 ? (interview.duration || 0) / totalQuestions : 0,
          performanceMetrics: {
            accuracy,
            averageRating: interview.score || 0,
            timeEfficiency: 85, // Default value
            completionRate
          }
          },
          videoRecordings: {
          fullInterview: null,
          audioRecordings: [],
          hasRecordings: false
        },
        analytics: generateBasicAnalytics(interview.interviewType, answers, {
          score: interview.score || 0,
          maxScore: interview.maxScore || 0,
          completionRate,
          accuracy
        }),
        approvalStatus: interview.passed ? 'approved' : 'pending'
      };
    });

    // Calculate dashboard statistics
    const stats = {
      totalInterviews: results.length,
      averageScore: results.length > 0 ? 
        results.reduce((sum, r) => sum + (r.summary.performanceMetrics.averageRating || 0), 0) / results.length : 0,
      completionRate: results.length > 0 ? 
        results.reduce((sum, r) => sum + r.summary.performanceMetrics.completionRate, 0) / results.length : 0,
      totalCandidates: new Set(results.map(r => r.interview.candidateName)).size
    };

    console.log(`Returning ${results.length} processed interview results`);

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

// Helper function to generate basic analytics
function generateBasicAnalytics(interviewType: string, answers: any[], metrics: any) {
  const defaultAnalytics = {
    strengths: [] as string[],
    improvements: [] as string[],
    recommendations: [] as string[],
    overallAssessment: '',
    technicalSkills: [] as string[],
    softSkills: [] as string[],
    nextSteps: [] as string[]
  };

  const { score, maxScore, completionRate, accuracy } = metrics;
  const performanceLevel = accuracy >= 70 ? 'good' : accuracy >= 50 ? 'average' : 'needs improvement';

  switch (interviewType) {
    case 'behavioral':
      defaultAnalytics.overallAssessment = `Based on ${answers.length} behavioral questions with ${completionRate.toFixed(1)}% completion rate, candidate shows ${performanceLevel} communication skills.`;
      defaultAnalytics.strengths = performanceLevel === 'good' ? 
        ['Clear communication', 'Relevant examples', 'Good problem-solving approach'] : 
        ['Engagement with questions', 'Willingness to share experiences'];
      defaultAnalytics.softSkills = ['Communication', 'Problem-solving', 'Adaptability'];
      break;
      
    case 'coding':
      defaultAnalytics.overallAssessment = `Based on ${answers.length} coding problems with ${accuracy.toFixed(1)}% accuracy, candidate demonstrates ${performanceLevel} technical skills.`;
      defaultAnalytics.strengths = performanceLevel === 'good' ? 
        ['Strong algorithmic thinking', 'Clean code structure', 'Good problem decomposition'] : 
        ['Basic programming concepts', 'Logical approach to problems'];
      defaultAnalytics.technicalSkills = ['Algorithm design', 'Code implementation', 'Problem solving'];
      break;
      
    case 'mcq':
      defaultAnalytics.overallAssessment = `Based on ${answers.length} multiple choice questions with ${accuracy.toFixed(1)}% accuracy, candidate shows ${performanceLevel} theoretical knowledge.`;
      defaultAnalytics.strengths = performanceLevel === 'good' ? 
        ['Strong theoretical foundation', 'Good knowledge retention'] : 
        ['Basic understanding of concepts'];
      defaultAnalytics.technicalSkills = ['Theoretical knowledge', 'Concept understanding'];
      break;
      
    case 'combo':
      defaultAnalytics.overallAssessment = `Based on ${answers.length} mixed questions, candidate demonstrates balanced technical and soft skills.`;
      defaultAnalytics.strengths = ['Versatile skill set', 'Balanced approach'];
      defaultAnalytics.technicalSkills = ['Programming', 'System thinking'];
      defaultAnalytics.softSkills = ['Communication', 'Adaptability'];
      break;
      
    default:
      defaultAnalytics.overallAssessment = `Interview completed with ${completionRate.toFixed(1)}% completion rate.`;
      defaultAnalytics.strengths = ['Interview participation'];
  }

  // Common recommendations based on performance
  if (performanceLevel === 'needs improvement') {
    defaultAnalytics.improvements = ['Focus on fundamental concepts', 'Practice more examples', 'Improve preparation'];
    defaultAnalytics.recommendations = ['Additional training recommended', 'Consider mentorship program'];
    defaultAnalytics.nextSteps = ['Skills development plan', 'Follow-up assessment'];
  } else if (performanceLevel === 'average') {
    defaultAnalytics.improvements = ['Deepen technical knowledge', 'Practice advanced scenarios'];
    defaultAnalytics.recommendations = ['Continue skill development', 'Focus on specific areas'];
    defaultAnalytics.nextSteps = ['Advanced assessment', 'Specialized training'];
  } else {
    defaultAnalytics.improvements = ['Maintain current level', 'Explore advanced topics'];
    defaultAnalytics.recommendations = ['Ready for next stage', 'Consider leadership opportunities'];
    defaultAnalytics.nextSteps = ['Final interview round', 'Role-specific evaluation'];
  }

  return defaultAnalytics;
}

