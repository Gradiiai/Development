import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { adminActivityLogs, users, companies } from '@/lib/database/schema';
import { eq, desc, and } from 'drizzle-orm';

// GET - Fetch admin activity logs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session || session.user?.role !== 'super-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const userId = searchParams.get('userId');
    const activityType = searchParams.get('activityType');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Apply filters if provided
    const conditions = [];
    if (companyId) {
      conditions.push(eq(adminActivityLogs.companyId, companyId));
    }
    if (userId) {
      conditions.push(eq(adminActivityLogs.userId, userId));
    }
    if (activityType) {
      conditions.push(eq(adminActivityLogs.activityType, activityType));
    }

    // Build query with conditional where clause
    const baseQuery = db
      .select({
        id: adminActivityLogs.id,
        userId: adminActivityLogs.userId,
        userName: users.name,
        userEmail: users.email,
        companyId: adminActivityLogs.companyId,
        companyName: companies.name,
        activityType: adminActivityLogs.activityType,
        description: adminActivityLogs.description,
        ipAddress: adminActivityLogs.ipAddress,
        userAgent: adminActivityLogs.userAgent,
        createdAt: adminActivityLogs.createdAt,
        metadata: adminActivityLogs.metadata,
      })
      .from(adminActivityLogs)
      .leftJoin(users, eq(adminActivityLogs.userId, users.id))
      .leftJoin(companies, eq(adminActivityLogs.companyId, companies.id));

    const logs = conditions.length > 0 
      ? await baseQuery
          .where(and(...conditions))
          .orderBy(desc(adminActivityLogs.createdAt))
          .limit(limit)
          .offset(offset)
      : await baseQuery
          .orderBy(desc(adminActivityLogs.createdAt))
          .limit(limit)
          .offset(offset);

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error fetching admin activity logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new activity log
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      userId, 
      companyId, 
      activityType, 
      description, 
      ipAddress, 
      userAgent, 
      metadata 
    } = body;

    // Validate required fields
    if (!userId || !activityType || !description) {
      return NextResponse.json({ 
        error: 'User ID, activity type, and description are required' 
      }, { status: 400 });
    }

    // Create activity log
    const newLog = await db
      .insert(adminActivityLogs)
      .values({
        userId: userId || session.user?.id || '',
        companyId,
        activityType,
        description,
        ipAddress,
        userAgent,
        metadata,
      })
      .returning();

    return NextResponse.json({ log: newLog[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating activity log:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}