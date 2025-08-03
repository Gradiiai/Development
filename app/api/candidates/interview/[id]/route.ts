import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';
import { candidateUsers, candidateInterviewHistory, interviewSetups, CodingInterview, Interview, candidateApplications, jobCampaigns, companies, users, campaignInterviews } from '@/lib/database/schema';
// Unified interviews table removed - you only use Direct and Campaign interviews
import { eq, and } from 'drizzle-orm';
import { getQuestions } from '@/lib/database/queries/campaigns';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const setupId = searchParams.get('setupId');
    
    console.log(`Interview fetch request: id=${id}, email=${email}, setupId=${setupId}`);
    
    if (!email) {
      console.error('Missing email parameter in interview fetch');
      return NextResponse.json(
        { error: 'Missing email parameter' },
        { status: 400 }
      );
    }

    const candidateEmail = email;

    // Get candidate user
    const candidateUser = await db
      .select()
      .from(candidateUsers)
      .where(eq(candidateUsers.email, candidateEmail))
      .limit(1);

    if (!candidateUser.length) {
      console.error(`Candidate not found: email=${candidateEmail}`);
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      );
    }

    const candidate = candidateUser[0];

    // Get existing interview history
    const existingHistory = await db
      .select()
      .from(candidateInterviewHistory)
      .where(
        and(
          eq(candidateInterviewHistory.candidateId, candidate.id),
          eq(candidateInterviewHistory.interviewId, id)
        )
      )
      .limit(1);

    // Try to find interview setup
    let setup: any = null;
    let interviewType: string = 'Coding'; // Default value
    let campaignData: any = null;

    console.log(`🔍 Looking for interview setup with ID: ${id}`);

    // First, try to find in campaignInterviews table (Campaign interviews)
    const campaignInterview = await db
      .select({
        id: campaignInterviews.id,
        interviewId: campaignInterviews.interviewId,
        interviewType: campaignInterviews.interviewType,
        setupId: campaignInterviews.setupId,
        campaignId: campaignInterviews.campaignId,
        status: campaignInterviews.status,
        scheduledAt: campaignInterviews.scheduledAt,
        interviewLink: campaignInterviews.interviewLink,
        jobTitle: jobCampaigns.jobTitle,
        campaignName: jobCampaigns.campaignName,
        companyName: companies.name,
        roundName: interviewSetups.roundName,
        timeLimit: interviewSetups.timeLimit,
        numberOfQuestions: interviewSetups.numberOfQuestions,
        difficultyLevel: interviewSetups.difficultyLevel,
        questionCollectionId: interviewSetups.questionCollectionId
      })
      .from(campaignInterviews)
      .innerJoin(jobCampaigns, eq(campaignInterviews.campaignId, jobCampaigns.id))
      .innerJoin(companies, eq(jobCampaigns.companyId, companies.id))
      .leftJoin(interviewSetups, eq(campaignInterviews.setupId, interviewSetups.id))
      .where(eq(campaignInterviews.setupId, id))
      .limit(1);

    if (campaignInterview.length > 0) {
      const campInterview = campaignInterview[0];
      interviewType = campInterview.interviewType || 'behavioral';
      
      console.log(`✅ Found campaign interview:`, {
        id: campInterview.interviewId,
        type: interviewType,
        setupId: campInterview.setupId,
        roundName: campInterview.roundName
      });

      // Get questions from question bank with AI fallback
      let questions: any[] = [];
      let questionSource = 'question_bank';
      
      try {
        if (campInterview.questionCollectionId) {
          console.log(`🔍 Fetching questions from question bank:`, {
            questionCollectionId: campInterview.questionCollectionId,
            questionType: interviewType,
            difficultyLevel: campInterview.difficultyLevel,
            numberOfQuestions: campInterview.numberOfQuestions
          });

          // Validate that questionCollectionId is a valid UUID format
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          const isValidUUID = uuidRegex.test(campInterview.questionCollectionId);

          if (!isValidUUID) {
            console.warn(`⚠️ Invalid question bank ID format: "${campInterview.questionCollectionId}" (not a valid UUID), using AI fallback...`);
            throw new Error(`Invalid question bank ID format: ${campInterview.questionCollectionId}`);
          }

          // Get the company ID from the campaign data
          const campaignDetails = await db
            .select({ companyId: jobCampaigns.companyId })
            .from(jobCampaigns)
            .where(eq(jobCampaigns.id, campInterview.campaignId))
            .limit(1);

          if (campaignDetails.length > 0) {
            const questionsResult = await getQuestions({
              companyId: campaignDetails[0].companyId,
              collectionId: campInterview.questionCollectionId,
              questionType: campInterview.interviewType || interviewType,
              difficultyLevel: campInterview.difficultyLevel || undefined
            });
            
            if (questionsResult.success && questionsResult.data && questionsResult.data.length > 0) {
              // Shuffle questions and limit to numberOfQuestions
              const shuffledQuestions = questionsResult.data.sort(() => Math.random() - 0.5);
              questions = shuffledQuestions.slice(0, campInterview.numberOfQuestions || 5);
              questionSource = 'question_bank';
              
              console.log(`✅ Fetched ${questions.length} questions from question bank`);
            } else {
              console.warn(`⚠️ Question bank ${campInterview.questionCollectionId} is empty, using AI fallback...`);
              throw new Error('Question bank unavailable');
            }
          }
        } else {
          console.warn(`⚠️ No question bank configured, using AI fallback...`);
          throw new Error('No question bank configured');
        }
      } catch (questionBankError) {
        console.log(`🤖 Using AI fallback for question generation during interview...`);
        
        try {
          const aiResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/ai/generate-fallback`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              interviewType: interviewType === 'technical' ? 'behavioral' : interviewType,
              jobTitle: campInterview.jobTitle,
              jobDescription: '', // We don't have job description in this context
              companyName: campInterview.companyName,
              difficultyLevel: campInterview.difficultyLevel || 'medium',
              numberOfQuestions: campInterview.numberOfQuestions || 5,
              candidateName: 'the candidate'
            })
          });

          if (aiResponse.ok) {
            const aiResult = await aiResponse.json();
            if (aiResult.success) {
              questions = aiResult.questions;
              questionSource = 'ai_fallback';
              console.log(`✅ Generated ${questions.length} questions using AI fallback`);
            } else {
              throw new Error(aiResult.error || 'AI generation failed');
            }
          } else {
            throw new Error(`AI API returned ${aiResponse.status}`);
          }
        } catch (aiError) {
          console.error(`❌ AI fallback also failed: ${aiError}`);
          // Provide default fallback questions
          questions = [{
            id: 'fallback_1',
            question: `Tell me about your experience with ${interviewType} related work.`,
            expectedAnswer: 'Look for relevant experience and specific examples.',
            questionType: interviewType,
            category: 'General',
            difficultyLevel: 'medium'
          }];
          questionSource = 'default_fallback';
        }
      }

      // Transform to unified format
      setup = {
        id: campInterview.interviewId,
        title: `${campInterview.roundName} - ${campInterview.jobTitle}`,
        description: `${campInterview.roundName} interview for ${campInterview.jobTitle} at ${campInterview.companyName}`,
        duration: campInterview.timeLimit || 30,
        questions: questions,
        interviewType: interviewType,
        difficultyLevel: campInterview.difficultyLevel,
        numberOfQuestions: campInterview.numberOfQuestions,
        createdAt: campInterview.scheduledAt,
        updatedAt: campInterview.scheduledAt,
        questionSource: questionSource, // Track where questions came from
        campaignData: {
          campaignId: campInterview.campaignId,
          setupId: campInterview.setupId,
          jobTitle: campInterview.jobTitle,
          companyName: campInterview.companyName
        }
      };
    } else {
      // Try to find in Interview table (MCQ, Behavioral, Combo)
      const interview = await db
        .select()
        .from(Interview)
        .where(eq(Interview.interviewId, id))
        .limit(1);

      if (interview.length > 0) {
        setup = interview[0];
        interviewType = setup.interviewType || 'behavioral';
        
        console.log(`Found interview in Interview table:`, {
          id: setup.interviewId,
          type: interviewType,
          hasQuestions: !!setup.interviewQuestions
        });
        
        // Transform interview data to match expected format
        let questions = [];
        if (setup.interviewQuestions) {
          try {
            const parsed = JSON.parse(setup.interviewQuestions);
            questions = Array.isArray(parsed) ? parsed : [parsed];
          } catch (error) {
            console.error('Error parsing interview questions:', error);
            questions = [];
          }
        }

        // Transform to unified format
        setup = {
          id: setup.interviewId,
          title: setup.jobPosition || `${interviewType} Interview`,
          description: setup.jobDescription || `${interviewType} Interview`,
          duration: 30, // Default duration
          questions: questions,
          interviewType: interviewType,
          createdAt: setup.createdAt,
          updatedAt: setup.updatedAt
        };
      } else {
        // Try to find in CodingInterview table
        const codingInterview = await db
          .select()
          .from(CodingInterview)
          .where(eq(CodingInterview.interviewId, id))
          .limit(1);

        if (codingInterview.length > 0) {
          setup = codingInterview[0];
          interviewType = 'coding';
          
          console.log(`Found interview in CodingInterview table:`, {
            id: setup.interviewId,
            type: interviewType
          });

          // Parse questions
          let questions = [];
          if (setup.codingQuestions) {
            try {
              const parsed = JSON.parse(setup.codingQuestions);
              questions = Array.isArray(parsed) ? parsed : [parsed];
            } catch (error) {
              console.error('Error parsing coding questions:', error);
              questions = [];
            }
          }

          // Transform to unified format
          setup = {
            id: setup.interviewId,
            title: setup.interviewTopic || 'Coding Interview',
            description: setup.problemDescription || 'Coding Interview',
            duration: setup.timeLimit || 60,
            questions: questions,
            interviewType: interviewType,
            createdAt: setup.createdAt,
            updatedAt: setup.updatedAt
          };
        }
      }
    }

    // Check if we found an interview setup
    if (!setup) {
      console.error(`No interview setup found for id: ${id}, candidate: ${candidateEmail}`);
            return NextResponse.json(
              { error: 'Interview not found' },
              { status: 404 }
            );
          }

    console.log(`Successfully found interview setup:`, {
      id: setup.id,
      type: interviewType,
      hasQuestions: !!setup.questions,
      questionsCount: setup.questions ? setup.questions.length : 0
    });

    const interviewData = {
      id: setup.id,
      title: setup.title,
      description: setup.description,
      duration: setup.duration,
      questions: setup.questions || [],
      interviewType: interviewType,
      status: existingHistory.length > 0 ? existingHistory[0].status : 'not_started',
      startedAt: existingHistory.length > 0 ? existingHistory[0].startedAt : null,
      completedAt: existingHistory.length > 0 ? existingHistory[0].completedAt : null,
      feedback: existingHistory.length > 0 ? existingHistory[0].feedback : null,
      actualDuration: existingHistory.length > 0 ? existingHistory[0].duration : null,
      score: existingHistory.length > 0 ? existingHistory[0].score : null,
      maxScore: existingHistory.length > 0 ? existingHistory[0].maxScore : null,
      savedAnswers: existingHistory.length > 0 && existingHistory[0].feedback ? 
        (() => {
          try {
            return JSON.parse(existingHistory[0].feedback);
          } catch {
            return {};
          }
        })() : {},
      candidateEmail: candidateEmail,
      campaign: campaignData,
      candidate: {
        id: candidate.id,
        name: `${candidate.firstName} ${candidate.lastName}`,
        email: candidate.email
      }
    };

    return NextResponse.json({
      success: true,
      interview: interviewData
    });

  } catch (error) {
    console.error('Error fetching interview:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, answers, timeSpent, email, videoRecordingUrl, programmingLanguage } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Missing action field' },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Missing email parameter' },
        { status: 400 }
      );
    }

    const candidateEmail = email;

    // Get candidate user
    const candidateUser = await db
      .select()
      .from(candidateUsers)
      .where(eq(candidateUsers.email, candidateEmail))
      .limit(1);

    if (!candidateUser.length) {
      return NextResponse.json(
        { success: false, error: 'Candidate not found' },
        { status: 404 }
      );
    }

    const candidate = candidateUser[0];

    // Get interview setup
    let setup: any = null;
    let interviewType: string = 'Coding';

    // First, try to find in campaignInterviews table
    const campaignInterview = await db
      .select({
        id: campaignInterviews.id,
        interviewId: campaignInterviews.interviewId,
        interviewType: campaignInterviews.interviewType,
        setupId: campaignInterviews.setupId,
        campaignId: campaignInterviews.campaignId
      })
      .from(campaignInterviews)
      .where(eq(campaignInterviews.setupId, id))
      .limit(1);

    if (campaignInterview.length > 0) {
      setup = campaignInterview[0];
      interviewType = setup.interviewType || 'behavioral';
    } else {
      // Try Interview table first (MCQ, Behavioral, Combo)
      const interview = await db
        .select()
        .from(Interview)
        .where(eq(Interview.interviewId, id))
        .limit(1);

      if (interview.length > 0) {
        setup = interview[0];
        interviewType = setup.interviewType || 'behavioral';
      } else {
        // Try CodingInterview table
        const codingInterview = await db
          .select()
          .from(CodingInterview)
          .where(eq(CodingInterview.interviewId, id))
          .limit(1);

        if (codingInterview.length > 0) {
          setup = codingInterview[0];
          interviewType = 'coding';
        }
      }
    }

    if (!setup) {
      return NextResponse.json(
        { success: false, error: 'Interview setup not found' },
        { status: 404 }
      );
    }

    // Handle different actions
    if (action === 'start') {
      // Check if interview history already exists
      const existingHistory = await db
        .select()
        .from(candidateInterviewHistory)
        .where(
          and(
            eq(candidateInterviewHistory.candidateId, candidate.id),
            eq(candidateInterviewHistory.interviewId, id)
          )
        )
        .limit(1);

      if (existingHistory.length > 0) {
        return NextResponse.json({
          success: true,
          message: 'Interview already started',
          historyId: existingHistory[0].id
        });
      }

      // Create new interview history
      const newHistory = await db
        .insert(candidateInterviewHistory)
        .values({
          candidateId: candidate.id,
          applicationId: null, // No application for direct interviews
          interviewId: id,
          interviewType: interviewType,
          roundNumber: 1,
          status: 'in_progress',
          startedAt: new Date()
        })
        .returning();

      return NextResponse.json({
        success: true,
        message: 'Interview started successfully',
        historyId: newHistory[0].id
      });

    } else if (action === 'submit') {
      // Check if interview has already been completed
      const existingHistory = await db
        .select()
        .from(candidateInterviewHistory)
        .where(
          and(
            eq(candidateInterviewHistory.candidateId, candidate.id),
            eq(candidateInterviewHistory.interviewId, id)
          )
        )
        .limit(1);

      if (existingHistory.length > 0 && existingHistory[0].status === 'completed') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Interview has already been completed and cannot be resubmitted' 
          },
          { status: 400 }
        );
      }

      // Calculate score based on interview type and answers
      let score = 0;
      let maxScore = 0;
      
      if (answers && typeof answers === 'object') {
        const answersArray = Array.isArray(answers) ? answers : Object.values(answers);
        maxScore = answersArray.length;
        
        // Simple scoring logic
        if (interviewType === 'mcq') {
          score = answersArray.filter((answer: any) => 
            answer && answer.selectedOption === answer.correctAnswer
          ).length;
        } else {
          // For behavioral/coding, give score based on completion
          score = answersArray.filter((answer: any) => 
            answer && answer.toString().trim().length > 10
          ).length;
        }
      }

      // Structure answers properly with metadata
      const structuredAnswers = {
        answers: answers,
        submittedAt: new Date().toISOString(),
        interviewType: interviewType,
        timeSpent: timeSpent || 0,
        score: score,
        maxScore: maxScore
      };

      // Update interview history with final answers and score
      const updateData: any = {
        duration: timeSpent || 0,
        status: 'completed',
        completedAt: new Date(),
        feedback: JSON.stringify(structuredAnswers),
        score: score,
        maxScore: maxScore,
        passed: maxScore > 0 ? (score / maxScore) >= 0.6 : false,
        recordingUrl: videoRecordingUrl || null, // Save video recording URL
        programmingLanguage: programmingLanguage || null // Save programming language for coding interviews
      };

      await db
        .update(candidateInterviewHistory)
        .set(updateData)
        .where(
          and(
            eq(candidateInterviewHistory.candidateId, candidate.id),
            eq(candidateInterviewHistory.interviewId, id)
          )
        );

      return NextResponse.json({
        success: true,
        message: 'Interview submitted successfully',
        score: score,
        maxScore: maxScore,
        passed: updateData.passed
      });

    } else if (action === 'save_progress') {
      // Save intermediate answers
      await db
        .update(candidateInterviewHistory)
        .set({
          feedback: answers ? JSON.stringify(answers) : null,
          duration: timeSpent || 0
        })
        .where(
          and(
            eq(candidateInterviewHistory.candidateId, candidate.id),
            eq(candidateInterviewHistory.interviewId, id)
          )
        );

      return NextResponse.json({
        success: true,
        message: 'Progress saved successfully'
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error processing interview action:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}