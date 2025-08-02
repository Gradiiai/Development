// MIGRATED: Previously at app/api/job-folder/job-categories/route.ts
// MIGRATED DATE: Phase 2C - Directory Structure Cleanup
// REASON: Moved from confusing job-folder structure to organized content structure
// NEW LOCATION: /api/content/job-categories/

import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from "@/auth";;
import { getDistinctJobCategories } from '@/lib/database/queries/campaigns';

// GET /api/content/job-categories (previously /api/job-folder/job-categories)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const companyId = session.user.companyId;
    
    // Check if companyId exists and is valid
    if (!companyId) {
      console.error('Error: User session missing companyId');
      return NextResponse.json({ success: true, data: [] }); // Return empty array instead of error
    }
    
    const result = await getDistinctJobCategories(companyId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/content/job-categories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch job categories' },
      { status: 500 }
    );
  }
}