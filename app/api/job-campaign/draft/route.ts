import { NextRequest, NextResponse } from 'next/server';
import { JobCampaignService } from '@/lib/services/jobCampaignService';
import { withAPIMiddleware } from '@/lib/api/middleware/base';
import { getServerSessionWithAuth } from '@/auth';

// GET - Load job campaign draft
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

      const draft = await JobCampaignService.loadDraft(session.user.id);
      
      return NextResponse.json({
        success: true,
        data: draft,
      });
    } catch (error) {
      console.error('Error loading job campaign draft:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to load draft' },
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

// POST - Save job campaign draft
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
      const { draft } = body;

      if (!draft) {
        return NextResponse.json(
          { success: false, error: 'Draft data is required' },
          { status: 400 }
        );
      }

      await JobCampaignService.saveDraft(session.user.id, draft);
      
      return NextResponse.json({
        success: true,
        message: 'Draft saved successfully',
      });
    } catch (error) {
      console.error('Error saving job campaign draft:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to save draft' },
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

// DELETE - Clear job campaign draft
export const DELETE = withAPIMiddleware(
  async (request: NextRequest) => {
    try {
      const session = await getServerSessionWithAuth();
      if (!session?.user?.id) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }

      await JobCampaignService.clearDraft(session.user.id);
      
      return NextResponse.json({
        success: true,
        message: 'Draft cleared successfully',
      });
    } catch (error) {
      console.error('Error clearing job campaign draft:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to clear draft' },
        { status: 500 }
      );
    }
  },
  {
    requireAuth: true,
    rateLimit: {
      requests: 20,
      windowMs: 60 * 1000, // 1 minute
    },
  }
);