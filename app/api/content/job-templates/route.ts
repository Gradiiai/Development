import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import {
  getJobDescriptionTemplates,
  createJobDescriptionTemplate,
} from '@/lib/database/queries/campaigns';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const companyId = session.user.companyId;
    if (!companyId) {
      return NextResponse.json({ success: false, error: 'Company not found' }, { status: 400 });
    }

    const result = await getJobDescriptionTemplates(companyId);
    
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Error in GET /api/job-description-templates:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const companyId = session.user.companyId;
    const userId = session.user.id;
    
    if (!companyId || !userId) {
      return NextResponse.json({ success: false, error: 'Company or user not found' }, { status: 400 });
    }

    const body = await req.json();
    const { templateName, jobCategory, templateContent, placeholders, description, isDefault } = body;

    if (!templateName || !jobCategory || !templateContent) {
      return NextResponse.json(
        { success: false, error: 'Template name, job category, and content are required' },
        { status: 400 }
      );
    }

    const result = await createJobDescriptionTemplate({
      companyId,
      createdBy: userId,
      templateName,
      jobCategory,
      templateContent,
      placeholders,
      description,
      isDefault,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: result.data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/job-description-templates:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}