'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/shared/button';
import { Input } from '@/components/ui/shared/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/shared/dialog';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/shared/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/shared/card';
import { Badge } from '@/components/ui/shared/badge';
import { Switch } from '@/components/ui/shared/switch';
import { Label } from '@/components/ui/shared/label';
import { useToast } from '@/shared/hooks/use-toast';
import { Loader2, Plus, Edit, Trash2, Check, X, Sparkles, Wand2 } from 'lucide-react';

type SkillTemplate = {
  id: string;
  companyId: string;
  createdBy: string;
  templateName: string;
  jobCategory: string;
  skills: any;
  jobDuties?: string;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type Skill = {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
};

export default function SkillTemplatesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<SkillTemplate[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<SkillTemplate | null>(null);
  const [jobCategories, setJobCategories] = useState<string[]>([]);
  
  // Form state for adding/editing templates
  const [formData, setFormData] = useState({
    templateName: '',
    jobCategory: '',  // Will be populated when job categories are fetched
    skills: [{ name: '', level: 'intermediate' as const }],
    jobDuties: '',
    isDefault: false,
  });

  // AI Generation state
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  useEffect(() => {
    if (!session) return;
    fetchTemplates();
    fetchJobCategories();
  }, [session]);
  
  const fetchJobCategories = async () => {
    try {
      const response = await fetch('/api/job-categories');
      const data = await response.json();

      if (data.success && data.data.length > 0) {
        setJobCategories(data.data);
        // Update form data with first job category if available
        setFormData(prev => ({
          ...prev,
          jobCategory: data.data[0]
        }));
      } else {
        // Fallback to default categories if API returns empty
        const defaultCategories = ['Software Development', 'Data Science', 'Product Management', 'Design', 'Marketing', 'Sales', 'Customer Support', 'Human Resources', 'Finance', 'Operations'];
        setJobCategories(defaultCategories);
        setFormData(prev => ({
          ...prev,
          jobCategory: defaultCategories[0]
        }));
      }
    } catch (error) {
      console.error('Error fetching job categories:', error);
      // Fallback to default categories on error
      const defaultCategories = ['Software Development', 'Data Science', 'Product Management', 'Design', 'Marketing', 'Sales', 'Customer Support', 'Human Resources', 'Finance', 'Operations'];
      setJobCategories(defaultCategories);
      setFormData(prev => ({
        ...prev,
        jobCategory: defaultCategories[0]
      }));
    }
  };

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/content/skill-templates');
      const data = await response.json();

      if (data.success) {
        setTemplates(data.data);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch templates',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTemplate = async () => {
    try {
      // Validate skills
      const validSkills = formData.skills.filter(skill => skill.name.trim() !== '');
      if (validSkills.length === 0) {
        toast({
          title: 'Error',
          description: 'At least one skill is required',
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch('/api/content/skill-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          skills: validSkills,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Template added successfully',
        });
        setIsAddDialogOpen(false);
        resetForm();
        fetchTemplates();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to add template',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error adding template:', error);
      toast({
        title: 'Error',
        description: 'Failed to add template',
        variant: 'destructive',
      });
    }
  };

  const handleEditTemplate = async () => {
    if (!currentTemplate) return;

    try {
      // Validate skills
      const validSkills = formData.skills.filter(skill => skill.name.trim() !== '');
      if (validSkills.length === 0) {
        toast({
          title: 'Error',
          description: 'At least one skill is required',
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch(`/api/skill-templates/${currentTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          skills: validSkills,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Template updated successfully',
        });
        setIsEditDialogOpen(false);
        resetForm();
        fetchTemplates();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update template',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: 'Error',
        description: 'Failed to update template',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(`/api/skill-templates/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Template deleted successfully',
        });
        fetchTemplates();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to delete template',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      templateName: '',
      jobCategory: jobCategories.length > 0 ? jobCategories[0] : 'Software Development',
      skills: [{ name: '', level: 'intermediate' }],
      jobDuties: '',
      isDefault: false,
    });
    setCurrentTemplate(null);
  };

  const openEditDialog = (template: SkillTemplate) => {
    setCurrentTemplate(template);
    setFormData({
      templateName: template.templateName,
      jobCategory: template.jobCategory,
      skills: template.skills || [{ name: '', level: 'intermediate' }],
      jobDuties: template.jobDuties || '',
      isDefault: template.isDefault || false,
    });
    setIsEditDialogOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, isDefault: checked }));
  };

  const handleSkillChange = (index: number, field: 'name' | 'level', value: string) => {
    const updatedSkills = [...formData.skills];
    updatedSkills[index] = { ...updatedSkills[index], [field]: value };
    setFormData((prev) => ({ ...prev, skills: updatedSkills }));
  };

  const addSkill = () => {
    setFormData((prev) => ({
      ...prev,
      skills: [...prev.skills, { name: '', level: 'intermediate' }],
    }));
  };

  const removeSkill = (index: number) => {
    const updatedSkills = [...formData.skills];
    updatedSkills.splice(index, 1);
    setFormData((prev) => ({ ...prev, skills: updatedSkills }));
  };

  // AI Generation functions
  const generateSkillTemplateWithAI = async () => {
    if (!aiPrompt.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a prompt for AI generation',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingAI(true);
    try {
      const response = await fetch('/api/ai/generate-skill-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          jobCategory: formData.jobCategory,
          templateName: formData.templateName,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setFormData(prev => ({
          ...prev,
          templateName: data.templateName || prev.templateName,
          skills: data.skills || prev.skills,
          jobDuties: data.jobDuties || prev.jobDuties,
        }));
        setAiPrompt('');
        toast({
          title: 'Success',
          description: 'Skill template generated successfully with AI',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to generate skill template with AI',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error generating skill template with AI:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate skill template with AI',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const generateSkillsForJobWithAI = async () => {
    if (!formData.jobCategory && !formData.templateName) {
      toast({
        title: 'Error',
        description: 'Please provide a job category or template name for AI generation',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingAI(true);
    try {
      const response = await fetch('/api/ai/generate-skills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobCategory: formData.jobCategory,
          templateName: formData.templateName,
          existingSkills: formData.skills.filter(skill => skill.name.trim() !== ''),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setFormData(prev => ({
          ...prev,
          skills: data.skills || prev.skills,
        }));
        toast({
          title: 'Success',
          description: 'Skills generated successfully with AI',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to generate skills with AI',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error generating skills with AI:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate skills with AI',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const renderTemplateForm = () => (
    <div className="space-y-4">
      {/* AI Generation Section */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI-Powered Skill Template Generation
          </CardTitle>
          <CardDescription>
            Use AI to generate skill templates and job duties based on your requirements.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="aiPrompt" className="text-sm font-medium">
              AI Prompt
            </label>
            <Textarea
              id="aiPrompt"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Describe the role or skills you want to generate. E.g., 'Create a skill template for a senior full-stack developer with React and Node.js experience' or 'Generate skills for a data scientist role focusing on machine learning'"
              rows={3}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={generateSkillTemplateWithAI}
              disabled={isGeneratingAI || !aiPrompt.trim()}
              className="flex-1"
            >
              {isGeneratingAI ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              Generate Complete Template
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={generateSkillsForJobWithAI}
              disabled={isGeneratingAI || (!formData.jobCategory && !formData.templateName)}
              className="flex-1"
            >
              {isGeneratingAI ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate Skills Only
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <label htmlFor="templateName" className="text-sm font-medium">
          Template Name
        </label>
        <Input
          id="templateName"
          name="templateName"
          value={formData.templateName}
          onChange={handleInputChange}
          placeholder="E.g., Frontend Developer, Data Scientist, etc."
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="jobCategory" className="text-sm font-medium">
          Job Category
        </label>
        <Select
          value={formData.jobCategory}
          onValueChange={(value) => handleSelectChange('jobCategory', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select job category" />
          </SelectTrigger>
          <SelectContent>
            {jobCategories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Skills</label>
        <div className="space-y-2">
          {formData.skills.map((skill, index) => (
            <div key={index} className="flex items-center space-x-2">
              <Input
                placeholder="Skill name"
                value={skill.name}
                onChange={(e) => handleSkillChange(index, 'name', e.target.value)}
                className="flex-grow"
              />
              <Select
                value={skill.level}
                onValueChange={(value) => handleSkillChange(index, 'level', value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Proficiency level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => removeSkill(index)}
                disabled={formData.skills.length <= 1}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={addSkill} className="mt-2">
          <Plus className="h-4 w-4 mr-2" /> Add Skill
        </Button>
      </div>

      <div className="space-y-2">
        <label htmlFor="jobDuties" className="text-sm font-medium">
          Job Duties & Responsibilities
        </label>
        <Textarea
          id="jobDuties"
          name="jobDuties"
          value={formData.jobDuties}
          onChange={handleInputChange}
          placeholder="Enter job duties and responsibilities here..."
          rows={5}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isDefault"
          checked={formData.isDefault}
          onCheckedChange={handleSwitchChange}
        />
        <Label htmlFor="isDefault">Set as default template for this job category</Label>
      </div>
    </div>
  );

  const getSkillLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner':
        return 'bg-blue-100 text-blue-800';
      case 'intermediate':
        return 'bg-green-100 text-green-800';
      case 'advanced':
        return 'bg-yellow-100 text-yellow-800';
      case 'expert':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Please sign in to access Skill Templates</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Skill Templates</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" /> Add New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Skill Template</DialogTitle>
              <DialogDescription>
                Create a new template with skills and job duties for your job campaigns.
              </DialogDescription>
            </DialogHeader>
            {renderTemplateForm()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddTemplate}>Save Template</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No templates found. Add your first template to get started.</p>
            </div>
          ) : (
            <Table>
              <TableCaption>A list of all skill templates.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Template Name</TableHead>
                  <TableHead>Job Category</TableHead>
                  <TableHead>Skills</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.templateName}</TableCell>
                    <TableCell>{template.jobCategory}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {template.skills.slice(0, 3).map((skill: Skill, index: number) => (
                          <Badge key={index} className={getSkillLevelColor(skill.level)}>
                            {skill.name}
                          </Badge>
                        ))}
                        {template.skills.length > 3 && (
                          <Badge variant="outline">
                            +{template.skills.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {template.isDefault ? (
                        <Badge className="bg-green-100 text-green-800">
                          <Check className="h-3 w-3 mr-1" /> Default
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openEditDialog(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDeleteTemplate(template.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Skill Template</DialogTitle>
            <DialogDescription>
              Update the details of this skill template.
            </DialogDescription>
          </DialogHeader>
          {renderTemplateForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditTemplate}>Update Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}