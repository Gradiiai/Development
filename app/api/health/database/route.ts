import { NextRequest, NextResponse } from 'next/server';
import { checkDatabaseHealth, getDatabaseInfo } from '@/lib/database/health';

export async function GET(request: NextRequest) {
  try {
    const health = await checkDatabaseHealth();
    const info = getDatabaseInfo();
    
    const response = {
      database: health,
      config: info,
      timestamp: new Date().toISOString()
    };
    
    if (health.healthy) {
      return NextResponse.json(response, { status: 200 });
    } else {
      return NextResponse.json(response, { status: 503 });
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        database: {
          healthy: false,
          error: error?.message || 'Health check failed'
        },
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
} 