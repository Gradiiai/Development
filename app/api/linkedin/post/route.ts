import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/database/connection';
import { linkedinIntegrations } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { content, campaignId } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: 'Post content is required' },
        { status: 400 }
      );
    }

    // Get LinkedIn integration
    const integration = await db
      .select()
      .from(linkedinIntegrations)
      .where(
        and(
          eq(linkedinIntegrations.companyId, session.user.companyId),
          eq(linkedinIntegrations.isActive, true)
        )
      )
      .limit(1);

    if (integration.length === 0) {
      return NextResponse.json(
        { error: 'LinkedIn account not connected. Please connect your LinkedIn account first.' },
        { status: 400 }
      );
    }

    const linkedinData = integration[0];

    // Check if token is expired
    const isExpired = new Date() >= new Date(linkedinData.expiresAt);

    if (isExpired) {
      // Mark as inactive if expired
      await db
        .update(linkedinIntegrations)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(linkedinIntegrations.id, linkedinData.id));

      return NextResponse.json(
        { error: 'LinkedIn token has expired. Please reconnect your LinkedIn account.' },
        { status: 400 }
      );
    }

    // Create LinkedIn post
    const postData = {
      author: `urn:li:person:${linkedinData.profileId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: content
          },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };

    // Post to LinkedIn
    const linkedinResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${linkedinData.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(postData)
    });

    if (!linkedinResponse.ok) {
      const errorData = await linkedinResponse.text();
      console.error('LinkedIn posting failed:', errorData);
      
      // Handle specific LinkedIn errors
      if (linkedinResponse.status === 401) {
        // Token is invalid, mark as inactive
        await db
          .update(linkedinIntegrations)
          .set({
            isActive: false,
            updatedAt: new Date(),
          })
          .where(eq(linkedinIntegrations.id, linkedinData.id));

        return NextResponse.json(
          { error: 'LinkedIn authentication expired. Please reconnect your LinkedIn account.' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to post to LinkedIn. Please try again.' },
        { status: 400 }
      );
    }

    const responseData = await linkedinResponse.json();

    // Update last used timestamp
    await db
      .update(linkedinIntegrations)
      .set({
        lastUsedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(linkedinIntegrations.id, linkedinData.id));

    return NextResponse.json({
      success: true,
      postId: responseData.id,
      message: 'Successfully posted to LinkedIn!'
    });

  } catch (error) {
    console.error('Error posting to LinkedIn:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}