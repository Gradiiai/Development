'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/shared/button';
import { Input } from '@/components/ui/shared/input';
import { Label } from '@/components/ui/shared/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/shared/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shared/tabs';
import { 
  Upload, FileText, X, Loader2, Send, User, Mail, Hash, Settings, AlertCircle, 
  Briefcase, Calendar, Plus, Edit, Trash2, Eye, Link as LinkIcon, Clock, 
  CheckCircle2, XCircle, Search, Filter, MoreVertical, Copy
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/shared/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shared/dialog';
import { useToast } from '@/shared/hooks/use-toast';
import { useSession } from 'next-auth/react';
import moment from 'moment';
// Removed PDFToText import - now using server-side Gemini parsing

interface DirectInterviewFlowProps {
  onInterviewCreated?: () => void;
  existingInterview?: any;
  isEditing?: boolean;
}

interface InterviewData {
  id: string;
  interviewId: string;
  candidateName: string | null;
  candidateEmail: string | null;
  jobPosition: string;
  jobDescription: string;
  yearsOfExperience: number;
  interviewType: 'mcq' | 'behavioral' | 'coding' | 'combo';
  numberOfQuestions?: number;
  difficultyLevel: 'easy' | 'medium' | 'hard';
  interviewDate: string | null;
  interviewTime: string | null;
  interviewStatus: string | null;
  interviewLink: string | null;
  linkExpiryTime: Date | null;
  createdAt: Date;
  createdBy: string;
}

interface FormData {
  candidateName: string;
  candidateEmail: string;
  resume: File | null;
  interviewType: 'mcq' | 'behavioral' | 'coding' | 'combo';
  numberOfQuestions: number;
  difficultyLevel: 'easy' | 'medium' | 'hard';
  jobPosition: string;
  yearsOfExperience: number;
  jobDescription: string;
  scheduleDate: string;
  scheduleTime: string;
}

const DirectInterviewFlow: React.FC<DirectInterviewFlowProps> = ({ 
  onInterviewCreated,
  existingInterview,
  isEditing = false 
}) => {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('create');
  const [interviews, setInterviews] = useState<InterviewData[]>([]);
  const [filteredInterviews, setFilteredInterviews] = useState<InterviewData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoadingInterviews, setIsLoadingInterviews] = useState(false);
  const [editingInterview, setEditingInterview] = useState<InterviewData | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [interviewToDelete, setInterviewToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState<FormData>(
    existingInterview ? {
      candidateName: existingInterview.candidateName || '',
      candidateEmail: existingInterview.candidateEmail || '',
      resume: null,
      interviewType: existingInterview.interviewType || 'behavioral',
      numberOfQuestions: existingInterview.numberOfQuestions || 5,
      difficultyLevel: existingInterview.difficultyLevel || 'medium',
      jobPosition: existingInterview.jobPosition || '',
      yearsOfExperience: existingInterview.yearsOfExperience || 0,
      jobDescription: existingInterview.jobDescription || '',
      scheduleDate: existingInterview.scheduleDate || '',
      scheduleTime: existingInterview.scheduleTime || ''
    } : {
      candidateName: '',
      candidateEmail: '',
      resume: null,
      interviewType: 'behavioral',
      numberOfQuestions: 5,
      difficultyLevel: 'medium',
      jobPosition: '',
      yearsOfExperience: 0,
      jobDescription: '',
      scheduleDate: '',
      scheduleTime: ''
    }
  );
  const [isLoading, setIsLoading] = useState(false);
  const [fileError, setFileError] = useState('');
  const { toast } = useToast();

  // Fetch interviews on component mount
  useEffect(() => {
    if (activeTab === 'manage') {
      fetchInterviews();
    }
  }, [activeTab, session]);

  // Filter interviews based on search and status
  useEffect(() => {
    let filtered = [...interviews];

    if (searchQuery) {
      filtered = filtered.filter(
        (interview) =>
          interview.jobPosition.toLowerCase().includes(searchQuery.toLowerCase()) ||
          interview.candidateName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          interview.candidateEmail?.toLowerCase().includes(searchQuery.toLowerCase())
          
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(
        (interview) => interview.interviewStatus?.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    setFilteredInterviews(filtered);
  }, [interviews, searchQuery, statusFilter]);

  const fetchInterviews = async () => {
    if (!session?.user?.id) return;

    try {
      setIsLoadingInterviews(true);
      
      // Fetch from multiple endpoints
     const [
  generalResponse,
  mcqResponse,
  codingResponse,
  comboResponse,
  behavioralResponse
] = await Promise.all([
  fetch('/api/interviews'),
  fetch('/api/interviews/mcq'),
  fetch('/api/interviews/coding'),
  fetch('/api/interviews/combo'),
  fetch('/api/interviews/behavioral')
]);

      let allInterviews: any[] = [];
      
      // Process each type of interview
      if (behavioralResponse.ok) {
        const data = await behavioralResponse.json();

        if (Array.isArray(data)) {
          allInterviews = [
            ...allInterviews,
            ...data.map((interview: any, index: number) => ({
              id: interview.id || `behavioral-${index}`,
              interviewType: 'behavioral',
              behavioralQuestion: interview.Question,
              behavioralAnswer: interview.Answer,
              ...interview,
            })),
          ];
        }
      }

      if (mcqResponse.ok) {
        const data = await mcqResponse.json();
        if (Array.isArray(data)) {
          allInterviews = [...allInterviews, ...data.map((interview: any) => ({
            ...interview,
            interviewType: 'mcq'
          }))];
        }
      }
      
      if (codingResponse.ok) {
        const data = await codingResponse.json();

        if (Array.isArray(data.data)) {

          allInterviews = [
            ...allInterviews,
            ...data.data.map((interview: any) => ({
              ...interview,
              codingQuestions: JSON.parse(interview.codingQuestions),
              interviewType: 'coding',
            })),
          ];
        }
      }      
      if (comboResponse.ok) {
        const data = await comboResponse.json();
        if (Array.isArray(data)) {
          allInterviews = [...allInterviews, ...data.map((interview: any) => ({
            ...interview,
            interviewType: 'combo'
          }))];
        }
      }
      
      // Remove duplicates and sort by creation date
      const uniqueInterviews = allInterviews.filter((interview, index, self) => 
        index === self.findIndex(i => i.interviewId === interview.interviewId)
      ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setInterviews(uniqueInterviews);
      console.log(uniqueInterviews)
      console.log(allInterviews)
    } catch (error) {
      console.error('Error fetching interviews:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch interviews',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingInterviews(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | number | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setFileError('Only PDF files are allowed');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setFileError('File size must be less than 5MB');
        return;
      }
      setFileError('');
      handleInputChange('resume', file);
      
      // Auto-parse PDF and fill candidate details
      parsePDFContent(file);
    }
  };

  const parsePDFContent = async (file: File) => {
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      
      const response = await fetch('/api/candidates/resumes/direct-interview', {
        method: 'POST',
        body: uploadFormData
      });
      
      if (!response.ok) {
        throw new Error('Failed to parse resume');
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        const { name, email, phone } = result.data;
        
        if (name && !formData.candidateName) {
          handleInputChange('candidateName', name);
        }
        
        if (email && !formData.candidateEmail) {
          handleInputChange('candidateEmail', email);
        }
        
        // You can also use phone if needed in the future
        console.log('Extracted phone:', phone);
      }
    } catch (error) {
      console.error('Error parsing resume:', error);
      toast({
        title: 'Resume Parsing',
        description: 'Could not extract information from resume. Please fill details manually.',
        variant: 'default'
      });
    }
  };

  const removeFile = () => {
    handleInputChange('resume', null);
    setFileError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.candidateName || !formData.candidateEmail || !formData.jobPosition || !formData.jobDescription || !formData.scheduleDate || !formData.scheduleTime) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      let interviewData: any = {
        candidateName: formData.candidateName,
        candidateEmail: formData.candidateEmail,
        interviewDate: formData.scheduleDate,
        interviewTime: formData.scheduleTime,
      };

      // Add fields specific to each interview type
      if (formData.interviewType === 'coding') {
        interviewData = {
          ...interviewData,
          interviewTopic: formData.jobPosition || 'General Programming', // Use job position as topic
          difficultyLevel: formData.difficultyLevel || 'medium',
          problemDescription: formData.jobDescription || 'Programming challenge',
          timeLimit: 60, // Default 60 minutes
          programmingLanguage: 'Python', // Default language
        };
      } else if (formData.interviewType === 'mcq') {
        interviewData = {
          ...interviewData,
          jobPosition: formData.jobPosition || 'General Position',
          jobDescription: formData.jobDescription || 'General job description',
          yearsOfExperience: formData.yearsOfExperience || 0,
          numberOfQuestions: formData.numberOfQuestions || 5,
          difficulty: formData.difficultyLevel || 'medium',
        };
      } else if (formData.interviewType === 'behavioral') {
        interviewData = {
          ...interviewData,
          jobPosition: formData.jobPosition || 'General Position',
          jobDescription: formData.jobDescription || 'General job description',
          yearsOfExperience: formData.yearsOfExperience || 0,
        };
      } else if (formData.interviewType === 'combo') {
        interviewData = {
          ...interviewData,
          jobPosition: formData.jobPosition || 'General Position',
          jobDescription: formData.jobDescription || 'General job description',
          yearsOfExperience: formData.yearsOfExperience || 0,
          totalQuestions: formData.numberOfQuestions || 5,
          difficulty: formData.difficultyLevel || 'medium',
        };
      }

      // Determine API endpoint and method based on interview type and editing mode
      let apiEndpoint = '/api/interviews';
      let method = 'POST';
      
      if (isEditing && existingInterview) {
        method = 'PUT';
        if (formData.interviewType === 'coding') {
          apiEndpoint = `/api/interviews/coding?interviewId=${existingInterview.interviewId}`;
        } else if (formData.interviewType === 'combo') {
          apiEndpoint = `/api/interviews/combo?interviewId=${existingInterview.interviewId}`;
        } else if (formData.interviewType === 'mcq') {
          apiEndpoint = `/api/interviews/mcq?interviewId=${existingInterview.interviewId}`;
        } else if (formData.interviewType === 'behavioral') {
          apiEndpoint = `/api/interviews/behavioral?interviewId=${existingInterview.interviewId}`;
        } else {
          apiEndpoint = `/api/interviews?interviewId=${existingInterview.interviewId}`;
        }
      } else {
        if (formData.interviewType === 'coding') {
          apiEndpoint = '/api/interviews/coding';
        } else if (formData.interviewType === 'combo') {
          apiEndpoint = '/api/interviews/combo';
        } else if (formData.interviewType === 'mcq') {
          apiEndpoint = '/api/interviews/mcq';
        } else if (formData.interviewType === 'behavioral') {
          apiEndpoint = '/api/interviews/behavioral';
        } else {
          apiEndpoint = '/api/interviews';
        }
      }

      // Debug logging
      console.log('Form Data:', formData);
      console.log('Interview Data being sent:', interviewData);
      console.log('API Endpoint:', apiEndpoint);

      const response = await fetch(apiEndpoint, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(interviewData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create interview');
      }

      const result = await response.json();
      
      toast({
        title: isEditing ? 'Interview Updated' : 'Interview Generated',
        description: isEditing ? 'Interview has been updated successfully' : 'Interview link has been sent to the candidate via email',
      });

      // Reset form only if not editing
      if (!isEditing) {
        setFormData({
          candidateName: '',
          candidateEmail: '',
          resume: null,
          interviewType: 'behavioral',
          numberOfQuestions: 5,
          difficultyLevel: 'medium',
          jobPosition: '',
          yearsOfExperience: 0,
          jobDescription: '',
          scheduleDate: '',
          scheduleTime: ''
        });
      }

      // Refresh interviews list if we're on the manage tab
      if (activeTab === 'manage') {
        fetchInterviews();
      }

      // Switch to manage tab to show the created interview
      setActiveTab('manage');

      if (onInterviewCreated) {
        onInterviewCreated();
      }
    } catch (error) {
      console.error('Error creating interview:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create interview',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditInterview = (interview: InterviewData) => {
    setEditingInterview(interview);
    setFormData({
      candidateName: interview.candidateName || '',
      candidateEmail: interview.candidateEmail || '',
      resume: null,
      interviewType: interview.interviewType,
      numberOfQuestions: interview.numberOfQuestions || 5,
      difficultyLevel: interview.difficultyLevel,
      jobPosition: interview.jobPosition,
      yearsOfExperience: interview.yearsOfExperience,
      jobDescription: interview.jobDescription,
      scheduleDate: interview.interviewDate || '',
      scheduleTime: interview.interviewTime || ''
    });
    setActiveTab('create');
  };

  const handleDeleteClick = (interviewId: string) => {
    setInterviewToDelete(interviewId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteInterview = async () => {
    if (!interviewToDelete) return;
    
    try {
      setIsDeleting(true);
      
      const interviewToDeleteObj = interviews.find(interview => interview.interviewId === interviewToDelete);
      if (!interviewToDeleteObj) {
        throw new Error('Interview not found');
      }
      
      let deleteResponse;
      const interviewType = interviewToDeleteObj.interviewType;
      
      if (interviewType === 'behavioral') {
        deleteResponse = await fetch(`/api/interviews/behavioral?interviewId=${interviewToDelete}`, {
          method: 'DELETE',
        });
      } else if (interviewType === 'mcq') {
        deleteResponse = await fetch(`/api/interviews/mcq?interviewId=${interviewToDelete}`, {
          method: 'DELETE',
        });
      } else if (interviewType === 'coding') {
        deleteResponse = await fetch(`/api/interviews/coding?interviewId=${interviewToDelete}`, {
          method: 'DELETE',
        });
      } else if (interviewType === 'combo') {
        deleteResponse = await fetch(`/api/interviews/combo?interviewId=${interviewToDelete}`, {
          method: 'DELETE',
        });
      }
      
      if (!deleteResponse?.ok) {
        let errorMessage = 'Failed to delete interview';
        try {
          const contentType = deleteResponse?.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await deleteResponse?.json();
            errorMessage = errorData?.error || errorMessage;
          } else {
            // If response is not JSON, try to get text content
            const errorText = await deleteResponse?.text();
            if (errorText) {
              errorMessage = errorText;
            }
          }
        } catch (parseError) {
          // If parsing fails, use the default error message
          console.warn('Failed to parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }
      
      // Update the local state
      const updatedList = interviews.filter((interview) => interview.interviewId !== interviewToDelete);
      setInterviews(updatedList);
      
      toast({
        title: 'Interview deleted',
        description: 'The interview has been successfully deleted.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error deleting interview:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete the interview. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setInterviewToDelete(null);
    }
  };

  const copyInterviewLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({
      title: 'Link copied',
      description: 'Interview link copied to clipboard',
      variant: 'default',
    });
  };

  const getStatusColor = (status: string | null) => {
    if (!status) return 'text-gray-600 bg-gray-50';
    
    switch (status.toLowerCase()) {
      case 'scheduled':
        return 'text-blue-600 bg-blue-50';
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'no-show':
        return 'text-red-600 bg-red-50';
      case 'in-progress':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDateTime = (date: string | null, time: string | null) => {
    if (!date) return 'Not scheduled';
    return `${moment(date).format('MMM D, YYYY')}${time ? ' at ' + time : ''}`;
  };

  const getInterviewTypeColor = (type: string) => {
    switch (type) {
      case 'mcq':
        return 'bg-blue-100 text-blue-800';
      case 'behavioral':
        return 'bg-green-100 text-green-800';
      case 'coding':
        return 'bg-purple-100 text-purple-800';
      case 'combo':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const cancelEdit = () => {
    setEditingInterview(null);
    setFormData({
      candidateName: '',
      candidateEmail: '',
      resume: null,
      interviewType: 'behavioral',
      numberOfQuestions: 5,
      difficultyLevel: 'medium',
      jobPosition: '',
      yearsOfExperience: 0,
      jobDescription: '',
      scheduleDate: '',
      scheduleTime: ''
    });
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {editingInterview ? 'Edit Interview' : 'Create Interview'}
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Manage Interviews ({interviews.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          {editingInterview && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>You are editing an existing interview</span>
                <Button variant="outline" size="sm" onClick={cancelEdit}>
                  Cancel Edit
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
        {/* Candidate Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Candidate Information
            </CardTitle>
            <CardDescription>
              Enter candidate details or upload resume for auto-fill
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="candidateName">Candidate Name (Optional)</Label>
                <Input
                  id="candidateName"
                  value={formData.candidateName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('candidateName', e.target.value)}
                  placeholder="Auto-filled from resume or enter manually"
                  className="border-gray-300 focus:border-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="candidateEmail">Candidate Email (Optional)</Label>
                <Input
                  id="candidateEmail"
                  type="email"
                  value={formData.candidateEmail}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('candidateEmail', e.target.value)}
                  placeholder="Auto-filled from resume or enter manually"
                  className="border-gray-300 focus:border-blue-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resume Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Resume Upload
            </CardTitle>
            <CardDescription>
              Upload PDF resume to auto-fill candidate details (Only PDF allowed)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!formData.resume ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Upload candidate's resume (PDF only, max 5MB)
                  </p>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="resume-upload"
                  />
                  <label
                    htmlFor="resume-upload"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer transition-colors"
                  >
                    Choose PDF File
                  </label>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-900">{formData.resume.name}</p>
                    <p className="text-xs text-green-700">
                      {(formData.resume.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeFile}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            {fileError && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{fileError}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Job Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Job Information
            </CardTitle>
            <CardDescription>
              Enter job details for interview question generation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jobPosition">Job Position/Role *</Label>
                <Input
                  id="jobPosition"
                  value={formData.jobPosition}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('jobPosition', e.target.value)}
                  placeholder="e.g., Software Engineer, Product Manager"
                  className="border-gray-300 focus:border-blue-500"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearsOfExperience">Years of Experience Required *</Label>
                <Input
                  id="yearsOfExperience"
                  type="number"
                  min="0"
                  max="50"
                  value={formData.yearsOfExperience}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('yearsOfExperience', parseInt(e.target.value) || 0)}
                  placeholder="e.g., 3"
                  className="border-gray-300 focus:border-blue-500"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobDescription">Job/Role Description *</Label>
              <textarea
                id="jobDescription"
                value={formData.jobDescription}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('jobDescription', e.target.value)}
                placeholder="Describe the key responsibilities, required skills, and qualifications for this role..."
                className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-vertical"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Schedule Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Schedule Information
            </CardTitle>
            <CardDescription>
              Set the interview date and time
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduleDate">Interview Date *</Label>
                <Input
                  id="scheduleDate"
                  type="date"
                  value={formData.scheduleDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('scheduleDate', e.target.value)}
                  className="border-gray-300 focus:border-blue-500"
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduleTime">Interview Time *</Label>
                <Input
                  id="scheduleTime"
                  type="time"
                  value={formData.scheduleTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('scheduleTime', e.target.value)}
                  className="border-gray-300 focus:border-blue-500"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interview Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Interview Configuration
            </CardTitle>
            <CardDescription>
              Configure interview type, questions, and difficulty
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="interviewType">Type of Interview</Label>
                <Select
                  value={formData.interviewType}
                  onValueChange={(value: 'mcq' | 'behavioral' | 'coding' | 'combo') => 
                    handleInputChange('interviewType', value)
                  }
                >
                  <SelectTrigger className="border-gray-300 focus:border-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mcq">MCQ</SelectItem>
                    <SelectItem value="behavioral">Behavioral</SelectItem>
                    <SelectItem value="coding">Coding</SelectItem>
                    <SelectItem value="combo">Combo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="numberOfQuestions">Number of Questions</Label>
                <Input
                  id="numberOfQuestions"
                  type="number"
                  min="1"
                  max="20"
                  value={formData.numberOfQuestions}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('numberOfQuestions', parseInt(e.target.value) || 5)}
                  className="border-gray-300 focus:border-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="difficultyLevel">Difficulty Level</Label>
                <Select
                  value={formData.difficultyLevel}
                  onValueChange={(value: 'easy' | 'medium' | 'hard') => 
                    handleInputChange('difficultyLevel', value)
                  }
                >
                  <SelectTrigger className="border-gray-300 focus:border-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              {editingInterview && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelEdit}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingInterview ? 'Updating Interview...' : 'Generating Interview...'}
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {editingInterview ? 'Update Interview' : 'Generate Interview'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="manage" className="space-y-6">
          {/* Search and Filter Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search & Filter
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search by candidate name, email, or job position..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="no-show">No Show</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Interviews List */}
          <div className="space-y-4">
            {isLoadingInterviews ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading interviews...</span>
              </div>
            ) : filteredInterviews.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchQuery || statusFilter !== 'all' ? 'No interviews found' : 'No interviews created yet'}
                  </h3>
                  <p className="text-gray-600 text-center mb-4">
                    {searchQuery || statusFilter !== 'all' 
                      ? 'Try adjusting your search or filter criteria'
                      : 'Create your first interview to get started'
                    }
                  </p>
                  {!searchQuery && statusFilter === 'all' && (
                    <Button onClick={() => setActiveTab('create')} className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Create Interview
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <AnimatePresence>
                {filteredInterviews.map((interview, index) => (
                  <motion.div
                    key={interview.interviewId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Card className="hover:shadow-lg transition-shadow duration-200">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg">{interview.jobPosition}</CardTitle>
                              <Badge className={getInterviewTypeColor(interview.interviewType)}>
                                {interview.interviewType.toUpperCase()}
                              </Badge>
                              {interview.interviewStatus && (
                                <Badge className={getStatusColor(interview.interviewStatus)}>
                                  {interview.interviewStatus}
                                </Badge>
                              )}
                            </div>
                            <CardDescription className="flex items-center gap-4 text-sm">
                              {interview.candidateName && (
                                <span className="flex items-center gap-1">
                                  <User className="h-4 w-4" />
                                  {interview.candidateName}
                                </span>
                              )}
                              {interview.candidateEmail && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-4 w-4" />
                                  {interview.candidateEmail}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {formatDateTime(interview.interviewDate, interview.interviewTime)}
                              </span>
                            </CardDescription>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditInterview(interview)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Interview
                              </DropdownMenuItem>
                              {interview.interviewLink && (
                                <DropdownMenuItem onClick={() => copyInterviewLink(interview.interviewLink!)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy Link
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteClick(interview.interviewId)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Interview
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-medium text-sm text-gray-700 mb-1">Job Description</h4>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {interview?.jobDescription?.length > 150 
                                ? `${interview.jobDescription.substring(0, 150)}...` 
                                : interview.jobDescription
                              }
                            </p>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Experience:</span>
                              <p className="text-gray-600">{interview.yearsOfExperience} years</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Difficulty:</span>
                              <p className="text-gray-600 capitalize">{interview.difficultyLevel}</p>
                            </div>
                            {interview.numberOfQuestions && (
                              <div>
                                <span className="font-medium text-gray-700">Questions:</span>
                                <p className="text-gray-600">{interview.numberOfQuestions}</p>
                              </div>
                            )}
                            <div>
                              <span className="font-medium text-gray-700">Created:</span>
                              <p className="text-gray-600">{moment(interview.createdAt).format('MMM D, YYYY')}</p>
                            </div>
                          </div>
                          {interview.interviewLink && (
                            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                              <LinkIcon className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-900">Interview Link Available</span>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => copyInterviewLink(interview.interviewLink!)}
                                className="ml-auto"
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                Copy
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Interview</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this interview? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteInterview} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DirectInterviewFlow;