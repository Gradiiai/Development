import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { 
  users, companies, candidateAccess, candidateScores, interviewSetups, 
  campaignInterviews, questionBank, skillTemplates, interviewTemplates, 
  jobDescriptionTemplates, apiTokens, ssoConfigurations, webhooks, 
  systemNotifications 
} from '@/lib/database/schema';
import { eq, count, desc, ilike, or, and, isNull } from 'drizzle-orm';
import { logAdminActivity } from '@/lib/admin/admin-activity-logger';
import bcrypt from 'bcryptjs';



export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session || session.user.role !== 'super-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    const companyId = searchParams.get('companyId') || '';
    const offset = (page - 1) * limit;

    // Build where conditions
    let whereConditions: any[] = [];
    
    if (search) {
      whereConditions.push(
        or(
          ilike(users.name, `%${search}%`),
          ilike(users.email, `%${search}%`)
        )
      );
    }
    
    if (role) {
      whereConditions.push(eq(users.role, role));
    }
    
    if (status) {
      const isActive = status === 'active';
      whereConditions.push(eq(users.isActive, isActive));
    }
    
    if (companyId) {
      if (companyId === 'none') {
        whereConditions.push(isNull(users.companyId));
      } else {
        whereConditions.push(eq(users.companyId, companyId));
      }
    }

    // Get users with company information
    const usersData = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        image: users.image,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
        companyId: users.companyId,
        companyName: companies.name,
      })
      .from(users)
      .leftJoin(companies, eq(users.companyId, companies.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const [totalResult] = await db
      .select({ count: count() })
      .from(users)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    return NextResponse.json({
      users: usersData,
      page,
      limit,
      total: totalResult.count,
      totalPages: Math.ceil(totalResult.count / limit),
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session || session.user.role !== 'super-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, role, companyId, password } = body;

    if (!name || !email || !role || !companyId) {
      return NextResponse.json({ error: 'Name, email, role, and company are required' }, { status: 400 });
    }

    // Check if user already exists
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 12);
    }

    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email,
        role,
        companyId,
        password: hashedPassword,
        isActive: true,
      })
      .returning();

    // Log admin activity
    await logAdminActivity({
      userId: session.user.id!,
      activityType: 'user_creation',
      description: `Created user: ${name} (${email})`,
      metadata: { userId: newUser.id, userName: name, userEmail: email },
    });

    // Remove password from response
    const { password: _, ...userResponse } = newUser;
    return NextResponse.json(userResponse, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session || session.user.role !== 'super-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, email, role, status, companyId } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Build update object with only provided fields
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.isActive = status === 'active';
    if (companyId !== undefined) updateData.companyId = companyId;

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Log admin activity
    await logAdminActivity({
      userId: session.user.id!,
      activityType: 'user_update',
      description: `Updated user: ${updatedUser.name} (${updatedUser.email})`,
      metadata: { userId: id, userName: updatedUser.name, userEmail: updatedUser.email },
    });

    // Remove password from response
    const { password: _, ...userResponse } = updatedUser;
    return NextResponse.json(userResponse);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session || session.user.role !== 'super-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user info for logging
    const [user] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, id));

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Handle foreign key constraints by setting references to null or deleting records
    try {
      await Promise.all([
        // Set nullable foreign keys to null
        db.update(candidateAccess).set({ createdBy: null }).where(eq(candidateAccess.createdBy, id)).catch(() => {}),
        db.update(candidateScores).set({ scoredBy: null }).where(eq(candidateScores.scoredBy, id)).catch(() => {}),
        db.update(interviewSetups).set({ createdBy: null }).where(eq(interviewSetups.createdBy, id)).catch(() => {}),
        db.update(campaignInterviews).set({ interviewerId: null }).where(eq(campaignInterviews.interviewerId, id)).catch(() => {}),
        // Delete records where createdBy is not nullable
        db.delete(questionBank).where(eq(questionBank.createdBy, id)).catch(() => {}),
        db.delete(skillTemplates).where(eq(skillTemplates.createdBy, id)).catch(() => {}),
        db.delete(interviewTemplates).where(eq(interviewTemplates.createdBy, id)).catch(() => {}),
        db.delete(jobDescriptionTemplates).where(eq(jobDescriptionTemplates.createdBy, id)).catch(() => {}),
      ]);
    } catch (error) {
      console.warn('Some foreign key updates failed, but continuing with deletion:', error);
    }

    // Now delete the user
    await db.delete(users).where(eq(users.id, id));

    // Log admin activity
    await logAdminActivity({
      userId: session.user.id!,
      activityType: 'user_deletion',
      description: `Deleted user: ${user.name} (${user.email})`,
      metadata: { userId: id, userName: user.name, userEmail: user.email },
    });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}