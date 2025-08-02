import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { skillTemplates, interviewTemplates, jobDescriptionTemplates } from '@/lib/database/schema';
import { eq, and, or } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');
    const templateType = searchParams.get('type'); // 'skill', 'interview', or 'job_description'

    if (!templateId || !templateType) {
      return NextResponse.json(
        { success: false, error: 'Template ID and type are required' },
        { status: 400 }
      );
    }

    let originalTemplate;
    let duplicatedTemplate;

    // Find and duplicate based on template type
    switch (templateType) {
      case 'skill':
        const skillTemplate = await db
          .select()
          .from(skillTemplates)
          .where(
            and(
              eq(skillTemplates.id, templateId),
              or(
                eq(skillTemplates.companyId, session.user.companyId),
                eq(skillTemplates.isPublic, true),
                eq(skillTemplates.createdBy, session.user.id)
              )
            )
          )
          .limit(1);

        if (!skillTemplate[0]) {
          return NextResponse.json(
            { success: false, error: 'Skill template not found or access denied' },
            { status: 404 }
          );
        }

        originalTemplate = skillTemplate[0];
        const newSkillTemplate = await db
          .insert(skillTemplates)
          .values({
            templateName: `${originalTemplate.templateName} (Copy)`,
            jobCategory: originalTemplate.jobCategory,
            skills: originalTemplate.skills,
            jobDuties: originalTemplate.jobDuties,
            description: originalTemplate.description,
            experienceLevel: originalTemplate.experienceLevel,
            isPublic: false,
            isActive: true,
            aiGenerated: originalTemplate.aiGenerated,
            metadata: {
              ...(originalTemplate.metadata || {}),
              duplicatedFrom: originalTemplate.id,
              duplicatedAt: new Date().toISOString()
            },
            createdBy: session.user.id,
            companyId: session.user.companyId
          })
          .returning();

        duplicatedTemplate = newSkillTemplate[0];
        break;

      case 'interview':
        const interviewTemplate = await db
          .select()
          .from(interviewTemplates)
          .where(
            and(
              eq(interviewTemplates.id, templateId),
              or(
                eq(interviewTemplates.companyId, session.user.companyId),
                eq(interviewTemplates.isPublic, true),
                eq(interviewTemplates.createdBy, session.user.id)
              )
            )
          )
          .limit(1);

        if (!interviewTemplate[0]) {
          return NextResponse.json(
            { success: false, error: 'Interview template not found or access denied' },
            { status: 404 }
          );
        }

        originalTemplate = interviewTemplate[0];
        const newInterviewTemplate = await db
          .insert(interviewTemplates)
          .values({
            templateName: `${originalTemplate.templateName} (Copy)`,
            description: originalTemplate.description,
            jobCategory: originalTemplate.jobCategory,
            interviewType: originalTemplate.interviewType,
            difficultyLevel: originalTemplate.difficultyLevel,
            timeLimit: originalTemplate.timeLimit,
            questionIds: originalTemplate.questionIds,
            instructions: originalTemplate.instructions,
            rounds: originalTemplate.rounds,
            isPublic: false,
            isActive: true,
            aiGenerated: originalTemplate.aiGenerated,
            metadata: {
              ...(originalTemplate.metadata || {}),
              duplicatedFrom: originalTemplate.id,
              duplicatedAt: new Date().toISOString()
            },
            createdBy: session.user.id,
            companyId: session.user.companyId
          })
          .returning();

        duplicatedTemplate = newInterviewTemplate[0];
        break;

      case 'job_description':
        const jobTemplate = await db
          .select()
          .from(jobDescriptionTemplates)
          .where(
            and(
              eq(jobDescriptionTemplates.id, templateId),
              or(
                eq(jobDescriptionTemplates.companyId, session.user.companyId),
                eq(jobDescriptionTemplates.isPublic, true),
                eq(jobDescriptionTemplates.createdBy, session.user.id)
              )
            )
          )
          .limit(1);

        if (!jobTemplate[0]) {
          return NextResponse.json(
            { success: false, error: 'Job description template not found or access denied' },
            { status: 404 }
          );
        }

        originalTemplate = jobTemplate[0];
        const newJobTemplate = await db
          .insert(jobDescriptionTemplates)
          .values({
            templateName: `${originalTemplate.templateName} (Copy)`,
            jobCategory: originalTemplate.jobCategory,
            templateContent: originalTemplate.templateContent,
            placeholders: originalTemplate.placeholders,
            description: originalTemplate.description,
            isPublic: false,
            isActive: true,
            aiGenerated: originalTemplate.aiGenerated,
            metadata: {
              ...(originalTemplate.metadata || {}),
              duplicatedFrom: originalTemplate.id,
              duplicatedAt: new Date().toISOString()
            },
            createdBy: session.user.id,
            companyId: session.user.companyId
          })
          .returning();

        duplicatedTemplate = newJobTemplate[0];
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid template type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: duplicatedTemplate
    });

  } catch (error) {
    console.error('Error duplicating template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to duplicate template' },
      { status: 500 }
    );
  }
}