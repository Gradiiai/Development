import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/database/connection';
import { questionBankTemplates, questionBanks, questionBank } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import { PREDEFINED_TEMPLATES } from '@/lib/constants/question-bank';

// GET /api/content/question-bank-templates
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get predefined templates from database
    const templates = await db
      .select()
      .from(questionBankTemplates)
      .where(eq(questionBankTemplates.isActive, true));

    // If no templates in database, return predefined ones
    if (templates.length === 0) {
      return NextResponse.json({
        success: true,
        data: PREDEFINED_TEMPLATES
      });
    }

    return NextResponse.json({
      success: true,
      data: templates
    });

  } catch (error) {
    console.error('Error fetching question bank templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// POST /api/content/question-bank-templates/[templateId]/create
// Create a question bank from a template
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.companyId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { templateId, customName, customDescription } = body;

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // First check if templateId is a UUID (database template) or a name (predefined template)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(templateId);
    
    let template: any[] = [];
    let predefinedTemplate = null;

    if (isUUID) {
      // Query database for UUID-based template
      template = await db
        .select()
        .from(questionBankTemplates)
        .where(eq(questionBankTemplates.id, templateId))
        .limit(1);
    } else {
      // Look for predefined template by name
      predefinedTemplate = PREDEFINED_TEMPLATES.find(t => t.name === templateId);
    }

    if (template.length === 0 && !predefinedTemplate) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    if (predefinedTemplate) {
      // Create question bank from predefined template
      const [newBank] = await db
        .insert(questionBanks)
        .values({
          companyId: session.user.companyId,
          createdBy: session.user.id,
          name: customName || predefinedTemplate.name,
          description: customDescription || predefinedTemplate.description,
          category: predefinedTemplate.category,
          subCategory: predefinedTemplate.subCategory || null,
          tags: predefinedTemplate.targetRoles.join(', '),
          isActive: true,
          isPublic: false,
          isTemplate: false,
          questionCount: 0,
          usageCount: 0,
        })
        .returning();

      return NextResponse.json({
        success: true,
        data: newBank,
        message: `Question bank created from template: ${predefinedTemplate.name}`
      });
    } else {
      // Create from database template
      const templateData = template[0];
      const [newBank] = await db
        .insert(questionBanks)
        .values({
          companyId: session.user.companyId,
          createdBy: session.user.id,
          name: customName || templateData.name,
          description: customDescription || templateData.description,
          category: templateData.category,
          subCategory: templateData.subCategory,
          tags: templateData.targetRoles || '',
          isActive: true,
          isPublic: false,
          isTemplate: false,
          questionCount: 0,
          usageCount: 0,
        })
        .returning();

      return NextResponse.json({
        success: true,
        data: newBank,
        message: `Question bank created from template: ${templateData.name}`
      });
    }

  } catch (error) {
    console.error('Error creating question bank from template:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to create question bank from template';
    
    if (error instanceof Error) {
      if (error.message.includes('uuid')) {
        errorMessage = 'Invalid template ID format';
      } else if (error.message.includes('duplicate')) {
        errorMessage = 'A question bank with this name already exists';
      } else if (error.message.includes('foreign key')) {
        errorMessage = 'Invalid company or user reference';
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}