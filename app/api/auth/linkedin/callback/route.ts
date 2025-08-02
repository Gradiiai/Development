import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';
import { linkedinIntegrations } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('LinkedIn OAuth error:', error);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/linkedin?error=oauth_error&message=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/linkedin?error=missing_params`
      );
    }

    // Decode and validate state
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch (e) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/linkedin?error=invalid_state`
      );
    }

    const { companyId, userId, timestamp } = stateData;

    // Check if state is not too old (5 minutes)
    if (Date.now() - timestamp > 5 * 60 * 1000) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/linkedin?error=expired_state`
      );
    }

    // Exchange authorization code for access token
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/linkedin/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/linkedin?error=config_missing`
      );
    }

    // Request access token from LinkedIn
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('LinkedIn token exchange failed:', errorData);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/linkedin?error=token_exchange_failed`
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, expires_in, scope } = tokenData;

    // Get LinkedIn profile information using OpenID Connect userinfo endpoint
    // https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2
    const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    if (!profileResponse.ok) {
      console.error('Failed to fetch LinkedIn profile');
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/linkedin?error=profile_fetch_failed`
      );
    }

    const profileData = await profileResponse.json();
    
    // Extract profile information from OpenID Connect userinfo response
    const profileId = profileData.sub;
    const profileName = profileData.name || `${profileData.given_name || ''} ${profileData.family_name || ''}`.trim();
    const profileEmail = profileData.email || '';

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + (expires_in * 1000));

    // Store or update LinkedIn integration in database
    const existingIntegration = await db
      .select()
      .from(linkedinIntegrations)
      .where(eq(linkedinIntegrations.companyId, companyId))
      .limit(1);

    if (existingIntegration.length > 0) {
      // Update existing integration
      await db
        .update(linkedinIntegrations)
        .set({
          accessToken: access_token,
          expiresAt,
          scope,
          profileId,
          profileName,
          profileEmail,
          isActive: true,
          lastUsedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(linkedinIntegrations.companyId, companyId));
    } else {
      // Create new integration
      await db
        .insert(linkedinIntegrations)
        .values({
          companyId,
          accessToken: access_token,
          expiresAt,
          scope,
          profileId,
          profileName,
          profileEmail,
          isActive: true,
          lastUsedAt: new Date(),
          createdBy: userId,
        });
    }

    // Redirect back to LinkedIn dashboard with success
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/linkedin?success=connected`
    );

  } catch (error) {
    console.error('Error in LinkedIn callback:', error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/linkedin?error=internal_error`
    );
  }
}