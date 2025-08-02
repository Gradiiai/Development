import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';
import { companies, ssoConfigurations } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';

// POST - Detect company SSO configuration by email domain
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    // Extract domain from email
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Find company by domain
    const company = await db
      .select({
        id: companies.id,
        name: companies.name,
        domain: companies.domain,
      })
      .from(companies)
      .where(eq(companies.domain, domain))
      .limit(1);

    if (company.length === 0) {
      return NextResponse.json({
        hasSSO: false,
        message: 'No company found for this domain'
      });
    }

    // Check for active SSO configurations
    const ssoConfigs = await db
      .select({
        id: ssoConfigurations.id,
        provider: ssoConfigurations.provider,
        isActive: ssoConfigurations.isActive,
      })
      .from(ssoConfigurations)
      .where(
        and(
          eq(ssoConfigurations.companyId, company[0].id),
          eq(ssoConfigurations.isActive, true)
        )
      );

    if (ssoConfigs.length === 0) {
      return NextResponse.json({
        hasSSO: false,
        company: company[0],
        message: 'No active SSO configuration found for this company'
      });
    }

    // Return SSO options
    const ssoProviders = ssoConfigs.map(config => ({
      provider: config.provider,
      loginUrl: config.provider === 'saml' 
        ? `/api/auth/sso/saml/login/${company[0].id}`
        : `/api/auth/sso/oauth/authorize/${config.provider}/${company[0].id}`
    }));

    return NextResponse.json({
      hasSSO: true,
      company: company[0],
      providers: ssoProviders,
      message: 'SSO available for this domain'
    });

  } catch (error) {
    console.error('Error in domain detection:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get all companies with SSO enabled (for discovery)
export async function GET() {
  try {
    const companiesWithSSO = await db
      .select({
        id: companies.id,
        name: companies.name,
        domain: companies.domain,
      })
      .from(companies)
      .innerJoin(
        ssoConfigurations,
        and(
          eq(companies.id, ssoConfigurations.companyId),
          eq(ssoConfigurations.isActive, true)
        )
      );

    return NextResponse.json({
      companies: companiesWithSSO
    });

  } catch (error) {
    console.error('Error fetching companies with SSO:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}