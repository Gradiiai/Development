"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/shared/button";
import { Input } from "@/components/ui/shared/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/shared/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/shared/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/shared/card";
import { Badge } from "@/components/ui/shared/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/shared/label";
import { toast } from "sonner";
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
  ListChecks,
  AlertCircle,
  Calendar,
  Layers,
  MoveLeft,
  ArrowLeftIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/shared/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/shared/tabs";
import {
  QUESTION_CATEGORIES,
  INTERVIEW_TYPES,
  DIFFICULTY_LEVELS,
  CATEGORY_INFO,
  APTITUDE_SUBCATEGORIES,
  TECHNICAL_SUBCATEGORIES,
  SKILLS_SUBCATEGORIES,
  SCREENING_SUBCATEGORIES,
  COMMUNICATION_SUBCATEGORIES,
} from "@/lib/constants/question-bank";
import { Twinkle_Star } from "next/font/google";

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
  collection_id: string;

}

// Define the QuestionCollection type
interface QuestionCollection {
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
questionTypes?: {
  type: string;
  count: number;
}[];

}

// Question Bank Template type
interface QuestionCollectionTemplate {
  id?: string;
  name: string;
  description: string;
  category: string;
  subCategory?: string;
  interviewTypes: string[];
  targetRoles: string[];
  difficultyLevels: string[];
  estimatedQuestions: number;
  questionTypes: string[];

}


