import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { skillTemplates, interviewTemplates, jobDescriptionTemplates } from '@/lib/database/schema';
import { eq, and, or, desc, asc, ilike, count, sql } from 'drizzle-orm';
import { validateCompanyId } from '@/lib/api/utils';

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
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const isPublic = searchParams.get('isPublic');

    let templates: any[] = [];

    // Build where conditions for each template type
    const buildWhereCondition = (table: any) => {
      let conditions = [
        or(
          eq(table.companyId, companyValidation.companyId),
          eq(table.isPublic, true),
          eq(table.createdBy, session.user.id)
        )
      ];

      if (category) {
        conditions.push(ilike(table.jobCategory, `%${category}%`));
      }

      if (isPublic !== null) {
        conditions.push(eq(table.isPublic, isPublic === 'true'));
      }

      return and(...conditions);
    };

    // Fetch templates based on type filter
    if (!type || type === 'skill') {
      const skillTemplateResults = await db
        .select({
          id: skillTemplates.id,
          name: skillTemplates.templateName,
          description: skillTemplates.description,
          type: sql<string>`'skill'`.as('type'),
          category: skillTemplates.jobCategory,
          content: skillTemplates.skills,
          difficultyLevel: skillTemplates.experienceLevel,
          timeLimit: sql<number | null>`null`.as('timeLimit'),
          isPublic: skillTemplates.isPublic,
          isActive: skillTemplates.isActive,
          aiGenerated: skillTemplates.aiGenerated,
          metadata: skillTemplates.metadata,
          usageCount: skillTemplates.usageCount,
          createdAt: skillTemplates.createdAt,
          updatedAt: skillTemplates.updatedAt,
          createdBy: skillTemplates.createdBy,
          companyId: skillTemplates.companyId
        })
        .from(skillTemplates)
        .where(buildWhereCondition(skillTemplates));

      templates.push(...skillTemplateResults);
    }

    if (!type || type === 'interview') {
      const interviewTemplateResults = await db
        .select({
          id: interviewTemplates.id,
          name: interviewTemplates.templateName,
          description: interviewTemplates.description,
          type: sql<string>`'interview'`.as('type'),
          category: interviewTemplates.jobCategory,
          content: interviewTemplates.rounds,
          difficultyLevel: interviewTemplates.difficultyLevel,
          timeLimit: interviewTemplates.timeLimit,
          isPublic: interviewTemplates.isPublic,
          isActive: interviewTemplates.isActive,
          aiGenerated: interviewTemplates.aiGenerated,
          metadata: interviewTemplates.metadata,
          usageCount: interviewTemplates.usageCount,
          createdAt: interviewTemplates.createdAt,
          updatedAt: interviewTemplates.updatedAt,
          createdBy: interviewTemplates.createdBy,
          companyId: interviewTemplates.companyId
        })
        .from(interviewTemplates)
        .where(buildWhereCondition(interviewTemplates));

      templates.push(...interviewTemplateResults);
    }

    if (!type || type === 'job_description') {
      const jobTemplateResults = await db
        .select({
          id: jobDescriptionTemplates.id,
          name: jobDescriptionTemplates.templateName,
          description: jobDescriptionTemplates.description,
          type: sql<string>`'job_description'`.as('type'),
          category: jobDescriptionTemplates.jobCategory,
          content: jobDescriptionTemplates.templateContent,
          difficultyLevel: sql<string | null>`null`.as('difficultyLevel'),
          timeLimit: sql<number | null>`null`.as('timeLimit'),
          isPublic: jobDescriptionTemplates.isPublic,
          isActive: jobDescriptionTemplates.isActive,
          aiGenerated: jobDescriptionTemplates.aiGenerated,
          metadata: jobDescriptionTemplates.metadata,
          usageCount: jobDescriptionTemplates.usageCount,
          createdAt: jobDescriptionTemplates.createdAt,
          updatedAt: jobDescriptionTemplates.updatedAt,
          createdBy: jobDescriptionTemplates.createdBy,
          companyId: jobDescriptionTemplates.companyId
        })
        .from(jobDescriptionTemplates)
        .where(buildWhereCondition(jobDescriptionTemplates));

      templates.push(...jobTemplateResults);
    }

    // Sort by creation date (newest first)
    templates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      data: templates
    });

  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

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
    const { 
      name, 
      description, 
      type, 
      category, 
      content, 
      difficultyLevel, 
      timeLimit, 
      isPublic = false,
      isActive = true,
      metadata = {}
    } = body;

    // Validate required fields
    if (!name || !type || !content) {
      return NextResponse.json(
        { success: false, error: 'Name, type, and content are required' },
        { status: 400 }
      );
    }

    // Validate type
    if (!['skill', 'interview', 'job_description'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid template type' },
        { status: 400 }
      );
    }

    let newTemplate;

    // Create template in the appropriate table based on type
    if (type === 'skill') {
      const [template] = await db.insert(skillTemplates).values({
        templateName: name,
        description,
        jobCategory: category,
        skills: content,
        experienceLevel: difficultyLevel,
        isPublic,
        isActive,
        aiGenerated: false,
        metadata,
        usageCount: 0,
        createdBy: session.user.id,
        companyId: companyValidation.companyId,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      newTemplate = {
        ...template,
        type: 'skill',
        content: template.skills,
        difficultyLevel: template.experienceLevel,
        timeLimit: null
      };
    } else if (type === 'interview') {
      const [template] = await db.insert(interviewTemplates).values({
        templateName: name,
        description,
        jobCategory: category,
        rounds: content,
        difficultyLevel,
        timeLimit,
        interviewType: 'standard', // Adding required interviewType field
        isPublic,
        isActive,
        aiGenerated: false,
        metadata,
        usageCount: 0,
        createdBy: session.user.id,
        companyId: companyValidation.companyId,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      newTemplate = {
        ...template,
        type: 'interview',
        content: template.rounds
      };
    } else if (type === 'job_description') {
      const [template] = await db.insert(jobDescriptionTemplates).values({
        templateName: name,
        description,
        jobCategory: category,
        templateContent: content,
        isPublic,
        isActive,
        aiGenerated: false,
        metadata,
        usageCount: 0,
        createdBy: session.user.id,
        companyId: companyValidation.companyId,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      newTemplate = {
        ...template,
        type: 'job_description',
        content: template.templateContent,
        difficultyLevel: null,
        timeLimit: null
      };
    }

    return NextResponse.json({
      success: true,
      data: newTemplate
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create template' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
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
    const { 
      id,
      type,
      name, 
      description, 
      category, 
      content, 
      difficultyLevel, 
      timeLimit, 
      isPublic,
      isActive,
      metadata
    } = body;

    // Validate required fields
    if (!id || !type) {
      return NextResponse.json(
        { success: false, error: 'ID and type are required' },
        { status: 400 }
      );
    }

    // Validate type
    if (!['skill', 'interview', 'job_description'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid template type' },
        { status: 400 }
      );
    }

    let updatedTemplate;

    // Update template in the appropriate table based on type
    if (type === 'skill') {
      // First check if template exists and user has permission
      const existingTemplate = await db
        .select()
        .from(skillTemplates)
        .where(
          and(
            eq(skillTemplates.id, id),
            or(
              eq(skillTemplates.createdBy, session.user.id),
              eq(skillTemplates.companyId, companyValidation.companyId)
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

      const updateData: any = { updatedAt: new Date() };
      if (name !== undefined) updateData.templateName = name;
      if (description !== undefined) updateData.description = description;
      if (category !== undefined) updateData.jobCategory = category;
      if (content !== undefined) updateData.skills = content;
      if (difficultyLevel !== undefined) updateData.experienceLevel = difficultyLevel;
      if (isPublic !== undefined) updateData.isPublic = isPublic;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (metadata !== undefined) updateData.metadata = metadata;

      const [template] = await db
        .update(skillTemplates)
        .set(updateData)
        .where(eq(skillTemplates.id, id))
        .returning();

      updatedTemplate = {
        ...template,
        type: 'skill',
        content: template.skills,
        difficultyLevel: template.experienceLevel,
        timeLimit: null
      };
    } else if (type === 'interview') {
      // First check if template exists and user has permission
      const existingTemplate = await db
        .select()
        .from(interviewTemplates)
        .where(
          and(
            eq(interviewTemplates.id, id),
            or(
              eq(interviewTemplates.createdBy, session.user.id),
              eq(interviewTemplates.companyId, companyValidation.companyId)
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

      const updateData: any = { updatedAt: new Date() };
      if (name !== undefined) updateData.templateName = name;
      if (description !== undefined) updateData.description = description;
      if (category !== undefined) updateData.jobCategory = category;
      if (content !== undefined) updateData.rounds = content;
      if (difficultyLevel !== undefined) updateData.difficultyLevel = difficultyLevel;
      if (timeLimit !== undefined) updateData.timeLimit = timeLimit;
      if (isPublic !== undefined) updateData.isPublic = isPublic;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (metadata !== undefined) updateData.metadata = metadata;

      const [template] = await db
        .update(interviewTemplates)
        .set(updateData)
        .where(eq(interviewTemplates.id, id))
        .returning();

      updatedTemplate = {
        ...template,
        type: 'interview',
        content: template.rounds
      };
    } else if (type === 'job_description') {
      // First check if template exists and user has permission
      const existingTemplate = await db
        .select()
        .from(jobDescriptionTemplates)
        .where(
          and(
            eq(jobDescriptionTemplates.id, id),
            or(
              eq(jobDescriptionTemplates.createdBy, session.user.id),
              eq(jobDescriptionTemplates.companyId, companyValidation.companyId)
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

      const updateData: any = { updatedAt: new Date() };
      if (name !== undefined) updateData.templateName = name;
      if (description !== undefined) updateData.description = description;
      if (category !== undefined) updateData.jobCategory = category;
      if (content !== undefined) updateData.templateContent = content;
      if (isPublic !== undefined) updateData.isPublic = isPublic;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (metadata !== undefined) updateData.metadata = metadata;

      const [template] = await db
        .update(jobDescriptionTemplates)
        .set(updateData)
        .where(eq(jobDescriptionTemplates.id, id))
        .returning();

      updatedTemplate = {
        ...template,
        type: 'job_description',
        content: template.templateContent,
        difficultyLevel: null,
        timeLimit: null
      };
    }

    return NextResponse.json({
      success: true,
      data: updatedTemplate
    });

  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    const id = searchParams.get('id');
    const type = searchParams.get('type');

    if (!id || !type) {
      return NextResponse.json(
        { success: false, error: 'Template ID and type are required' },
        { status: 400 }
      );
    }

    // Validate type
    if (!['skill', 'interview', 'job_description'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid template type' },
        { status: 400 }
      );
    }

    // Delete template from the appropriate table based on type
    if (type === 'skill') {
      // First check if template exists and user has permission
      const existingTemplate = await db
        .select()
        .from(skillTemplates)
        .where(
          and(
            eq(skillTemplates.id, id),
            or(
              eq(skillTemplates.createdBy, session.user.id),
              eq(skillTemplates.companyId, companyValidation.companyId)
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

      await db.delete(skillTemplates).where(eq(skillTemplates.id, id));
    } else if (type === 'interview') {
      // First check if template exists and user has permission
      const existingTemplate = await db
        .select()
        .from(interviewTemplates)
        .where(
          and(
            eq(interviewTemplates.id, id),
            or(
              eq(interviewTemplates.createdBy, session.user.id),
              eq(interviewTemplates.companyId, companyValidation.companyId)
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

      await db.delete(interviewTemplates).where(eq(interviewTemplates.id, id));
    } else if (type === 'job_description') {
      // First check if template exists and user has permission
      const existingTemplate = await db
        .select()
        .from(jobDescriptionTemplates)
        .where(
          and(
            eq(jobDescriptionTemplates.id, id),
            or(
              eq(jobDescriptionTemplates.createdBy, session.user.id),
              eq(jobDescriptionTemplates.companyId, companyValidation.companyId)
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

      await db.delete(jobDescriptionTemplates).where(eq(jobDescriptionTemplates.id, id));
    }

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}