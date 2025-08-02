import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-candidate';
import { db } from '@/lib/database/connection';
import { candidateUsers, candidateDocuments } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the candidate session
    const session = await auth();
    
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Ensure the user has candidate role
    if (session.user.role !== "candidate") {
      return NextResponse.json(
        { success: false, error: "Access denied. Candidate role required." },
        { status: 403 }
      );
    }

    const { id: documentId } = await params;
    const candidateEmail = session.user.email;

    // Get candidate user
    const candidateUser = await db
      .select()
      .from(candidateUsers)
      .where(eq(candidateUsers.email, candidateEmail))
      .limit(1);

    if (!candidateUser.length) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      );
    }

    // Check if document exists, belongs to this candidate, and is a resume
    const [document] = await db
      .select()
      .from(candidateDocuments)
      .where(
        and(
          eq(candidateDocuments.id, documentId),
          eq(candidateDocuments.candidateId, candidateUser[0].id),
          eq(candidateDocuments.documentType, 'resume')
        )
      );

    if (!document) {
      return NextResponse.json(
        { error: 'Resume not found' },
        { status: 404 }
      );
    }

    // First, set all other resumes for this candidate to not be default
    await db
      .update(candidateDocuments)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(
        and(
          eq(candidateDocuments.candidateId, candidateUser[0].id),
          eq(candidateDocuments.documentType, 'resume')
        )
      );

    // Then set this resume as the primary/default one
    const [updatedDocument] = await db
      .update(candidateDocuments)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(
        and(
          eq(candidateDocuments.id, documentId),
          eq(candidateDocuments.candidateId, candidateUser[0].id)
        )
      )
      .returning();

    // Transform the response
    const transformedDocument = {
      id: updatedDocument.id,
      name: updatedDocument.documentName,
      type: updatedDocument.fileType,
      size: updatedDocument.fileSize,
      url: updatedDocument.fileUrl,
      uploadedAt: updatedDocument.uploadedAt,
      status: 'active',
      description: updatedDocument.description,
      tags: updatedDocument.tags ? JSON.parse(updatedDocument.tags) : [],
      documentType: updatedDocument.documentType,
      originalFileName: updatedDocument.originalFileName,
      version: updatedDocument.version,
      isDefault: updatedDocument.isDefault,
      isPublic: updatedDocument.isPublic,
      isPrimary: updatedDocument.isDefault, // Map isDefault to isPrimary for frontend
    };

    return NextResponse.json(transformedDocument);
  } catch (error) {
    console.error('Error setting primary resume:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}