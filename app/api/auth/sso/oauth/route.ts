import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { companies, ssoConfigurations } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const oauthConfigSchema = z.object({
  companyId: z.string(),
  provider: z.enum(['google', 'microsoft', 'github']),
  clientId: z.string(),
  clientSecret: z.string(),
  scopes: z.array(z.string()).default(['openid', 'email', 'profile']),
  redirectUri: z.string().url().optional(),
  isActive: z.boolean().default(true),
});

// POST - Configure OAuth SSO for a company
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
    const validatedData = oauthConfigSchema.parse(body);

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

    // Check if OAuth config already exists for this provider
    const existingConfig = await db
      .select()
      .from(ssoConfigurations)
      .where(eq(ssoConfigurations.companyId, validatedData.companyId))
      .limit(1);

    if (existingConfig.length > 0 && existingConfig[0].provider === validatedData.provider) {
      return NextResponse.json(
        { error: `${validatedData.provider} OAuth configuration already exists for this company` },
        { status: 409 }
      );
    }

    // Set default redirect URI if not provided
    const redirectUri = validatedData.redirectUri || 
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/sso/oauth/callback/${validatedData.provider}/${validatedData.companyId}`;

    // Create OAuth configuration
    const newConfig = await db
      .insert(ssoConfigurations)
      .values({
        companyId: validatedData.companyId,
        provider: validatedData.provider,
        configuration: {
          clientId: validatedData.clientId,
          clientSecret: validatedData.clientSecret,
          scopes: validatedData.scopes,
          redirectUri,
          authUrl: getAuthUrl(validatedData.provider),
          tokenUrl: getTokenUrl(validatedData.provider),
          userInfoUrl: getUserInfoUrl(validatedData.provider),
        },
        isActive: validatedData.isActive,
      })
      .returning();

    // Don't return sensitive data
    const { configuration, ...safeConfig } = newConfig[0];
    const { clientSecret, ...safeConfiguration } = configuration as any;

    return NextResponse.json({
      message: `${validatedData.provider} OAuth SSO configuration created successfully`,
      config: {
        ...safeConfig,
        configuration: safeConfiguration,
      },
      authUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/sso/oauth/authorize/${validatedData.provider}/${validatedData.companyId}`,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating OAuth SSO configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Retrieve OAuth configurations
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
    const provider = searchParams.get('provider');

    // Build conditions array
    const conditions = [eq(ssoConfigurations.provider, provider || 'google')];
    
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

    // Remove sensitive data
    const safeConfigs = configs.map(config => {
      const { configuration, ...rest } = config;
      const { clientSecret, ...safeConfiguration } = configuration as any;
      return {
        ...rest,
        configuration: safeConfiguration,
      };
    });

    return NextResponse.json({ configs: safeConfigs });
  } catch (error) {
    console.error('Error fetching OAuth configurations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update OAuth configuration
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
    const validatedData = oauthConfigSchema.partial().parse(updateData);

    if (!id) {
      return NextResponse.json(
        { error: 'Configuration ID is required' },
        { status: 400 }
      );
    }

    // Get existing configuration
    const existingConfig = await db
      .select()
      .from(ssoConfigurations)
      .where(eq(ssoConfigurations.id, id))
      .limit(1);

    if (existingConfig.length === 0) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }

    const currentConfig = existingConfig[0].configuration as any;
    
    // Update configuration
    const updatedConfiguration = {
      ...currentConfig,
      ...(validatedData.clientId && { clientId: validatedData.clientId }),
      ...(validatedData.clientSecret && { clientSecret: validatedData.clientSecret }),
      ...(validatedData.scopes && { scopes: validatedData.scopes }),
      ...(validatedData.redirectUri && { redirectUri: validatedData.redirectUri }),
    };

    const updatedConfig = await db
      .update(ssoConfigurations)
      .set({
        configuration: updatedConfiguration,
        isActive: validatedData.isActive ?? existingConfig[0].isActive,
        updatedAt: new Date(),
      })
      .where(eq(ssoConfigurations.id, id))
      .returning();

    // Don't return sensitive data
    const { configuration, ...safeConfig } = updatedConfig[0];
    const { clientSecret, ...safeConfiguration } = configuration as any;

    return NextResponse.json({
      message: 'OAuth SSO configuration updated successfully',
      config: {
        ...safeConfig,
        configuration: safeConfiguration,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating OAuth SSO configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove OAuth configuration
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
      message: 'OAuth SSO configuration deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting OAuth SSO configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions for OAuth provider URLs
function getAuthUrl(provider: string): string {
  const urls = {
    google: 'https://accounts.google.com/o/oauth2/v2/auth',
    microsoft: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    github: 'https://github.com/login/oauth/authorize',
    linkedin: 'https://www.linkedin.com/oauth/v2/authorization',
  };
  return urls[provider as keyof typeof urls] || urls.google;
}

function getTokenUrl(provider: string): string {
  const urls = {
    google: 'https://oauth2.googleapis.com/token',
    microsoft: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    github: 'https://github.com/login/oauth/access_token',
    linkedin: 'https://www.linkedin.com/oauth/v2/accessToken',
  };
  return urls[provider as keyof typeof urls] || urls.google;
}

function getUserInfoUrl(provider: string): string {
  const urls = {
    google: 'https://www.googleapis.com/oauth2/v2/userinfo',
    microsoft: 'https://graph.microsoft.com/v1.0/me',
    github: 'https://api.github.com/user',
    linkedin: 'https://api.linkedin.com/v2/people/~',
  };
  return urls[provider as keyof typeof urls] || urls.google;
}