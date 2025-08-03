import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/lib/database/connection';
import { campaignInterviews, candidates, interviewSetups, users } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import { sendSimpleEmail } from '@/lib/services/email/service';
// Removed auto-registration import

// Utility function to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Helper function to generate email-only interview links
function generateInterviewLinkWithEmail(
  interviewType: string,
  candidateId: string,
  candidateEmail: string,
  setupId: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const encodedEmail = encodeURIComponent(candidateEmail);
  
  switch (interviewType) {
    case 'coding':
      return `${baseUrl}/candidate/interview/${setupId}/coding?email=${encodedEmail}`;
    case 'mcq':
      return `${baseUrl}/candidate/interview/${setupId}/mcq?email=${encodedEmail}`;
    case 'behavioral':
      return `${baseUrl}/candidate/interview/${setupId}/behavioral?email=${encodedEmail}`;
    case 'combo':
      return `${baseUrl}/candidate/interview/${setupId}/combo?email=${encodedEmail}`;
    default:
      return `${baseUrl}/candidate/interview/${setupId}?email=${encodedEmail}`;
  }
}

interface ScheduleInterviewData {
  candidateId: string;
  campaignId: string;
  setupId: string;
  scheduledDate: string;
  scheduledTime: string;
  interviewerId?: string;
  interviewLink?: string;
  candidateNotes?: string;
  timezone?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const scheduleData: ScheduleInterviewData = await request.json();

    // Validate required fields
    if (!scheduleData.candidateId || !scheduleData.campaignId || 
        !scheduleData.setupId || !scheduleData.scheduledDate || 
        !scheduleData.scheduledTime) {
      return NextResponse.json({ 
        error: 'Candidate ID, campaign ID, setup ID, scheduled date, and scheduled time are required' 
      }, { status: 400 });
    }

    // Verify candidate exists and belongs to the campaign
    const candidate = await db.select()
      .from(candidates)
      .where(and(
        eq(candidates.id, scheduleData.candidateId),
        eq(candidates.campaignId, scheduleData.campaignId)
      ))
      .limit(1);

    if (candidate.length === 0) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    // Verify interview setup exists
    const setup = await db.select()
      .from(interviewSetups)
      .where(eq(interviewSetups.id, scheduleData.setupId))
      .limit(1);

    if (setup.length === 0) {
      return NextResponse.json({ error: 'Interview setup not found' }, { status: 404 });
    }

    // Create scheduled date-time
    const scheduledDateTime = new Date(`${scheduleData.scheduledDate}T${scheduleData.scheduledTime}`);
    
    if (scheduledDateTime <= new Date()) {
      return NextResponse.json({ error: 'Scheduled time must be in the future' }, { status: 400 });
    }

    // Check for existing interview for this candidate and campaign
    const existingInterview = await db.select()
      .from(campaignInterviews)
      .where(and(
        eq(campaignInterviews.candidateId, scheduleData.candidateId),
        eq(campaignInterviews.campaignId, scheduleData.campaignId)
      ))
      .limit(1);

    if (existingInterview.length > 0) {
      return NextResponse.json({ 
        error: 'Interview already scheduled for this candidate' 
      }, { status: 400 });
    }

