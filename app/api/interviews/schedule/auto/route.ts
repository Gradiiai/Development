import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/database/connection';
import { campaignInterviews, candidates, interviewSetups, jobCampaigns } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import { sendSimpleEmail } from '@/lib/services/email/service';
import { 
  checkAutoScheduleEligibility, 
  generateInterviewSchedule, 
  parseAutoScheduleConfig,
  logAutoScheduleActivity
} from '@/lib/services/interview/scheduling';

interface AutoScheduleData {
  candidateId: string;
  campaignId: string;
  resumeScore: number;
  scoreThreshold?: number; // Default to 80
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { candidateId, campaignId, resumeScore, scoreThreshold = 80 }: AutoScheduleData = await request.json();

    // Validate required fields
    if (!candidateId || !campaignId || resumeScore === undefined) {
      return NextResponse.json({ 
        error: 'Candidate ID, campaign ID, and resume score are required' 
      }, { status: 400 });
    }

    // Get campaign details and auto-scheduling configuration
    const campaign = await db.select()
      .from(jobCampaigns)
      .where(eq(jobCampaigns.id, campaignId))
      .limit(1);

    if (campaign.length === 0) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const campaignData = campaign[0];
    const autoScheduleConfig = parseAutoScheduleConfig(campaignData);

    // Check eligibility using utility function
    const eligibilityCheck = await checkAutoScheduleEligibility(
      candidateId,
      campaignId,
      resumeScore,
      autoScheduleConfig
    );

    if (!eligibilityCheck.eligible) {
      await logAutoScheduleActivity(
        candidateId,
        campaignId,
        'eligibility_check_failed',
        { reason: eligibilityCheck.reason, resumeScore, config: autoScheduleConfig },
        false
      );
      
      return NextResponse.json({
        success: false,
        message: eligibilityCheck.reason || 'Candidate not eligible for auto-scheduling',
        details: eligibilityCheck.details
      });
    }

    const { candidate, setups } = eligibilityCheck.details;

    // Generate interview schedule using utility function
    const schedules = generateInterviewSchedule(setups, autoScheduleConfig);
    const scheduledInterviews = [];
    
