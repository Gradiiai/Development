import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { skillTemplates, interviewTemplates, jobDescriptionTemplates } from '@/lib/database/schema';
import OpenAI from 'openai';
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, category, requirements, difficultyLevel, timeLimit, isPublic = false } = body;

    if (!type || !category || !requirements) {
      return NextResponse.json(
        { success: false, error: 'Type, category, and requirements are required' },
        { status: 400 }
      );
    }

    let generatedContent;
    let templateName;
    let description;
    let template;

    switch (type) {
      case 'job_description':
        const jdResult = await generateJobDescription(requirements, category);
        generatedContent = jdResult.content;
        templateName = jdResult.name;
        description = jdResult.description;

        const newJobTemplate = await db
          .insert(jobDescriptionTemplates)
          .values({
            templateName,
            description,
            jobCategory: category,
            templateContent: JSON.stringify(generatedContent),
            placeholders: JSON.stringify([]), // Can be enhanced later
            isPublic,
            isActive: true,
            aiGenerated: true,
            metadata: {
              generatedFrom: requirements,
              generatedAt: new Date().toISOString()
            },
            createdBy: session.user.id,
            companyId: session.user.companyId
          })
          .returning();

        template = newJobTemplate[0];
        break;

      case 'skill':
        const skillResult = await generateSkillTemplate(requirements, category, difficultyLevel);
        generatedContent = skillResult.content;
        templateName = skillResult.name;
        description = skillResult.description;

        const newSkillTemplate = await db
          .insert(skillTemplates)
          .values({
            templateName,
            description,
            jobCategory: category,
            skills: generatedContent.skillsToAssess || generatedContent,
            jobDuties: generatedContent.jobDuties || '',
            experienceLevel: difficultyLevel || 'medium',
            isPublic,
            isActive: true,
            aiGenerated: true,
            metadata: {
              generatedFrom: requirements,
              generatedAt: new Date().toISOString()
            },
            createdBy: session.user.id,
            companyId: session.user.companyId
          })
          .returning();

        template = newSkillTemplate[0];
        break;

      case 'interview':
        const interviewResult = await generateInterviewTemplate(requirements, category, difficultyLevel, timeLimit);
        generatedContent = interviewResult.content;
        templateName = interviewResult.name;
        description = interviewResult.description;

        const newInterviewTemplate = await db
          .insert(interviewTemplates)
          .values({
            templateName,
            description,
            jobCategory: category,
            interviewType: 'behavioral', // Default, can be enhanced
            difficultyLevel: difficultyLevel || 'medium',
            timeLimit: timeLimit || 60,
            questionIds: JSON.stringify([]), // Can be enhanced later
            instructions: generatedContent.instructions || '',
            rounds: generatedContent.rounds || null,
            isPublic,
            isActive: true,
            aiGenerated: true,
            metadata: {
              generatedFrom: requirements,
              generatedAt: new Date().toISOString()
            },
            createdBy: session.user.id,
            companyId: session.user.companyId
          })
          .returning();

        template = newInterviewTemplate[0];
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid template type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: template
    });

  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate template' },
      { status: 500 }
    );
  }
}

async function generateJobDescription(requirements: any, category: string) {
  const prompt = `Generate a comprehensive job description based on the following requirements:
  
  Category: ${category}
  Requirements: ${JSON.stringify(requirements, null, 2)}
  
  Please create a structured job description with the following sections:
  - Job Title
  - Company Overview
  - Job Summary
  - Key Responsibilities (detailed list)
  - Required Qualifications
  - Preferred Qualifications
  - Skills Required
  - Benefits
  - Salary Range (if applicable)
  - Location/Remote Options
  
  Return the response as a JSON object with the following structure:
  {
    "name": "Job Title - Category Template",
    "description": "Brief description of this job description template",
    "content": {
      "jobTitle": "",
      "companyOverview": "",
      "jobSummary": "",
      "keyResponsibilities": [],
      "requiredQualifications": [],
      "preferredQualifications": [],
      "skillsRequired": [],
      "benefits": [],
      "salaryRange": "",
      "location": ""
    }
  }`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  return JSON.parse(completion.choices[0].message.content || '{}');
}

async function generateSkillTemplate(requirements: any, category: string, difficultyLevel: string) {
  const prompt = `Generate a comprehensive skill assessment template based on the following requirements:
  
  Category: ${category}
  Difficulty Level: ${difficultyLevel}
  Requirements: ${JSON.stringify(requirements, null, 2)}
  
  Please create a structured skill template with the following sections:
  - Skills to assess
  - Assessment criteria
  - Evaluation methods
  - Scoring rubric
  - Required tools/technologies
  - Prerequisites
  
  Return the response as a JSON object with the following structure:
  {
    "name": "Skill Assessment - Category Template",
    "description": "Brief description of this skill assessment template",
    "content": {
      "skillsToAssess": [],
      "assessmentCriteria": [],
      "evaluationMethods": [],
      "scoringRubric": {},
      "requiredTools": [],
      "prerequisites": [],
      "timeEstimate": ""
    }
  }`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  return JSON.parse(completion.choices[0].message.content || '{}');
}

async function generateInterviewTemplate(requirements: any, category: string, difficultyLevel: string, timeLimit?: number) {
  const prompt = `Generate a comprehensive interview template based on the following requirements:
  
  Category: ${category}
  Difficulty Level: ${difficultyLevel}
  Time Limit: ${timeLimit ? `${timeLimit} minutes` : 'Not specified'}
  Requirements: ${JSON.stringify(requirements, null, 2)}
  
  Please create a structured interview template with the following sections:
  - Interview rounds
  - Questions for each round
  - Evaluation criteria
  - Scoring guidelines
  - Time allocation
  - Required materials/setup
  
  Return the response as a JSON object with the following structure:
  {
    "name": "Interview Template - Category",
    "description": "Brief description of this interview template",
    "content": {
      "rounds": [
        {
          "roundName": "",
          "roundType": "",
          "duration": 0,
          "questions": [],
          "evaluationCriteria": [],
          "scoringGuidelines": ""
        }
      ],
      "totalDuration": 0,
      "requiredMaterials": [],
      "setupInstructions": [],
      "evaluationRubric": {}
    }
  }`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  return JSON.parse(completion.choices[0].message.content || '{}');
}