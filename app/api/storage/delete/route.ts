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

    // Delete value from Redis cache
    const success = await cache.delete(key, {
      prefix: 'storage:',
    });

    return NextResponse.json({ success });
  } catch (error) {
    console.error('Storage delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}