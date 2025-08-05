import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/lib/redis';
import { auth } from '@/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { key, value, ttl } = await request.json();
    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    // Set value in Redis cache
    const success = await cache.set(key, value, {
      prefix: 'storage:',
      ttl: ttl || 24 * 60 * 60, // Default 24 hours
      serialize: true,
    });

    if (!success) {
      return NextResponse.json({ error: 'Failed to store value' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Storage set error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}