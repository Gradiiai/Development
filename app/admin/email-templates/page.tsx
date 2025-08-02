'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Badge } from '@/components/ui/shared/badge';
import { Button } from '@/components/ui/shared/button';
import { Input } from '@/components/ui/shared/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shared/tabs';
import { 
  Mail, 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  Eye, 
  Send,
  FileText,
  Settings,
  Code,
  Palette,
  Users,
  Building2
} from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  description: string;
  category: 'welcome' | 'notification' | 'marketing' | 'system' | 'interview';
  status: 'active' | 'draft' | 'archived';
  lastModified: string;
  usageCount: number;
  htmlContent: string;
  textContent: string;
}

const mockTemplates: EmailTemplate[] = [
  {
    id: '1',
    name: 'Welcome Email',
    subject: 'Welcome to our platform!',
    description: 'Welcome email for new user registrations',
    category: 'welcome',
    status: 'active',
    lastModified: '2024-01-15T10:00:00Z',
    usageCount: 1247,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Welcome to our platform!</h1>
        <p>Thank you for joining us. We're excited to have you on board.</p>
        <a href="{{dashboard_url}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Get Started</a>
      </div>
    `,
    textContent: 'Welcome to our platform! Thank you for joining us. Visit {{dashboard_url}} to get started.'
  },
  {
    id: '2',
    name: 'Interview Invitation',
    subject: 'Interview Invitation - {{company_name}}',
    description: 'Email template for interview invitations',
    category: 'interview',
    status: 'active',
    lastModified: '2024-01-14T15:00:00Z',
    usageCount: 892,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Interview Invitation</h2>
        <p>Dear {{candidate_name}},</p>
        <p>You have been invited to an interview with {{company_name}}.</p>
        <p><strong>Position:</strong> {{position}}</p>
        <p><strong>Date:</strong> {{interview_date}}</p>
        <p><strong>Time:</strong> {{interview_time}}</p>
        <a href="{{interview_link}}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Join Interview</a>
      </div>
    `,
    textContent: 'Dear {{candidate_name}}, You have been invited to an interview with {{company_name}}. Position: {{position}}, Date: {{interview_date}}, Time: {{interview_time}}. Join at: {{interview_link}}'
  },
  {
    id: '3',
    name: 'Password Reset',
    subject: 'Reset your password',
    description: 'Password reset email template',
    category: 'system',
    status: 'active',
    lastModified: '2024-01-13T12:00:00Z',
    usageCount: 456,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>You requested a password reset. Click the button below to reset your password:</p>
        <a href="{{reset_link}}" style="background: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p><small>This link will expire in 24 hours.</small></p>
      </div>
    `,
    textContent: 'You requested a password reset. Visit {{reset_link}} to reset your password. This link expires in 24 hours.'
  },
  {
    id: '4',
    name: 'Monthly Newsletter',
    subject: 'Your monthly update',
    description: 'Monthly newsletter template',
    category: 'marketing',
    status: 'draft',
    lastModified: '2024-01-12T09:00:00Z',
    usageCount: 0,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Monthly Update</h1>
        <p>Here's what's new this month...</p>
        <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 5px;">
          <h3>New Features</h3>
          <ul>
            <li>Feature 1</li>
            <li>Feature 2</li>
          </ul>
        </div>
      </div>
    `,
    textContent: 'Monthly Update: Here\'s what\'s new this month... New Features: Feature 1, Feature 2'
  }
];

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'welcome':
      return <Users className="w-4 h-4 text-blue-500" />;
    case 'interview':
      return <Building2 className="w-4 h-4 text-green-500" />;
    case 'system':
      return <Settings className="w-4 h-4 text-gray-500" />;
    case 'marketing':
      return <Mail className="w-4 h-4 text-purple-500" />;
    case 'notification':
      return <FileText className="w-4 h-4 text-orange-500" />;
    default:
      return <Mail className="w-4 h-4 text-gray-500" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-100 text-green-800">Active</Badge>;
    case 'draft':
      return <Badge variant="outline">Draft</Badge>;
    case 'archived':
      return <Badge className="bg-gray-100 text-gray-800">Archived</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>(mockTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    subject: '',
    description: '',
    category: 'notification' as const,
    htmlContent: '',
    textContent: ''
  });

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || template.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleCreateTemplate = () => {
    const template: EmailTemplate = {
      id: Date.now().toString(),
      ...newTemplate,
      status: 'draft',
      lastModified: new Date().toISOString(),
      usageCount: 0
    };
    
    setTemplates([template, ...templates]);
    setNewTemplate({
      name: '',
      subject: '',
      description: '',
      category: 'notification',
      htmlContent: '',
      textContent: ''
    });
    setIsCreating(false);
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates(templates.filter(template => template.id !== id));
    if (selectedTemplate?.id === id) {
      setSelectedTemplate(null);
    }
  };

  const handleDuplicateTemplate = (template: EmailTemplate) => {
    const duplicated: EmailTemplate = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} (Copy)`,
      status: 'draft',
      lastModified: new Date().toISOString(),
      usageCount: 0
    };
    
    setTemplates([duplicated, ...templates]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Templates</h1>
          <p className="text-muted-foreground">
            Create and manage email templates for automated communications
          </p>
        </div>
        <Button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Template
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Templates List */}
        <div className="lg:col-span-1 space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="welcome">Welcome</SelectItem>
                    <SelectItem value="interview">Interview</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="notification">Notification</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Templates List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Templates ({filteredTemplates.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                      selectedTemplate?.id === template.id ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getCategoryIcon(template.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-sm truncate">{template.name}</h3>
                          {getStatusBadge(template.status)}
                        </div>
                        <p className="text-xs text-gray-600 mb-1 truncate">{template.subject}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{template.usageCount} uses</span>
                          <span>•</span>
                          <span>{new Date(template.lastModified).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredTemplates.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Mail className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No templates found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Template Editor/Viewer */}
        <div className="lg:col-span-2">
          {isCreating ? (
            <Card>
              <CardHeader>
                <CardTitle>Create New Template</CardTitle>
                <CardDescription>
                  Create a new email template for automated communications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Template Name</label>
                    <Input
                      placeholder="Template name"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Select 
                      value={newTemplate.category} 
                      onValueChange={(value: any) => setNewTemplate({...newTemplate, category: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="welcome">Welcome</SelectItem>
                        <SelectItem value="interview">Interview</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="notification">Notification</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject Line</label>
                  <Input
                    placeholder="Email subject"
                    value={newTemplate.subject}
                    onChange={(e) => setNewTemplate({...newTemplate, subject: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    placeholder="Template description"
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">HTML Content</label>
                  <Textarea
                    placeholder="HTML email content"
                    value={newTemplate.htmlContent}
                    onChange={(e) => setNewTemplate({...newTemplate, htmlContent: e.target.value})}
                    rows={8}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Text Content</label>
                  <Textarea
                    placeholder="Plain text version"
                    value={newTemplate.textContent}
                    onChange={(e) => setNewTemplate({...newTemplate, textContent: e.target.value})}
                    rows={4}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateTemplate}>
                    Create Template
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreating(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : selectedTemplate ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {getCategoryIcon(selectedTemplate.category)}
                      {selectedTemplate.name}
                    </CardTitle>
                    <CardDescription>{selectedTemplate.description}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleDuplicateTemplate(selectedTemplate)}>
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDeleteTemplate(selectedTemplate.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="preview" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                    <TabsTrigger value="html">HTML</TabsTrigger>
                    <TabsTrigger value="text">Text</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="preview">
                    <div className="space-y-4">
                      <div className="p-4 border rounded-lg bg-gray-50">
                        <div className="text-sm font-medium mb-2">Subject: {selectedTemplate.subject}</div>
                        <div 
                          className="bg-white p-4 border rounded"
                          dangerouslySetInnerHTML={{ __html: selectedTemplate.htmlContent }}
                        />
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="html">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">HTML Content</label>
                      <Textarea
                        value={selectedTemplate.htmlContent}
                        readOnly
                        rows={12}
                        className="font-mono text-sm"
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="text">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Text Content</label>
                      <Textarea
                        value={selectedTemplate.textContent}
                        readOnly
                        rows={8}
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="settings">
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium">Category</label>
                          <p className="text-sm text-gray-600 capitalize">{selectedTemplate.category}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Status</label>
                          <div className="mt-1">{getStatusBadge(selectedTemplate.status)}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Usage Count</label>
                          <p className="text-sm text-gray-600">{selectedTemplate.usageCount} times</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Last Modified</label>
                          <p className="text-sm text-gray-600">{new Date(selectedTemplate.lastModified).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center">
                  <Mail className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Template Selected</h3>
                  <p className="text-gray-500 mb-4">Select a template from the list to view or edit it</p>
                  <Button onClick={() => setIsCreating(true)}>
                    Create New Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}