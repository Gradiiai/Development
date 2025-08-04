import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';
import { ssoConfigurations, users, companies } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import { SignJWT } from 'jose';
import { sessionManager } from '@/lib/redis';

// GET - OAuth Callback endpoint
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string; companyId: string }> }
) {
  try {
    const { provider, companyId } = await params;
    const { searchParams } = new URL(request.url);
    
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/auth/signin?error=oauth_${error}`, process.env.NEXT_PUBLIC_APP_URL!)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/auth/signin?error=missing_code_or_state', process.env.NEXT_PUBLIC_APP_URL!)
      );
    }

    // Validate state parameter using Redis
    const [receivedState, receivedCompanyId] = state.split(':');
    
    if (receivedCompanyId !== companyId) {
      return NextResponse.redirect(
        new URL('/auth/signin?error=invalid_company', process.env.NEXT_PUBLIC_APP_URL!)
      );
    }
    
    const stateValidation = await sessionManager.validateOAuthState(companyId, receivedState);
    
    if (!stateValidation.valid || stateValidation.provider !== provider) {
      return NextResponse.redirect(
        new URL('/auth/signin?error=invalid_state', process.env.NEXT_PUBLIC_APP_URL!)
      );
    }

    // Get OAuth configuration
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
      return NextResponse.redirect(
        new URL('/auth/signin?error=config_not_found', process.env.NEXT_PUBLIC_APP_URL!)
      );
    }

    const oauthConfig = config[0].configuration as any;

    // Exchange authorization code for access token
    const tokenResponse = await fetch(oauthConfig.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: oauthConfig.clientId,
        client_secret: oauthConfig.clientSecret,
        code,
        redirect_uri: oauthConfig.redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text());
      return NextResponse.redirect(
        new URL('/auth/signin?error=token_exchange_failed', process.env.NEXT_PUBLIC_APP_URL!)
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.redirect(
        new URL('/auth/signin?error=no_access_token', process.env.NEXT_PUBLIC_APP_URL!)
      );
    }

    // Get user information
    const userResponse = await fetch(oauthConfig.userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!userResponse.ok) {
      console.error('User info fetch failed:', await userResponse.text());
      return NextResponse.redirect(
        new URL('/auth/signin?error=user_info_failed', process.env.NEXT_PUBLIC_APP_URL!)
      );
    }

    const userData = await userResponse.json();
    
    // Extract user information based on provider
    const userInfo = extractUserInfo(provider, userData);
    
    if (!userInfo.email) {
      return NextResponse.redirect(
        new URL('/auth/signin?error=no_email', process.env.NEXT_PUBLIC_APP_URL!)
      );
    }

    // Check if user exists
    let user = await db
      .select()
      .from(users)
      .where(eq(users.email, userInfo.email))
      .limit(1);

    if (user.length === 0) {
      // Create new user
      const newUser = await db
        .insert(users)
        .values({
          email: userInfo.email,
          firstName: userInfo.firstName || '',
          lastName: userInfo.lastName || '',
          companyId,
          role: 'company', // Default role for OAuth users
          isActive: true,
          emailVerified: new Date(), // OAuth users are considered verified
          image: userInfo.picture,
        })
        .returning();
      
      user = newUser;
    } else {
      // Update existing user
      await db
        .update(users)
        .set({
          firstName: userInfo.firstName || user[0].firstName,
          lastName: userInfo.lastName || user[0].lastName,
          image: userInfo.picture || user[0].image,
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
    const response = NextResponse.redirect(
      new URL('/dashboard', process.env.NEXT_PUBLIC_APP_URL!)
    );
    
    response.cookies.set('next-auth.session-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    return NextResponse.redirect(
      new URL('/auth/signin?error=oauth_callback_error', process.env.NEXT_PUBLIC_APP_URL!)
    );
  }
}

// Helper function to extract user information based on provider
function extractUserInfo(provider: string, userData: any) {
  switch (provider) {
    case 'google':
      return {
        email: userData.email,
        firstName: userData.given_name || '',
        lastName: userData.family_name || '',
        picture: userData.picture,
      };
    
    case 'microsoft':
      return {
        email: userData.mail || userData.userPrincipalName,
        firstName: userData.givenName || '',
        lastName: userData.surname || '',
        picture: null, // Microsoft Graph doesn't provide picture in basic profile
      };
    
    case 'github':
      return {
        email: userData.email,
        firstName: userData.name?.split(' ')[0] || '',
        lastName: userData.name?.split(' ').slice(1).join(' ') || '',
        picture: userData.avatar_url,
      };
    
    default:
      return {
        email: userData.email,
        firstName: userData.given_name || userData.first_name || '',
        lastName: userData.family_name || userData.last_name || '',
        picture: userData.picture || userData.avatar_url,
      };
  }
}