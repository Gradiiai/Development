import { NextRequest, NextResponse } from 'next/server';
import { JobCampaignService } from '@/lib/services/jobCampaignService';
import { withAPIMiddleware } from '@/lib/api/middleware/base';
import { getServerSessionWithAuth } from '@/auth';

// GET - Get current job campaign ID
export const GET = withAPIMiddleware(
  async (request: NextRequest) => {
    try {
      const session = await getServerSessionWithAuth();
      if (!session?.user?.id) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const campaignId = await JobCampaignService.getCurrentCampaignId(session.user.id);
      
      return NextResponse.json({
        success: true,
        data: { campaignId },
      });
    } catch (error) {
      console.error('Error getting current job campaign ID:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to get current campaign ID' },
        { status: 500 }
      );
    }
  },
  {
    requireAuth: true,
    rateLimit: {
      requests: 100,
      windowMs: 60 * 1000, // 1 minute
    },
  }
);

// POST - Set current job campaign ID
export const POST = withAPIMiddleware(
  async (request: NextRequest) => {
    try {
      const session = await getServerSessionWithAuth();
      if (!session?.user?.id) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const body = await request.json();
      const { campaignId } = body;

      if (!campaignId || typeof campaignId !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Valid campaign ID is required' },
          { status: 400 }
        );
      }

      await JobCampaignService.setCurrentCampaignId(session.user.id, campaignId);
      
      return NextResponse.json({
        success: true,
        message: 'Current campaign ID set successfully',
      });
    } catch (error) {
      console.error('Error setting current job campaign ID:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to set current campaign ID' },
        { status: 500 }
      );
    }
  },
  {
    requireAuth: true,
    rateLimit: {
      requests: 50,
      windowMs: 60 * 1000, // 1 minute
    },
  }
);