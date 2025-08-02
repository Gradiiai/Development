import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/lib/database/connection';
import { interviewTemplates, companies, users } from '@/lib/database/schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * GET /api/interview-templates
 * 
 * Returns a list of interview templates from the database for use in interview setup
 * This endpoint is used to populate the templates dropdown in the interview setup page
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get templates from database for the company
    const companyId = session.user.companyId;
    
    // Directly query the database for templates
    const templates = await db.select()
      .from(interviewTemplates)
      .where(and(
        eq(interviewTemplates.companyId, companyId),
        eq(interviewTemplates.isActive, true)
      ))
      .orderBy(desc(interviewTemplates.createdAt));
    
    // If no templates exist, create default templates
    if (templates.length === 0) {
      // Get the first company and admin user for creating templates
      const firstCompany = await db.select().from(companies).limit(1);
      const firstAdmin = await db.select().from(users).where(eq(users.role, 'company')).limit(1);
      
      if (firstCompany.length === 0 || firstAdmin.length === 0) {
        return NextResponse.json({
          success: true,
          data: []
        });
      }
      
      // Define the templates to create
      const templateData = [
        {
          companyId,
          createdBy: session.user.id || '',
          templateName: 'Standard Behavioral Interview',
          description: 'Comprehensive technical assessment for software developers',
          jobCategory: 'software-engineering',
          interviewType: 'behavioral',
          difficultyLevel: 'medium',
          timeLimit: 45,
          questionIds: JSON.stringify(['1', '2', '3']), // Example question IDs
          instructions: 'This round focuses on technical knowledge and problem-solving skills.',
          isDefault: true,
          isActive: true
        },
        {
          companyId,
          createdBy: session.user.id || '',
          templateName: 'Senior Developer Interview',
          description: 'Advanced technical assessment for senior positions',
          jobCategory: 'software-engineering',
          interviewType: 'behavioral',
          difficultyLevel: 'hard',
          timeLimit: 90,
          questionIds: JSON.stringify(['4', '5', '6']), // Example question IDs
          instructions: 'This round focuses on advanced technical concepts and architecture.',
          isDefault: true,
          isActive: true
        },
        {
          companyId,
          createdBy: session.user.id || '',
          templateName: 'Frontend Developer Interview',
          description: 'Specialized assessment for frontend developers',
          jobCategory: 'frontend-development',
          interviewType: 'behavioral',
          difficultyLevel: 'medium',
          timeLimit: 45,
          questionIds: JSON.stringify(['7', '8', '9']), // Example question IDs
          instructions: 'This round tests your knowledge of frontend fundamentals.',
          isDefault: true,
          isActive: true
        }
      ];
      
      // Insert the templates
      const insertedTemplates = await db.insert(interviewTemplates).values(templateData).returning();
      
      // Transform the newly created templates to match the expected format for the frontend
      const formattedTemplates = insertedTemplates.map(template => {
        // Parse questionIds from JSON string if it exists
        const questionIds = template.questionIds ? JSON.parse(template.questionIds) : [];
        
        // Create a single round from the template data
        const round = {
          id: '1',
          name: template.templateName,
          type: template.interviewType,
          timeLimit: template.timeLimit,
          numberOfQuestions: questionIds.length,
          randomizeQuestions: true,
          difficultyLevel: template.difficultyLevel,
          passingScore: 70,
          instructions: template.instructions || '',
          isActive: template.isActive
        };
        
        return {
          id: template.id,
          name: template.templateName,
          description: template.description || '',
          rounds: [round]
        };
      });
      
      return NextResponse.json({
        success: true,
        data: formattedTemplates
      });
    }
    
    // Transform database templates to match the expected format for the frontend
    const formattedTemplates = templates.map(template => {
      // Parse questionIds from JSON string if it exists
      const questionIds = template.questionIds ? JSON.parse(template.questionIds) : [];
      
      // Create a single round from the template data
      const round = {
        id: '1',
        name: template.templateName,
        type: template.interviewType,
        timeLimit: template.timeLimit,
        numberOfQuestions: questionIds.length,
        randomizeQuestions: true,
        difficultyLevel: template.difficultyLevel,
        passingScore: 70,
        instructions: template.instructions || '',
        isActive: template.isActive
      };
      
      return {
        id: template.id,
        name: template.templateName,
        description: template.description || '',
        rounds: [round]
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedTemplates
    });
  } catch (error) {
    console.error('Error in GET /api/interview-templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch interview templates' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/interview-templates
 * 
 * Creates a new interview template in the database
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    // Only admin users can create templates
    if (session.user.role !== 'company' && session.user.role !== 'super-admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    
    const body = await req.json();
    
    // Validate required fields
    const requiredFields = ['templateName', 'jobCategory', 'interviewType', 'difficultyLevel', 'timeLimit'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ success: false, error: `Missing required field: ${field}` }, { status: 400 });
      }
    }
    
    // Create the template directly in the database
    const templateData = {
      companyId: session.user.companyId || '',
      createdBy: session.user.id || '',
      templateName: body.templateName,
      description: body.description,
      jobCategory: body.jobCategory,
      interviewType: body.interviewType,
      difficultyLevel: body.difficultyLevel,
      timeLimit: body.timeLimit,
      questionIds: body.questionIds ? JSON.stringify(body.questionIds) : undefined,
      instructions: body.instructions,
      isDefault: body.isDefault || false,
      isActive: body.isActive !== undefined ? body.isActive : true
    };
    
    try {
      const [template] = await db.insert(interviewTemplates).values(templateData).returning();
      return NextResponse.json({ success: true, data: template });
    } catch (dbError) {
      console.error('Error creating interview template:', dbError);
      return NextResponse.json({ success: false, error: 'Failed to create interview template' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in POST /api/interview-templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create interview template' },
      { status: 500 }
    );
  }
}