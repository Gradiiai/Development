'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Save, RefreshCw, Bell, Mail, Globe, Database, Shield, Palette, Monitor, Users as UsersIcon, Building2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Button } from '@/components/ui/shared/button';
import { Input } from '@/components/ui/shared/input';
import { Label } from '@/components/ui/shared/label';
import { Switch } from '@/components/ui/shared/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/shared/tabs';
import { Separator } from '@/components/ui/shared/separator';
import { toast } from 'sonner';

interface PlatformSettings {
  // General Settings
  platformName?: string;
  platformDescription?: string;
  supportEmail?: string;
  
  // Database Settings
  databaseBackupFrequency?: 'daily' | 'weekly' | 'monthly';
  databaseRetentionDays?: number;
  databaseAutoBackup?: boolean;
  databaseOptimization?: boolean;
  
  // Performance Settings
  cacheDuration?: number;
  maxUploadSize?: number;
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
  cacheEnabled?: boolean;
  
  // Email Settings
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPassword?: string;
  smtpSecure?: boolean;
  emailFromAddress?: string;
  emailFromName?: string;
  emailReplyTo?: string;
  emailSignature?: string;
  
  // Notification Settings
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  pushNotifications?: boolean;
  notificationRetentionDays?: number;
  newUserNotification?: boolean;
  failedLoginNotification?: boolean;
  welcomeEmailEnabled?: boolean;
  interviewReminderEnabled?: boolean;
  
  // Security Settings
  sessionTimeout?: number;
  maxLoginAttempts?: number;
  lockoutDuration?: number;
  passwordMinLength?: number;
  requireTwoFactor?: boolean;
  requireStrongPassword?: boolean;
  ipWhitelistEnabled?: boolean;
  publicApiAccess?: boolean;
  
  // API Security
  apiRateLimit?: number;
  apiKeyExpiry?: number;
  corsOrigins?: string;
  apiLogging?: boolean;
  
  // Appearance
  defaultTheme?: 'light' | 'dark' | 'system';
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
  footerText?: string;
  customCss?: string;
  
  // Feature Flags
  maintenanceMode?: boolean;
  registrationEnabled?: boolean;
  debugMode?: boolean;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [settings, setSettings] = useState<PlatformSettings>({});
  const [testEmail, setTestEmail] = useState('');

