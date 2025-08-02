'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/shared/button';
import { Input } from '@/components/ui/shared/input';
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
} from '@/components/ui/shared/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/shared/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Badge } from '@/components/ui/shared/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/shared/label';
import { toast } from 'sonner';
import { 
  Loader2, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Sparkles, 
  ArrowLeft, 
  FolderOpen, 
  FileText, 
  MoreVertical,
  Eye,
  Copy,
  Star,
  Clock,
  Users,
  TrendingUp,
  BookOpen,
  Brain,
  Code,
  MessageSquare,
  CheckCircle2,
  ListChecks ,
  AlertCircle,
  Calendar,
  Layers
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/shared/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shared/tabs';
import { 
  QUESTION_CATEGORIES, 
  QUESTION_TYPES, 
  DIFFICULTY_LEVELS,
  CATEGORY_INFO,
  APTITUDE_SUBCATEGORIES,
  TECHNICAL_SUBCATEGORIES,
  BEHAVIORAL_SUBCATEGORIES,
  SCREENING_SUBCATEGORIES,
  SOFT_SKILLS_SUBCATEGORIES
} from '@/lib/constants/question-bank';

// Define the Question type
interface Question {
  id: string;
  questionBankId: string;
  questionType: string;
  category: string;
  subCategory?: string;
  difficultyLevel: string;
  question: string;
  expectedAnswer?: string;
  sampleAnswer?: string;
  scoringRubric?: any;
  multipleChoiceOptions?: any;
  correctAnswer?: string;
  explanation?: string;
  tags?: string;
  skills?: string;
  competencies?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  timeToAnswer?: number;
  isPublic: boolean;
  aiGenerated: boolean;
  usageCount: number;
  averageScore?: number;
  validatedBy?: string;
  validatedAt?: string;
  revisionNumber: number;
}

// Define the QuestionBank type
interface QuestionBank {
  id: string;
  name: string;
  description?: string;
  category: string;
  subCategory?: string;
  tags?: string;
  isPublic: boolean;
  isActive: boolean;
  isTemplate?: boolean;
  questionCount?: number;
  usageCount?: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Question Bank Template type
interface QuestionBankTemplate {
  id?: string;
  name: string;
  description: string;
  category: string;
  subCategory?: string;
  questionTypes: string[];
  targetRoles: string[];
  difficultyLevels: string[];
  estimatedQuestions: number;
}

export default function QuestionBankPage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  // Main state
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  
  // View state
  const [currentView, setCurrentView] = useState<'banks' | 'questions'>('banks');
  const [selectedBank, setSelectedBank] = useState<QuestionBank | null>(null);
  
  // Dialog states
  const [isBankDialogOpen, setIsBankDialogOpen] = useState(false);
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
const [progress, setProgress] = useState(0);
const[isGenerate, setIsGenerate] = useState(false);
  // Question Bank form state
  const [bankFormData, setBankFormData] = useState({
    name: '',
    description: '',
    category: '',
    subCategory: '',
    tags: '',
    isPublic: false,
    isTemplate: false,
  });
  
  // Templates state
  const [templates, setTemplates] = useState<QuestionBankTemplate[]>([]);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<QuestionBankTemplate | null>(null);
  
  // Dependency checking state
  const [dependencyInfo, setDependencyInfo] = useState<any>(null);
  const [showDependencyDialog, setShowDependencyDialog] = useState(false);
  const [bankToDelete, setBankToDelete] = useState<QuestionBank | null>(null);
  
  // Enhanced filters
  const [bankFilters, setBankFilters] = useState({
    category: '',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc'
  });
  
  // Question form state
  const [questionFormData, setQuestionFormData] = useState({
    questionType: '',
    category: '',
    difficultyLevel: '',
    question: '',
    expectedAnswer: '',
    sampleAnswer: '',
    scoringRubric: '',
    tags: '',
  });
  
  // Filter state for questions
  const [questionFilters, setQuestionFilters] = useState({
    questionType: '',
    search: '',
  });
  
  // AI Generation state
  const [aiFormData, setAiFormData] = useState({
    type: '',
    count: 1,
    jobTitle: '',
    behavioralCount:1,
    mcqCount:1,
    codingCount:1,
    jobDescription: '',
    yearsOfExperience: '',
    difficulty: 'medium',
    topic: '',
    category: '',
  });

  useEffect(() => {
    if (!session) return;
    if (currentView === 'banks') {
      fetchQuestionBanks();
    }
  }, [session, currentView]);

  useEffect(() => {
    if (selectedBank && currentView === 'questions') {
      fetchQuestions();
    }
  }, [selectedBank, currentView, questionFilters]);

  const fetchQuestionBanks = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/content/questions/banks');
      const data = await response.json();

      if (data.success) {
        setQuestionBanks(data.data);
      } else {
        toast.error(data.error || 'Failed to fetch question banks');
      }
    } catch (error) {
      console.error('Error fetching question banks:', error);
      toast.error('Failed to fetch question banks');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async () => {
    if (!selectedBank) return;
    
    setQuestionsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (questionFilters.questionType && questionFilters.questionType !== 'all') {
        queryParams.append('questionType', questionFilters.questionType);
      }
      if (questionFilters.search) {
        queryParams.append('search', questionFilters.search);
      }

      const response = await fetch(`/api/content/questions/banks/${selectedBank.id}?${queryParams.toString()}`);
      const data = await response.json();

      if (data.success) {
        setQuestions(data.data.questions);
      } else {
        toast.error(data.error || 'Failed to fetch questions');
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Failed to fetch questions');
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleCreateQuestionBank = async () => {
    try {
      const response = await fetch('/api/content/questions/banks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bankFormData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Question bank created successfully');
        setIsBankDialogOpen(false);
        resetBankForm();
        fetchQuestionBanks();
      } else {
        toast.error(data.error || 'Failed to create question bank');
      }
    } catch (error) {
      console.error('Error creating question bank:', error);
      toast.error('Failed to create question bank');
    }
  };

  const handleCreateQuestion = async () => {
    if (!selectedBank) return;
    
    try {
      const response = await fetch('/api/content/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...questionFormData,
          questionBankId: selectedBank.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Question created successfully');
        setIsQuestionDialogOpen(false);
        resetQuestionForm();
        fetchQuestions();
      } else {
        toast.error(data.error || 'Failed to create question');
      }
    } catch (error) {
      console.error('Error creating question:', error);
      toast.error('Failed to create question');
    }
  };

  const handleUpdateQuestion = async () => {
    if (!editingQuestion) return;
    
    try {
      const response = await fetch(`/api/content/questions/${editingQuestion.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(questionFormData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Question updated successfully');
        setIsQuestionDialogOpen(false);
        setEditingQuestion(null);
        resetQuestionForm();
        fetchQuestions();
      } else {
        toast.error(data.error || 'Failed to update question');
      }
    } catch (error) {
      console.error('Error updating question:', error);
      toast.error('Failed to update question');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    
    try {
      const response = await fetch(`/api/content/questions/${questionId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Question deleted successfully');
        fetchQuestions();
      } else {
        toast.error(data.error || 'Failed to delete question');
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Failed to delete question');
    }
  };
  const checkDependenciesAndDelete = async (bank: QuestionBank) => {
    try {
      // First check dependencies
      const response = await fetch(`/api/content/question-banks/${bank.id}/dependencies`);
      const data = await response.json();

      if (data.success) {
        setDependencyInfo(data.data);
        setBankToDelete(bank);
        setShowDependencyDialog(true);
      } else {
        toast.error('Failed to check dependencies');
      }
    } catch (error) {
      console.error('Error checking dependencies:', error);
      toast.error('Failed to check dependencies');
    }
  };

  const handleDeleteQuestionBank = async () => {
    if (!bankToDelete) return;
    
    try {
      const response = await fetch(`/api/content/questions/banks/${bankToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Question bank deleted successfully');
        setShowDependencyDialog(false);
        setBankToDelete(null);
        setDependencyInfo(null);
        fetchQuestionBanks();
      } else {
        if (response.status === 409) {
          // Conflict - show detailed error information
          toast.error(data.details?.message || 'Cannot delete question bank - it is in use');
        } else {
          toast.error(data.error || 'Failed to delete question bank');
        }
      }
    } catch (error) {
      console.error('Error deleting question bank:', error);
      toast.error('Failed to delete question bank');
    }
  };

  // Function to fetch templates
  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/content/question-bank-templates');
      const data = await response.json();
      
      if (data.success) {
        setTemplates(data.data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  // Function to create question bank from template
 const createFromTemplate = async (template: QuestionBankTemplate, customName?: string, customDescription?: string) => {
  try {
    const response = await fetch('/api/content/question-bank-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: template.name,
        customName,
        customDescription,
      }),
    });

    const data = await response.json();

    if (data.success) {
      toast.success(data.message || 'Question bank created from template');
      setShowTemplateDialog(false);
      setSelectedTemplate(null);
      fetchQuestionBanks();

      if (data.data?.id) {
        const questionBankId = data.data.id;

        for (const type of template.questionTypes) {
          let endpoint = '';
          switch (type) {
            case 'coding':
              endpoint = '/api/ai/generate-coding';
              break;
            case 'mcq':
              endpoint = '/api/ai/generate-mcq';
              break;
            case 'behavioral':
              endpoint = '/api/ai/generate-behavioral';
              break;
            // Add other types if needed
            default:
              continue;
          }

          const response = await fetch(endpoint, {
            method: 'POST',
            body: new URLSearchParams({
              questionBankId: questionBankId,
              topic: template.name || template.description || 'General',
              totalQuestions: '5',
              difficulty: 'medium',
              type: type,
            }),
          });

          if (response.ok) {
            const responseText = await response.text();
            const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const aiQuestions = JSON.parse(cleanedText);

            // Convert AI questions to DB format and save
            const questionsToSave = aiQuestions.map((q: any) => {
              if (type === 'coding') {
                return {
                  questionType: 'coding',
                  question: q.title + '\n\n' + q.description,
                  expectedAnswer: q.explanation,
                  category: template.name || 'Technical',
                  difficultyLevel: q.difficulty || 'medium',
                  questionBankId: questionBankId,
                };
              } else if (type === 'mcq') {
                return {
                  questionType: 'mcq',
                  question: q.question,
                  expectedAnswer: q.correctAnswer,
                  category: template.name || 'Technical',
                  difficultyLevel: q.difficulty || 'medium',
                  questionBankId: questionBankId,
                };
              } else if (type === 'behavioral') {
                return {
                  questionType: 'behavioral',
                  question: q.question,
                  expectedAnswer: q.purpose,
                  category: template.name || 'Behavioral',
                  difficultyLevel: 'medium',
                  questionBankId: questionBankId,
                };
              }
            });

            for (const questionData of questionsToSave) {
              await fetch('/api/content/questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(questionData),
              });
            }
          } else {
            toast.error(`Failed to generate ${type} questions`);
          }
        }

        fetchQuestions();
      }
    } else {
      toast.error(data.error || 'Failed to create question bank from template');
    }
  } catch (error) {
    console.error('Error creating from template:', error);
    toast.error('Failed to create question bank from template');
  }
};
  const handleGenerateQuestions = async () => {
    if (!selectedBank) return;
    
    setIsGenerate(true);
    try {
      // Determine the endpoint based on question type
      let endpoint = '';
      switch (aiFormData.type) {
        case 'coding':
          endpoint = '/api/ai/generate-coding';
          break;
        case 'behavioral':
          endpoint = '/api/ai/generate-behavioral';
          break;
        case 'mcq':
          endpoint = '/api/ai/generate-mcq';
          break;
        case 'combo':
          endpoint = '/api/ai/generate-combo';
          break;
        default:
          toast.error('Please select a question type');
          return;
      }
      

      // Prepare form data
      const formData = new FormData();
      formData.append('topic', aiFormData.topic || selectedBank?.name || 'General');
      formData.append('totalQuestions', String(aiFormData.count));
      formData.append('jobDescription', aiFormData.jobDescription || '');
      formData.append('difficulty', aiFormData.difficulty || 'medium');
      formData.append('type', aiFormData.type || '');
      formData.append('experience',aiFormData.yearsOfExperience || '')
      formData.append('jobTitle',aiFormData.jobTitle || '')

      if (aiFormData.type === 'combo') {
        formData.append('coding', String(aiFormData.codingCount));
        formData.append('behavioral', String(aiFormData.behavioralCount));
        formData.append('mcq', String(aiFormData.mcqCount));
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

const responseText = await response.text();

if (response.ok) {
  // ✅ Sanitize AI response: remove ```json and ```
  const cleanedText = responseText
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  let aiQuestions;
  try {
    aiQuestions = JSON.parse(cleanedText);
  } catch (err) {
    console.error('Invalid JSON from AI:', cleanedText);
    toast.error('Failed to parse AI response');
    return;
  }        
        // Convert AI format to our database format and save
        let questionsToSave = [];
        
        if (aiFormData.type === 'combo') {
          // Handle combo questions
          if (aiQuestions.coding) {
            questionsToSave.push(...aiQuestions.coding.map((q: any) => ({
              questionType: 'coding',
              question: q.title + '\n\n' + q.description,
              expectedAnswer: q.explanation,
              category: aiFormData.category || 'Technical',
              difficultyLevel: q.difficulty || 'medium',
              questionBankId: selectedBank.id
            })));
          }
          if (aiQuestions.behavioral) {
            questionsToSave.push(...aiQuestions.behavioral.map((q: any) => ({
              questionType: 'behavioral',
              question: q.question,
              expectedAnswer: q.purpose,
              category: aiFormData.category || 'Behavioral',
              difficultyLevel: 'medium',
              questionBankId: selectedBank.id
            })));
          }
          if (aiQuestions.mcq) {
            questionsToSave.push(...aiQuestions.mcq.map((q: any) => ({
              questionType: 'mcq',
              question: q.question,
              expectedAnswer: q.correctAnswer,
              category: aiFormData.category || 'Technical',
              difficultyLevel: q.difficulty || 'medium',
              questionBankId: selectedBank.id
            })));
          }
        } else {
          // Handle single type questions
          questionsToSave = aiQuestions.map((q: any) => ({
            questionType: aiFormData.type,
            question: aiFormData.type === 'coding' ? q.title + '\n\n' + q.description : q.question || q.title,
            expectedAnswer: q.explanation || q.purpose || q.correctAnswer,
            category: aiFormData.category || 'General',
            difficultyLevel: q.difficulty || 'medium',
            questionBankId: selectedBank.id
          }));
        }

        // Save questions to database
        for (const questionData of questionsToSave) {
          await fetch('/api/content/questions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(questionData),
          });
        }

        toast.success(`Generated ${questionsToSave.length} questions successfully`);
        fetchQuestions();
      } else {
        toast.error('Failed to generate questions');
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      toast.error('Failed to generate questions');
    } finally {
      setIsGenerating(false);
    }
  };

  const resetBankForm = () => {
    setBankFormData({
      name: '',
      description: '',
      category: '',
      subCategory: '',
      tags: '',
      isPublic: false,
      isTemplate: false,
    });
  };

  const resetQuestionForm = () => {
    setQuestionFormData({
      questionType: '',
      category: '',
      difficultyLevel: '',
      question: '',
      expectedAnswer: '',
      sampleAnswer: '',
      scoringRubric: '',
      tags: '',
    });
  };

  const openEditDialog = (question: Question) => {
    setEditingQuestion(question);
    setQuestionFormData({
      questionType: question.questionType,
      category: question.category,
      difficultyLevel: question.difficultyLevel,
      question: question.question,
      expectedAnswer: question.expectedAnswer || '',
      sampleAnswer: question.sampleAnswer || '',
      scoringRubric: question.scoringRubric || '',
      tags: question.tags || '',
    });
    setIsQuestionDialogOpen(true);
  };

  const openBankView = (bank: QuestionBank) => {
    setSelectedBank(bank);
    setCurrentView('questions');
  };

  const backToBanks = () => {
    setCurrentView('banks');
    setSelectedBank(null);
    setQuestions([]);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'mcq': return 'bg-blue-100 text-blue-800';
      case 'coding': return 'bg-purple-100 text-purple-800';
      case 'behavioral': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto space-y-8">
        {/* Enhanced Header */}
        <div className="bg-white rounded-2xl border border-gray-200/50 shadow-lg p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              {currentView === "questions" && (
                <Button
                  variant="ghost"
                  onClick={backToBanks}
                  className="hover:bg-gray-50 transition-all duration-200 group px-4 py-2 rounded-xl"
                >
                  <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                  Back to Question Banks
                </Button>
              )}
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  {currentView === "banks" ? (
                    <div className="p-3 bg-emerald-500 rounded-xl">
                      <BookOpen className="h-6 w-6 text-white" />
                    </div>
                  ) : (
                    <div className="p-3 bg-blue-500 rounded-xl">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                  )}
                  <h1 className="text-3xl font-bold text-gray-900">
                    {currentView === "banks"
                      ? "Question Banks"
                      : selectedBank?.name}
                  </h1>
                </div>
                <p className="text-lg text-gray-600 ml-16">
                  {currentView === "banks"
                    ? "Organize and manage your question collections with AI-powered tools"
                    : selectedBank?.description ||
                      "Manage and organize questions in this collection"}
                </p>
                {currentView === "banks" && (
                  <div className="flex items-center space-x-6 ml-16 mt-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <FolderOpen className="h-4 w-4" />
                      <span>{questionBanks.length} Banks</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      <span>Last updated today</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Action Buttons */}
            <div className="flex space-x-3">
              {currentView === "banks" ? (
                <>
                  <Button
                    onClick={() => {
                      fetchTemplates();
                      setShowTemplateDialog(true);
                    }}
                    variant="outline"
                    className="border-2 border-blue-500 text-blue-700 hover:bg-blue-50 px-6 py-3 rounded-xl font-medium"
                    size="lg"
                  >
                    <Layers className="h-5 w-5 mr-2" />
                    Use Template
                  </Button>
                  <Button
                    onClick={() => setIsBankDialogOpen(true)}
                    className="bg-emerald-500 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 px-6 py-3 rounded-xl font-medium"
                    size="lg"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Create Question Bank
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsQuestionDialogOpen(true)}
                    className="border-gray-300 hover:bg-gray-50 px-6 py-3 rounded-xl font-medium"
                    size="lg"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Add Question
                  </Button>
                  <Button
                    onClick={() => setIsGenerating(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/20 px-6 py-3 rounded-xl font-medium"
                    size="lg"
                  >
                    <Sparkles className="h-5 w-5 mr-2" />
                    AI Generate
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Question Banks View */}
        {currentView === "banks" && (
          <div className="space-y-8">
            {/* Quick Stats */}
            <div className="flex items-center justify-between gap-2 bg-[#DAE4FF] rounded-lg border border-gray-200/50 p-6">
              <Card className="w-[33%] transition-all duration-300">
                <CardContent className="p-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-blue-500 rounded-xl">
                      <FolderOpen className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-blue-900">
                        {questionBanks.length}
                      </p>
                      <p className="text-sm text-blue-600">Question Banks</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="w-[33%] transition-all duration-300">
                <CardContent className="p-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-blue-500 rounded-xl">
                      <Code className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-blue-900">
                        {questionBanks.reduce(
                          (sum, bank) => sum + (bank.questionCount || 0),
                          0
                        )}
                      </p>
                      <p className="text-sm text-blue-600">
                        Total Questions
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sort By Date of Question Bank */}
              <div className="justify-self-end flex items-center justify-end w-[33%]">
                <p className="text-sm text-gray-600 mr-2">Sort By:</p>
                <Select
                  value={bankFilters.sortBy}
                  onValueChange={(value) =>
                    setBankFilters((prev) => ({
                      ...prev,
                      sortBy: value,
                    }))
                  }
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Date Created</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin"></div>
                  <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                </div>
                <p className="mt-4 text-gray-600 animate-pulse">
                  Loading your question banks...
                </p>
              </div>
            ) : questionBanks.length === 0 ? (
              <div className="text-center py-20">
                <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
                  <FolderOpen className="h-12 w-12 text-blue-500" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                  No Question Banks Yet
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Create your first question bank to start organizing your
                  interview questions with AI-powered tools.
                </p>
                <Button
                  onClick={() => setIsBankDialogOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  size="lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Bank
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {questionBanks.map((bank, index) => (
                  <Card
                    key={bank.id}
                    className="group cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-blue-500/25"
                    onClick={() => openBankView(bank)}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-blue-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                          <FolderOpen className="h-6 w-6 text-white" />
                        </div>

                        <div className="flex items-center space-x-2">
                          <Badge
                            variant="secondary"
                            className="bg-blue-100 text-blue-800 border-0"
                          >
                            {bank.category}
                          </Badge>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  checkDependenciesAndDelete(bank);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {bank.name}
                      </CardTitle>
                      <CardDescription className="text-gray-600 line-clamp-2">
                        {bank.description || "No description provided"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <FileText className="h-4 w-4" />
                            <span className="font-medium">
                              {bank.questionCount || 0}
                            </span>
                            <span>questions</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {new Date(bank.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {bank.tags && (
                          <div className="flex flex-wrap gap-1">
                            {bank.tags
                              .split(",")
                              .slice(0, 3)
                              .map((tag, tagIndex) => (
                                <Badge
                                  key={tagIndex}
                                  variant="outline"
                                  className="text-xs bg-gray-50 hover:bg-gray-100 transition-colors"
                                >
                                  {tag.trim()}
                                </Badge>
                              ))}
                            {bank.tags.split(",").length > 3 && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-gray-50"
                              >
                                +{bank.tags.split(",").length - 3}
                              </Badge>
                            )}
                          </div>
                        )}

                        <div className="pt-2 border-t border-gray-100">
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center space-x-1">
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                              <span>Active</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Users className="h-3 w-3" />
                              <span>Shared</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Enhanced Questions View */}
        {currentView === "questions" && selectedBank && (
          <div className="space-y-8">
            {/* Question Bank Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-[#CCF8FE] border border-[#CCF8FE] rounded-xl">
                <CardContent className="p-4 flex items-center space-x-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-blue-900">
                      {questions.length}
                    </p>
                    <p className="text-sm text-blue-700">Total Questions</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#F1FFE9] border border-[#F1FFE9] rounded-xl">
                <CardContent className="p-4 flex items-center space-x-3">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <Code className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-green-900">
                      {
                        questions.filter((q) => q.questionType === "coding")
                          .length
                      }
                    </p>
                    <p className="text-sm text-green-700">Coding</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#DAE4FF] border border-[#DAE4FF] rounded-xl">
                <CardContent className="p-4 flex items-center space-x-3">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <MessageSquare className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-purple-900">
                      {
                        questions.filter((q) => q.questionType === "behavioral")
                          .length
                      }
                    </p>
                    <p className="text-sm text-purple-700">Behavioral</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#FFDCFC] border border-[#FFDCFC] rounded-xl">
                <CardContent className="p-4 flex items-center space-x-3">
                  <div className="p-2 bg-pink-500 rounded-lg">
                    <ListChecks className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-pink-900">
                      {questions.filter((q) => q.questionType === "mcq").length}
                    </p>
                    <p className="text-sm text-pink-700">MCQ</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            {/* Enhanced Filters */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-600 rounded-lg">
                      {" "}
                      {/* Solid blue background */}
                      <Filter className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle className="text-xl">Filter & Search</CardTitle>
                  </div>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    {questions.length} results
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search questions..."
                      value={questionFilters.search}
                      onChange={(e) =>
                        setQuestionFilters((prev) => ({
                          ...prev,
                          search: e.target.value,
                        }))
                      }
                      className="pl-10 border-2 border-gray-200 focus:border-blue-400 transition-colors"
                    />
                  </div>
                  <Select
                    value={questionFilters.questionType}
                    onValueChange={(value) =>
                      setQuestionFilters((prev) => ({
                        ...prev,
                        questionType: value,
                      }))
                    }
                  >
                    <SelectTrigger className="border-2 border-gray-200 focus:border-blue-400">
                      <SelectValue placeholder="Question Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="mcq">MCQ Questions</SelectItem>
                      <SelectItem value="coding">Coding Challenges</SelectItem>
                      <SelectItem value="behavioral">
                        Behavioral Questions
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setQuestionFilters({ questionType: "", search: "" })
                    }
                    className="border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 transition-colors"
                  >
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Questions Display */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle className="text-xl">Questions</CardTitle>
                  </div>
                  <Tabs defaultValue="table" className="w-auto">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="table">Table View</TabsTrigger>
                      <TabsTrigger value="cards">Card View</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent>
                {questionsLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin"></div>
                      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                    </div>
                    <p className="mt-4 text-gray-600 animate-pulse">
                      Loading questions...
                    </p>
                  </div>
                ) : questions.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
                      <FileText className="h-12 w-12 text-blue-500" />
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                      No Questions Found
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      {questionFilters.search || questionFilters.questionType
                        ? "No questions match your current filters. Try adjusting your search criteria."
                        : "Start building your question collection by adding questions manually or generating them with AI."}
                    </p>
                    <div className="flex justify-center space-x-3">
                      <Button
                        onClick={() => setIsQuestionDialogOpen(true)}
                        variant="outline"
                        className="border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Question
                      </Button>
                      <Button
                        onClick={() => setIsGenerating(true)}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate with AI
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Tabs defaultValue="table" className="w-full">
                    <TabsContent value="table" className="mt-0">
                      <div className="rounded-lg border border-gray-200 overflow-hidden">
                        <Table>
                          <TableHeader className="bg-gray-50">
                            <TableRow>
                              <TableHead className="font-semibold">
                                Type
                              </TableHead>
                              <TableHead className="font-semibold">
                                Question
                              </TableHead>
                              <TableHead className="font-semibold">
                                Difficulty
                              </TableHead>
                              <TableHead className="font-semibold">
                                Tags
                              </TableHead>
                              <TableHead className="font-semibold text-center">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {questions.map((question, index) => (
                              <TableRow
                                key={question.id}
                                className="hover:bg-blue-50/50 transition-colors group"
                                style={{ animationDelay: `${index * 50}ms` }}
                              >
                                <TableCell>
                                  <Badge
                                    className={`${getTypeColor(question.questionType)} font-medium`}
                                  >
                                    {question.questionType === "mcq"
                                      ? "MCQ"
                                      : question.questionType === "coding"
                                        ? "CODE"
                                        : "BEHAVIORAL"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="max-w-md">
                                  <div className="space-y-2">
                                    <p className="font-medium text-gray-900 line-clamp-2">
                                      {truncateText(question.question, 120)}
                                    </p>
                                    <div className="flex items-center space-x-2">
                                      <Badge
                                        variant="outline"
                                        className="text-xs bg-gray-50"
                                      >
                                        {question.category}
                                      </Badge>
                                      {question.aiGenerated && (
                                        <Badge
                                          variant="outline"
                                          className="text-xs bg-purple-50 text-purple-700 border-purple-200"
                                        >
                                          <Brain className="h-3 w-3 mr-1" />
                                          AI Generated
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    className={`${getDifficultyColor(question.difficultyLevel)} font-medium`}
                                  >
                                    {question.difficultyLevel
                                      .charAt(0)
                                      .toUpperCase() +
                                      question.difficultyLevel.slice(1)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {question.tags && (
                                    <div className="flex flex-wrap gap-1">
                                      {question.tags
                                        .split(",")
                                        .slice(0, 2)
                                        .map((tag, tagIndex) => (
                                          <Badge
                                            key={tagIndex}
                                            variant="outline"
                                            className="text-xs bg-gray-50 hover:bg-gray-100 transition-colors"
                                          >
                                            {tag.trim()}
                                          </Badge>
                                        ))}
                                      {question.tags.split(",").length > 2 && (
                                        <Badge
                                          variant="outline"
                                          className="text-xs bg-gray-50"
                                        >
                                          +{question.tags.split(",").length - 2}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex justify-center space-x-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openEditDialog(question)}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-100"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleDeleteQuestion(question.id)
                                      }
                                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>
                    <TabsContent value="cards" className="mt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {questions.map((question, index) => (
                          <Card
                            key={question.id}
                            className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:shadow-blue-500/25"
                            style={{ animationDelay: `${index * 100}ms` }}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center space-x-2">
                                  <Badge
                                    className={getTypeColor(
                                      question.questionType
                                    )}
                                  >
                                    {question.questionType.toUpperCase()}
                                  </Badge>
                                  <Badge
                                    className={getDifficultyColor(
                                      question.difficultyLevel
                                    )}
                                  >
                                    {question.difficultyLevel}
                                  </Badge>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => openEditDialog(question)}
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit Question
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Copy className="h-4 w-4 mr-2" />
                                      Duplicate
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-red-600"
                                      onClick={() =>
                                        handleDeleteQuestion(question.id)
                                      }
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              <CardTitle className="text-lg line-clamp-2 group-hover:text-blue-600 transition-colors">
                                {question.question}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600">
                                    Category:
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="bg-gray-50"
                                  >
                                    {question.category}
                                  </Badge>
                                </div>
                                {question.tags && (
                                  <div className="flex flex-wrap gap-1">
                                    {question.tags
                                      .split(",")
                                      .map((tag, tagIndex) => (
                                        <Badge
                                          key={tagIndex}
                                          variant="outline"
                                          className="text-xs bg-gray-50"
                                        >
                                          {tag.trim()}
                                        </Badge>
                                      ))}
                                  </div>
                                )}
                                {question.aiGenerated && (
                                  <div className="flex items-center space-x-2 text-xs text-purple-600">
                                    <Brain className="h-3 w-3" />
                                    <span>AI Generated</span>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Question Bank Dialog */}
        <Dialog open={isBankDialogOpen} onOpenChange={setIsBankDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Question Bank</DialogTitle>
              <DialogDescription>
                Create a new question bank to organize your questions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={bankFormData.name}
                  onChange={(e) =>
                    setBankFormData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Enter question bank name"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={bankFormData.description}
                  onChange={(e) =>
                    setBankFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Enter description (optional)"
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={bankFormData.category}
                  onChange={(e) =>
                    setBankFormData((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  placeholder="e.g., Software Engineering, Marketing"
                />
              </div>
              <div>
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={bankFormData.tags}
                  onChange={(e) =>
                    setBankFormData((prev) => ({
                      ...prev,
                      tags: e.target.value,
                    }))
                  }
                  placeholder="Enter tags separated by commas"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsBankDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateQuestionBank}>
                Create Question Bank
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Question Dialog */}
        <Dialog
          open={isQuestionDialogOpen}
          onOpenChange={setIsQuestionDialogOpen}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-50 to-white">
            <DialogHeader className="border-b border-slate-200 pb-4">
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {editingQuestion ? "✏️ Edit Question" : "✨ Add New Question"}
              </DialogTitle>
              <DialogDescription className="text-slate-600 mt-2">
                {editingQuestion
                  ? "Update the question details below."
                  : "Create a new question for your question bank with detailed information."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="questionType"
                    className="text-sm font-semibold text-slate-700 flex items-center gap-2"
                  >
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Question Type
                  </Label>
                  <Select
                    value={questionFormData.questionType}
                    onValueChange={(value) =>
                      setQuestionFormData((prev) => ({
                        ...prev,
                        questionType: value,
                      }))
                    }
                  >
                    <SelectTrigger className="h-12 border-2 border-slate-200 hover:border-blue-300 focus:border-blue-500 transition-colors">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        value="mcq"
                        className="flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Multiple Choice (MCQ)
                      </SelectItem>
                      <SelectItem
                        value="coding"
                        className="flex items-center gap-2"
                      >
                        <Code className="w-4 h-4 text-blue-500" />
                        Coding Challenge
                      </SelectItem>
                      <SelectItem
                        value="behavioral"
                        className="flex items-center gap-2"
                      >
                        <MessageSquare className="w-4 h-4 text-purple-500" />
                        Behavioral Interview
                      </SelectItem>
                      <SelectItem
                        value="combo"
                        className="flex items-center gap-2"
                      >
                        <Layers className="w-4 h-4 text-orange-500" />
                        Combo (Mixed Types)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="difficultyLevel"
                    className="text-sm font-semibold text-slate-700 flex items-center gap-2"
                  >
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    Difficulty Level
                  </Label>
                  <Select
                    value={questionFormData.difficultyLevel}
                    onValueChange={(value) =>
                      setQuestionFormData((prev) => ({
                        ...prev,
                        difficultyLevel: value,
                      }))
                    }
                  >
                    <SelectTrigger className="h-12 border-2 border-slate-200 hover:border-orange-300 focus:border-orange-500 transition-colors">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        value="easy"
                        className="text-green-600 font-medium"
                      >
                        🟢 Easy
                      </SelectItem>
                      <SelectItem
                        value="medium"
                        className="text-orange-600 font-medium"
                      >
                        🟡 Medium
                      </SelectItem>
                      <SelectItem
                        value="hard"
                        className="text-red-600 font-medium"
                      >
                        🔴 Hard
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="category"
                    className="text-sm font-semibold text-slate-700 flex items-center gap-2"
                  >
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    Category
                  </Label>
                  <Input
                    id="category"
                    value={questionFormData.category}
                    onChange={(e) =>
                      setQuestionFormData((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    placeholder="e.g., JavaScript, Leadership, Algorithms"
                    className="h-12 border-2 border-slate-200 hover:border-purple-300 focus:border-purple-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="question"
                  className="text-sm font-semibold text-slate-700 flex items-center gap-2"
                >
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  Question Content
                </Label>
                <Textarea
                  id="question"
                  value={questionFormData.question}
                  onChange={(e) =>
                    setQuestionFormData((prev) => ({
                      ...prev,
                      question: e.target.value,
                    }))
                  }
                  placeholder="Enter your question here... Be clear and specific about what you're asking."
                  rows={5}
                  className="border-2 border-slate-200 hover:border-emerald-300 focus:border-emerald-500 transition-colors resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="expectedAnswer"
                  className="text-sm font-semibold text-slate-700 flex items-center gap-2"
                >
                  <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                  Expected Answer / Solution
                </Label>
                <Textarea
                  id="expectedAnswer"
                  value={questionFormData.expectedAnswer}
                  onChange={(e) =>
                    setQuestionFormData((prev) => ({
                      ...prev,
                      expectedAnswer: e.target.value,
                    }))
                  }
                  placeholder="Provide the expected answer, solution approach, or key points to look for... (Optional)"
                  rows={4}
                  className="border-2 border-slate-200 hover:border-teal-300 focus:border-teal-500 transition-colors resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="tags"
                  className="text-sm font-semibold text-slate-700 flex items-center gap-2"
                >
                  <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                  Tags
                </Label>
                <Input
                  id="tags"
                  value={questionFormData.tags}
                  onChange={(e) =>
                    setQuestionFormData((prev) => ({
                      ...prev,
                      tags: e.target.value,
                    }))
                  }
                  placeholder="e.g., arrays, sorting, algorithms, problem-solving"
                  className="h-12 border-2 border-slate-200 hover:border-pink-300 focus:border-pink-500 transition-colors"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Separate multiple tags with commas
                </p>
              </div>
            </div>
            <DialogFooter className="border-t border-slate-200 pt-4 gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsQuestionDialogOpen(false);
                  setEditingQuestion(null);
                  resetQuestionForm();
                }}
                className="h-11 px-6 border-2 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                onClick={
                  editingQuestion ? handleUpdateQuestion : handleCreateQuestion
                }
                className="h-11 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg"
              >
                {editingQuestion ? "✅ Update Question" : "Create Question"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* AI Generation Dialog */}
        <Dialog open={isGenerating} onOpenChange={setIsGenerating}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Generate Questions with AI</DialogTitle>
              <DialogDescription>
                Use AI to generate questions based on job requirements and
                context.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="aiType">Question Type</Label>
                  <Select
                    value={aiFormData.type}
                    onValueChange={(value) =>
                      setAiFormData((prev) => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mcq">MCQ</SelectItem>
                      <SelectItem value="coding">Coding</SelectItem>
                      <SelectItem value="behavioral">Behavioral</SelectItem>
                      <SelectItem value="combo">Combo (Mixed Types)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {aiFormData.type !== "combo" && (
                  <div>
                    <Label htmlFor="aiCount">Number of Questions</Label>
                    <Input
                      id="aiCount"
                      type="number"
                      value={aiFormData.count}
                      onChange={(e) =>
                        setAiFormData((prev) => ({
                          ...prev,
                          count: parseInt(e.target.value) || 1,
                        }))
                      }
                    />
                  </div>
                )}

                {aiFormData.type === "combo" && (
                  <>
                    <div>
                      <Label htmlFor="behavioralCount">
                        Behavioral Questions
                      </Label>
                      <Input
                        id="behavioralCount"
                        type="number"
                        min="1"
                        max="10"
                        value={aiFormData.behavioralCount || 1}
                        onChange={(e) =>
                          setAiFormData((prev) => ({
                            ...prev,
                            behavioralCount: parseInt(e.target.value) || 1,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="codingCount">Coding Questions</Label>
                      <Input
                        id="codingCount"
                        type="number"
                        min="1"
                        max="10"
                        value={aiFormData.codingCount || 1}
                        onChange={(e) =>
                          setAiFormData((prev) => ({
                            ...prev,
                            codingCount: parseInt(e.target.value) || 1,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="mcqCount">MCQ Questions</Label>
                      <Input
                        id="mcqCount"
                        type="number"
                        min="1"
                        max="10"
                        value={aiFormData.mcqCount || 1}
                        onChange={(e) =>
                          setAiFormData((prev) => ({
                            ...prev,
                            mcqCount: parseInt(e.target.value) || 1,
                          }))
                        }
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select
                    value={aiFormData.difficulty}
                    onValueChange={(value) =>
                      setAiFormData((prev) => ({ ...prev, difficulty: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="topic">Topic/Category</Label>
                  <Input
                    id="topic"
                    value={aiFormData.topic}
                    onChange={(e) =>
                      setAiFormData((prev) => ({
                        ...prev,
                        topic: e.target.value,
                      }))
                    }
                    placeholder="e.g., React, Leadership"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsGenerating(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerateQuestions} disabled={isGenerate}>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Questions
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Template Selection Dialog */}
        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Choose Question Bank Template
              </DialogTitle>
              <DialogDescription>
                Select a pre-built template to quickly create a comprehensive
                question bank
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              {templates.map((template) => (
                <Card
                  key={template.name}
                  className="cursor-pointer hover:border-blue-300 transition-colors"
                  onClick={() => setSelectedTemplate(template)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{template.category}</Badge>
                        {template.subCategory && (
                          <Badge variant="secondary">
                            {template.subCategory}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        <div>
                          Question Types: {template.questionTypes.join(", ")}
                        </div>
                        <div>
                          Target Roles: {template.targetRoles.join(", ")}
                        </div>
                        <div>Est. Questions: {template.estimatedQuestions}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowTemplateDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedTemplate) {
                    createFromTemplate(selectedTemplate);
                  }
                }}
                disabled={!selectedTemplate}
              >
                Create from Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dependency Check Dialog */}
        <Dialog
          open={showDependencyDialog}
          onOpenChange={setShowDependencyDialog}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Delete Question Bank: {bankToDelete?.name}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-700">
                Are you sure you want to delete this question bank?{" "}
                <span className="font-semibold">
                  It will be removed from all job campaigns where it is
                  currently used.
                </span>
                <br />
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            {dependencyInfo && (
              <div className="py-4 space-y-4">
                {!dependencyInfo.canDelete && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-medium text-red-800 mb-2">
                      Blocking Issues:
                    </h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      {dependencyInfo.blockingReasons.map(
                        (reason: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-red-500 mt-1">•</span>
                            {reason}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}

                {dependencyInfo.dependencies.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Campaign Dependencies:</h4>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {dependencyInfo.dependencies.map(
                        (dep: any, index: number) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded"
                          >
                            <div>
                              <span className="font-medium">
                                {dep.campaignName}
                              </span>
                              {dep.roundName && (
                                <span className="text-sm text-gray-600 ml-2">
                                  ({dep.roundName})
                                </span>
                              )}
                            </div>
                            <Badge
                              variant={
                                dep.status === "active"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {dep.status}
                            </Badge>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="font-bold text-blue-700">
                      {dependencyInfo.totalCampaigns}
                    </div>
                    <div className="text-sm text-blue-600">Total Campaigns</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="font-bold text-green-700">
                      {dependencyInfo.activeCampaigns}
                    </div>
                    <div className="text-sm text-green-600">
                      Active Campaigns
                    </div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="font-bold text-purple-700">
                      {dependencyInfo.totalInterviews}
                    </div>
                    <div className="text-sm text-purple-600">
                      Completed Interviews
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDependencyDialog(false)}
              >
                Cancel
              </Button>
              {dependencyInfo?.canDelete && (
                <Button
                  variant="destructive"
                  onClick={handleDeleteQuestionBank}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Question Bank
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
