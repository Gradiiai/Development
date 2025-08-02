import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-candidate';
import { db } from '@/lib/database/connection';
import { candidateUsers, candidateDocuments } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import { azureStorageService } from '@/lib/integrations/storage/azure';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get candidate user
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

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('documentType') as string || 'other';
    const description = formData.get('description') as string || '';
    const isPrimary = formData.get('isPrimary') === 'true';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type and size
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 400 }
      );
    }

    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size too large (max 10MB)' },
        { status: 400 }
      );
    }

    const candidateId = candidateUser[0].id;

    // Upload to Azure with new folder structure
    const uploadResult = await azureStorageService.uploadCandidateDocument(
      file,
      candidateId,
      documentType as 'resume' | 'cover_letter' | 'certificate' | 'portfolio' | 'transcript' | 'other',
      isPrimary
    );

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      );
    }

    // If this is a primary resume, update other resumes to not be primary
    if (isPrimary && documentType === 'resume') {
      await db
        .update(candidateDocuments)
        .set({ isDefault: false })
        .where(eq(candidateDocuments.candidateId, candidateId));
    }

    // Save file record to database
    const [newDocument] = await db
      .insert(candidateDocuments)
      .values({
        candidateId,
        documentType,
        documentName: file.name,
        originalFileName: file.name,
        fileUrl: uploadResult.url,
        fileSize: file.size,
        fileType: file.type,
        description,
        tags: null,
        version: 1,
        isDefault: isPrimary,
        isPublic: true,
        uploadedAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Transform the response to match frontend interface
    const transformedDocument = {
      id: newDocument.id,
      name: newDocument.documentName,
      type: newDocument.fileType,
      size: newDocument.fileSize,
      url: newDocument.fileUrl,
      uploadDate: newDocument.uploadedAt,
      status: 'active',
      description: newDocument.description,
      tags: [],
      documentType: newDocument.documentType,
      originalFileName: newDocument.originalFileName,
      version: newDocument.version,
      isPrimary: newDocument.isDefault,
    };

    return NextResponse.json(transformedDocument, { status: 201 });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}