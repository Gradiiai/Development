'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Button } from '@/components/ui/shared/button';
import { Input } from '@/components/ui/shared/input';
import { Badge } from '@/components/ui/shared/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/shared/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shared/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/shared/label';
import { Switch } from '@/components/ui/shared/switch';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  Users, 
  Briefcase, 
  ArrowRight, 
  Sparkles, 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Brain,
  Clock,
  Globe,
  Lock,
  Loader2,
  Copy,
  Eye,
  Download
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface Template {
  id: string;
  name: string;
  description: string;
  type: 'skill' | 'interview' | 'job_description';
  category: string;
  content?: any;
  questions?: number;
  skills?: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  isPublic: boolean;
  aiGenerated: boolean;
  createdBy: string;
  companyId: string;
  usageCount?: number;
}

interface AIGenerationForm {
  type: 'skill' | 'interview' | 'job_description';
  jobTitle: string;
  jobCategory: string;
  experienceLevel: string;
  companySize: string;
  industry: string;
  specificRequirements: string;
  difficultyLevel: string;
  timeLimit?: number;
  numberOfQuestions?: number;
  focusAreas: string[];
  isPublic: boolean;
}

export default function TemplatesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  const [aiForm, setAiForm] = useState<AIGenerationForm>({
    type: 'interview',
    jobTitle: '',
    jobCategory: '',
    experienceLevel: 'mid',
    companySize: 'medium',
    industry: '',
    specificRequirements: '',
    difficultyLevel: 'medium',
    timeLimit: 45,
    numberOfQuestions: 10,
    focusAreas: [],
    isPublic: false
  });

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    type: 'interview' as 'skill' | 'interview' | 'job_description',
    category: '',
    difficultyLevel: 'medium' as 'easy' | 'medium' | 'hard',
    timeLimit: 45,
    isPublic: false
  });

  const jobCategories = [
    'Software Engineering',
    'Data Science',
    'Product Management',
    'Marketing',
    'Sales',
    'Design',
    'Operations',
    'Finance',
    'Human Resources',
    'Customer Success',
    'DevOps',
    'Quality Assurance'
  ];

  const experienceLevels = [
    { value: 'entry', label: 'Entry Level (0-2 years)' },
    { value: 'mid', label: 'Mid Level (3-5 years)' },
    { value: 'senior', label: 'Senior Level (6-10 years)' },
    { value: 'lead', label: 'Lead/Principal (10+ years)' },
    { value: 'executive', label: 'Executive Level' }
  ];

  const focusAreaOptions = {
    interview: [
      'Technical Skills',
      'Problem Solving',
      'Communication',
      'Leadership',
      'Team Collaboration',
      'Cultural Fit',
      'Domain Knowledge',
      'System Design',
      'Coding Ability',
      'Analytical Thinking'
    ],
    skill: [
      'Programming Languages',
      'Frameworks',
      'Databases',
      'Cloud Platforms',
      'DevOps Tools',
      'Soft Skills',
      'Industry Knowledge',
      'Certifications',
      'Project Management',
      'Communication Skills'
    ],
    job_description: [
      'Responsibilities',
      'Requirements',
      'Benefits',
      'Company Culture',
      'Growth Opportunities',
      'Technical Stack',
      'Team Structure',
      'Remote Work',
      'Compensation',
      'Perks'
    ]
  };

  useEffect(() => {
    if (session?.user?.companyId) {
      fetchTemplates();
    }
  }, [session]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/content/templates');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTemplates(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  const handleAIGeneration = async () => {
    if (!aiForm.jobTitle.trim() || !aiForm.jobCategory.trim()) {
      toast.error('Please fill in job title and category');
      return;
    }

    try {
      setAiGenerating(true);
      const response = await fetch('/api/content/templates/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: aiForm.type,
          category: aiForm.jobCategory,
          requirements: {
            jobTitle: aiForm.jobTitle,
            experienceLevel: aiForm.experienceLevel,
            companySize: aiForm.companySize,
            industry: aiForm.industry,
            specificRequirements: aiForm.specificRequirements,
            focusAreas: aiForm.focusAreas,
            numberOfQuestions: aiForm.numberOfQuestions
          },
          difficultyLevel: aiForm.difficultyLevel,
          timeLimit: aiForm.timeLimit,
          isPublic: aiForm.isPublic
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Template generated successfully!');
        fetchTemplates();
        setShowAIDialog(false);
        setAiForm({
          type: 'interview',
          jobTitle: '',
          jobCategory: '',
          experienceLevel: 'mid',
          companySize: 'medium',
          industry: '',
          specificRequirements: '',
          difficultyLevel: 'medium',
          timeLimit: 45,
          numberOfQuestions: 10,
          focusAreas: [],
          isPublic: false
        });
      } else {
        toast.error(data.error || 'Failed to generate template');
      }
    } catch (error) {
      console.error('Error generating template:', error);
      toast.error('Failed to generate template');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim() || !newTemplate.description.trim() || !newTemplate.category.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('/api/content/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTemplate),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Template created successfully');
        fetchTemplates();
        setShowCreateDialog(false);
        setNewTemplate({ 
          name: '', 
          description: '', 
          type: 'interview', 
          category: '', 
          difficultyLevel: 'medium', 
          timeLimit: 45,
          isPublic: false
        });
      } else {
        toast.error(data.error || 'Failed to create template');
      }
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    }
  };

  const handleDeleteTemplate = async (template: Template) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(`/api/content/templates?id=${template.id}&type=${template.type}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Template deleted successfully');
        fetchTemplates();
      } else {
        toast.error(data.error || 'Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handleTogglePublic = async (template: Template) => {
    try {
      const response = await fetch(`/api/content/templates`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          id: template.id,
          name: template.name,
          description: template.description,
          type: template.type,
          category: template.category,
          content: template.content,
          isPublic: !template.isPublic,
          isActive: template.isActive
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Template ${!template.isPublic ? 'shared publicly' : 'made private'}`);
        fetchTemplates();
      } else {
        toast.error(data.error || 'Failed to update template');
      }
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Failed to update template');
    }
  };

  const handleDuplicateTemplate = async (template: Template) => {
    try {
      const response = await fetch(`/api/content/templates/duplicate?id=${template.id}&type=${template.type}`, {
        method: 'POST',
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Template duplicated successfully');
        fetchTemplates();
      } else {
        toast.error(data.error || 'Failed to duplicate template');
      }
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast.error('Failed to duplicate template');
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || template.type === activeTab;
    return matchesSearch && matchesTab;
  });

  const templateStats = {
    all: templates.length,
    interview: templates.filter(t => t.type === 'interview').length,
    skill: templates.filter(t => t.type === 'skill').length,
    job_description: templates.filter(t => t.type === 'job_description').length,
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
            <p className="mt-2 text-gray-600">Loading templates...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI-Powered Templates</h1>
          <p className="text-gray-600 mt-1">Create, manage, and share intelligent templates for interviews, skills, and job descriptions</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                <Brain className="h-4 w-4 mr-2" />
                AI Generate
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  AI Template Generator
                </DialogTitle>
                <DialogDescription>
                  Let AI create a comprehensive template based on your requirements
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Template Type</Label>
                    <Select value={aiForm.type} onValueChange={(value: any) => setAiForm(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="interview">Interview Template</SelectItem>
                        <SelectItem value="skill">Skill Template</SelectItem>
                        <SelectItem value="job_description">Job Description Template</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Job Category</Label>
                    <Select value={aiForm.jobCategory} onValueChange={(value) => setAiForm(prev => ({ ...prev, jobCategory: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {jobCategories.map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Job Title</Label>
                  <Input
                    value={aiForm.jobTitle}
                    onChange={(e) => setAiForm(prev => ({ ...prev, jobTitle: e.target.value }))}
                    placeholder="e.g., Senior Frontend Developer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Experience Level</Label>
                    <Select value={aiForm.experienceLevel} onValueChange={(value) => setAiForm(prev => ({ ...prev, experienceLevel: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {experienceLevels.map(level => (
                          <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Company Size</Label>
                    <Select value={aiForm.companySize} onValueChange={(value) => setAiForm(prev => ({ ...prev, companySize: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="startup">Startup (1-50)</SelectItem>
                        <SelectItem value="medium">Medium (51-500)</SelectItem>
                        <SelectItem value="large">Large (500+)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Industry</Label>
                  <Input
                    value={aiForm.industry}
                    onChange={(e) => setAiForm(prev => ({ ...prev, industry: e.target.value }))}
                    placeholder="e.g., FinTech, E-commerce, Healthcare"
                  />
                </div>

                {aiForm.type === 'interview' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Number of Questions</Label>
                      <Input
                        type="number"
                        value={aiForm.numberOfQuestions}
                        onChange={(e) => setAiForm(prev => ({ ...prev, numberOfQuestions: parseInt(e.target.value) || 10 }))}
                        min="5"
                        max="50"
                      />
                    </div>
                    <div>
                      <Label>Time Limit (minutes)</Label>
                      <Input
                        type="number"
                        value={aiForm.timeLimit}
                        onChange={(e) => setAiForm(prev => ({ ...prev, timeLimit: parseInt(e.target.value) || 45 }))}
                        min="15"
                        max="180"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label>Focus Areas</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {focusAreaOptions[aiForm.type]?.map(area => (
                      <label key={area} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={aiForm.focusAreas.includes(area)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAiForm(prev => ({ ...prev, focusAreas: [...prev.focusAreas, area] }));
                            } else {
                              setAiForm(prev => ({ ...prev, focusAreas: prev.focusAreas.filter(a => a !== area) }));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{area}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Specific Requirements</Label>
                  <Textarea
                    value={aiForm.specificRequirements}
                    onChange={(e) => setAiForm(prev => ({ ...prev, specificRequirements: e.target.value }))}
                    placeholder="Any specific requirements, technologies, or focus areas..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={aiForm.isPublic}
                    onCheckedChange={(checked) => setAiForm(prev => ({ ...prev, isPublic: checked }))}
                  />
                  <Label>Make this template public (available to all companies)</Label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleAIGeneration} 
                    disabled={aiGenerating}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    {aiGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Template
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAIDialog(false)} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Manual Create
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Template</DialogTitle>
                <DialogDescription>
                  Create a new template manually
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Template Name</Label>
                  <Input
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter template name"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter template description"
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={newTemplate.type} onValueChange={(value: any) => setNewTemplate(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interview">Interview Template</SelectItem>
                      <SelectItem value="skill">Skill Template</SelectItem>
                      <SelectItem value="job_description">Job Description Template</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category</Label>
                  <Input
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="Enter category"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newTemplate.isPublic}
                    onCheckedChange={(checked) => setNewTemplate(prev => ({ ...prev, isPublic: checked }))}
                  />
                  <Label>Make this template public</Label>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleCreateTemplate} className="flex-1">
                    Create Template
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({templateStats.all})</TabsTrigger>
          <TabsTrigger value="interview">Interview ({templateStats.interview})</TabsTrigger>
          <TabsTrigger value="skill">Skills ({templateStats.skill})</TabsTrigger>
          <TabsTrigger value="job_description">Job Descriptions ({templateStats.job_description})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredTemplates.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
                <p className="text-gray-600 mb-4">Create your first AI-powered template to get started.</p>
                <Button onClick={() => setShowAIDialog(true)} className="bg-gradient-to-r from-purple-600 to-blue-600">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate with AI
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{template.name}</h3>
                          <Badge variant={template.type === 'interview' ? 'default' : template.type === 'skill' ? 'secondary' : 'outline'}>
                            {template.type.replace('_', ' ')}
                          </Badge>
                          {template.aiGenerated && (
                            <Badge variant="outline" className="text-purple-600 border-purple-600">
                              <Sparkles className="h-3 w-3 mr-1" />
                              AI Generated
                            </Badge>
                          )}
                          {template.isActive && (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              Active
                            </Badge>
                          )}
                          {template.isPublic ? (
                            <Badge variant="outline" className="text-blue-600 border-blue-600">
                              <Globe className="h-3 w-3 mr-1" />
                              Public
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-600 border-gray-600">
                              <Lock className="h-3 w-3 mr-1" />
                              Private
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-600 mb-3">{template.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>Category: {template.category}</span>
                          {template.questions && <span>{template.questions} questions</span>}
                          {template.skills && <span>{template.skills} skills</span>}
                          {template.usageCount && <span>Used {template.usageCount} times</span>}
                          <span>Created: {new Date(template.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setShowPreviewDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Preview
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDuplicateTemplate(template)}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Duplicate
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleTogglePublic(template)}
                        >
                          {template.isPublic ? <Lock className="h-4 w-4 mr-1" /> : <Globe className="h-4 w-4 mr-1" />}
                          {template.isPublic ? 'Make Private' : 'Make Public'}
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDeleteTemplate(template)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Template Preview: {selectedTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <p className="text-sm text-gray-600">{selectedTemplate.type.replace('_', ' ')}</p>
                </div>
                <div>
                  <Label>Category</Label>
                  <p className="text-sm text-gray-600">{selectedTemplate.category}</p>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <p className="text-sm text-gray-600">{selectedTemplate.description}</p>
              </div>
              {selectedTemplate.content && (
                <div>
                  <Label>Content Preview</Label>
                  <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(selectedTemplate.content, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}