import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-candidate';
import { db } from '@/lib/database/connection';
import { candidateUsers, candidateDocuments } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';

export async function DELETE(
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

    // Check if document exists and belongs to this candidate
    const [document] = await db
      .select()
      .from(candidateDocuments)
      .where(
        and(
          eq(candidateDocuments.id, documentId),
          eq(candidateDocuments.candidateId, candidateUser[0].id)
        )
      );

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Delete the document
    await db
      .delete(candidateDocuments)
      .where(
        and(
          eq(candidateDocuments.id, documentId),
          eq(candidateDocuments.candidateId, candidateUser[0].id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
    const body = await request.json();

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

    // Check if document exists and belongs to this candidate
    const [document] = await db
      .select()
      .from(candidateDocuments)
      .where(
        and(
          eq(candidateDocuments.id, documentId),
          eq(candidateDocuments.candidateId, candidateUser[0].id)
        )
      );

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.isPublic !== undefined) {
      updateData.isPublic = body.isPublic;
    }

    if (body.description !== undefined) {
      updateData.description = body.description;
    }

    if (body.tags !== undefined) {
      updateData.tags = JSON.stringify(body.tags);
    }

    if (body.documentName !== undefined) {
      updateData.documentName = body.documentName;
    }

    // Update the document
    const [updatedDocument] = await db
      .update(candidateDocuments)
      .set(updateData)
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
    };

    return NextResponse.json(transformedDocument);
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}