    // Generate secure interview link with email authentication  
    const interviewLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/candidate/interview/${scheduleData.setupId}/lobby?email=${encodeURIComponent(candidate[0].email)}&setupId=${scheduleData.setupId}`;

    // Create interview record
    const [interview] = await db.insert(campaignInterviews).values({
      candidateId: scheduleData.candidateId,
      campaignId: scheduleData.campaignId,
      setupId: scheduleData.setupId,
      scheduledAt: scheduledDateTime,
      interviewLink: interviewLink,
      candidateNotes: scheduleData.candidateNotes,
      status: 'scheduled',
      interviewId: `INT-${Date.now()}`,
      interviewType: setup[0].interviewType || 'behavioral',
      interviewerId: scheduleData.interviewerId,
      timezone: scheduleData.timezone || 'UTC',
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    // Update candidate status to 'interview'
    await db.update(candidates)
      .set({ 
        status: 'interview',
        updatedAt: new Date()
      })
      .where(eq(candidates.id, scheduleData.candidateId));

    // Set default for new candidate flag
    let isNewCandidate = false;

    // Send email notifications using proper email template
    try {
      const candidateData = candidate[0];
      const setupData = setup[0];
      
      // Use the proper email service with template support
      const emailBaseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : process.env.NEXTAUTH_URL;
      const emailResponse = await fetch(`${emailBaseUrl}/api/interviews/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidateName: candidateData.name,
          candidateEmail: candidateData.email,
          jobPosition: setupData.roundName || 'Interview Position',
          companyName: 'Gradii',
          interviewDate: scheduleData.scheduledDate,
          interviewTime: scheduleData.scheduledTime,
          interviewMode: 'Online',
          interviewLink: interviewLink,
          interviewType: setupData.interviewType || 'behavioral',
          additionalInfo: `This is a ${setupData.roundName} interview with ${setupData.numberOfQuestions} questions at ${setupData.difficultyLevel} difficulty level. Duration: ${setupData.timeLimit} minutes.${scheduleData.candidateNotes ? ` Additional notes: ${scheduleData.candidateNotes}` : ''}`,
          isNewCandidate: isNewCandidate,
        }),
      });

      if (!emailResponse.ok) {
        console.error('Failed to send interview invitation email');
        // Continue even if email fails
      }

      // Email to interviewers
      const interviewerEmailContent = `
        <h2>Interview Scheduled</h2>
        <p>You have been assigned as an interviewer for:</p>
        <ul>
          <li><strong>Candidate:</strong> ${candidateData.name}</li>
          <li><strong>Email:</strong> ${candidateData.email}</li>
          <li><strong>Date:</strong> ${scheduleData.scheduledDate}</li>
          <li><strong>Time:</strong> ${scheduleData.scheduledTime} ${scheduleData.timezone || 'UTC'}</li>
          <li><strong>Interview Type:</strong> ${setupData.roundName}</li>
          <li><strong>Duration:</strong> ${setupData.timeLimit} minutes</li>
          <li><strong>Interview Link:</strong> <a href="${interviewLink}">Start Interview</a></li>
        </ul>
        <p><strong>Difficulty Level:</strong> ${setupData.difficultyLevel}</p>
        <p><strong>Number of Questions:</strong> ${setupData.numberOfQuestions}</p>
        ${scheduleData.candidateNotes ? `<p><strong>Notes:</strong> ${scheduleData.candidateNotes}</p>` : ''}
        <p>Please review the candidate's profile and be prepared for the interview.</p>
      `;

      // Send email to interviewer if interviewerId is provided
      if (scheduleData.interviewerId) {
        console.log('Interviewer notification would be sent to interviewer ID:', scheduleData.interviewerId);
      }
    } catch (emailError) {
      console.error('Error sending email notifications:', emailError);
      // Continue with the response even if email fails
    }

    return NextResponse.json({
      success: true,
      interview: {
        id: interview.id,
        interviewId: interview.interviewId,
        candidateId: interview.candidateId,
        campaignId: interview.campaignId,
        setupId: interview.setupId,
        scheduledAt: interview.scheduledAt,
        interviewLink: interview.interviewLink,
        status: interview.status,
        interviewType: interview.interviewType,
        timezone: interview.timezone
      }
    });
  } catch (error) {
    console.error('Error scheduling campaign interview:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const interviewId = searchParams.get('interviewId');

    if (!interviewId) {
      return NextResponse.json({ error: 'Interview ID is required' }, { status: 400 });
    }

    // Delete the interview
    const deletedInterview = await db
      .delete(campaignInterviews)
      .where(eq(campaignInterviews.id, interviewId))
      .returning();

    if (deletedInterview.length === 0) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Interview deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting campaign interview:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const candidateId = searchParams.get('candidateId');
    const interviewId = searchParams.get('interviewId');

    let whereConditions = [];

    if (campaignId) {
      whereConditions.push(eq(campaignInterviews.campaignId, campaignId));
    }
    if (candidateId) {
      whereConditions.push(eq(campaignInterviews.candidateId, candidateId));
    }
    if (interviewId) {
      whereConditions.push(eq(campaignInterviews.interviewId, interviewId));
    }

    const interviews = await db
      .select({
        id: campaignInterviews.id,
        interviewId: campaignInterviews.interviewId,
        candidateId: campaignInterviews.candidateId,
        campaignId: campaignInterviews.campaignId,
        setupId: campaignInterviews.setupId,
        scheduledAt: campaignInterviews.scheduledAt,
        interviewLink: campaignInterviews.interviewLink,
        candidateNotes: campaignInterviews.candidateNotes,
        status: campaignInterviews.status,
        interviewType: campaignInterviews.interviewType,
        interviewerId: campaignInterviews.interviewerId,
        timezone: campaignInterviews.timezone,
        createdAt: campaignInterviews.createdAt,
        updatedAt: campaignInterviews.updatedAt,
        candidateName: candidates.name,
        candidateEmail: candidates.email
      })
      .from(campaignInterviews)
      .leftJoin(candidates, eq(campaignInterviews.candidateId, candidates.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(campaignInterviews.createdAt);

    return NextResponse.json({
      success: true,
      interviews
    });
  } catch (error) {
    console.error('Error fetching campaign interviews:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}