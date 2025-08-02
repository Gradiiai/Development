import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { db } from '@/lib/database/connection';
import { interviewTemplates } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/interview-templates/[id]
 * 
 * Returns a specific interview template by ID
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const id = params.id;
    
    // Query the database for the template
    const template = await db.select()
      .from(interviewTemplates)
      .where(eq(interviewTemplates.id, id))
      .limit(1);

    if (template.length === 0) {
      return NextResponse.json({ success: false, error: 'Interview template not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: template[0]
    });
  } catch (error) {
    console.error('Error in GET /api/interview-templates/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch interview template' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/interview-templates/[id]
 * 
 * Updates an existing interview template
 */
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    // Only admin users can update templates
    if (session.user.role !== 'company' && session.user.role !== 'super-admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    
    const id = params.id;
    const body = await req.json();
    
    // Check if template exists
    const existingTemplate = await db.select()
      .from(interviewTemplates)
      .where(eq(interviewTemplates.id, id))
      .limit(1);
      
    if (existingTemplate.length === 0) {
      return NextResponse.json({ success: false, error: 'Interview template not found' }, { status: 404 });
    }
    
    // Update the template
    const [updatedTemplate] = await db
      .update(interviewTemplates)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(interviewTemplates.id, id))
      .returning();
    
    return NextResponse.json({ success: true, data: updatedTemplate });
  } catch (error) {
    console.error('Error in PUT /api/interview-templates/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update interview template' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/interview-templates/[id]
 * 
 * Deletes an interview template
 */
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    // Only admin users can delete templates
    if (session.user.role !== 'company' && session.user.role !== 'super-admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    
    const id = params.id;
    
    // Check if template exists
    const existingTemplate = await db.select()
      .from(interviewTemplates)
      .where(eq(interviewTemplates.id, id))
      .limit(1);
      
    if (existingTemplate.length === 0) {
      return NextResponse.json({ success: false, error: 'Interview template not found' }, { status: 404 });
    }
    
    // Delete the template
    await db
      .delete(interviewTemplates)
      .where(eq(interviewTemplates.id, id));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/interview-templates/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete interview template' },
      { status: 500 }
    );
  }
}