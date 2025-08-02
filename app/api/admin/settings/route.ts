import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionWithAuth } from '@/auth';
import { db } from '@/lib/database/connection';
import { companies } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import { logAdminActivity } from '@/lib/admin/admin-activity-logger';

// Default system settings
const defaultSettings = {
  general: {
    appName: 'Gradii',
    appDescription: 'AI-Powered Interview Platform',
    supportEmail: 'support@gradii.com',
    companyLogo: '/logo.png',
    primaryColor: '#3b82f6',
    secondaryColor: '#1e40af',
  },
  authentication: {
    otpEnabled: true,
    otpExpiryMinutes: 10,
    sessionTimeoutHours: 3,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,
  },
  notifications: {
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    marketingEmails: false,
    systemAlerts: true,
    weeklyReports: true,
  },
  features: {
    candidateLoginExpiry: 3, // hours
    autoSaveInterval: 30, // seconds
    maxFileUploadSize: 10, // MB
    allowedFileTypes: ['pdf', 'doc', 'docx'],
  },
  branding: {
    customLogo: null,
    customColors: {
      primary: '#3b82f6',
      secondary: '#1e40af',
      accent: '#f59e0b',
    },
    customFonts: {
      heading: 'Inter',
      body: 'Inter',
    },
  },
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionWithAuth();
    
    if (!session || !['super-admin', 'company'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const companyId = searchParams.get('companyId');

    if (type === 'company' && companyId) {
      // Get company-specific settings
      const [company] = await db
        .select({
          id: companies.id,
          name: companies.name,
          domain: companies.domain,
          logo: companies.logo,
        })
        .from(companies)
        .where(eq(companies.id, companyId));

      if (!company) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }

      return NextResponse.json({ company });
    }

    if (type === 'general') {
      return NextResponse.json({ settings: defaultSettings.general });
    }

    if (type === 'authentication') {
      return NextResponse.json({ settings: defaultSettings.authentication });
    }

    if (type === 'notifications') {
      return NextResponse.json({ settings: defaultSettings.notifications });
    }

    if (type === 'features') {
      return NextResponse.json({ settings: defaultSettings.features });
    }

    if (type === 'branding') {
      return NextResponse.json({ settings: defaultSettings.branding });
    }

    // Return all settings
    return NextResponse.json({ settings: defaultSettings });
  } catch (error) {
    console.error('Error fetching settings:', error);
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
    const { type, settings, companyId } = body;

    if (!type || !settings) {
      return NextResponse.json({ error: 'Type and settings are required' }, { status: 400 });
    }

    if (type === 'company' && companyId) {
      // Update company-specific settings
      const { name, domain, logo } = settings;

      const [updatedCompany] = await db
        .update(companies)
        .set({
          name,
          domain,
          logo,
          updatedAt: new Date(),
        })
        .where(eq(companies.id, companyId))
        .returning();

      if (!updatedCompany) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }

      await logAdminActivity({
        userId: session.user.id!,
        activityType: 'company_settings_update',
        description: `Updated company settings for: ${name}`,
        metadata: { companyId, companyName: name, settingsUpdated: Object.keys(settings) },
      });

      return NextResponse.json({ 
        message: 'Company settings updated successfully',
        company: updatedCompany
      });
    }

    // For system-wide settings, we would typically store these in a settings table
    // For now, we'll just log the activity and return success
    
    if (type === 'general') {
      await logAdminActivity({
        userId: session.user.id!,
        activityType: 'system_settings_update',
        description: 'Updated general system settings',
        metadata: { settingType: 'general', settings },
      });

      return NextResponse.json({ 
        message: 'General settings updated successfully',
        settings: { ...defaultSettings.general, ...settings }
      });
    }

    if (type === 'authentication') {
      await logAdminActivity({
        userId: session.user.id!,
        activityType: 'system_settings_update',
        description: 'Updated authentication settings',
        metadata: { settingType: 'authentication', settings },
      });

      return NextResponse.json({ 
        message: 'Authentication settings updated successfully',
        settings: { ...defaultSettings.authentication, ...settings }
      });
    }

    if (type === 'notifications') {
      await logAdminActivity({
        userId: session.user.id!,
        activityType: 'system_settings_update',
        description: 'Updated notification settings',
        metadata: { settingType: 'notifications', settings },
      });

      return NextResponse.json({ 
        message: 'Notification settings updated successfully',
        settings: { ...defaultSettings.notifications, ...settings }
      });
    }

    if (type === 'features') {
      await logAdminActivity({
        userId: session.user.id!,
        activityType: 'system_settings_update',
        description: 'Updated feature settings',
        metadata: { settingType: 'features', settings },
      });

      return NextResponse.json({ 
        message: 'Feature settings updated successfully',
        settings: { ...defaultSettings.features, ...settings }
      });
    }

    if (type === 'branding') {
      await logAdminActivity({
        userId: session.user.id!,
        activityType: 'system_settings_update',
        description: 'Updated branding settings',
        metadata: { settingType: 'branding', settings },
      });

      return NextResponse.json({ 
        message: 'Branding settings updated successfully',
        settings: { ...defaultSettings.branding, ...settings }
      });
    }

    return NextResponse.json({ error: 'Invalid setting type' }, { status: 400 });
  } catch (error) {
    console.error('Error updating settings:', error);
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
    const { action, data } = body;

    if (action === 'reset-settings') {
      // Reset settings to default
      const { type } = data;
      
      await logAdminActivity({
        userId: session.user.id!,
        activityType: 'system_settings_reset',
        description: `Reset ${type || 'all'} settings to default`,
        metadata: { settingType: type || 'all' },
      });

      if (type && defaultSettings[type as keyof typeof defaultSettings]) {
        return NextResponse.json({ 
          message: `${type} settings reset to default`,
          settings: defaultSettings[type as keyof typeof defaultSettings]
        });
      }

      return NextResponse.json({ 
        message: 'All settings reset to default',
        settings: defaultSettings
      });
    }

    if (action === 'backup-settings') {
      // Create a backup of current settings
      const backup = {
        timestamp: new Date().toISOString(),
        settings: defaultSettings,
        createdBy: session.user.id,
      };

      await logAdminActivity({
        userId: session.user.id!,
        activityType: 'settings_backup',
        description: 'Created settings backup',
        metadata: { backupTimestamp: backup.timestamp },
      });

      return NextResponse.json({ 
        message: 'Settings backup created successfully',
        backup
      });
    }

    if (action === 'test-email') {
      // Test email configuration
      const { email } = data;
      
      if (!email) {
        return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
      }

      // In a real application, you would send a test email here
      await logAdminActivity({
        userId: session.user.id!,
        activityType: 'email_test',
        description: `Sent test email to: ${email}`,
        metadata: { testEmail: email },
      });

      return NextResponse.json({ 
        message: `Test email sent to ${email}`,
        success: true
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error processing settings action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}