import { NextRequest, NextResponse } from 'next/server';
import { checkAllRedisServices } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    // Test all Redis services
    const healthStatus = await checkAllRedisServices();
    
    return NextResponse.json({
      success: true,
      message: 'Redis health check completed',
      services: healthStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Redis health check failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Redis health check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}