import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';
import { ssoConfigurations } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

// GET - OAuth Authorization endpoint
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string; companyId: string }> }
) {
  try {
    const { provider, companyId } = await params;
    const { searchParams } = new URL(request.url);
    
    // Get OAuth configuration for the company and provider
    const config = await db
      .select()
      .from(ssoConfigurations)
      .where(
        and(
          eq(ssoConfigurations.companyId, companyId),
          eq(ssoConfigurations.provider, provider),
          eq(ssoConfigurations.isActive, true)
        )
      )
      .limit(1);

    if (config.length === 0) {
      return NextResponse.json(
        { error: 'OAuth configuration not found or inactive' },
        { status: 404 }
      );
    }

    const oauthConfig = config[0].configuration as any;
    
    // Generate state parameter for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    
    // Build authorization URL
    const authUrl = new URL(oauthConfig.authUrl);
    authUrl.searchParams.set('client_id', oauthConfig.clientId);
    authUrl.searchParams.set('redirect_uri', oauthConfig.redirectUri);
    authUrl.searchParams.set('scope', oauthConfig.scopes.join(' '));
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', `${state}:${companyId}`);
    
    // Add provider-specific parameters
    if (provider === 'google') {
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
    } else if (provider === 'microsoft') {
      authUrl.searchParams.set('response_mode', 'query');
    }

    // Store state in session/cookie for validation (in production, use Redis or database)
    const response = NextResponse.redirect(authUrl.toString());
    response.cookies.set(`oauth_state_${companyId}`, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error in OAuth authorization:', error);
    return NextResponse.redirect(
      new URL('/auth/signin?error=oauth_error', process.env.NEXT_PUBLIC_APP_URL!)
    );
  }
}