import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { platformSettings, systemBackupLogs, systemCacheLogs } from '@/lib/database/schema';
import { eq, desc } from 'drizzle-orm';
import { logAdminActivity } from '@/lib/admin/admin-activity-logger';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const platformSettingsSchema = z.object({
  // Database Settings
  databaseBackupFrequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  databaseRetentionDays: z.number().min(1).max(365).optional(),
  databaseAutoBackup: z.boolean().optional(),
  databaseOptimization: z.boolean().optional(),
  
  // Performance Settings
  cacheDuration: z.number().min(60).max(86400).optional(), // 1 minute to 24 hours
  maxUploadSize: z.number().min(1).max(100).optional(), // 1MB to 100MB
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).optional(),
  cacheEnabled: z.boolean().optional(),
  
  // Email Settings
  smtpHost: z.string().optional(),
  smtpPort: z.number().min(1).max(65535).optional(),
  smtpUsername: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpSecure: z.boolean().optional(),
  emailFromAddress: z.string().email().optional(),
  emailFromName: z.string().optional(),
  
  // Notification Settings
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  notificationRetentionDays: z.number().min(1).max(365).optional(),
  
  // Security Settings
  sessionTimeout: z.number().min(15).max(1440).optional(), // 15 minutes to 24 hours
  maxLoginAttempts: z.number().min(3).max(10).optional(),
  passwordMinLength: z.number().min(6).max(50).optional(),
  requireTwoFactor: z.boolean().optional(),
  ipWhitelistEnabled: z.boolean().optional(),
  
  // Feature Flags
  maintenanceMode: z.boolean().optional(),
  registrationEnabled: z.boolean().optional(),
  apiRateLimit: z.number().min(10).max(10000).optional(),
  debugMode: z.boolean().optional(),
});

// GET - Fetch platform settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.id || session.user.role !== 'super-admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Super admin access required.' },
        { status: 401 }
      );
    }

    // Get current platform settings
    const settings = await db
      .select()
      .from(platformSettings)
      .orderBy(desc(platformSettings.updatedAt))
      .limit(1);

    if (settings.length === 0) {
      // Return default settings if none exist
      const defaultSettings = {
        // Database defaults
        databaseBackupFrequency: 'daily',
        databaseRetentionDays: 30,
        databaseAutoBackup: true,
        databaseOptimization: true,
        
        // Performance defaults
        cacheDuration: 3600, // 1 hour
        maxUploadSize: 10, // 10MB
        logLevel: 'info',
        cacheEnabled: true,
        
        // Email defaults
        smtpHost: '',
        smtpPort: 587,
        smtpUsername: '',
        smtpPassword: '',
        smtpSecure: true,
        emailFromAddress: '',
        emailFromName: 'Interview AI',
        
        // Notification defaults
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        notificationRetentionDays: 90,
        
        // Security defaults
        sessionTimeout: 480, // 8 hours
        maxLoginAttempts: 5,
        passwordMinLength: 8,
        requireTwoFactor: false,
        ipWhitelistEnabled: false,
        
        // Feature flags defaults
        maintenanceMode: false,
        registrationEnabled: true,
        apiRateLimit: 1000,
        debugMode: false,
        
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      return NextResponse.json(defaultSettings);
    }

    return NextResponse.json(settings[0]);
  } catch (error) {
    console.error('Error fetching platform settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Update platform settings
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.id || session.user.role !== 'super-admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Super admin access required.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = platformSettingsSchema.parse(body);

    // Get current settings
    const currentSettings = await db
      .select()
      .from(platformSettings)
      .orderBy(desc(platformSettings.updatedAt))
      .limit(1);

    let updatedSettings;
    
    if (currentSettings.length === 0) {
      // Create new settings record
      updatedSettings = await db
        .insert(platformSettings)
        .values({
          ...validatedData,
          isActive: true,
          updatedBy: session.user.id,
        })
        .returning();
    } else {
      // Update existing settings
      updatedSettings = await db
        .update(platformSettings)
        .set({
          ...validatedData,
          updatedBy: session.user.id,
          updatedAt: new Date(),
        })
        .where(eq(platformSettings.id, currentSettings[0].id))
        .returning();
    }

    // Log admin activity
    await logAdminActivity({
      userId: session.user.id,
      activityType: 'platform_settings_updated',
      description: 'Updated platform settings',
      metadata: {
        updatedFields: Object.keys(validatedData),
        settingsId: updatedSettings[0].id,
      }
    });

    // Revalidate cache
    revalidatePath('/admin/settings');

    return NextResponse.json({
      message: 'Platform settings updated successfully',
      settings: updatedSettings[0],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating platform settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Reset to default settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    if (!session?.user?.id || session.user.role !== 'super-admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Super admin access required.' },
        { status: 401 }
      );
    }

    const defaultSettings = {
      // Database defaults
      databaseBackupFrequency: 'daily' as const,
      databaseRetentionDays: 30,
      databaseAutoBackup: true,
      databaseOptimization: true,
      
      // Performance defaults
      cacheDuration: 3600,
      maxUploadSize: 10,
      logLevel: 'info' as const,
      cacheEnabled: true,
      
      // Email defaults
      smtpHost: '',
      smtpPort: 587,
      smtpUsername: '',
      smtpPassword: '',
      smtpSecure: true,
      emailFromAddress: '',
      emailFromName: 'Interview AI',
      
      // Notification defaults
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      notificationRetentionDays: 90,
      
      // Security defaults
      sessionTimeout: 480,
      maxLoginAttempts: 5,
      passwordMinLength: 8,
      requireTwoFactor: false,
      ipWhitelistEnabled: false,
      
      // Feature flags defaults
      maintenanceMode: false,
      registrationEnabled: true,
      apiRateLimit: 1000,
      debugMode: false,
    };

    // Get current settings
    const currentSettings = await db
      .select()
      .from(platformSettings)
      .orderBy(desc(platformSettings.updatedAt))
      .limit(1);

    let resetSettings;
    
    if (currentSettings.length === 0) {
      // Create new settings record with defaults
      resetSettings = await db
        .insert(platformSettings)
        .values({
          ...defaultSettings,
          isActive: true,
          updatedBy: session.user.id,
        })
        .returning();
    } else {
      // Update existing settings to defaults
      resetSettings = await db
        .update(platformSettings)
        .set({
          ...defaultSettings,
          updatedBy: session.user.id,
          updatedAt: new Date(),
        })
        .where(eq(platformSettings.id, currentSettings[0].id))
        .returning();
    }

    // Log admin activity
    await logAdminActivity({
      userId: session.user.id,
      activityType: 'platform_settings_reset',
      description: 'Reset platform settings to defaults',
      metadata: {
        settingsId: resetSettings[0].id,
      }
    });

    // Revalidate cache
    revalidatePath('/admin/settings');

    return NextResponse.json({
      message: 'Platform settings reset to defaults successfully',
      settings: resetSettings[0],
    });
  } catch (error) {
    console.error('Error resetting platform settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}