    for (let i = 0; i < setups.length; i++) {
      const setup = setups[i];
      const scheduledDateTime = schedules[i];
      
      // Generate simple direct interview link without token
      const interviewPath = setup.interviewType === 'mcq' ? 'mcq' : 
                           setup.interviewType === 'combo' ? 'combo' : 'regular';
      const interviewLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/candidate/interview/${setup.id}/lobby?email=${encodeURIComponent(candidate[0].email)}`;

      // Create interview record
      const [interview] = await db.insert(campaignInterviews).values({
        candidateId,
        campaignId,
        setupId: setup.id,
        scheduledAt: scheduledDateTime,
        interviewLink,
        status: 'scheduled',
        interviewId: `AUTO-${Date.now()}-${i + 1}`,
        interviewType: setup.interviewType,
        timezone: 'UTC',
        candidateNotes: `Automatically scheduled based on resume score of ${resumeScore}%`,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      scheduledInterviews.push({
        ...interview,
        setup: {
          roundName: setup.roundName,
          interviewType: setup.interviewType,
          timeLimit: setup.timeLimit,
          difficultyLevel: setup.difficultyLevel,
          numberOfQuestions: setup.numberOfQuestions
        }
      });
    }

    // Update candidate status to 'interview'
    await db.update(candidates)
      .set({ 
        status: 'interview',
        updatedAt: new Date()
      })
      .where(eq(candidates.id, candidateId));

    // Log successful auto-scheduling activity
    await logAutoScheduleActivity(
      candidateId,
      campaignId,
      'interviews_auto_scheduled',
      { 
        resumeScore, 
        scheduledCount: scheduledInterviews.length,
        config: autoScheduleConfig,
        schedules: schedules.map(s => s.toISOString())
      },
      true
    );

    // Send email notification to candidate
    try {
      const candidateData = candidate[0];
      const campaignData = campaign[0];
      
      const emailContent = `
        <h2>🎉 Congratulations! Your Interviews Have Been Scheduled</h2>
        <p>Dear ${candidateData.name},</p>
        <p>Great news! Based on your impressive resume score of <strong>${resumeScore}%</strong>, you have been automatically selected for interviews for the position of <strong>${campaignData.jobTitle}</strong>.</p>
        
        <h3>📅 Your Interview Schedule:</h3>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
          ${scheduledInterviews.map((interview, index) => `
            <div style="margin-bottom: 15px; padding: 10px; border-left: 4px solid #007bff;">
              <h4>Round ${index + 1}: ${interview.setup.roundName}</h4>
              <ul style="margin: 5px 0;">
                <li><strong>Date & Time:</strong> ${interview.scheduledAt?.toLocaleDateString()} at ${interview.scheduledAt?.toLocaleTimeString()}</li>
                <li><strong>Type:</strong> ${interview.setup.interviewType.charAt(0).toUpperCase() + interview.setup.interviewType.slice(1)}</li>
                <li><strong>Duration:</strong> ${interview.setup.timeLimit} minutes</li>
                <li><strong>Difficulty:</strong> ${interview.setup.difficultyLevel}</li>
                <li><strong>Questions:</strong> ${interview.setup.numberOfQuestions}</li>
                <li><strong>Interview Link:</strong> <a href="${interview.interviewLink}" style="color: #007bff;">Join Interview</a></li>
              </ul>
            </div>
          `).join('')}
        </div>
        
        <h3>📋 Important Instructions:</h3>
        <ul>
          <li>Please join each interview 5 minutes before the scheduled time</li>
          <li>Ensure you have a stable internet connection</li>
          <li>For coding interviews, make sure your browser supports the coding environment</li>
          <li>Have your ID ready for verification if required</li>
          <li>Each interview link is unique and should not be shared</li>
        </ul>
        
        <p><strong>Note:</strong> These interviews were automatically scheduled based on your excellent resume score. This demonstrates that your qualifications align well with our requirements!</p>
        
        <p>If you need to reschedule any interview, please contact us as soon as possible.</p>
        
        <p>Best of luck with your interviews!</p>
        
        <hr style="margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">This is an automated message. Please do not reply to this email.</p>
      `;

      await sendSimpleEmail({
        to: candidateData.email,
        subject: `🎉 Interviews Scheduled - ${campaignData.jobTitle} Position`,
        html: emailContent
      });
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: `Successfully auto-scheduled ${scheduledInterviews.length} interviews for candidate with score ${resumeScore}% (threshold: ${autoScheduleConfig.scoreThreshold}%)`,
      data: {
        candidateId,
        campaignId,
        resumeScore,
        scoreThreshold: autoScheduleConfig.scoreThreshold,
        scheduledInterviews: scheduledInterviews.length,
        autoScheduleConfig: {
          enabled: autoScheduleConfig.enabled,
          scoreThreshold: autoScheduleConfig.scoreThreshold,
          schedulingDelay: autoScheduleConfig.schedulingDelay,
          intervalBetweenRounds: autoScheduleConfig.intervalBetweenRounds,
          defaultStartTime: autoScheduleConfig.defaultStartTime,
          timezone: autoScheduleConfig.timezone
        },
        interviews: scheduledInterviews.map(interview => ({
          id: interview.id,
          roundName: interview.setup.roundName,
          type: interview.setup.interviewType,
          scheduledAt: interview.scheduledAt,
          link: interview.interviewLink
        }))
      }
    });

  } catch (error) {
    console.error('Error in auto-schedule interview:', error);
    return NextResponse.json(
      { error: 'Failed to auto-schedule interviews' },
      { status: 500 }
    );
  }
}

// Removed generateInterviewToken - now using JWT tokens from jwt-utils

// GET endpoint to check auto-scheduling eligibility
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const candidateId = searchParams.get('candidateId');
    const campaignId = searchParams.get('campaignId');
    const scoreThreshold = parseInt(searchParams.get('scoreThreshold') || '80');

    if (!candidateId || !campaignId) {
      return NextResponse.json({ 
        error: 'Candidate ID and campaign ID are required' 
      }, { status: 400 });
    }

    // Check if candidate exists
    const candidate = await db.select()
      .from(candidates)
      .where(and(
        eq(candidates.id, candidateId),
        eq(candidates.campaignId, campaignId)
      ))
      .limit(1);

    if (candidate.length === 0) {
      return NextResponse.json({ 
        eligible: false,
        reason: 'Candidate not found or not associated with campaign'
      });
    }

    // Check if interviews already exist
    const existingInterviews = await db.select()
      .from(campaignInterviews)
      .where(and(
        eq(campaignInterviews.candidateId, candidateId),
        eq(campaignInterviews.campaignId, campaignId)
      ));

    if (existingInterviews.length > 0) {
      return NextResponse.json({ 
        eligible: false,
        reason: 'Interviews already scheduled',
        existingInterviews: existingInterviews.length
      });
    }

    // Check if interview setups exist
    const setups = await db.select()
      .from(interviewSetups)
      .where(eq(interviewSetups.campaignId, campaignId));

    if (setups.length === 0) {
      return NextResponse.json({ 
        eligible: false,
        reason: 'No interview setups configured for campaign'
      });
    }

    return NextResponse.json({
      eligible: true,
      candidate: candidate[0],
      availableRounds: setups.length,
      scoreThreshold,
      setups: setups.map(setup => ({
        id: setup.id,
        roundName: setup.roundName,
        interviewType: setup.interviewType,
        timeLimit: setup.timeLimit
      }))
    });

  } catch (error) {
    console.error('Error checking auto-schedule eligibility:', error);
    return NextResponse.json(
      { error: 'Failed to check eligibility' },
      { status: 500 }
    );
  }
}