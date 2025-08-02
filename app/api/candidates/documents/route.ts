import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-candidate';
import { db } from '@/lib/database/connection';
import { candidateUsers, candidateDocuments } from '@/lib/database/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Get the candidate session
    const session = await auth();
    
    console.log('Documents API - Session:', session);
    
    if (!session || !session.user?.email) {
      console.log('Documents API - No session or email');
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Ensure the user has candidate role
    if (session.user.role !== "candidate") {
      console.log('Documents API - Invalid role:', session.user.role);
      return NextResponse.json(
        { success: false, error: "Access denied. Candidate role required." },
        { status: 403 }
      );
    }

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

    // Get documents for this candidate
    const documents = await db
      .select()
      .from(candidateDocuments)
      .where(eq(candidateDocuments.candidateId, candidateUser[0].id))
      .orderBy(desc(candidateDocuments.uploadedAt));

    // Transform the data to match the frontend interface
    const transformedDocuments = documents.map(doc => ({
      id: doc.id,
      name: doc.documentName,
      type: doc.fileType,
      size: doc.fileSize,
      url: doc.fileUrl,
      uploadedAt: doc.uploadedAt,
      status: 'active',
      description: doc.description,
      tags: doc.tags ? JSON.parse(doc.tags) : [],
      documentType: doc.documentType,
      originalFileName: doc.originalFileName,
      version: doc.version,
      isDefault: doc.isDefault,
    }));

    return NextResponse.json(transformedDocuments);
  } catch (error) {
    console.error('Error fetching candidate documents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { documentName, documentType, fileType, fileSize, fileUrl, description, tags } = body;

    if (!documentName || !fileType || !fileUrl) {
      return NextResponse.json(
        { error: 'Document name, file type, and file URL are required' },
        { status: 400 }
      );
    }

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

    // Create new document record
    const [newDocument] = await db
      .insert(candidateDocuments)
      .values({
        candidateId: candidateUser[0].id,
        documentType: documentType || 'other',
        documentName,
        originalFileName: documentName,
        fileUrl,
        fileSize: fileSize || 0,
        fileType,
        description: description || '',
        tags: tags ? JSON.stringify(tags) : null,
        version: 1,
        isDefault: false,
        isPublic: true,
        uploadedAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Transform the response
    const transformedDocument = {
      id: newDocument.id,
      name: newDocument.documentName,
      type: newDocument.fileType,
      size: newDocument.fileSize,
      url: newDocument.fileUrl,
      uploadedAt: newDocument.uploadedAt,
      status: 'active',
      description: newDocument.description,
      tags: newDocument.tags ? JSON.parse(newDocument.tags) : [],
      documentType: newDocument.documentType,
      originalFileName: newDocument.originalFileName,
      version: newDocument.version,
      isDefault: newDocument.isDefault,
    };

    return NextResponse.json(transformedDocument, { status: 201 });
  } catch (error) {
    console.error('Error creating document record:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

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

    // Verify document belongs to candidate and delete
    const deletedDocument = await db
      .delete(candidateDocuments)
      .where(
        eq(candidateDocuments.id, documentId)
      )
      .returning();

    if (!deletedDocument.length) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}