export default function QuestionCollectionPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // Main state
  const [questionCollections, setQuestionCollections] = useState<
    QuestionCollection[]
  >([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(false);

  // View state
  const [currentView, setCurrentView] = useState<"collections" | "questions">(
    "collections"
  );
  const [selectedCollection, setSelectedCollection] =
    useState<QuestionCollection | null>(null);

  // Dialog states
  const [isCollectionDialogOpen, setIsCollectionDialogOpen] = useState(false);
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isGenerate, setIsGenerate] = useState(false);
  // Question Collection form state
  const [collectionFormData, setCollectionFormData] = useState({
    name: "",
    description: "",
    category: "",
    subCategory: "",
    tags: "",
    isPublic: false,
    isTemplate: false,
    collectionType: "custom",
  });

  // Templates state
  const [templates, setTemplates] = useState<QuestionCollectionTemplate[]>([]);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<QuestionCollectionTemplate | null>(null);

  // Dependency checking state
  const [dependencyInfo, setDependencyInfo] = useState<any>(null);
  const [showDependencyDialog, setShowDependencyDialog] = useState(false);
  const [collectionToDelete, setCollectionToDelete] =
    useState<QuestionCollection | null>(null);

  // Enhanced filters
  const [bankFilters, setBankFilters] = useState({
    category: "",
    search: "",
    sortBy: "createdAt",
    sortOrder: "desc" as "asc" | "desc",
  });

  // Question form state
  const [questionFormData, setQuestionFormData] = useState({
    questionType: "",
    category: "",
    difficultyLevel: "",
    question: "",
    expectedAnswer: "",
    sampleAnswer: "",
    scoringRubric: "",
    tags: "",
  });

  // Filter state for questions
  const [questionFilters, setQuestionFilters] = useState({
    questionType: "",
    search: "",
  });

  // AI Generation state
  const [aiFormData, setAiFormData] = useState({
    type: "",
    count: 1,
    jobTitle: "",
    behavioralCount: 1,
    mcqCount: 1,
    codingCount: 1,
    jobDescription: "",
    yearsOfExperience: "",
    difficulty: "medium",
    topic: "",
    category: "",
    languages: ['javascript'],

  });

  useEffect(() => {
    if (!session) return;
    if (currentView === "collections") {
      fetchQuestionCollections();
    }
  }, [session, currentView]);

  useEffect(() => {
    if (selectedCollection && currentView === "questions") {
      fetchQuestions();
    }
  }, [selectedCollection, currentView, questionFilters]);

  const fetchQuestionCollections = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/content/questions/banks");
      const data = await response.json();

      if (data.success) {
        setQuestionCollections(data.data);
      } else {
        toast.error(data.error || "Failed to fetch question collections");
      }
    } catch (error) {
      console.error("Error fetching question collections:", error);
      toast.error("Failed to fetch question collections");
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async () => {
    if (!selectedCollection) return;

    setQuestionsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (
        questionFilters.questionType &&
        questionFilters.questionType !== "all"
      ) {
        queryParams.append("questionType", questionFilters.questionType);
      }
      if (questionFilters.search) {
        queryParams.append("search", questionFilters.search);
      }

      const response = await fetch(
        `/api/content/questions/banks/${selectedCollection.id}?${queryParams.toString()}`
      );
      const data = await response.json();

      if (data.success) {
        setQuestions(data.data.questions);
      } else {
        toast.error(data.error || "Failed to fetch questions");
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
      toast.error("Failed to fetch questions");
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleCreateQuestionCollection = async () => {
    try {
      const response = await fetch("/api/content/questions/banks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(collectionFormData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Question bank created successfully");
        setIsCollectionDialogOpen(false);
        resetBankForm();
        fetchQuestionCollections();
      } else {
        toast.error(data.error || "Failed to create question bank");
      }
    } catch (error) {
      console.error("Error creating question bank:", error);
      toast.error("Failed to create question bank");
    }
  };

  const handleCreateQuestion = async () => {
    if (!selectedCollection) return;

    try {
      const response = await fetch("/api/content/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...questionFormData,
          collectionId: selectedCollection.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Question created successfully");
        setIsQuestionDialogOpen(false);
        resetQuestionForm();
        fetchQuestions();
      } else {
        toast.error(data.error || "Failed to create question");
      }
    } catch (error) {
      console.error("Error creating question:", error);
      toast.error("Failed to create question");
    }
  };

  const handleUpdateQuestion = async () => {
    if (!editingQuestion) return;

    try {
      const response = await fetch(
        `/api/content/questions/${editingQuestion.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(questionFormData),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success("Question updated successfully");
        setIsQuestionDialogOpen(false);
        setEditingQuestion(null);
        resetQuestionForm();
        fetchQuestions();
      } else {
        toast.error(data.error || "Failed to update question");
      }
    } catch (error) {
      console.error("Error updating question:", error);
      toast.error("Failed to update question");
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;

    try {
      const response = await fetch(`/api/content/questions/${questionId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Question deleted successfully");
        fetchQuestions();
      } else {
        toast.error(data.error || "Failed to delete question");
      }
    } catch (error) {
      console.error("Error deleting question:", error);
      toast.error("Failed to delete question");
    }
  };
  const checkDependenciesAndDelete = async (bank: QuestionCollection) => {
    try {
      // First check dependencies
      const response = await fetch(
        `/api/content/question-banks/${bank.id}/dependencies`
      );
      const data = await response.json();

      if (data.success) {
        setDependencyInfo(data.data);
        setCollectionToDelete(bank);
        setShowDependencyDialog(true);
      } else {
        toast.error("Failed to check dependencies");
      }
    } catch (error) {
      console.error("Error checking dependencies:", error);
      toast.error("Failed to check dependencies");
    }
  };

  const handleDeleteQuestionCollection = async () => {
    if (!collectionToDelete) return;

    try {
      const response = await fetch(
        `/api/content/questions/banks/${collectionToDelete.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success("Question bank deleted successfully");
        setShowDependencyDialog(false);
        setCollectionToDelete(null);
        setDependencyInfo(null);
        fetchQuestionCollections();
      } else {
        if (response.status === 409) {
          // Conflict - show detailed error information
          toast.error(
            data.details?.message ||
            "Cannot delete question bank - it is in use"
          );
        } else {
          toast.error(data.error || "Failed to delete question bank");
        }
      }
    } catch (error) {
      console.error("Error deleting question bank:", error);
      toast.error("Failed to delete question bank");
    }
  };

  // Function to fetch templates
  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/content/question-bank-templates");
      const data = await response.json();

      if (data.success) {
        setTemplates(data.data);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  // Function to create question bank from template
  const createFromTemplate = async (
    template: QuestionCollectionTemplate,
    customName?: string,
    customDescription?: string
  ) => {
    try {
      const response = await fetch("/api/content/question-bank-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: template.name,
          customName,
          customDescription,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || "Question bank created from template");
        setShowTemplateDialog(false);
        setSelectedTemplate(null);
        fetchQuestionCollections();

        if (data.data?.id) {
          const questionBankId = data.data.id;

          for (const type of template.interviewTypes) {
            let endpoint = "";
            switch (type) {
              case "coding":
                endpoint = "/api/ai/generate-coding";
                break;
              case "mcq":
                endpoint = "/api/ai/generate-mcq";
                break;
              case "behavioral":
                endpoint = "/api/ai/generate-behavioral";
                break;
              // Add other types if needed
              default:
                continue;
            }

            const response = await fetch(endpoint, {
              method: "POST",
              body: new URLSearchParams({
                questionBankId: questionBankId,
                topic: template.name || template.description || "General",
                totalQuestions: "5",
                difficulty: "medium",
                type: type,
              }),
            });

            if (response.ok) {
              const responseText = await response.text();
              const cleanedText = responseText
                .replace(/```json/g, "")
                .replace(/```/g, "")
                .trim();
              const aiQuestions = JSON.parse(cleanedText);

              // Convert AI questions to DB format and save
              const questionsToSave = aiQuestions.map((q: any) => {
                if (type === "coding") {
                  return {
                    questionType: "coding",
                    question: q.title + "\n\n" + q.description,
                    expectedAnswer: q.explanation,
                    category: "Technical",
                    difficultyLevel: q.difficulty || "medium",
                    questionBankId: questionBankId,
                  };
                } else if (type === "mcq") {
                  return {
                    questionType: "mcq",
                    question: q.question,
                    expectedAnswer: q.correctAnswer,
                    category: "Technical",
                    difficultyLevel: q.difficulty || "medium",
                    questionBankId: questionBankId,
                  };
                } else if (type === "behavioral") {
                  return {
                    questionType: "behavioral",
                    question: q.question,
                    expectedAnswer: q.purpose,
                    category: "Behavioral",
                    difficultyLevel: "medium",
                    questionBankId: questionBankId,
                  };
                }
              });

              for (const questionData of questionsToSave) {
                await fetch("/api/content/questions", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
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
        toast.error(
          data.error || "Failed to create question bank from template"
        );
      }
    } catch (error) {
      console.error("Error creating from template:", error);
      toast.error("Failed to create question bank from template");
    }
  };
  const preferredLanguage = aiFormData.languages?.[0]?.toLowerCase() || 'javascript';

  const handleGenerateQuestions = async () => {
    if (!selectedCollection) return;

    setIsGenerate(true);
    try {
      // Determine the endpoint based on question type
      let endpoint = "";
      switch (aiFormData.type) {
        case "coding":
          endpoint = "/api/ai/generate-coding";
          break;
        case "behavioral":
          endpoint = "/api/ai/generate-behavioral";
          break;
        case "mcq":
          endpoint = "/api/ai/generate-mcq";
          break;
        case "combo":
          endpoint = "/api/ai/generate-combo";
          break;
        default:
          toast.error("Please select a question type");
          return;
      }

      // Prepare form data
      const formData = new FormData();
      formData.append(
        "topic",
        aiFormData.topic || selectedCollection?.name || "General"
      );
      formData.append("totalQuestions", String(aiFormData.count));
      formData.append("jobDescription", aiFormData.jobDescription || "");
      formData.append("difficulty", aiFormData.difficulty || "medium");
      formData.append("type", aiFormData.type || "");
      formData.append("experience", aiFormData.yearsOfExperience || "");
      formData.append("jobTitle", aiFormData.jobTitle || "");

      if (aiFormData.type === "combo") {
        formData.append("coding", String(aiFormData.codingCount));
        formData.append("behavioral", String(aiFormData.behavioralCount));
        formData.append("mcq", String(aiFormData.mcqCount));
      }

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const responseText = await response.text();

      if (response.ok) {
        // ✅ Sanitize AI response: remove ```json and ```
        const cleanedText = responseText
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();

        let aiQuestions;
        try {
          aiQuestions = JSON.parse(cleanedText);
        } catch (err) {
          console.error("Invalid JSON from AI:", cleanedText);
          toast.error("Failed to parse AI response");
          return;
        }
        // Convert AI format to our database format and save
        let questionsToSave = [];

        if (aiFormData.type === "combo") {
          // Handle combo questions
         if (aiQuestions.coding) {
  questionsToSave.push(
    ...aiQuestions.coding.map((q: any) => ({
      questionType: "coding",
      question: q.title + "\n\n" + q.description,
      expectedAnswer: q.solutions?.[preferredLanguage] || Object.values(q.solutions || {})[0] || q.explanation,
      category: aiFormData.category || "Technical",
      difficultyLevel: q.difficulty || "medium",
      collectionId: selectedCollection.id
              }))
            );
          }
          if (aiQuestions.behavioral) {
            questionsToSave.push(
              ...aiQuestions.behavioral.map((q: any) => ({
                questionType: "behavioral",
                question: q.question,
                expectedAnswer: q.purpose,
                category: aiFormData.category || "Behavioral",
                difficultyLevel: "medium",
                collectionId: selectedCollection.id,
              }))
            );
          }
          if (aiQuestions.mcq) {
            questionsToSave.push(
              ...aiQuestions.mcq.map((q: any) => ({
                questionType: "mcq",
                question: q.question,
                expectedAnswer: q.correctAnswer,
                category: aiFormData.category || "Mcq",
                difficultyLevel: q.difficulty || "medium",
                collectionId: selectedCollection.id,
              }))
            );
          }
        } else {
          // Handle single type questions
          questionsToSave = aiQuestions.map((q: any) => ({
            questionType: aiFormData.type,
            question:
              aiFormData.type === "coding"
                ? q.title + "\n\n" + q.description
                : q.question || q.title,
            expectedAnswer: aiFormData.type === 'coding'
              ? q.solution?.[preferredLanguage] || Object.values(q.solution || {})[0] || q.explanation
              : q.explanation || q.purpose || q.correctAnswer,
            category: aiFormData.category || "General",
            difficultyLevel: q.difficulty || "medium",
            collectionId: selectedCollection.id,
          }));
        }

        // Save questions to database
        for (const questionData of questionsToSave) {
          await fetch("/api/content/questions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(questionData),
          });
        }

        toast.success(
          `Generated ${questionsToSave.length} questions successfully`
        );
        fetchQuestions();
      } else {
        toast.error("Failed to generate questions");
      }
    } catch (error) {
      console.error("Error generating questions:", error);
      toast.error("Failed to generate questions");
    } finally {
      setIsGenerating(false);
    }
  };

  const resetBankForm = () => {
    setCollectionFormData({
      name: "",
      description: "",
      category: "",
      subCategory: "",
      tags: "",
      isPublic: false,
      isTemplate: false,
      collectionType: "custom",
    });
  };

  const resetQuestionForm = () => {
    setQuestionFormData({
      questionType: "",
      category: "",
      difficultyLevel: "",
      question: "",
      expectedAnswer: "",
      sampleAnswer: "",
      scoringRubric: "",
      tags: "",
    });
  };

  const openEditDialog = (question: Question) => {
    setEditingQuestion(question);
    setQuestionFormData({
      questionType: question.questionType,
      category: question.category,
      difficultyLevel: question.difficultyLevel,
      question: question.question,
      expectedAnswer: question.expectedAnswer || "",
      sampleAnswer: question.sampleAnswer || "",
      scoringRubric: question.scoringRubric || "",
      tags: question.tags || "",
    });
    setIsQuestionDialogOpen(true);
  };

  const openCollectionView = (bank: QuestionCollection) => {
    setSelectedCollection(bank);
    setCurrentView("questions");
  };

  const backToBanks = () => {
    setCurrentView("collections");
    setSelectedCollection(null);
    setQuestions([]);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "hard":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "mcq":
        return "bg-blue-100 text-blue-800";
      case "coding":
        return "bg-purple-100 text-purple-800";
      case "behavioral":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            {currentView === "questions" && (
              <Button
                variant="ghost"
                onClick={backToBanks}
                className="hover:bg-gray-50 transition-all duration-200 group px-4 py-2 rounded-xl"
              >
                <ArrowLeftIcon
                  className="group-hover:-translate-x-1 transition-transform"
                  size={44}
                />
              </Button>
            )}
            <div className="flex items-center">
              <h1 className="text-3xl font-medium">
                {currentView === "collections"
                  ? "Question Banks"
                  : selectedCollection?.name}
              </h1>
            </div>
          </div>
        </div>

        {/* Enhanced Question Banks View */}
        {currentView === "collections" && (
          <div className="space-y-8">
            {/* Quick Stats */}
            <div className="flex justify-between items-center border border-gray-200 p-6">
              <div className="grid grid-cols-3 gap-2 w-1/2">
                <Card className="w-full transition-all duration-300">
                  <CardContent className="p-3">
                    <div className="text-center">
                      <p className="text-xl font-medium">
                        {questionCollections.length}
                      </p>
                      <p className="text-sm">Question Banks</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="w-full transition-all duration-300">
                  <CardContent className="p-3">
                    <div className="text-center">
                      <p className="text-xl font-medium">
                        {questionCollections.reduce(
                          (sum, bank) => sum + (bank.questionCount || 0),
                          0
                        )}
                      </p>
                      <p className="text-sm">Total Questions</p>
                    </div>
                  </CardContent>
                </Card>

                <Select
                  value={bankFilters.sortBy}
                  onValueChange={(value) =>
                    setBankFilters((prev) => ({
                      ...prev,
                      sortBy: value,
                    }))
                  }
                >
                  <SelectTrigger className="w-full my-auto">
                    <SelectValue placeholder="Date Created" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Date Created</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end items-center gap-4">
                <Button
                  onClick={() => {
                    fetchTemplates();
                    setShowTemplateDialog(true);
                  }}
                  variant="outline"
                  className="font-medium"
                  size="lg"
                >
                  <Layers className="h-5 w-5 mr-2" />
                  Use Template
                </Button>
                <Button
                  onClick={() => setIsCollectionDialogOpen(true)}
                  className="font-medium bg-purple-600"
                  size="lg"
                >
                  <Plus className="h-5 w-5" />
                  Create Question Bank
                </Button>
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
            ) : questionCollections.length === 0 ? (
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
                  onClick={() => setIsCollectionDialogOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  size="lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Bank
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {questionCollections.map((bank, index) => (
                  <Card
                    key={bank.id}
                    className="group cursor-pointer bg-white/80"
                    onClick={() => openCollectionView(bank)}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardHeader className="flex justify-between">
                      <div className="flex justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-xl font-medium">
                            {bank.name}
                          </CardTitle>
                          <div className="bg-green-100 px-2 py-1 rounded-3xl">
                            <p className="text-xs text-green-800">Active</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button variant={"outline"}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            className="bg-red-100 text-red-600"
                            variant={"outline"}
                            onClick={(e) => {
                              e.stopPropagation();
                              checkDependenciesAndDelete(bank);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription className="text-gray-600 line-clamp-2">
                        {bank.description || "No description provided"}
                      </CardDescription>
                    </CardHeader>

              <CardContent className="pt-0">
  <div className="space-y-4">
    <div className="flex justify-between items-start gap-5">
      <div className="flex gap-5">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <FileText className="h-4 w-4" />
          <span className="font-medium">
            {bank.questionCount || 0} questions
          </span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Calendar className="h-4 w-4" />
          <span>
            {new Date(bank.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-md border border-gray-200 text-center">
          <p>
{bank.questionTypes?.find((qt) => qt.type === "mcq")?.count || 0}
          </p>
          <p className="text-sm">MCQs</p>
        </div>

        <div className="p-4 rounded-md border border-gray-200 text-center">
          <p>
{bank.questionTypes?.find((qt) => qt.type === "behavioral")?.count || 0}
          </p>
          <p className="text-sm">Behavioral</p>
        </div>

        <div className="p-4 rounded-md border border-gray-200 text-center">
          <p>
{bank.questionTypes?.find((qt) => qt.type === "coding")?.count || 0}
          </p>
          <p className="text-sm">Coding</p>
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
        {currentView === "questions" && selectedCollection && (
          <div className="space-y-8">
            {/* Question Bank Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="bborder border-gray-200 rounded-xl">
                <CardContent className="p-4 flex justify-center items-center text-center space-x-3">
                  <div>
                    <p className="text-xl font-medium">{questions.length}</p>
                    <p className="text-sm">Total Questions</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bborder border-gray-200 rounded-xl">
                <CardContent className="p-4 flex justify-center items-center text-center space-x-3">
                  <div>
                    <p className="text-xl font-medium">
                      {
                        questions.filter((q) => q.questionType === "coding")
                          .length
                      }
                    </p>
                    <p className="text-sm">Coding</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bborder border-gray-200 rounded-xl">
                <CardContent className="p-4 flex justify-center items-center text-center space-x-3">
                  <div>
                    <p className="text-xl font-medium">
                      {
                        questions.filter((q) => q.questionType === "behavioral")
                          .length
                      }
                    </p>
                    <p className="text-sm">Behavioral</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bborder border-gray-200 rounded-xl">
                <CardContent className="p-4 flex justify-center items-center text-center space-x-3">
                  <div>
                    <p className="text-xl font-medium">
                      {questions.filter((q) => q.questionType === "mcq").length}
                    </p>
                    <p className="text-sm">MCQ</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            {/* Enhanced Filters */}
            <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-center flex-col">
              <div className="w-full flex items-center justify-between">
                <div className="w-[45%] relative">
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
                <div className="flex gap-3 w-[35%]">
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
                  <Select>
                    <SelectTrigger className="border-2 border-gray-200 focus:border-blue-400">
                      <SelectValue placeholder="Select Difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Questions</SelectItem>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Enhanced Questions Display */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CardTitle className="text-xl font-medium">
                      Questions
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200">
                      <Plus className="h-5 w-5 mr-2" />
                      <p>Add Question</p>
                    </div>
                    <div onClick={() => setIsGenerating(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-600 text-white border border-gray-200">
                      <Sparkles className="h-5 w-5 mr-2" />
                      <p>AI Generate</p>
                    </div>
                  </div>
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
                          <TableHeader className="bg-purple-100">
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
                                  <Badge className={"font-medium"}>
                                    {question.difficultyLevel
                                      .charAt(0)
                                      .toUpperCase() +
                                      question.difficultyLevel.slice(1)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {question.tags ? (
                                    (() => {
                                      const tags = question.tags
                                        .split(",")
                                        .map((tag) => tag.trim());
                                      return (
                                        <div className="flex flex-wrap gap-1">
                                          {tags.slice(0, 2).map((tag, i) => (
                                            <Badge
                                              key={i}
                                              variant="outline"
                                              className="text-xs bg-gray-50 hover:bg-gray-100 transition-colors"
                                            >
                                              {tag}
                                            </Badge>
                                          ))}
                                          {tags.length > 2 && (
                                            <Badge
                                              variant="outline"
                                              className="text-xs bg-gray-50"
                                            >
                                              +{tags.length - 2}
                                            </Badge>
                                          )}
                                        </div>
                                      );
                                    })()
                                  ) : (
                                    <span>Tags</span>
                                  )}
                                </TableCell>

                                <TableCell>
                                  <div className="flex justify-center space-x-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openEditDialog(question)}
                                      className="border border-gray-200"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleDeleteQuestion(question.id)
                                      }
                                      className="border border-gray-200 hover:bg-red-100 text-red-600"
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
        <Dialog
          open={isCollectionDialogOpen}
          onOpenChange={setIsCollectionDialogOpen}
        >
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
                  value={collectionFormData.name}
                  onChange={(e) =>
                    setCollectionFormData((prev) => ({
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
                  value={collectionFormData.description}
                  onChange={(e) =>
                    setCollectionFormData((prev) => ({
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
                  value={collectionFormData.category}
                  onChange={(e) =>
                    setCollectionFormData((prev) => ({
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
                  value={collectionFormData.tags}
                  onChange={(e) =>
                    setCollectionFormData((prev) => ({
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
                onClick={() => setIsCollectionDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateQuestionCollection}>
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
                      <SelectItem value={INTERVIEW_TYPES.MCQ}>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Multiple Choice (MCQ)
                        </div>
                      </SelectItem>
                      <SelectItem value={INTERVIEW_TYPES.CODING}>
                        <div className="flex items-center gap-2">
                          <Code className="w-4 h-4 text-blue-500" />
                          Coding Challenge
                        </div>
                      </SelectItem>
                      <SelectItem value={INTERVIEW_TYPES.BEHAVIORAL}>
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-purple-500" />
                          Behavioral Interview
                        </div>
                      </SelectItem>
                      <SelectItem value={INTERVIEW_TYPES.COMBO}>
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-orange-500" />
                          Combo (Mixed Types)
                        </div>
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
                      <SelectItem value={INTERVIEW_TYPES.MCQ}>MCQ</SelectItem>
                      <SelectItem value={INTERVIEW_TYPES.CODING}>
                        Coding
                      </SelectItem>
                      <SelectItem value={INTERVIEW_TYPES.BEHAVIORAL}>
                        Behavioral
                      </SelectItem>
                      <SelectItem value={INTERVIEW_TYPES.COMBO}>
                        Combo (Mixed Types)
                      </SelectItem>
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
                          <Badge variant="secondary">{template.subCategory}</Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        <div>
                          Question Types: {(template.questionTypes || []).join(" & ")}
                        </div>
                        <div>
                          Target Roles: {(template.targetRoles || []).join(" & ")}
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
                Delete Question Bank: {collectionToDelete?.name}
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
                  onClick={handleDeleteQuestionCollection}
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
