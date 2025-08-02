import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { companies, ssoConfigurations } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import crypto from 'crypto';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

const samlConfigSchema = z.object({
  companyId: z.string(),
  entityId: z.string(),
  ssoUrl: z.string().url(),
  x509Certificate: z.string(),
  attributeMapping: z.object({
    email: z.string().default('http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'),
    firstName: z.string().default('http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'),
    lastName: z.string().default('http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'),
  }).optional(),
  isActive: z.boolean().default(true),
});

// POST - Configure SAML SSO for a company
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.id || session.user.role !== 'super-admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Super admin access required.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = samlConfigSchema.parse(body);

    // Verify company exists
    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.id, validatedData.companyId))
      .limit(1);

    if (company.length === 0) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Check if SAML config already exists
    const existingConfig = await db
      .select()
      .from(ssoConfigurations)
      .where(eq(ssoConfigurations.companyId, validatedData.companyId))
      .limit(1);

    if (existingConfig.length > 0) {
      return NextResponse.json(
        { error: 'SSO configuration already exists for this company' },
        { status: 409 }
      );
    }

    // Create SAML configuration
    const newConfig = await db
      .insert(ssoConfigurations)
      .values({
        companyId: validatedData.companyId,
        provider: 'saml',
        configuration: {
          entityId: validatedData.entityId,
          ssoUrl: validatedData.ssoUrl,
          x509Certificate: validatedData.x509Certificate,
          attributeMapping: validatedData.attributeMapping || {
            email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
            firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
            lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
          },
        },
        isActive: validatedData.isActive,
      })
      .returning();

    return NextResponse.json({
      message: 'SAML SSO configuration created successfully',
      config: newConfig[0],
      metadata: {
        entityId: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/sso/saml/metadata/${validatedData.companyId}`,
        acsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/sso/saml/acs/${validatedData.companyId}`,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating SAML SSO configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Retrieve SAML configurations
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
    const companyId = searchParams.get('companyId');

    // Build conditions array
    const conditions = [eq(ssoConfigurations.provider, 'saml')];
    
    if (companyId) {
      conditions.push(eq(ssoConfigurations.companyId, companyId));
    }

    const configs = await db
      .select({
        id: ssoConfigurations.id,
        companyId: ssoConfigurations.companyId,
        provider: ssoConfigurations.provider,
        configuration: ssoConfigurations.configuration,
        isActive: ssoConfigurations.isActive,
        createdAt: ssoConfigurations.createdAt,
        companyName: companies.name,
      })
      .from(ssoConfigurations)
      .leftJoin(companies, eq(ssoConfigurations.companyId, companies.id))
      .where(conditions.length > 1 ? and(...conditions) : conditions[0]);

    return NextResponse.json({ configs });
  } catch (error) {
    console.error('Error fetching SAML configurations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update SAML configuration
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.id || session.user.role !== 'super-admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Super admin access required.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;
    const validatedData = samlConfigSchema.partial().parse(updateData);

    if (!id) {
      return NextResponse.json(
        { error: 'Configuration ID is required' },
        { status: 400 }
      );
    }

    const updatedConfig = await db
      .update(ssoConfigurations)
      .set({
        configuration: validatedData.entityId || validatedData.ssoUrl || validatedData.x509Certificate || validatedData.attributeMapping
          ? {
              entityId: validatedData.entityId,
              ssoUrl: validatedData.ssoUrl,
              x509Certificate: validatedData.x509Certificate,
              attributeMapping: validatedData.attributeMapping,
            }
          : undefined,
        isActive: validatedData.isActive,
        updatedAt: new Date(),
      })
      .where(eq(ssoConfigurations.id, id))
      .returning();

    if (updatedConfig.length === 0) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'SAML SSO configuration updated successfully',
      config: updatedConfig[0],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating SAML SSO configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove SAML configuration
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Configuration ID is required' },
        { status: 400 }
      );
    }

    const deletedConfig = await db
      .delete(ssoConfigurations)
      .where(eq(ssoConfigurations.id, id))
      .returning();

    if (deletedConfig.length === 0) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'SAML SSO configuration deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting SAML SSO configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}