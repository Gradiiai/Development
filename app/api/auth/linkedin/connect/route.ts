import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // LinkedIn OAuth configuration
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/linkedin/callback`;
    
    if (!clientId) {
      return NextResponse.json(
        { error: 'LinkedIn integration is not configured. Please contact your administrator.' },
        { status: 500 }
      );
    }

    // LinkedIn OpenID Connect scopes as per Microsoft documentation
    // https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2
    const scopes = [
      'openid',
      'profile', 
      'email',
      'w_member_social'
    ].join(' ');

    // Generate state parameter for security (include company ID)
    const state = Buffer.from(JSON.stringify({
      companyId: session.user.companyId,
      userId: session.user.id,
      timestamp: Date.now()
    })).toString('base64');

    // Build LinkedIn authorization URL
    const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('scope', scopes);

    return NextResponse.json({
      authUrl: authUrl.toString()
    });

  } catch (error) {
    console.error('Error initiating LinkedIn connection:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}