  // Fetch platform settings
  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/platform-settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        toast.error('Failed to load settings');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status !== 'loading' && session?.user?.role === 'super-admin') {
      fetchSettings();
    } else if (status !== 'loading') {
      setIsLoading(false);
    }
  }, [status, session]);

  // Update settings
  const updateSettings = (updates: Partial<PlatformSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  // Save all settings
  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/platform-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success('Settings saved successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to defaults
  const handleResetSettings = async () => {
    setIsResetting(true);
    try {
      const response = await fetch('/api/admin/platform-settings', {
        method: 'PUT',
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
        toast.success('Settings reset to defaults');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to reset settings');
      }
    } catch (error) {
      console.error('Error resetting settings:', error);
      toast.error('Failed to reset settings');
    } finally {
      setIsResetting(false);
    }
  };

  // Platform actions
  const handlePlatformAction = async (action: string, data?: any) => {
    const setLoadingState = {
      backup: setIsBackingUp,
      clear_cache: setIsClearingCache,
      test_email: setIsTestingEmail,
    }[action];

    if (setLoadingState) setLoadingState(true);

    try {
      const response = await fetch('/api/admin/platform-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, data }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.error || `Failed to ${action.replace('_', ' ')}`);
      }
    } catch (error) {
      console.error(`Error executing ${action}:`, error);
      toast.error(`Failed to ${action.replace('_', ' ')}`);
    } finally {
      if (setLoadingState) setLoadingState(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (session?.user?.role !== 'super-admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You need super admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  const settingsCategories = [
    {
      id: 'general',
      title: 'General',
      icon: SettingsIcon,
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: Bell,
      gradient: 'from-emerald-500 to-teal-500',
    },
    {
      id: 'email',
      title: 'Email',
      icon: Mail,
      gradient: 'from-purple-500 to-indigo-500',
    },
    {
      id: 'security',
      title: 'Security',
      icon: Shield,
      gradient: 'from-red-500 to-pink-500',
    },
    {
      id: 'appearance',
      title: 'Appearance',
      icon: Palette,
      gradient: 'from-orange-500 to-red-500',
    },
    {
      id: 'system',
      title: 'System',
      icon: Database,
      gradient: 'from-gray-500 to-slate-500',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-600 via-gray-600 to-zinc-600 p-8 text-white"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-slate-600/90 via-gray-600/90 to-zinc-600/90"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <SettingsIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Platform Settings</h1>
              <p className="text-slate-100 text-lg">Configure and customize platform behavior</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button 
              onClick={handleResetSettings}
              disabled={isResetting}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
            >
              {isResetting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Reset
            </Button>
            <Button 
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save All
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Settings Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 overflow-hidden"
      >
        <Tabs defaultValue="general" className="w-full">
          <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-100">
            <TabsList className="grid w-full grid-cols-6 bg-white/50 backdrop-blur-sm">
              {settingsCategories.map((category) => {
                const Icon = category.icon;
                return (
                  <TabsTrigger 
                    key={category.id} 
                    value={category.id}
                    className="flex items-center space-x-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{category.title}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* General Settings */}
          <TabsContent value="general" className="p-8 space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">General Settings</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-0 bg-gradient-to-br from-blue-50 to-cyan-50">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Globe className="w-5 h-5 text-blue-600" />
                      <span>Platform Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="platform-name">Platform Name</Label>
                      <Input 
                        id="platform-name" 
                        value={settings.platformName || ''}
                        onChange={(e) => updateSettings({ platformName: e.target.value })}
                        className="mt-1" 
                      />
                    </div>
                    <div>
                      <Label htmlFor="platform-description">Description</Label>
                      <Textarea 
                        id="platform-description" 
                        value={settings.platformDescription || ''}
                        onChange={(e) => updateSettings({ platformDescription: e.target.value })}
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="support-email">Support Email</Label>
                      <Input 
                        id="support-email" 
                        value={settings.supportEmail || ''}
                        onChange={(e) => updateSettings({ supportEmail: e.target.value })}
                        className="mt-1" 
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 bg-gradient-to-br from-emerald-50 to-teal-50">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Monitor className="w-5 h-5 text-emerald-600" />
                      <span>Platform Behavior</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Maintenance Mode</Label>
                        <p className="text-sm text-gray-600">Temporarily disable platform access</p>
                      </div>
                      <Switch 
                        checked={settings.maintenanceMode || false}
                        onCheckedChange={(checked) => updateSettings({ maintenanceMode: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>New User Registration</Label>
                        <p className="text-sm text-gray-600">Allow new users to register</p>
                      </div>
                      <Switch 
                        checked={settings.registrationEnabled !== false}
                        onCheckedChange={(checked) => updateSettings({ registrationEnabled: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Public API Access</Label>
                        <p className="text-sm text-gray-600">Enable public API endpoints</p>
                      </div>
                      <Switch 
                        checked={settings.publicApiAccess !== false}
                        onCheckedChange={(checked) => updateSettings({ publicApiAccess: checked })}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications" className="p-8 space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Notification Settings</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-0 bg-gradient-to-br from-emerald-50 to-teal-50">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Bell className="w-5 h-5 text-emerald-600" />
                      <span>System Notifications</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>New User Registration</Label>
                        <p className="text-sm text-gray-600">Notify when new users register</p>
                      </div>
                      <Switch 
                        checked={settings.newUserNotification !== false}
                        onCheckedChange={(checked) => updateSettings({ newUserNotification: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Failed Login Attempts</Label>
                        <p className="text-sm text-gray-600">Alert on suspicious login activity</p>
                      </div>
                      <Switch 
                        checked={settings.failedLoginNotification !== false}
                        onCheckedChange={(checked) => updateSettings({ failedLoginNotification: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>System Errors</Label>
                        <p className="text-sm text-gray-600">Notify on critical system errors</p>
                      </div>
                      <Switch 
                        checked={settings.emailNotifications !== false}
                        onCheckedChange={(checked) => updateSettings({ emailNotifications: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Subscription Changes</Label>
                        <p className="text-sm text-gray-600">Alert on plan upgrades/downgrades</p>
                      </div>
                      <Switch 
                        checked={settings.pushNotifications || false}
                        onCheckedChange={(checked) => updateSettings({ pushNotifications: checked })}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 bg-gradient-to-br from-purple-50 to-indigo-50">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <UsersIcon className="w-5 h-5 text-purple-600" />
                      <span>User Notifications</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Welcome Emails</Label>
                        <p className="text-sm text-gray-600">Send welcome email to new users</p>
                      </div>
                      <Switch 
                        checked={settings.welcomeEmailEnabled !== false}
                        onCheckedChange={(checked) => updateSettings({ welcomeEmailEnabled: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Interview Reminders</Label>
                        <p className="text-sm text-gray-600">Remind users of upcoming interviews</p>
                      </div>
                      <Switch 
                        checked={settings.interviewReminderEnabled !== false}
                        onCheckedChange={(checked) => updateSettings({ interviewReminderEnabled: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Weekly Reports</Label>
                        <p className="text-sm text-gray-600">Send weekly activity reports</p>
                      </div>
                      <Switch 
                        checked={settings.smsNotifications || false}
                        onCheckedChange={(checked) => updateSettings({ smsNotifications: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Marketing Emails</Label>
                        <p className="text-sm text-gray-600">Send promotional content</p>
                      </div>
                      <Switch 
                        checked={settings.notificationRetentionDays ? true : false}
                        onCheckedChange={(checked) => updateSettings({ notificationRetentionDays: checked ? 30 : 0 })}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Email Settings */}
          <TabsContent value="email" className="p-8 space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Email Configuration</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-0 bg-gradient-to-br from-purple-50 to-indigo-50">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Mail className="w-5 h-5 text-purple-600" />
                      <span>SMTP Settings</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="smtp-host">SMTP Host</Label>
                      <Input 
                        id="smtp-host" 
                        value={settings.smtpHost || ''}
                        onChange={(e) => updateSettings({ smtpHost: e.target.value })}
                        className="mt-1" 
                      />
                    </div>
                    <div>
                      <Label htmlFor="smtp-port">SMTP Port</Label>
                      <Input 
                        id="smtp-port" 
                        value={settings.smtpPort?.toString() || ''}
                        onChange={(e) => updateSettings({ smtpPort: parseInt(e.target.value) || 587 })}
                        className="mt-1" 
                      />
                    </div>
                    <div>
                      <Label htmlFor="smtp-username">Username</Label>
                      <Input 
                        id="smtp-username" 
                        value={settings.smtpUsername || ''}
                        onChange={(e) => updateSettings({ smtpUsername: e.target.value })}
                        className="mt-1" 
                      />
                    </div>
                    <div>
                      <Label htmlFor="smtp-password">Password</Label>
                      <Input 
                        id="smtp-password" 
                        type="password" 
                        value={settings.smtpPassword || ''}
                        onChange={(e) => updateSettings({ smtpPassword: e.target.value })}
                        className="mt-1" 
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={settings.smtpSecure !== false}
                        onCheckedChange={(checked) => updateSettings({ smtpSecure: checked })}
                      />
                      <Label>Enable TLS/SSL</Label>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 bg-gradient-to-br from-orange-50 to-red-50">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Building2 className="w-5 h-5 text-orange-600" />
                      <span>Email Templates</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="from-name">From Name</Label>
                      <Input 
                        id="from-name" 
                        value={settings.emailFromName || ''}
                        onChange={(e) => updateSettings({ emailFromName: e.target.value })}
                        className="mt-1" 
                      />
                    </div>
                    <div>
                      <Label htmlFor="from-email">From Email</Label>
                      <Input 
                        id="from-email" 
                        value={settings.emailFromAddress || ''}
                        onChange={(e) => updateSettings({ emailFromAddress: e.target.value })}
                        className="mt-1" 
                      />
                    </div>
                    <div>
                      <Label htmlFor="reply-to">Reply-To Email</Label>
                      <Input 
                        id="reply-to" 
                        value={settings.emailReplyTo || ''}
                        onChange={(e) => updateSettings({ emailReplyTo: e.target.value })}
                        className="mt-1" 
                      />
                    </div>
                    <div>
                      <Label htmlFor="email-signature">Email Signature</Label>
                      <Textarea 
                        id="email-signature" 
                        value={settings.emailSignature || ''}
                        onChange={(e) => updateSettings({ emailSignature: e.target.value })}
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="test-email">Test Email</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          id="test-email"
                          type="email"
                          placeholder="test@example.com"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                        />
                        <Button 
                          onClick={() => handlePlatformAction('test_email', { email: testEmail })}
                          disabled={isTestingEmail || !testEmail}
                          variant="outline"
                        >
                          {isTestingEmail ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Send Test'
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="p-8 space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Security Configuration</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-0 bg-gradient-to-br from-red-50 to-pink-50">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="w-5 h-5 text-red-600" />
                      <span>Authentication</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                      <Input 
                        id="session-timeout" 
                        type="number"
                        value={settings.sessionTimeout?.toString() || ''}
                        onChange={(e) => updateSettings({ sessionTimeout: parseInt(e.target.value) || 30 })}
                        className="mt-1" 
                      />
                    </div>
                    <div>
                      <Label htmlFor="max-login-attempts">Max Login Attempts</Label>
                      <Input 
                        id="max-login-attempts" 
                        type="number"
                        value={settings.maxLoginAttempts?.toString() || ''}
                        onChange={(e) => updateSettings({ maxLoginAttempts: parseInt(e.target.value) || 5 })}
                        className="mt-1" 
                      />
                    </div>
                    <div>
                      <Label htmlFor="lockout-duration">Lockout Duration (minutes)</Label>
                      <Input 
                        id="lockout-duration" 
                        type="number"
                        value={settings.lockoutDuration?.toString() || ''}
                        onChange={(e) => updateSettings({ lockoutDuration: parseInt(e.target.value) || 15 })}
                        className="mt-1" 
                      />
                    </div>
                    <div>
                      <Label htmlFor="password-min-length">Min Password Length</Label>
                      <Input 
                        id="password-min-length" 
                        type="number"
                        value={settings.passwordMinLength?.toString() || ''}
                        onChange={(e) => updateSettings({ passwordMinLength: parseInt(e.target.value) || 8 })}
                        className="mt-1" 
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={settings.requireTwoFactor || false}
                        onCheckedChange={(checked) => updateSettings({ requireTwoFactor: checked })}
                      />
                      <Label>Require 2FA for Admins</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={settings.requireStrongPassword !== false}
                        onCheckedChange={(checked) => updateSettings({ requireStrongPassword: checked })}
                      />
                      <Label>Force Strong Passwords</Label>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 bg-gradient-to-br from-yellow-50 to-orange-50">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Globe className="w-5 h-5 text-yellow-600" />
                      <span>API Security</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="rate-limit">Rate Limit (requests/minute)</Label>
                      <Input 
                        id="rate-limit" 
                        type="number"
                        value={settings.apiRateLimit?.toString() || ''}
                        onChange={(e) => updateSettings({ apiRateLimit: parseInt(e.target.value) || 100 })}
                        className="mt-1" 
                      />
                    </div>
                    <div>
                      <Label htmlFor="api-key-expiry">API Key Expiry (days)</Label>
                      <Input 
                        id="api-key-expiry" 
                        type="number"
                        value={settings.apiKeyExpiry?.toString() || ''}
                        onChange={(e) => updateSettings({ apiKeyExpiry: parseInt(e.target.value) || 365 })}
                        className="mt-1" 
                      />
                    </div>
                    <div>
                      <Label htmlFor="cors-origins">Allowed CORS Origins</Label>
                      <Textarea 
                        id="cors-origins" 
                        value={settings.corsOrigins || ''}
                        onChange={(e) => updateSettings({ corsOrigins: e.target.value })}
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={settings.apiLogging !== false}
                        onCheckedChange={(checked) => updateSettings({ apiLogging: checked })}
                      />
                      <Label>Enable API Logging</Label>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance" className="p-8 space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Appearance & Branding</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-0 bg-gradient-to-br from-orange-50 to-red-50">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Palette className="w-5 h-5 text-orange-600" />
                      <span>Theme Settings</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="primary-color">Primary Color</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Input 
                          id="primary-color" 
                          value={settings.primaryColor || ''}
                          onChange={(e) => updateSettings({ primaryColor: e.target.value })}
                          className="flex-1" 
                        />
                        <div 
                          className="w-10 h-10 rounded border"
                          style={{ backgroundColor: settings.primaryColor || '#3b82f6' }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="secondary-color">Secondary Color</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Input 
                          id="secondary-color" 
                          value={settings.secondaryColor || ''}
                          onChange={(e) => updateSettings({ secondaryColor: e.target.value })}
                          className="flex-1" 
                        />
                        <div 
                          className="w-10 h-10 rounded border"
                          style={{ backgroundColor: settings.secondaryColor || '#10b981' }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <Label>Default Theme</Label>
                      <Select 
                        value={settings.defaultTheme || 'light'}
                        onValueChange={(value) => updateSettings({ defaultTheme: value as 'light' | 'dark' | 'system' })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 bg-gradient-to-br from-pink-50 to-purple-50">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Building2 className="w-5 h-5 text-pink-600" />
                      <span>Branding</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="logo-url">Logo URL</Label>
                      <Input 
                        id="logo-url" 
                        value={settings.logoUrl || ''}
                        onChange={(e) => updateSettings({ logoUrl: e.target.value })}
                        className="mt-1" 
                      />
                    </div>
                    <div>
                      <Label htmlFor="favicon-url">Favicon URL</Label>
                      <Input 
                        id="favicon-url" 
                        value={settings.faviconUrl || ''}
                        onChange={(e) => updateSettings({ faviconUrl: e.target.value })}
                        className="mt-1" 
                      />
                    </div>
                    <div>
                      <Label htmlFor="footer-text">Footer Text</Label>
                      <Input 
                        id="footer-text" 
                        value={settings.footerText || ''}
                        onChange={(e) => updateSettings({ footerText: e.target.value })}
                        className="mt-1" 
                      />
                    </div>
                    <div>
                      <Label htmlFor="custom-css">Custom CSS</Label>
                      <Textarea 
                        id="custom-css" 
                        placeholder="/* Add your custom CSS here */"
                        value={settings.customCss || ''}
                        onChange={(e) => updateSettings({ customCss: e.target.value })}
                        className="mt-1 font-mono text-sm"
                        rows={4}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* System Settings */}
          <TabsContent value="system" className="p-8 space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">System Configuration</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-0 bg-gradient-to-br from-gray-50 to-slate-50">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Database className="w-5 h-5 text-gray-600" />
                      <span>Database</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="backup-frequency">Backup Frequency</Label>
                      <Select 
                        value={settings.databaseBackupFrequency || 'daily'}
                        onValueChange={(value) => updateSettings({ databaseBackupFrequency: value as 'daily' | 'weekly' | 'monthly' })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="retention-period">Backup Retention (days)</Label>
                      <Input 
                        id="retention-period" 
                        type="number"
                        value={settings.databaseRetentionDays?.toString() || ''}
                        onChange={(e) => updateSettings({ databaseRetentionDays: parseInt(e.target.value) || 30 })}
                        className="mt-1" 
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={settings.databaseAutoBackup !== false}
                        onCheckedChange={(checked) => updateSettings({ databaseAutoBackup: checked })}
                      />
                      <Label>Auto Backup</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={settings.databaseOptimization !== false}
                        onCheckedChange={(checked) => updateSettings({ databaseOptimization: checked })}
                      />
                      <Label>Database Optimization</Label>
                    </div>
                    <Button 
                      onClick={() => handlePlatformAction('backup')}
                      disabled={isBackingUp}
                      className="w-full bg-gradient-to-r from-gray-500 to-slate-500 hover:from-gray-600 hover:to-slate-600 text-white"
                    >
                      {isBackingUp ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      Run Backup Now
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Monitor className="w-5 h-5 text-blue-600" />
                      <span>Performance</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="cache-duration">Cache Duration (minutes)</Label>
                      <Input 
                        id="cache-duration" 
                        type="number"
                        value={settings.cacheDuration?.toString() || ''}
                        onChange={(e) => updateSettings({ cacheDuration: parseInt(e.target.value) || 60 })}
                        className="mt-1" 
                      />
                    </div>
                    <div>
                      <Label htmlFor="max-file-size">Max Upload Size (MB)</Label>
                      <Input 
                        id="max-file-size" 
                        type="number"
                        value={settings.maxUploadSize?.toString() || ''}
                        onChange={(e) => updateSettings({ maxUploadSize: parseInt(e.target.value) || 10 })}
                        className="mt-1" 
                      />
                    </div>
                    <div>
                      <Label htmlFor="log-level">Log Level</Label>
                      <Select 
                        value={settings.logLevel || 'info'}
                        onValueChange={(value) => updateSettings({ logLevel: value as 'error' | 'warn' | 'info' | 'debug' })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="debug">Debug</SelectItem>
                          <SelectItem value="info">Info</SelectItem>
                          <SelectItem value="warn">Warning</SelectItem>
                          <SelectItem value="error">Error</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={settings.cacheEnabled !== false}
                        onCheckedChange={(checked) => updateSettings({ cacheEnabled: checked })}
                      />
                      <Label>Enable Caching</Label>
                    </div>
                    <Button 
                      onClick={() => handlePlatformAction('clear_cache')}
                      disabled={isClearingCache}
                      className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
                    >
                      {isClearingCache ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      Clear Cache
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Save Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="flex justify-end space-x-4"
      >
        <Button variant="outline" className="rounded-xl">
          <RefreshCw className="w-4 h-4 mr-2" />
          Reset to Defaults
        </Button>
        <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl">
          <Save className="w-4 h-4 mr-2" />
          Save All Settings
        </Button>
      </motion.div>
    </div>
  );
}