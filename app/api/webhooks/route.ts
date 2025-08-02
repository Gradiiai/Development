import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { webhooks } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import crypto from 'crypto';

const webhookSchema = z.object({
  companyId: z.string(),
  name: z.string().min(1, 'Name is required'),
  url: z.string().url('Valid URL is required'),
  events: z.array(z.enum([
    // Application events
    'candidate.created',
    'candidate.updated',
    'candidate.status_changed',
    'interview.scheduled',
    'interview.completed',
    'interview.cancelled',
    'job.created',
    'job.updated',
    'job.published',
    'job.closed',
    'application.submitted',
    'application.reviewed',
    'evaluation.completed',
    // Stripe events
    'subscription.created',
    'subscription.updated',
    'subscription.cancelled',
    'payment.succeeded',
    'payment.failed',
    'invoice.created',
    'invoice.paid',
    'invoice.payment_failed',
    'customer.created',
    'customer.updated',
    'plan.changed'
  ])).min(1, 'At least one event is required'),
  isActive: z.boolean().default(true),
  headers: z.record(z.string()).optional(),
  retryAttempts: z.number().min(0).max(5).default(3),
  timeout: z.number().min(1000).max(30000).default(10000), // milliseconds
});

// POST - Create webhook
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.id || !['super-admin', 'company'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = webhookSchema.parse(body);

    // For non-super-admin users, ensure they can only create webhooks for their company
    if (session.user.role !== 'super-admin' && validatedData.companyId !== session.user.companyId) {
      return NextResponse.json(
        { error: 'You can only create webhooks for your own company' },
        { status: 403 }
      );
    }

    // Generate webhook secret for signature verification
    const secret = crypto.randomBytes(32).toString('hex');

    // Create webhook
    const newWebhook = await db
      .insert(webhooks)
      .values({
        companyId: validatedData.companyId,
        name: validatedData.name,
        url: validatedData.url,
        events: validatedData.events,
        secret,
        isActive: validatedData.isActive,
        headers: validatedData.headers || {},
        retryAttempts: validatedData.retryAttempts,
        timeout: validatedData.timeout,
      })
      .returning();

    return NextResponse.json({
      message: 'Webhook created successfully',
      webhook: {
        ...newWebhook[0],
        secret: `wh_${secret.substring(0, 8)}...`, // Only show partial secret
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Retrieve webhooks
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
    const companyId = searchParams.get('companyId');
    const isActive = searchParams.get('isActive');

    // Build where conditions
    const whereConditions = [];
    
    // Apply filters based on user role
    if (session.user.role === 'super-admin') {
      if (companyId) {
        whereConditions.push(eq(webhooks.companyId, companyId));
      }
    } else {
      // Non-super-admin users can only see their company's webhooks
      whereConditions.push(eq(webhooks.companyId, session.user.companyId!));
    }

    if (isActive !== null) {
      const activeFilter = isActive === 'true';
      whereConditions.push(eq(webhooks.isActive, activeFilter));
    }

    // Execute query with combined conditions
    const webhookList = whereConditions.length > 0 
      ? await db.select().from(webhooks).where(and(...whereConditions))
      : await db.select().from(webhooks);

    // Hide full secrets in response
    const safeWebhooks = webhookList.map(webhook => ({
      ...webhook,
      secret: `wh_${webhook.secret.substring(0, 8)}...`,
    }));

    return NextResponse.json({ webhooks: safeWebhooks });
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update webhook
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.id || !['super-admin', 'company'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;
    const validatedData = webhookSchema.partial().parse(updateData);

    if (!id) {
      return NextResponse.json(
        { error: 'Webhook ID is required' },
        { status: 400 }
      );
    }

    // Check if webhook exists and user has permission
    const existingWebhook = await db
      .select()
      .from(webhooks)
      .where(eq(webhooks.id, id))
      .limit(1);

    if (existingWebhook.length === 0) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (session.user.role !== 'super-admin' && existingWebhook[0].companyId !== session.user.companyId) {
      return NextResponse.json(
        { error: 'You can only update webhooks for your own company' },
        { status: 403 }
      );
    }

    // Update webhook
    const updatedWebhook = await db
      .update(webhooks)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(webhooks.id, id))
      .returning();

    return NextResponse.json({
      message: 'Webhook updated successfully',
      webhook: {
        ...updatedWebhook[0],
        secret: `wh_${updatedWebhook[0].secret.substring(0, 8)}...`,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove webhook
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.id || !['super-admin', 'company'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Webhook ID is required' },
        { status: 400 }
      );
    }

    // Check if webhook exists and user has permission
    const existingWebhook = await db
      .select()
      .from(webhooks)
      .where(eq(webhooks.id, id))
      .limit(1);

    if (existingWebhook.length === 0) {
      return NextResponse.json(
        { error: 'Webhook not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (session.user.role !== 'super-admin' && existingWebhook[0].companyId !== session.user.companyId) {
      return NextResponse.json(
        { error: 'You can only delete webhooks for your own company' },
        { status: 403 }
      );
    }

    // Delete webhook
    await db
      .delete(webhooks)
      .where(eq(webhooks.id, id));

    return NextResponse.json({
      message: 'Webhook deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}