import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';
import { ssoConfigurations, users, companies } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import { XMLParser } from 'fast-xml-parser';
import crypto from 'crypto';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

// POST - SAML Assertion Consumer Service
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const formData = await request.formData();
    const samlResponse = formData.get('SAMLResponse') as string;

    if (!samlResponse) {
      return NextResponse.json(
        { error: 'Missing SAML response' },
        { status: 400 }
      );
    }

    // Get SAML configuration for the company
    const config = await db
      .select()
      .from(ssoConfigurations)
      .where(
        and(
          eq(ssoConfigurations.companyId, companyId),
          eq(ssoConfigurations.provider, 'saml'),
          eq(ssoConfigurations.isActive, true)
        )
      )
      .limit(1);

    if (config.length === 0) {
      return NextResponse.json(
        { error: 'SAML configuration not found or inactive' },
        { status: 404 }
      );
    }

    const samlConfig = config[0].configuration as any;

    // Decode SAML response
    const decodedResponse = Buffer.from(samlResponse, 'base64').toString('utf-8');
    
    // Parse XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      parseAttributeValue: false,
      trimValues: true,
    });
    
    const parsedResponse = parser.parse(decodedResponse);
    
    // Extract assertion from SAML response
    const response = parsedResponse['saml2p:Response'] || parsedResponse['samlp:Response'];
    if (!response) {
      return NextResponse.json(
        { error: 'Invalid SAML response format' },
        { status: 400 }
      );
    }

    const assertion = response['saml2:Assertion'] || response['saml:Assertion'];
    if (!assertion) {
      return NextResponse.json(
        { error: 'No assertion found in SAML response' },
        { status: 400 }
      );
    }

    // Extract user attributes
    const attributeStatement = assertion['saml2:AttributeStatement'] || assertion['saml:AttributeStatement'];
    const attributes = attributeStatement?.['saml2:Attribute'] || attributeStatement?.['saml:Attribute'] || [];
    
    const userAttributes: Record<string, string> = {};
    
    if (Array.isArray(attributes)) {
      attributes.forEach((attr: any) => {
        const name = attr['@_Name'];
        const value = attr['saml2:AttributeValue'] || attr['saml:AttributeValue'];
        if (name && value) {
          userAttributes[name] = typeof value === 'string' ? value : value['#text'] || '';
        }
      });
    } else if (attributes['@_Name']) {
      const name = attributes['@_Name'];
      const value = attributes['saml2:AttributeValue'] || attributes['saml:AttributeValue'];
      userAttributes[name] = typeof value === 'string' ? value : value['#text'] || '';
    }

    // Map attributes to user fields
    const attributeMapping = samlConfig.attributeMapping || {
      email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
      firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
      lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
    };

    const email = userAttributes[attributeMapping.email];
    const firstName = userAttributes[attributeMapping.firstName] || '';
    const lastName = userAttributes[attributeMapping.lastName] || '';

    if (!email) {
      return NextResponse.json(
        { error: 'Email not found in SAML response' },
        { status: 400 }
      );
    }

    // Check if user exists
    let user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user.length === 0) {
      // Create new user
      const newUser = await db
        .insert(users)
        .values({
          email,
          firstName,
          lastName,
          companyId,
          role: 'company', // Default role for SSO users
          isActive: true,
          emailVerified: new Date(), // SSO users are considered verified
        })
        .returning();
      
      user = newUser;
    } else {
      // Update existing user if needed
      await db
        .update(users)
        .set({
          firstName: firstName || user[0].firstName,
          lastName: lastName || user[0].lastName,
          lastLoginAt: new Date(),
        })
        .where(eq(users.id, user[0].id));
    }

    // Get company information
    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    // Create JWT token for session
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
    const token = await new SignJWT({
      sub: user[0].id,
      email: user[0].email,
      role: user[0].role,
      companyId: user[0].companyId,
      companyName: company[0]?.name || '',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set('next-auth.session-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    // Redirect to dashboard
    return NextResponse.redirect(
      new URL('/dashboard', process.env.NEXT_PUBLIC_APP_URL),
      { status: 302 }
    );
  } catch (error) {
    console.error('Error processing SAML response:', error);
    return NextResponse.redirect(
      new URL('/auth/signin?error=saml_error', process.env.NEXT_PUBLIC_APP_URL),
      { status: 302 }
    );
  }
}