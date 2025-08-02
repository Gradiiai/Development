import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from "@/auth";;
import {
  updateSkillTemplate,
  deleteSkillTemplate
} from '@/lib/database/queries/campaigns';

// PUT /api/skill-templates/[id]
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSessionWithAuth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const id = params.id;
    const body = await req.json();

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
      templateName: body.templateName,
      jobCategory: body.jobCategory,
      skills: validSkills,
      jobDuties: body.jobDuties || undefined,
      isDefault: body.isDefault || false,
    };

    const result = await updateSkillTemplate(id, templateData);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in PUT /api/skill-templates/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update skill template' },
      { status: 500 }
    );
  }
}

// DELETE /api/skill-templates/[id]
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSessionWithAuth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const id = params.id;
    const result = await deleteSkillTemplate(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in DELETE /api/skill-templates/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete skill template' },
      { status: 500 }
    );
  }
}