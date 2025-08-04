import { NextRequest, NextResponse } from 'next/server';
import { JobCampaignService } from '@/lib/services/jobCampaignService';
import { withAPIMiddleware } from '@/lib/api/middleware/base';
import { getServerSessionWithAuth } from '@/auth';

// GET - Get complete job campaign state
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

      const state = await JobCampaignService.getJobCampaignState(session.user.id);
      
      return NextResponse.json({
        success: true,
        data: state,
      });
    } catch (error) {
      console.error('Error getting job campaign state:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to get campaign state' },
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

// PATCH - Update specific parts of job campaign state
export const PATCH = withAPIMiddleware(
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
      const { type, data } = body;

      if (!type || !data) {
        return NextResponse.json(
          { success: false, error: 'Type and data are required' },
          { status: 400 }
        );
      }

      switch (type) {
        case 'jobDetails':
          await JobCampaignService.updateJobDetails(session.user.id, data);
          break;
        case 'scoringParameters':
          await JobCampaignService.updateScoringParameters(session.user.id, data);
          break;
        case 'currentStep':
          if (typeof data !== 'number') {
            return NextResponse.json(
              { success: false, error: 'Current step must be a number' },
              { status: 400 }
            );
          }
          await JobCampaignService.updateCurrentStep(session.user.id, data);
          break;
        case 'campaignId':
          if (typeof data !== 'string') {
            return NextResponse.json(
              { success: false, error: 'Campaign ID must be a string' },
              { status: 400 }
            );
          }
          await JobCampaignService.setCurrentCampaignId(session.user.id, data);
          break;
        default:
          return NextResponse.json(
            { success: false, error: 'Invalid update type' },
            { status: 400 }
          );
      }
      
      return NextResponse.json({
        success: true,
        message: `${type} updated successfully`,
      });
    } catch (error) {
      console.error('Error updating job campaign state:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update campaign state' },
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