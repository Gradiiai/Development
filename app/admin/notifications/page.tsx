'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Badge } from '@/components/ui/shared/badge';
import { Button } from '@/components/ui/shared/button';
import { Input } from '@/components/ui/shared/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/shared/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shared/tabs';
import { 
  Bell, 
  Send, 
  Users, 
  Building2, 
  Mail, 
  MessageSquare, 
  Settings,
  Plus,
  Edit,
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  recipients: 'all' | 'companies' | 'users' | 'specific';
  status: 'draft' | 'scheduled' | 'sent';
  createdAt: string;
  scheduledFor?: string;
  sentAt?: string;
  recipientCount?: number;
}

interface NotificationSettings {
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  defaultSender: string;
  retryAttempts: number;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'System Maintenance Notice',
    message: 'Scheduled maintenance will occur on Sunday from 2-4 AM EST.',
    type: 'info',
    recipients: 'all',
    status: 'sent',
    createdAt: '2024-01-15T10:00:00Z',
    sentAt: '2024-01-15T10:30:00Z',
    recipientCount: 1247
  },
  {
    id: '2',
    title: 'New Feature Release',
    message: 'We\'ve released new analytics features for better insights.',
    type: 'success',
    recipients: 'companies',
    status: 'scheduled',
    createdAt: '2024-01-14T15:00:00Z',
    scheduledFor: '2024-01-16T09:00:00Z',
    recipientCount: 89
  },
  {
    id: '3',
    title: 'Security Alert',
    message: 'Unusual login activity detected. Please review your account.',
    type: 'warning',
    recipients: 'specific',
    status: 'draft',
    createdAt: '2024-01-14T12:00:00Z',
    recipientCount: 5
  }
];

const mockSettings: NotificationSettings = {
  emailEnabled: true,
  pushEnabled: true,
  smsEnabled: false,
  defaultSender: 'noreply@company.com',
  retryAttempts: 3
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'info':
      return <Bell className="w-4 h-4 text-blue-500" />;
    case 'warning':
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    case 'success':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'error':
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    default:
      return <Bell className="w-4 h-4 text-gray-500" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'sent':
      return <Badge className="bg-green-100 text-green-800">Sent</Badge>;
    case 'scheduled':
      return <Badge className="bg-blue-100 text-blue-800">Scheduled</Badge>;
    case 'draft':
      return <Badge variant="outline">Draft</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [settings, setSettings] = useState<NotificationSettings>(mockSettings);
  const [isCreating, setIsCreating] = useState(false);
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'info' as const,
    recipients: 'all' as const,
    scheduledFor: ''
  });

  const handleCreateNotification = () => {
    const notification: Notification = {
      id: Date.now().toString(),
      ...newNotification,
      status: newNotification.scheduledFor ? 'scheduled' : 'draft',
      createdAt: new Date().toISOString(),
      recipientCount: newNotification.recipients === 'all' ? 1247 : 
                     newNotification.recipients === 'companies' ? 89 : 
                     newNotification.recipients === 'users' ? 1158 : 0
    };
    
    setNotifications([notification, ...notifications]);
    setNewNotification({
      title: '',
      message: '',
      type: 'info',
      recipients: 'all',
      scheduledFor: ''
    });
    setIsCreating(false);
  };

  const handleSendNotification = (id: string) => {
    setNotifications(notifications.map(notif => 
      notif.id === id 
        ? { ...notif, status: 'sent' as const, sentAt: new Date().toISOString() }
        : notif
    ));
  };

  const handleDeleteNotification = (id: string) => {
    setNotifications(notifications.filter(notif => notif.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            Manage system notifications and communication settings
          </p>
        </div>
        <Button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Notification
        </Button>
      </div>

      <Tabs defaultValue="notifications" className="space-y-4">
        <TabsList>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-4">
          {/* Create Notification Form */}
          {isCreating && (
            <Card>
              <CardHeader>
                <CardTitle>Create New Notification</CardTitle>
                <CardDescription>
                  Send notifications to users, companies, or specific recipients
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      placeholder="Notification title"
                      value={newNotification.title}
                      onChange={(e) => setNewNotification({...newNotification, title: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Type</label>
                    <Select 
                      value={newNotification.type} 
                      onValueChange={(value: any) => setNewNotification({...newNotification, type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message</label>
                  <Textarea
                    placeholder="Notification message"
                    value={newNotification.message}
                    onChange={(e) => setNewNotification({...newNotification, message: e.target.value})}
                    rows={3}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Recipients</label>
                    <Select 
                      value={newNotification.recipients} 
                      onValueChange={(value: any) => setNewNotification({...newNotification, recipients: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="companies">Companies Only</SelectItem>
                        <SelectItem value="users">Individual Users</SelectItem>
                        <SelectItem value="specific">Specific Recipients</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Schedule For (Optional)</label>
                    <Input
                      type="datetime-local"
                      value={newNotification.scheduledFor}
                      onChange={(e) => setNewNotification({...newNotification, scheduledFor: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateNotification}>
                    Create Notification
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreating(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notifications List */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>
              <CardDescription>
                Manage and track your notification campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-shrink-0 mt-1">
                      {getTypeIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{notification.title}</h3>
                        {getStatusBadge(notification.status)}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Recipients: {notification.recipientCount}</span>
                        <span>Type: {notification.recipients}</span>
                        {notification.sentAt && (
                          <span>Sent: {new Date(notification.sentAt).toLocaleString()}</span>
                        )}
                        {notification.scheduledFor && (
                          <span>Scheduled: {new Date(notification.scheduledFor).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {notification.status === 'draft' && (
                        <Button 
                          size="sm" 
                          onClick={() => handleSendNotification(notification.id)}
                          className="flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" />
                          Send
                        </Button>
                      )}
                      <Button size="sm" variant="outline">
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDeleteNotification(notification.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure notification delivery methods and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Email Notifications</label>
                    <p className="text-xs text-gray-500">Send notifications via email</p>
                  </div>
                  <Switch 
                    checked={settings.emailEnabled}
                    onCheckedChange={(checked) => setSettings({...settings, emailEnabled: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Push Notifications</label>
                    <p className="text-xs text-gray-500">Send browser push notifications</p>
                  </div>
                  <Switch 
                    checked={settings.pushEnabled}
                    onCheckedChange={(checked) => setSettings({...settings, pushEnabled: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">SMS Notifications</label>
                    <p className="text-xs text-gray-500">Send notifications via SMS</p>
                  </div>
                  <Switch 
                    checked={settings.smsEnabled}
                    onCheckedChange={(checked) => setSettings({...settings, smsEnabled: checked})}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Default Sender Email</label>
                  <Input
                    value={settings.defaultSender}
                    onChange={(e) => setSettings({...settings, defaultSender: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Retry Attempts</label>
                  <Select 
                    value={settings.retryAttempts.toString()}
                    onValueChange={(value) => setSettings({...settings, retryAttempts: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 attempt</SelectItem>
                      <SelectItem value="2">2 attempts</SelectItem>
                      <SelectItem value="3">3 attempts</SelectItem>
                      <SelectItem value="5">5 attempts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button>Save Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Templates</CardTitle>
              <CardDescription>
                Pre-built templates for common notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Mail className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Notification templates coming soon...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}