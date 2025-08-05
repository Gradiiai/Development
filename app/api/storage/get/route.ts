import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/lib/redis';
import { auth } from '@/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { key } = await request.json();
    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    // Get value from Redis cache
    const value = await cache.get(key, {
      prefix: 'storage:',
      serialize: true,
    });

    return NextResponse.json({ value });
  } catch (error) {
    console.error('Storage get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}