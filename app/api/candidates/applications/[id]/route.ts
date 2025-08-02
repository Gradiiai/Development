import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-candidate';
import { db } from '@/lib/database/connection';
import { candidateApplications, candidateUsers } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const applicationId = resolvedParams.id;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    // Get candidate user first
    const candidateUser = await db
      .select()
      .from(candidateUsers)
      .where(eq(candidateUsers.email, session.user.email))
      .limit(1);

    if (!candidateUser.length) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      );
    }

    // Verify the application belongs to the current candidate
    const application = await db
      .select()
      .from(candidateApplications)
      .where(
        and(
          eq(candidateApplications.id, applicationId),
          eq(candidateApplications.candidateId, candidateUser[0].id)
        )
      )
      .limit(1);

    if (!application.length) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Update the application status
    const [updatedApplication] = await db
      .update(candidateApplications)
      .set({
        status,
        lastUpdatedAt: new Date(),
      })
      .where(eq(candidateApplications.id, applicationId))
      .returning();

    return NextResponse.json(updatedApplication);
  } catch (error) {
    console.error('Error updating application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const applicationId = resolvedParams.id;

    // Get candidate user first
    const candidateUser = await db
      .select()
      .from(candidateUsers)
      .where(eq(candidateUsers.email, session.user.email))
      .limit(1);

    if (!candidateUser.length) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      );
    }

    // Verify the application belongs to the current candidate
    const application = await db
      .select()
      .from(candidateApplications)
      .where(
        and(
          eq(candidateApplications.id, applicationId),
          eq(candidateApplications.candidateId, candidateUser[0].id)
        )
      )
      .limit(1);

    if (!application.length) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Delete the application
    await db
      .delete(candidateApplications)
      .where(eq(candidateApplications.id, applicationId));

    return NextResponse.json({ message: 'Application deleted successfully' });
  } catch (error) {
    console.error('Error deleting application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}