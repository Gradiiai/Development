import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { skillTemplates, interviewTemplates, jobDescriptionTemplates } from '@/lib/database/schema';
import { eq, and, or, sql } from 'drizzle-orm';
import { validateCompanyId } from '@/lib/api/utils';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const companyValidation = validateCompanyId(session.user.companyId);
    if (!companyValidation.success) {
      return companyValidation.response;
    }

    const body = await request.json();
    const { templateId, templateType, usageContext, metadata = {} } = body;

    if (!templateId || !templateType || !usageContext) {
      return NextResponse.json(
        { success: false, error: 'Template ID, type, and usage context are required' },
        { status: 400 }
      );
    }

    // Validate template type
    if (!['skill', 'interview', 'job_description'].includes(templateType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid template type' },
        { status: 400 }
      );
    }

    let template: any = null;

    // Find and increment usage count for the appropriate template type
    if (templateType === 'skill') {
      // First verify template exists and user has access
      const existingTemplate = await db
        .select()
        .from(skillTemplates)
        .where(
          and(
            eq(skillTemplates.id, templateId),
            or(
              eq(skillTemplates.companyId, companyValidation.companyId),
              eq(skillTemplates.isPublic, true),
              eq(skillTemplates.createdBy, session.user.id)
            )
          )
        )
        .limit(1);

      if (existingTemplate.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Template not found or access denied' },
          { status: 404 }
        );
      }

      // Increment usage count
      const [updatedTemplate] = await db
        .update(skillTemplates)
        .set({ 
          usageCount: (existingTemplate[0].usageCount || 0) + 1,
          updatedAt: new Date()
        })
        .where(eq(skillTemplates.id, templateId))
        .returning();

      template = updatedTemplate;
    } else if (templateType === 'interview') {
      // First verify template exists and user has access
      const existingTemplate = await db
        .select()
        .from(interviewTemplates)
        .where(
          and(
            eq(interviewTemplates.id, templateId),
            or(
              eq(interviewTemplates.companyId, companyValidation.companyId),
              eq(interviewTemplates.isPublic, true),
              eq(interviewTemplates.createdBy, session.user.id)
            )
          )
        )
        .limit(1);

      if (existingTemplate.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Template not found or access denied' },
          { status: 404 }
        );
      }

      // Increment usage count
      const [updatedTemplate] = await db
        .update(interviewTemplates)
        .set({ 
          usageCount: (existingTemplate[0].usageCount || 0) + 1,
          updatedAt: new Date()
        })
        .where(eq(interviewTemplates.id, templateId))
        .returning();

      template = updatedTemplate;
    } else if (templateType === 'job_description') {
      // First verify template exists and user has access
      const existingTemplate = await db
        .select()
        .from(jobDescriptionTemplates)
        .where(
          and(
            eq(jobDescriptionTemplates.id, templateId),
            or(
              eq(jobDescriptionTemplates.companyId, companyValidation.companyId),
              eq(jobDescriptionTemplates.isPublic, true),
              eq(jobDescriptionTemplates.createdBy, session.user.id)
            )
          )
        )
        .limit(1);

      if (existingTemplate.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Template not found or access denied' },
          { status: 404 }
        );
      }

      // Increment usage count
      const [updatedTemplate] = await db
        .update(jobDescriptionTemplates)
        .set({ 
          usageCount: (existingTemplate[0].usageCount || 0) + 1,
          updatedAt: new Date()
        })
        .where(eq(jobDescriptionTemplates.id, templateId))
        .returning();

      template = updatedTemplate;
    }

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Failed to update template usage' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        templateId,
        templateType,
        usageContext,
        usageCount: template.usageCount || 0,
        recordedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error recording template usage:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record template usage' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const companyValidation = validateCompanyId(session.user.companyId);
    if (!companyValidation.success) {
      return companyValidation.response;
    }

    const { searchParams } = new URL(request.url);
    const templateType = searchParams.get('templateType');
    const templateId = searchParams.get('templateId');

    let templates: any[] = [];

    if (templateType) {
      // Get specific template type
      if (templateType === 'skill') {
        let conditions = [
          eq(skillTemplates.companyId, companyValidation.companyId),
          eq(skillTemplates.isPublic, true),
          eq(skillTemplates.createdBy, session.user.id)
        ];

        if (templateId) {
          conditions.push(eq(skillTemplates.id, templateId));
        }

        templates = await db
          .select({
            id: skillTemplates.id,
            name: skillTemplates.templateName,
            templateType: sql<string>`'skill'`.as('templateType'),
            category: skillTemplates.jobCategory,
            usageCount: skillTemplates.usageCount,
            createdAt: skillTemplates.createdAt,
            updatedAt: skillTemplates.updatedAt
          })
          .from(skillTemplates)
          .where(or(...conditions))
          .orderBy(skillTemplates.usageCount);
      } else if (templateType === 'interview') {
        let conditions = [
          eq(interviewTemplates.companyId, companyValidation.companyId),
          eq(interviewTemplates.isPublic, true),
          eq(interviewTemplates.createdBy, session.user.id)
        ];

        if (templateId) {
          conditions.push(eq(interviewTemplates.id, templateId));
        }

        templates = await db
          .select({
            id: interviewTemplates.id,
            name: interviewTemplates.templateName,
            templateType: sql<string>`'interview'`.as('templateType'),
            category: interviewTemplates.jobCategory,
            usageCount: interviewTemplates.usageCount,
            createdAt: interviewTemplates.createdAt,
            updatedAt: interviewTemplates.updatedAt
          })
          .from(interviewTemplates)
          .where(or(...conditions))
          .orderBy(interviewTemplates.usageCount);
      } else if (templateType === 'job_description') {
        let conditions = [
          eq(jobDescriptionTemplates.companyId, companyValidation.companyId),
          eq(jobDescriptionTemplates.isPublic, true),
          eq(jobDescriptionTemplates.createdBy, session.user.id)
        ];

        if (templateId) {
          conditions.push(eq(jobDescriptionTemplates.id, templateId));
        }

        templates = await db
          .select({
            id: jobDescriptionTemplates.id,
            name: jobDescriptionTemplates.templateName,
            templateType: sql<string>`'job_description'`.as('templateType'),
            category: jobDescriptionTemplates.jobCategory,
            usageCount: jobDescriptionTemplates.usageCount,
            createdAt: jobDescriptionTemplates.createdAt,
            updatedAt: jobDescriptionTemplates.updatedAt
          })
          .from(jobDescriptionTemplates)
          .where(or(...conditions))
          .orderBy(jobDescriptionTemplates.usageCount);
      }
    } else {
      // Get all template types with usage stats
      const [skillStats, interviewStats, jobDescStats] = await Promise.all([
        db
          .select({
            id: skillTemplates.id,
            name: skillTemplates.templateName,
            templateType: sql<string>`'skill'`.as('templateType'),
            category: skillTemplates.jobCategory,
            usageCount: skillTemplates.usageCount
          })
          .from(skillTemplates)
          .where(
            or(
              eq(skillTemplates.companyId, companyValidation.companyId),
              eq(skillTemplates.isPublic, true),
              eq(skillTemplates.createdBy, session.user.id)
            )
          ),
        db
          .select({
            id: interviewTemplates.id,
            name: interviewTemplates.templateName,
            templateType: sql<string>`'interview'`.as('templateType'),
            category: interviewTemplates.jobCategory,
            usageCount: interviewTemplates.usageCount
          })
          .from(interviewTemplates)
          .where(
            or(
              eq(interviewTemplates.companyId, companyValidation.companyId),
              eq(interviewTemplates.isPublic, true),
              eq(interviewTemplates.createdBy, session.user.id)
            )
          ),
        db
          .select({
            id: jobDescriptionTemplates.id,
            name: jobDescriptionTemplates.templateName,
            templateType: sql<string>`'job_description'`.as('templateType'),
            category: jobDescriptionTemplates.jobCategory,
            usageCount: jobDescriptionTemplates.usageCount
          })
          .from(jobDescriptionTemplates)
          .where(
            or(
              eq(jobDescriptionTemplates.companyId, companyValidation.companyId),
              eq(jobDescriptionTemplates.isPublic, true),
              eq(jobDescriptionTemplates.createdBy, session.user.id)
            )
          )
      ]);

      templates = [...skillStats, ...interviewStats, ...jobDescStats]
        .sort((a, b) => (b.usageCount as number) - (a.usageCount as number));
    }

    return NextResponse.json({
      success: true,
      data: templates
    });

  } catch (error) {
    console.error('Error fetching template usage:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch template usage' },
      { status: 500 }
    );
  }
}