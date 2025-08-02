import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { companies, users } from '@/lib/database/schema';
import { ilike, or, eq, sql, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session?.user?.id || !['super-admin', 'company'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const searchTerm = `%${query}%`;
    const results: any[] = [];

    // Search companies (only for super-admin or show own company)
    if (session.user.role === 'super-admin') {
      try {
        const companyResults = await db
          .select({
            type: sql<string>`'company'`,
            id: companies.id,
            name: companies.name,
            email: companies.email,
            plan: companies.subscriptionPlan
          })
          .from(companies)
          .where(
            or(
              ilike(companies.name, searchTerm),
              ilike(companies.domain, searchTerm),
              ilike(companies.email, searchTerm)
            )
          )
          .limit(5);
        
        if (companyResults && companyResults.length > 0) {
          results.push(...companyResults);
        }
      } catch (companyError) {
        console.error('Error searching companies:', companyError);
        // Continue with user search even if company search fails
      }
    }

    // Search users (filter by company if not super-admin)
    let userWhereCondition = or(
      ilike(users.name, searchTerm),
      ilike(users.email, searchTerm)
    );

    if (session.user.role !== 'super-admin' && session.user.companyId) {
      userWhereCondition = and(
        userWhereCondition,
        eq(users.companyId, session.user.companyId)
      );
    }

    try {
      const userResults = await db
        .select({
          type: sql<string>`'user'`,
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role
        })
        .from(users)
        .where(userWhereCondition)
        .limit(5);

      if (userResults && userResults.length > 0) {
        results.push(...userResults);
      }
    } catch (userError) {
      console.error('Error searching users:', userError);
      // Continue and return whatever results we have
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}