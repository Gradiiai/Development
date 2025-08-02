import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { users, companies, adminActivityLogs } from '@/lib/database/schema';
import { eq, count, desc, gte, and, sql } from 'drizzle-orm';
import { logAdminActivity } from '@/lib/admin/admin-activity-logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session || session.user.role !== 'super-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'rbac';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    if (type === 'rbac') {
      // Get role-based access control matrix
      const rolePermissions = {
        'super-admin': {
          companies: ['create', 'read', 'update', 'delete'],
          users: ['create', 'read', 'update', 'delete'],
          analytics: ['read'],
          subscriptions: ['create', 'read', 'update', 'delete'],
          reports: ['read', 'export'],
          security: ['read', 'update'],
          settings: ['read', 'update'],
        },
        'company': {
          companies: ['read', 'update'],
          users: ['create', 'read', 'update'],
          analytics: ['read'],
          subscriptions: ['read'],
          reports: ['read', 'export'],
          security: ['read'],
          settings: ['read'],
        },
        'candidate': {
          // No admin access
        },
      };

      // Get role distribution
      const roleDistribution = await db
        .select({
          role: users.role,
          count: count(),
        })
        .from(users)
        .groupBy(users.role)
        .orderBy(count());

      return NextResponse.json({
        rolePermissions,
        roleDistribution,
      });
    }

    if (type === 'login-history') {
      // Get login history from admin activity logs
      const loginHistory = await db
        .select({
          id: adminActivityLogs.id,
          userId: adminActivityLogs.userId,
          userName: users.name,
          userEmail: users.email,
          userRole: users.role,
          activityType: adminActivityLogs.activityType,
          description: adminActivityLogs.description,
          metadata: adminActivityLogs.metadata,
          createdAt: adminActivityLogs.createdAt,
        })
        .from(adminActivityLogs)
        .leftJoin(users, eq(adminActivityLogs.userId, users.id))
        .where(eq(adminActivityLogs.activityType, 'login'))
        .orderBy(desc(adminActivityLogs.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const [totalResult] = await db
        .select({ count: count() })
        .from(adminActivityLogs)
        .where(eq(adminActivityLogs.activityType, 'login'));

      return NextResponse.json({
        loginHistory,
        pagination: {
          page,
          limit,
          total: totalResult.count,
          totalPages: Math.ceil(totalResult.count / limit),
        },
      });
    }

    if (type === 'security-settings') {
      // Get security settings (this would typically come from a settings table)
      // For now, we'll return default settings
      const securitySettings = {
        twoFactorEnabled: false,
        ipWhitelistEnabled: false,
        sessionTimeout: 3600, // 1 hour in seconds
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
        },
        loginAttempts: {
          maxAttempts: 5,
          lockoutDuration: 900, // 15 minutes in seconds
        },
      };

      return NextResponse.json({ securitySettings });
    }

    if (type === 'failed-logins') {
      // Get failed login attempts from the last 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const failedLogins = await db
        .select({
          id: adminActivityLogs.id,
          userId: adminActivityLogs.userId,
          userName: users.name,
          userEmail: users.email,
          description: adminActivityLogs.description,
          metadata: adminActivityLogs.metadata,
          createdAt: adminActivityLogs.createdAt,
        })
        .from(adminActivityLogs)
        .leftJoin(users, eq(adminActivityLogs.userId, users.id))
        .where(
          and(
            eq(adminActivityLogs.activityType, 'failed_login'),
            gte(adminActivityLogs.createdAt, twentyFourHoursAgo)
          )
        )
        .orderBy(desc(adminActivityLogs.createdAt))
        .limit(limit)
        .offset(offset);

      const [totalResult] = await db
        .select({ count: count() })
        .from(adminActivityLogs)
        .where(
          and(
            eq(adminActivityLogs.activityType, 'failed_login'),
            gte(adminActivityLogs.createdAt, twentyFourHoursAgo)
          )
        );

      return NextResponse.json({
        failedLogins,
        pagination: {
          page,
          limit,
          total: totalResult.count,
          totalPages: Math.ceil(totalResult.count / limit),
        },
      });
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching security data:', error);
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
    const { type, settings } = body;

    if (!type || !settings) {
      return NextResponse.json({ error: 'Type and settings are required' }, { status: 400 });
    }

    // In a real application, you would update these settings in a database
    // For now, we'll just log the activity and return success
    
    if (type === 'two-factor') {
      // Update 2FA settings
      await logAdminActivity({
        userId: session.user.id!,
        activityType: 'security_setting_update',
        description: `Updated 2FA settings: ${settings.enabled ? 'enabled' : 'disabled'}`,
        metadata: { settingType: 'two-factor', enabled: settings.enabled },
      });

      return NextResponse.json({ 
        message: '2FA settings updated successfully',
        settings: { twoFactorEnabled: settings.enabled }
      });
    }

    if (type === 'ip-whitelist') {
      // Update IP whitelist settings
      await logAdminActivity({
        userId: session.user.id!,
        activityType: 'security_setting_update',
        description: `Updated IP whitelist: ${settings.enabled ? 'enabled' : 'disabled'}`,
        metadata: { settingType: 'ip-whitelist', enabled: settings.enabled, whitelist: settings.whitelist },
      });

      return NextResponse.json({ 
        message: 'IP whitelist settings updated successfully',
        settings: { ipWhitelistEnabled: settings.enabled, whitelist: settings.whitelist }
      });
    }

    if (type === 'session-timeout') {
      // Update session timeout settings
      await logAdminActivity({
        userId: session.user.id!,
        activityType: 'security_setting_update',
        description: `Updated session timeout to ${settings.timeout} seconds`,
        metadata: { settingType: 'session-timeout', timeout: settings.timeout },
      });

      return NextResponse.json({ 
        message: 'Session timeout updated successfully',
        settings: { sessionTimeout: settings.timeout }
      });
    }

    if (type === 'password-policy') {
      // Update password policy
      await logAdminActivity({
        userId: session.user.id!,
        activityType: 'security_setting_update',
        description: 'Updated password policy',
        metadata: { settingType: 'password-policy', policy: settings },
      });

      return NextResponse.json({ 
        message: 'Password policy updated successfully',
        settings: { passwordPolicy: settings }
      });
    }

    if (type === 'user-role') {
      // Update user role
      const { userId, newRole } = settings;
      
      if (!userId || !newRole) {
        return NextResponse.json({ error: 'User ID and new role are required' }, { status: 400 });
      }

      // Get user info for logging
      const [user] = await db
        .select({ name: users.name, email: users.email, role: users.role })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Update user role
      await db
        .update(users)
        .set({ role: newRole, updatedAt: new Date() })
        .where(eq(users.id, userId));

      await logAdminActivity({
        userId: session.user.id!,
        activityType: 'user_role_update',
        description: `Updated user role: ${user.name} (${user.email}) from ${user.role} to ${newRole}`,
        metadata: { userId, userName: user.name, userEmail: user.email, oldRole: user.role, newRole },
      });

      return NextResponse.json({ 
        message: 'User role updated successfully',
        user: { id: userId, name: user.name, email: user.email, role: newRole }
      });
    }

    return NextResponse.json({ error: 'Invalid setting type' }, { status: 400 });
  } catch (error) {
    console.error('Error updating security settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}