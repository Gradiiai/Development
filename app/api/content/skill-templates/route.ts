import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from "@/auth";;
import {
  createSkillTemplate,
  getSkillTemplates
} from '@/lib/database/queries/campaigns';

// GET /api/skill-templates
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const companyId = session.user.companyId;
    
    // Check if companyId exists and is valid
    if (!companyId) {
      console.error('Error: User session missing companyId');
      return NextResponse.json({ success: true, data: [] }); // Return empty array instead of error
    }
    
    const jobCategory = searchParams.get('jobCategory') || undefined;

    const result = await getSkillTemplates(companyId, jobCategory);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/skill-templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch skill templates' },
      { status: 500 }
    );
  }
}

// POST /api/skill-templates
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const companyId = session.user.companyId;
    const userId = session.user.id || '';
    
    // Check if companyId exists and is valid
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'User session missing company information' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.templateName || !body.jobCategory || !body.skills || body.skills.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate skills format
    const validSkills = body.skills.filter((skill: any) => 
      skill && typeof skill === 'object' && skill.name && skill.level
    );

    if (validSkills.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one valid skill is required' },
        { status: 400 }
      );
    }

    const templateData = {
      companyId,
      createdBy: userId,
      templateName: body.templateName,
      jobCategory: body.jobCategory,
      skills: validSkills,
      jobDuties: body.jobDuties || undefined,
      isDefault: body.isDefault || false,
    };

    const result = await createSkillTemplate(templateData);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in POST /api/skill-templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create skill template' },
      { status: 500 }
    );
  }
}