import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { apiTokens, companies } from '@/lib/database/schema';
import { eq, and, desc } from 'drizzle-orm';
import { logAdminActivity } from '@/lib/admin/admin-activity-logger';
import { z } from 'zod';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';



// PATCH - Regenerate or update token status
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.id || !['super-admin', 'company'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tokenId, action } = body;

    if (!tokenId || !action) {
      return NextResponse.json(
        { error: 'Token ID and action are required' },
        { status: 400 }
      );
    }

    // Check if token exists and user has permission
    const existingToken = await db
      .select()
      .from(apiTokens)
      .where(eq(apiTokens.id, tokenId))
      .limit(1);

    if (existingToken.length === 0) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (session.user.role !== 'super-admin' && existingToken[0].companyId !== session.user.companyId) {
      return NextResponse.json(
        { error: 'You can only modify tokens for your own company' },
        { status: 403 }
      );
    }

    let updatedToken;
    let responseData: any = { message: '' };

    switch (action) {
      case 'regenerate':
        // Generate new token
        const newTokenValue = `iai_${crypto.randomBytes(32).toString('hex')}`;
        const newTokenHash = await bcrypt.hash(newTokenValue, 12);
        
        updatedToken = await db
          .update(apiTokens)
          .set({
            hashedToken: newTokenHash,
            updatedAt: new Date(),
          })
          .where(eq(apiTokens.id, tokenId))
          .returning();

        responseData = {
          message: 'API token regenerated successfully',
          token: {
            ...updatedToken[0],
            token: newTokenValue,
            hashedToken: undefined,
          },
          warning: 'Store this token securely. You will not be able to see it again.',
        };

        await logAdminActivity({
          userId: session.user.id,
          activityType: 'api_token_regenerated',
          description: `Regenerated API token: ${existingToken[0].name}`,
          metadata: {
            tokenId: existingToken[0].id,
            companyId: existingToken[0].companyId,
          }
        });
        break;

      case 'activate':
        updatedToken = await db
          .update(apiTokens)
          .set({
            isActive: true,
            updatedAt: new Date(),
          })
          .where(eq(apiTokens.id, tokenId))
          .returning();

        responseData = {
          message: 'API token activated successfully',
          token: { ...updatedToken[0], hashedToken: undefined },
        };

        await logAdminActivity({
          userId: session.user.id,
          activityType: 'api_token_activated',
          description: `Activated API token: ${existingToken[0].name}`,
          metadata: {
            tokenId: existingToken[0].id,
            companyId: existingToken[0].companyId,
          }
        });
        break;

      case 'deactivate':
        updatedToken = await db
          .update(apiTokens)
          .set({
            isActive: false,
            updatedAt: new Date(),
          })
          .where(eq(apiTokens.id, tokenId))
          .returning();

        responseData = {
          message: 'API token deactivated successfully',
          token: { ...updatedToken[0], hashedToken: undefined },
        };

        await logAdminActivity({
          userId: session.user.id,
          activityType: 'api_token_deactivated',
          description: `Deactivated API token: ${existingToken[0].name}`,
          metadata: {
            tokenId: existingToken[0].id,
            companyId: existingToken[0].companyId,
          }
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: regenerate, activate, deactivate' },
          { status: 400 }
        );
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error updating API token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

const tokenSchema = z.object({
  name: z.string().min(1, 'Token name is required'),
  description: z.string().optional(),
  permissions: z.array(z.enum([
    'jobs:read',
    'jobs:write',
    'candidates:read',
    'candidates:write',
    'interviews:read',
    'interviews:write',
    'applications:read',
    'applications:write',
    'evaluations:read',
    'analytics:read'
  ])).min(1, 'At least one permission is required'),
  expiresAt: z.string().datetime().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  ipWhitelist: z.array(z.string()).optional(),
  companyId: z.string().optional(), // Allow super admins to specify target company
});

// POST - Create API token
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.id || !['super-admin', 'company'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = tokenSchema.parse(body);

    // Generate secure token
    const tokenValue = `iai_${crypto.randomBytes(32).toString('hex')}`;
    const hashedToken = await bcrypt.hash(tokenValue, 12);

    // Determine target company ID
    let targetCompanyId: string;
    if (session.user.role === 'super-admin' && validatedData.companyId) {
      // Super admin can specify any company
      targetCompanyId = validatedData.companyId;
    } else {
      // Other roles use their own company
      targetCompanyId = session.user.companyId!;
    }

    // Verify company exists
    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.id, targetCompanyId))
      .limit(1);

    if (company.length === 0) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Create token record
    const newToken = await db
      .insert(apiTokens)
      .values({
        name: validatedData.name,
        description: validatedData.description,
        hashedToken,
        permissions: validatedData.permissions,
        companyId: targetCompanyId,
        createdBy: session.user.id,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null,
        ipWhitelist: validatedData.ipWhitelist || [],
        isActive: true,
      })
      .returning();

    // Log admin activity
    await logAdminActivity({
      userId: session.user.id,
      activityType: 'api_token_created',
      description: `Created API token: ${validatedData.name}`,
      metadata: {
        tokenId: newToken[0].id,
        permissions: validatedData.permissions,
        companyId: targetCompanyId,
      }
    });

    return NextResponse.json({
      message: 'API token created successfully',
      token: {
        ...newToken[0],
        token: tokenValue, // Only return the actual token once
        hashedToken: undefined, // Don't return the hash
      },
      warning: 'Store this token securely. You will not be able to see it again.',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating API token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Retrieve API tokens
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.id || !['super-admin', 'company'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');

    // Build conditions array
    const conditions = [];
    
    // Apply filters based on user role
    if (session.user.role !== 'super-admin') {
      // Other users can only see their company's tokens
      conditions.push(eq(apiTokens.companyId, session.user.companyId!));
    }

    if (isActive !== null) {
      const activeFilter = isActive === 'true';
      conditions.push(eq(apiTokens.isActive, activeFilter));
    }

    // Build and execute query
    const queryBuilder = db
      .select({
        id: apiTokens.id,
        name: apiTokens.name,
        description: apiTokens.description,
        permissions: apiTokens.permissions,
        companyId: apiTokens.companyId,
        createdBy: apiTokens.createdBy,
        isActive: apiTokens.isActive,
        expiresAt: apiTokens.expiresAt,
        lastUsedAt: apiTokens.lastUsedAt,
        lastUsedIp: apiTokens.lastUsedIp,
        ipWhitelist: apiTokens.ipWhitelist,
        usageCount: apiTokens.usageCount,
        rateLimit: apiTokens.rateLimit,
        revokedAt: apiTokens.revokedAt,
        revokedBy: apiTokens.revokedBy,
        createdAt: apiTokens.createdAt,
        updatedAt: apiTokens.updatedAt,
      })
      .from(apiTokens)
      .orderBy(desc(apiTokens.createdAt));

    const tokens = conditions.length > 0 
      ? await queryBuilder.where(and(...conditions))
      : await queryBuilder;

    return NextResponse.json({ tokens });
  } catch (error) {
    console.error('Error fetching API tokens:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update API token
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.id || !['super-admin', 'company'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;
    const validatedData = tokenSchema.partial().parse(updateData);

    if (!id) {
      return NextResponse.json(
        { error: 'Token ID is required' },
        { status: 400 }
      );
    }

    // Check if token exists and user has permission
    const existingToken = await db
      .select()
      .from(apiTokens)
      .where(eq(apiTokens.id, id))
      .limit(1);

    if (existingToken.length === 0) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (session.user.role !== 'super-admin' && existingToken[0].companyId !== session.user.companyId) {
      return NextResponse.json(
        { error: 'You can only update tokens for your own company' },
        { status: 403 }
      );
    }

    // Update token
    const updatedToken = await db
      .update(apiTokens)
      .set({
        name: validatedData.name,
        description: validatedData.description,
        permissions: validatedData.permissions,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined,
        ipWhitelist: validatedData.ipWhitelist,
        updatedAt: new Date(),
      })
      .where(eq(apiTokens.id, id))
      .returning();

    // Log admin activity
    await logAdminActivity({
      userId: session.user.id,
      activityType: 'api_token_updated',
      description: `Updated API token: ${existingToken[0].name}`,
      metadata: {
        tokenId: existingToken[0].id,
        companyId: existingToken[0].companyId,
      }
    });

    // Don't return sensitive data
    const { hashedToken, ...safeToken } = updatedToken[0];

    return NextResponse.json({
      message: 'API token updated successfully',
      token: safeToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating API token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Revoke API token
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.id || !['super-admin', 'company'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tokenId } = body;

    if (!tokenId) {
      return NextResponse.json(
        { error: 'Token ID is required' },
        { status: 400 }
      );
    }

    // Check if token exists and user has permission
    const existingToken = await db
      .select()
      .from(apiTokens)
      .where(eq(apiTokens.id, tokenId))
      .limit(1);

    if (existingToken.length === 0) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (session.user.role !== 'super-admin' && existingToken[0].companyId !== session.user.companyId) {
      return NextResponse.json(
        { error: 'You can only revoke tokens for your own company' },
        { status: 403 }
      );
    }

    // Soft delete by marking as inactive
    await db
      .update(apiTokens)
      .set({
        isActive: false,
        revokedAt: new Date(),
        revokedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(apiTokens.id, tokenId));

    // Log admin activity
    await logAdminActivity({
      userId: session.user.id,
      activityType: 'api_token_revoked',
      description: `Revoked API token: ${existingToken[0].name}`,
      metadata: {
        tokenId: existingToken[0].id,
        companyId: existingToken[0].companyId,
      }
    });

    return NextResponse.json({
      message: 'API token revoked successfully',
    });
  } catch (error) {
    console.error('Error revoking API token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}