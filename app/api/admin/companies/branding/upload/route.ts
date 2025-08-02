import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { companyBranding, companies, fileStorage } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import { logAdminActivity } from '@/lib/admin/admin-activity-logger';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/webp'];
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'branding');

// POST - Upload company logo or favicon
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.id || session.user.role !== 'super-admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Super admin access required.' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const companyId = formData.get('companyId') as string;
    const fileType = formData.get('type') as string; // 'logo' or 'favicon'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }

    if (!fileType || !['logo', 'favicon'].includes(fileType)) {
      return NextResponse.json(
        { error: 'File type must be either "logo" or "favicon"' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, SVG, and WebP are allowed.' },
        { status: 400 }
      );
    }

    // Verify company exists
    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (company.length === 0) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Create upload directory if it doesn't exist
    try {
      await mkdir(UPLOAD_DIR, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore error
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const uniqueFilename = `${companyId}-${fileType}-${uuidv4()}.${fileExtension}`;
    const filePath = join(UPLOAD_DIR, uniqueFilename);
    const publicUrl = `/uploads/branding/${uniqueFilename}`;

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Save file record to database
    const fileRecord = await db
      .insert(fileStorage)
      .values({
        companyId,
        fileName: uniqueFilename,
        originalFileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        filePath,
        fileUrl: publicUrl,
        storageProvider: 'local',
        entityType: `company_${fileType}`,
        entityId: companyId,
        uploadedBy: session.user.id,
        isActive: true,
      })
      .returning();

    // Update company branding with new file URL
    const updateField = fileType === 'logo' ? 'logoUrl' : 'faviconUrl';
    
    // Check if branding record exists
    const existingBranding = await db
      .select()
      .from(companyBranding)
      .where(eq(companyBranding.companyId, companyId))
      .limit(1);

    if (existingBranding.length === 0) {
      // Create new branding record
      await db
        .insert(companyBranding)
        .values({
          companyId,
          [updateField]: publicUrl,
          isActive: true,
        });
    } else {
      // Update existing branding record
      await db
        .update(companyBranding)
        .set({
          [updateField]: publicUrl,
          updatedAt: new Date(),
        })
        .where(eq(companyBranding.companyId, companyId));
    }

    // Log admin activity
    await logAdminActivity({
      userId: session.user.id,
      activityType: 'company_branding_file_uploaded',
      description: `Uploaded ${fileType} for company ${company[0].name}`,
      metadata: { 
        companyId, 
        fileType, 
        fileName: file.name,
        fileSize: file.size,
        fileUrl: publicUrl
      }
    });

    return NextResponse.json({
      message: `${fileType.charAt(0).toUpperCase() + fileType.slice(1)} uploaded successfully`,
      fileUrl: publicUrl,
      fileName: uniqueFilename,
      originalFileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      fileRecord: fileRecord[0]
    }, { status: 201 });

  } catch (error) {
    console.error('Error uploading branding file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove uploaded file
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.id || session.user.role !== 'super-admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Super admin access required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const fileType = searchParams.get('type'); // 'logo' or 'favicon'

    if (!companyId || !fileType) {
      return NextResponse.json(
        { error: 'Company ID and file type are required' },
        { status: 400 }
      );
    }

    if (!['logo', 'favicon'].includes(fileType)) {
      return NextResponse.json(
        { error: 'File type must be either "logo" or "favicon"' },
        { status: 400 }
      );
    }

    // Verify company exists
    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (company.length === 0) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Get current branding to find file URL
    const branding = await db
      .select()
      .from(companyBranding)
      .where(eq(companyBranding.companyId, companyId))
      .limit(1);

    if (branding.length === 0) {
      return NextResponse.json(
        { error: 'No branding found for this company' },
        { status: 404 }
      );
    }

    const currentFileUrl = fileType === 'logo' ? branding[0].logoUrl : branding[0].faviconUrl;
    
    if (!currentFileUrl) {
      return NextResponse.json(
        { error: `No ${fileType} file found` },
        { status: 404 }
      );
    }

    // Update branding to remove file URL
    const updateField = fileType === 'logo' ? 'logoUrl' : 'faviconUrl';
    await db
      .update(companyBranding)
      .set({
        [updateField]: null,
        updatedAt: new Date(),
      })
      .where(eq(companyBranding.companyId, companyId));

    // Mark file as inactive in file storage
    await db
      .update(fileStorage)
      .set({
        isActive: false,
        deletedAt: new Date(),
      })
      .where(
        eq(fileStorage.companyId, companyId) &&
        eq(fileStorage.entityType, `company_${fileType}`)
      );

    // Note: We don't physically delete the file for audit purposes
    // In production, you might want to implement a cleanup job

    // Log admin activity
    await logAdminActivity({
      userId: session.user.id,
      activityType: 'company_branding_file_deleted',
      description: `Removed ${fileType} for company ${company[0].name}`,
      metadata: { companyId, fileType, removedFileUrl: currentFileUrl }
    });

    return NextResponse.json({
      message: `${fileType.charAt(0).toUpperCase() + fileType.slice(1)} removed successfully`
    });

  } catch (error) {
    console.error('Error deleting branding file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}