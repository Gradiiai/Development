import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createCampaignInterview, getCampaignInterviews, getQuestions } from '@/lib/database/queries/campaigns';
import { db } from '@/lib/database/db';
import { candidates, jobCampaigns, companies, interviewSetups, candidateUsers, campaignInterviews } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import { sendSimpleEmail } from '@/lib/services/email/service';
import { generateInterviewEmailTemplate, generateInterviewEmailText, generateEmailSubject } from '@/lib/services/email/templates';
import { generateInterviewLink } from '@/lib/services/interview/scheduling';
// Removed auto-registration import

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      campaignId,
      candidateId,
      interviewSetupId,
      scheduledAt,
      scheduledDate,
      scheduledTime,
      interviewerNotes,
      candidateNotes
    } = body;

    // Handle both old scheduledAt format and new scheduledDate/scheduledTime format
    let finalScheduledAt;
    if (scheduledDate && scheduledTime) {
      // Combine date and time into a proper datetime
      finalScheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`);
    } else if (scheduledAt) {
      finalScheduledAt = new Date(scheduledAt);
    }

    // Validate required fields
    if (!campaignId || !candidateId || !interviewSetupId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get candidate details from old system
    const [candidate] = await db
      .select({
        id: candidates.id,
        name: candidates.name,
        email: candidates.email
      })
      .from(candidates)
      .where(eq(candidates.id, candidateId))
      .limit(1);

    if (!candidate) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      );
    }

    // Find corresponding candidateUser by email for dashboard integration
    let candidateUser = await db
      .select({
        id: candidateUsers.id
      })
      .from(candidateUsers)
      .where(eq(candidateUsers.email, candidate.email))
      .limit(1);

    // Check if candidate exists in candidateUsers table
    let isNewCandidate = false;
    
    if (!candidateUser.length) {
      // Create new candidate user if they don't exist
      console.log(`🆕 Creating new candidate user: ${candidate.email}`);
      
      // Extract candidate name for registration
      const candidateNameParts = candidate.name.split(' ');
      const firstName = candidateNameParts[0] || candidate.email.split('@')[0];
      const lastName = candidateNameParts.slice(1).join(' ') || '';

      const newCandidateUser = await db
        .insert(candidateUsers)
        .values({
          email: candidate.email,
          firstName,
          lastName,
          isEmailVerified: false,
          onboardingCompleted: false,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      candidateUser = newCandidateUser;
      isNewCandidate = true;
      console.log(`✅ New candidate user created: ${candidate.email}`);
    }

    // Get campaign details
    const [campaign] = await db
      .select({
        id: jobCampaigns.id,
        campaignName: jobCampaigns.campaignName,
        jobTitle: jobCampaigns.jobTitle,
        companyId: jobCampaigns.companyId
      })
      .from(jobCampaigns)
      .where(eq(jobCampaigns.id, campaignId))
      .limit(1);

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Get company details
    const [company] = await db
      .select({
        name: companies.name
      })
      .from(companies)
      .where(eq(companies.id, campaign.companyId))
      .limit(1);

    // Get interview setup details
    const [setup] = await db
      .select({
        id: interviewSetups.id,
        roundName: interviewSetups.roundName,
        interviewType: interviewSetups.interviewType,
        timeLimit: interviewSetups.timeLimit,
        numberOfQuestions: interviewSetups.numberOfQuestions,
        difficultyLevel: interviewSetups.difficultyLevel,
        questionCollectionId: interviewSetups.questionCollectionId
      })
      .from(interviewSetups)
      .where(eq(interviewSetups.id, interviewSetupId))
      .limit(1);

    if (!setup) {
      return NextResponse.json(
        { error: 'Interview setup not found' },
        { status: 404 }
      );
    }

    // Generate unique interview ID
    const generatedInterviewId = `interview_${campaignId}_${candidateId}_${Date.now()}`;
    
    // Generate interview link - handle interview type properly
    let rawInterviewType = setup.interviewType as string;
    
    console.log(`🔍 Raw interview type from setup: "${rawInterviewType}"`);
    
    // Map legacy technical type to behavioral, but preserve other types
    if (rawInterviewType === 'technical') {
      rawInterviewType = 'behavioral';
      console.log('⚠️ Mapped technical interview type to behavioral for backward compatibility');
    }
    
    // Ensure we have a valid interview type - DO NOT default to behavioral if valid type exists
    const validTypes = ['behavioral', 'mcq', 'combo', 'coding'];
    if (!validTypes.includes(rawInterviewType)) {
      console.error(`❌ Invalid interview type: "${rawInterviewType}". Valid types: ${validTypes.join(', ')}`);
      return NextResponse.json(
        { error: `Invalid interview type: "${rawInterviewType}". Valid types: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }
    
    const interviewType = rawInterviewType as 'behavioral' | 'mcq' | 'combo' | 'coding';
    console.log(`✅ Final interview type: "${interviewType}"`);
    
    const interviewLink = generateInterviewLink(
      candidateId,
      candidate.email,
      interviewSetupId,
      interviewType,
      generatedInterviewId
    );

    // Validate questions are available before proceeding
    console.log(`🔍 Validating questions for ${interviewType} interview...`);
    
    let questionsValidation: { 
      success: boolean; 
      source: 'question_bank' | 'ai_fallback'; 
      questions: any[]; 
      error?: string; 
    } = { success: true, source: 'question_bank', questions: [] };
    
    try {
            // First, try to get questions from question bank if configured
      const questionCollectionId = setup.questionCollectionId;
      console.log(`🔍 Interview setup question bank ID: ${questionCollectionId}`);

      // Validate that questionCollectionId is a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const isValidUUID = questionCollectionId && uuidRegex.test(questionCollectionId);

      if (questionCollectionId && isValidUUID) {
        console.log(`📋 Using valid question bank: ${questionCollectionId}`);
        const questionsResult = await getQuestions({
          companyId: campaign.companyId,
          collectionId: questionCollectionId,
          questionType: interviewType,
          difficultyLevel: setup.difficultyLevel || undefined
        });
        
        if (questionsResult.success && questionsResult.data && questionsResult.data.length > 0) {
          console.log(`✅ Found ${questionsResult.data.length} questions in question bank`);
          questionsValidation = {
            success: true,
            source: 'question_bank',
            questions: questionsResult.data
          };
        } else {
          console.warn(`⚠️ Question bank ${questionCollectionId} is empty or unavailable, using AI fallback...`);
          throw new Error('Question bank unavailable');
        }
      } else {
        if (questionCollectionId && !isValidUUID) {
          console.warn(`⚠️ Invalid question bank ID format: "${questionCollectionId}" (not a valid UUID), using AI fallback...`);
          throw new Error(`Invalid question bank ID format: ${questionCollectionId}`);
        } else {
          console.warn(`⚠️ No question bank configured, using AI fallback...`);
          throw new Error('No question bank configured');
        }
      }
    } catch (questionBankError) {
      console.log(`🤖 Using AI fallback for question generation...`);
      
      // Use AI fallback endpoint
      try {
        // Use the correctly processed interview type for AI generation
        console.log(`🤖 Using AI fallback with interview type: "${interviewType}"`);
        
        const aiResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/ai/generate-fallback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            interviewType: interviewType,
            jobTitle: campaign.jobTitle,
            jobDescription: (campaign as any).jobDescription || '',
            companyName: company?.name || 'the company',
            difficultyLevel: setup.difficultyLevel || 'medium',
            numberOfQuestions: setup.numberOfQuestions || 5,
            candidateName: candidate.name
          })
        });

        if (aiResponse.ok) {
          const aiResult = await aiResponse.json();
          if (aiResult.success) {
            questionsValidation = {
              success: true,
              source: 'ai_fallback',
              questions: aiResult.questions
            };
          } else {
            throw new Error(aiResult.error || 'AI generation failed');
          }
        } else {
          throw new Error(`AI API returned ${aiResponse.status}`);
        }
      } catch (aiError) {
        console.error('❌ AI fallback also failed:', aiError);
        questionsValidation = {
          success: false,
          source: 'ai_fallback',
          questions: [],
          error: aiError instanceof Error ? aiError.message : 'AI fallback failed'
        };
      }
    }

    // Check if we have questions available
    if (!questionsValidation.success) {
      console.error(`❌ Failed to ensure questions are available: ${questionsValidation.error}`);
      return NextResponse.json({
        error: 'Unable to prepare interview questions. Please try again or contact support.',
        details: questionsValidation.error
      }, { status: 500 });
    }

    console.log(`✅ Questions validated successfully (source: ${questionsValidation.source})`);
    
    // Add metadata about question source to the interview notes
    const questionSourceNote = questionsValidation.source === 'ai_fallback' 
      ? `Questions generated using AI fallback (${questionsValidation.questions.length} questions)`
      : `Questions from question bank (${questionsValidation.questions.length} questions)`;
    
    const enhancedCandidateNotes = candidateNotes 
      ? `${candidateNotes}\n\n[System] ${questionSourceNote}`
      : `[System] ${questionSourceNote}`;

    // Create the campaign interview using the old candidates table ID
    // Note: campaignInterviews table references candidates.id, not candidateUsers.id
    console.log(`🚀 Creating campaign interview:`, {
      campaignId,
      candidateId,
      candidateEmail: candidate.email,
      setupId: interviewSetupId,
      interviewType,
      interviewLink,
      scheduledAt: finalScheduledAt,
      isNewCandidate
    });

    // Manually insert the campaign interview with all required fields including interviewLink
    const [campaignInterview] = await db.insert(campaignInterviews).values({
      campaignId,
      candidateId: candidateId, // Always use the old candidates table ID
      setupId: interviewSetupId,
      interviewId: generatedInterviewId,
      interviewType: interviewType,
      scheduledAt: finalScheduledAt,
      interviewLink: interviewLink, // This is crucial!
      candidateNotes: enhancedCandidateNotes, // Include question source info
      status: 'scheduled',
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    console.log(`✅ Campaign interview created successfully:`, {
      id: campaignInterview.id,
      candidateId: campaignInterview.candidateId,
      interviewLink: campaignInterview.interviewLink,
      status: campaignInterview.status
    });

    const result = { success: true, data: campaignInterview };

    // Send email notification to candidate using centralized template
    try {
      // Prepare data for our centralized email template
      const interviewDate = finalScheduledAt ? finalScheduledAt.toLocaleDateString() : 'TBD';
      const interviewTime = finalScheduledAt ? finalScheduledAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'TBD';
      
      const questionSourceInfo = questionsValidation.source === 'ai_fallback' 
        ? ' (AI-powered questions)' 
        : '';
      
      const additionalInfo = `${setup.roundName} - ${setup.interviewType} interview with ${questionsValidation.questions.length} questions${questionSourceInfo} (${setup.timeLimit} minutes, ${setup.difficultyLevel} difficulty)`;

      // Generate HTML email using centralized template
      const emailHtml = generateInterviewEmailTemplate({
        candidateName: candidate.name,
        candidateEmail: candidate.email,
        jobPosition: campaign.jobTitle,
        companyName: company?.name || 'the company',
        interviewDate: interviewDate,
        interviewTime: interviewTime,
        interviewMode: 'Online',
        interviewLink: interviewLink,
        interviewType: setup.interviewType as "behavioral" | "coding" | "combo",
        additionalInfo: additionalInfo,
        candidateLoginLink: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'}/candidate/signin?email=${encodeURIComponent(candidate.email)}`,
        isNewCandidate: isNewCandidate,
      });

      // Generate text email using centralized template
      const emailText = generateInterviewEmailText({
        candidateName: candidate.name,
        candidateEmail: candidate.email,
        jobPosition: campaign.jobTitle,
        companyName: company?.name || 'the company',
        interviewDate: interviewDate,
        interviewTime: interviewTime,
        interviewMode: 'Online',
        interviewLink: interviewLink,
        interviewType: setup.interviewType as "behavioral" | "coding" | "combo",
        additionalInfo: additionalInfo,
        candidateLoginLink: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'}/candidate/signin?email=${encodeURIComponent(candidate.email)}`,
        isNewCandidate: isNewCandidate,
      });

      // Generate subject using centralized function
      const subject = generateEmailSubject(campaign.jobTitle, interviewDate, setup.interviewType);

      await sendSimpleEmail({
        to: candidate.email,
        subject: subject,
        html: emailHtml,
        text: emailText
      });
    } catch (emailError) {
      console.error('Error sending interview email:', emailError);
      // Don't fail the request if email fails, but log the error
    }

    return NextResponse.json({
      success: true,
      data: {
        ...result.data,
        interviewLink,
        emailSent: true
      }
    });

  } catch (error) {
    console.error('Error in campaign interviews API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const candidateId = searchParams.get('candidateId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // campaignId is optional - if not provided, return all interviews for the user's company

    const result = await getCampaignInterviews(campaignId || undefined, candidateId || undefined, status || undefined, limit, offset);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('Error in campaign interviews GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}