"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/shared/card";
import { Button } from "@/components/ui/shared/button";
import { Badge } from "@/components/ui/shared/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/shared/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/shared/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/shared/dropdown-menu";
import { Separator } from "@/components/ui/shared/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/shared/table";
// Note: Progress and ScrollArea components not available, using div alternatives
import {
  Users,
  TrendingUp,
  Award,
  Eye,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Target,
  Lightbulb,
  Brain,
  Code,
  MessageSquare,
  Layers,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  FileText,
  Play,
  Pause,
  Volume2,
  Info,
  Download,
  BarChart3,
  Clock,
  Zap,
  Video,
  Monitor,
  Calendar,
  Send,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";

interface InterviewResult {
  interview: {
    id: string;
    candidateName: string;
    jobPosition: string;
    interviewType: "coding" | "mcq" | "behavioral" | "combo";
    completedAt: string;
    duration: number;
    candidateId?: string;
    campaignId?: string;
  };
  summary: {
    totalQuestions: number;
    averageRating: number;
    totalAnswers: number;
    totalCodeAnswers: number;
    totalTimeSpent: number;
    averageTimePerQuestion: number;
    performanceMetrics: {
      accuracy: number;
      averageRating: number;
      timeEfficiency: number;
      completionRate: number;
    };
  };
  analytics: {
    strengths: string[];
    improvements: string[];
    recommendations: string[];
    overallAssessment: string;
    technicalSkills: string[];
    softSkills: string[];
    nextSteps: string[];
  };
  answers?: {
    id: string;
    question: string;
    userAnswer: string;
    correctAnswer?: string;
    isCorrect?: boolean;
    rating?: number;
    feedback?: string;
    language?: string;
    type: "mcq" | "behavioral" | "coding";
    timeSpent?: number;
    scoringBreakdown?: {
      syntax?: number;
      logic?: number;
      efficiency?: number;
      completeness?: number;
      timeManagement?: number;
      structure?: number;
      specificity?: number;
      relevance?: number;
      impact?: number;
      communication?: number;
    };
  }[];
  videoRecordings?: {
    fullInterview?: string;
    audioRecordings?: { questionIndex: number; url: string }[];
    hasRecordings?: boolean;
    metadata?: {
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
      uploadedAt?: string;
    };
  };
  approvalStatus?:
    | "pending"
    | "approved"
    | "rejected"
    | "next_round"
    | "interview_scheduled"
    | "feedback_sent"
    | "documents_requested";
}

interface DashboardStats {
  totalInterviews: number;
  averageScore: number;
  completionRate: number;
  totalCandidates: number;
}

export default function EnhancedInterviewResultsDashboard() {
  const { data: session } = useSession();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [selectedResult, setSelectedResult] = useState<InterviewResult | null>(
    null
  );
  const [interviewResults, setInterviewResults] = useState<InterviewResult[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalInterviews: 0,
    averageScore: 0,
    completionRate: 0,
    totalCandidates: 0,
  });

  // Enhanced approval dialog state
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] =
    useState<InterviewResult | null>(null);
  const [approvalAction, setApprovalAction] = useState<
    | "approve"
    | "reject"
    | "next_round"
    | "schedule_interview"
    | "send_feedback"
    | "request_documents"
    | null
  >(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime, setInterviewTime] = useState("");
  const [nextRoundDetails, setNextRoundDetails] = useState("");

  // Video playback state
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [selectedVideoResult, setSelectedVideoResult] =
    useState<InterviewResult | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Scoring explanation state
  const [scoringDialogOpen, setScoringDialogOpen] = useState(false);
  const [selectedAnswerForScoring, setSelectedAnswerForScoring] =
    useState<any>(null);

  // Handle candidate approval actions
  const handleApprovalAction = (
    candidate: InterviewResult,
    action:
      | "approve"
      | "reject"
      | "next_round"
      | "schedule_interview"
      | "send_feedback"
      | "request_documents"
  ) => {
    setSelectedCandidate(candidate);
    setApprovalAction(action);
    setApprovalDialogOpen(true);
    setApprovalNotes("");
    setFeedbackMessage("");
    setInterviewDate("");
    setInterviewTime("");
    setNextRoundDetails("");
  };

  const submitApprovalAction = async () => {
    if (!selectedCandidate || !approvalAction) return;

    setApprovalLoading(true);
    try {
      const requestBody: any = {
        action: approvalAction,
        notes: approvalNotes,
        interviewId: selectedCandidate.interview.id,
        campaignId: selectedCandidate.interview.campaignId,
      };

      // Add action-specific data
      if (approvalAction === "send_feedback") {
        requestBody.feedbackToCandidate = feedbackMessage;
      }
      if (approvalAction === "schedule_interview") {
        requestBody.meetingDetails = {
          date: interviewDate,
          time: interviewTime,
          notes: approvalNotes,
        };
      }
      if (approvalAction === "next_round") {
        requestBody.nextRoundDetails = {
          roundName: nextRoundDetails,
          date: interviewDate,
          time: interviewTime,
        };
        if (interviewDate) {
          requestBody.interviewDate = interviewDate;
        }
      }

      const response = await fetch(
        `/api/candidates/${selectedCandidate.interview.candidateId}/approval`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (response.ok) {
        // Update local state
        setInterviewResults((prev) =>
          prev.map((result) =>
            result.interview.id === selectedCandidate.interview.id
              ? {
                  ...result,
                  approvalStatus:
                    approvalAction === "approve"
                      ? "approved"
                      : approvalAction === "reject"
                        ? "rejected"
                        : approvalAction === "next_round"
                          ? "next_round"
                          : approvalAction === "schedule_interview"
                            ? "interview_scheduled"
                            : approvalAction === "send_feedback"
                              ? "feedback_sent"
                              : approvalAction === "request_documents"
                                ? "documents_requested"
                                : "pending",
                }
              : result
          )
        );

        const successMessages = {
          approve: "Candidate approved successfully!",
          reject: "Candidate rejected",
          next_round: "Candidate moved to next round!",
          schedule_interview: "Interview scheduled successfully!",
          send_feedback: "Feedback sent to candidate!",
          request_documents: "Document request sent to candidate!",
        };

        toast.success(
          successMessages[approvalAction as keyof typeof successMessages] ||
            "Action completed successfully!"
        );

        setApprovalDialogOpen(false);
        setSelectedCandidate(null);
        setApprovalAction(null);
        setApprovalNotes("");
        setFeedbackMessage("");
        setInterviewDate("");
        setInterviewTime("");
        setNextRoundDetails("");
      } else {
        throw new Error("Failed to process approval action");
      }
    } catch (error) {
      console.error("Error processing approval:", error);
      toast.error("Failed to process approval action");
    } finally {
      setApprovalLoading(false);
    }
  };

  // Video playback handlers
  const handleVideoPlay = (result: InterviewResult) => {
    setSelectedVideoResult(result);
    setSelectedVideoUrl(result.videoRecordings?.fullInterview || "");
    setVideoDialogOpen(true);
  };

  const toggleVideoPlayback = () => {
    if (videoRef.current) {
      if (videoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setVideoPlaying(!videoPlaying);
    }
  };

  // Scoring explanation handler
  const showScoringExplanation = (answer: any) => {
    setSelectedAnswerForScoring(answer);
    setScoringDialogOpen(true);
  };

  // Helper to format scoring breakdown
  const formatScoringBreakdown = (breakdown: any, type: string) => {
    if (!breakdown) return [];

    const items = [];
    if (type === "coding") {
      if (breakdown.syntax !== undefined)
        items.push({ label: "Syntax", value: breakdown.syntax, max: 2 });
      if (breakdown.logic !== undefined)
        items.push({ label: "Logic", value: breakdown.logic, max: 4 });
      if (breakdown.efficiency !== undefined)
        items.push({
          label: "Efficiency",
          value: breakdown.efficiency,
          max: 2,
        });
      if (breakdown.completeness !== undefined)
        items.push({
          label: "Completeness",
          value: breakdown.completeness,
          max: 1.5,
        });
      if (breakdown.timeManagement !== undefined)
        items.push({
          label: "Time Management",
          value: breakdown.timeManagement,
          max: 0.5,
        });
    } else if (type === "behavioral") {
      if (breakdown.structure !== undefined)
        items.push({
          label: "Structure (STAR)",
          value: breakdown.structure,
          max: 1,
        });
      if (breakdown.specificity !== undefined)
        items.push({
          label: "Specificity",
          value: breakdown.specificity,
          max: 1,
        });
      if (breakdown.relevance !== undefined)
        items.push({ label: "Relevance", value: breakdown.relevance, max: 1 });
      if (breakdown.impact !== undefined)
        items.push({ label: "Impact", value: breakdown.impact, max: 1 });
      if (breakdown.communication !== undefined)
        items.push({
          label: "Communication",
          value: breakdown.communication,
          max: 1,
        });
    }
    return items;
  };

  // Helper to get detailed scoring explanation
  const getScoringExplanation = (type: string) => {
    const explanations = {
      mcq: {
        title: "MCQ Scoring System",
        description:
          "Multiple choice questions are scored based on correctness and time efficiency.",
        criteria: [
          "Base Score: 1 point for correct answer, 0 for incorrect",
          "Time Bonus: Up to 0.2 points for quick answers (under 60s)",
          "Partial Bonus: 0.1 points for reasonably quick answers (under 75% of time limit)",
          "Maximum Score: 1.2 points per question",
        ],
      },
      coding: {
        title: "Coding Scoring System",
        description:
          "Coding solutions are evaluated across multiple dimensions for comprehensive assessment.",
        criteria: [
          "Syntax (2 pts): Code structure, proper syntax, and conventions",
          "Logic (4 pts): Algorithmic correctness and problem-solving approach",
          "Efficiency (2 pts): Time/space complexity and optimization",
          "Completeness (1.5 pts): Solution coverage and edge case handling",
          "Time Management (0.5 pts): Completion within expected timeframe",
        ],
      },
      behavioral: {
        title: "Behavioral Scoring System",
        description:
          "Behavioral responses are assessed using the STAR method and professional competencies.",
        criteria: [
          "Structure (1 pt): STAR method usage (Situation, Task, Action, Result)",
          "Specificity (1 pt): Concrete examples and detailed scenarios",
          "Relevance (1 pt): Alignment with job requirements and question context",
          "Impact (1 pt): Measurable outcomes and professional impact",
          "Communication (1 pt): Clarity, articulation, and professional presentation",
        ],
      },
    };
    return explanations[type as keyof typeof explanations] || explanations.mcq;
  };

  const getApprovalStatusBadge = (status?: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Approved
          </Badge>
        );
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "next_round":
        return (
          <Badge variant="default" className="bg-blue-100 text-blue-800">
            Next Round
          </Badge>
        );
      case "interview_scheduled":
        return (
          <Badge variant="default" className="bg-purple-100 text-purple-800">
            Interview Scheduled
          </Badge>
        );
      case "feedback_sent":
        return (
          <Badge variant="default" className="bg-yellow-100 text-yellow-800">
            Feedback Sent
          </Badge>
        );
      case "documents_requested":
        return (
          <Badge variant="default" className="bg-orange-100 text-orange-800">
            Documents Requested
          </Badge>
        );
      default:
        return <Badge variant="outline">Pending Review</Badge>;
    }
  };

  useEffect(() => {
    if (session?.user?.companyId) {
      fetchInterviewResults();
    }
  }, [session]);

  const calculateTimeEfficiency = (
    actualTimeSeconds: number,
    maxTimeSeconds: number
  ) => {
    const effectiveTime = Math.min(actualTimeSeconds, maxTimeSeconds);
    const efficiency =
      ((maxTimeSeconds - effectiveTime) / maxTimeSeconds) * 100;
    return Math.max(0, Math.min(100, parseFloat(efficiency.toFixed(1))));
  };

  const calculateOverallScore = (
    accuracy: number,
    timeEfficiency: number,
    completionRate: number
  ) => {
    const normalizedAccuracy = (accuracy / 10) * 5; // Accuracy is 0-10
    const normalizedTimeEfficiency = (timeEfficiency / 100) * 5; // Efficiency is 0-100
    const normalizedCompletionRate = (completionRate / 100) * 5; // Completion is 0-100
    const weights = { accuracy: 0.5, timeEfficiency: 0.3, completionRate: 0.2 };
    const averageRating =
      weights.accuracy * normalizedAccuracy +
      weights.timeEfficiency * normalizedTimeEfficiency +
      weights.completionRate * normalizedCompletionRate;
    return parseFloat((averageRating * 20).toFixed(1)); // Return as percentage
  };

  const fetchInterviewResults = async () => {
    if (!session?.user?.companyId) {
      toast.error("Company ID not found. Please log in again.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/interviews/results");
      if (response.ok) {
        const data = await response.json();

        // Fetch answers and compute metrics for each interview
        const resultsWithAnswers = await Promise.all(
          data.results.map(async (result: InterviewResult) => {
            try {
              const answersResponse = await fetch(
                `/api/interviews/${result.interview.id}/results`
              );
              if (answersResponse.ok) {
                const answersData = await answersResponse.json();
                // Calculate time efficiency (assume max 600 seconds for 10 questions)
                const maxTimeSeconds = 600;
                const timeEfficiency = calculateTimeEfficiency(
                  result.summary.totalTimeSpent,
                  maxTimeSeconds
                );
                // Calculate overall score
                const averageRating = calculateOverallScore(
                  result.summary.performanceMetrics.accuracy,
                  timeEfficiency,
                  result.summary.performanceMetrics.completionRate
                );
                return {
                  ...result,
                  answers: answersData.answers || [],
                  approvalStatus: result.approvalStatus || "pending",
                  summary: {
                    ...result.summary,
                    performanceMetrics: {
                      ...result.summary.performanceMetrics,
                      timeEfficiency,
                      averageRating: averageRating / 20, // Store as 0-5 scale for consistency
                    },
                  },
                };
              }
            } catch (error) {
              console.error(
                "Error fetching answers for interview:",
                result.interview.id,
                error
              );
            }
            // Fallback: Calculate metrics even if answers fetch fails
            const maxTimeSeconds = 600;
            const timeEfficiency = calculateTimeEfficiency(
              result.summary.totalTimeSpent,
              maxTimeSeconds
            );
            const averageRating = calculateOverallScore(
              result.summary.performanceMetrics.accuracy,
              timeEfficiency,
              result.summary.performanceMetrics.completionRate
            );
            return {
              ...result,
              answers: [],
              approvalStatus: "pending",
              summary: {
                ...result.summary,
                performanceMetrics: {
                  ...result.summary.performanceMetrics,
                  timeEfficiency,
                  averageRating: averageRating / 20, // Store as 0-5 scale
                },
              },
            };
          })
        );

        setInterviewResults(resultsWithAnswers);
        setStats(data.stats);
      } else {
        throw new Error("Failed to fetch interview results");
      }
    } catch (error) {
      console.error("Error fetching interview results:", error);
      toast.error("Failed to fetch interview results");
    } finally {
      setLoading(false);
    }
  };

  const calculateDashboardStats = (results: InterviewResult[]) => {
    const totalInterviews = results.length;
    const totalCandidates = new Set(
      results.map((r) => r.interview.candidateName)
    ).size;
    const averageScore =
      results.length > 0
        ? (results.reduce(
            (sum, r) => sum + r.summary.performanceMetrics.averageRating,
            0
          ) /
            results.length) *
          20
        : 0;
    const completionRate =
      results.length > 0
        ? results.reduce(
            (sum, r) => sum + r.summary.performanceMetrics.completionRate,
            0
          ) / results.length
        : 0;

    setStats({
      totalInterviews,
      averageScore,
      completionRate,
      totalCandidates,
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading interview results and video recordings...</p>
          <p className="text-sm text-gray-500 mt-2">
            Analyzing answers and preparing comprehensive reports...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Enhanced Interview Results Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Comprehensive AI-powered analysis with detailed scoring and video
            playback
          </p>
        </div>
        <Button onClick={fetchInterviewResults} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Interviews
                </p>
                <p className="text-2xl font-bold">{stats.totalInterviews}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Average Score
                </p>
                <p
                  className={`text-2xl font-bold ${getScoreColor(stats.averageScore)}`}
                >
                  {stats.averageScore.toFixed(1)}%
                </p>
              </div>
              <Award className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Completion Rate
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.completionRate.toFixed(1)}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Candidates
                </p>
                <p className="text-2xl font-bold">{stats.totalCandidates}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="coding">Coding</TabsTrigger>
          <TabsTrigger value="mcq">MCQ</TabsTrigger>
          <TabsTrigger value="behavioral">Behavioral</TabsTrigger>
          <TabsTrigger value="combo">Combo</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="mb-6">Recent Interview Results</CardTitle>
              <CardDescription>
                Latest interviews with comprehensive AI analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {interviewResults.slice(0, 10).map((result) => {
                  const score =
                    result.summary.performanceMetrics.averageRating * 20;
                  return (
                    <div
                      key={result.interview.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium text-lg">
                            {result.interview.candidateName}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {result.interview.jobPosition}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">
                              {result.interview.interviewType.toUpperCase()}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {new Date(
                                result.interview.completedAt
                              ).toLocaleDateString()}
                            </span>
                            {getApprovalStatusBadge(result.approvalStatus)}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={getScoreBadgeVariant(score)}
                            className="mb-2"
                          >
                            {score.toFixed(1)}%
                          </Badge>
                          <p className="text-xs text-gray-500">
                            {result.summary.totalTimeSpent}min
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                        <div>
                          <span className="text-gray-600">Questions:</span>{" "}
                          {result.summary.totalQuestions}
                        </div>
                        <div>
                          <span className="text-gray-600">Completion:</span>{" "}
                          {result.summary.performanceMetrics.completionRate}%
                        </div>
                        <div>
                          <span className="text-gray-600">Accuracy:</span>{" "}
                          {(
                            result.summary.performanceMetrics.accuracy * 10
                          ).toFixed(1)}
                          %
                        </div>
                        <div>
                          <span className="text-gray-600">Efficiency:</span>{" "}
                          {result.summary.performanceMetrics.timeEfficiency.toFixed(
                            1
                          )}
                          %
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <p className="text-sm text-gray-700 font-medium mb-1">
                            Overall Assessment:
                          </p>
                          <p className="text-sm text-gray-600">
                            {result.analytics?.overallAssessment ||
                              "Assessment not available."}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {result.approvalStatus === "pending" && (
                            <>
                              {/* Primary Actions */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleApprovalAction(result, "approve")
                                }
                                className="text-green-600 border-green-600 hover:bg-green-50"
                              >
                                <ThumbsUp className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleApprovalAction(result, "next_round")
                                }
                                className="text-blue-600 border-blue-600 hover:bg-blue-50"
                              >
                                <ArrowRight className="h-4 w-4 mr-1" />
                                Next Round
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleApprovalAction(result, "reject")
                                }
                                className="text-red-600 border-red-600 hover:bg-red-50"
                              >
                                <ThumbsDown className="h-4 w-4 mr-1" />
                                Reject
                              </Button>

                              {/* Additional Actions Dropdown */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Info className="h-4 w-4 mr-1" />
                                    More Actions
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleApprovalAction(
                                        result,
                                        "schedule_interview"
                                      )
                                    }
                                    className="text-purple-600"
                                  >
                                    <Calendar className="h-4 w-4 mr-2" />
                                    Schedule Interview
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleApprovalAction(
                                        result,
                                        "send_feedback"
                                      )
                                    }
                                    className="text-orange-600"
                                  >
                                    <Send className="h-4 w-4 mr-2" />
                                    Send Feedback
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleApprovalAction(
                                        result,
                                        "request_documents"
                                      )
                                    }
                                    className="text-yellow-600"
                                  >
                                    <FileCheck className="h-4 w-4 mr-2" />
                                    Request Documents
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </>
                          )}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedResult(result)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh]">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <Target className="h-5 w-5" />
                                  Comprehensive Analysis:{" "}
                                  {result.interview.candidateName}
                                </DialogTitle>
                                <DialogDescription className="mt-5 ml-8">
                                  {result.interview.interviewType.toUpperCase()}{" "}
                                  Interview • {result.interview.jobPosition}
                                </DialogDescription>
                              </DialogHeader>

                              <div className="max-h-[60vh] overflow-y-auto space-y-6 p-1">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                                    <p className="text-sm text-gray-600">
                                      Overall Score
                                    </p>
                                    <p className="text-xl font-bold text-blue-600">
                                      {(
                                        result.summary.performanceMetrics
                                          .averageRating * 20
                                      ).toFixed(1)}
                                      %
                                    </p>
                                  </div>
                                  <div className="text-center p-3 bg-green-50 rounded-lg">
                                    <p className="text-sm text-gray-600">
                                      Accuracy
                                    </p>
                                    <p className="text-xl font-bold text-green-600">
                                      {(
                                        result.summary.performanceMetrics
                                          .accuracy * 10
                                      ).toFixed(1)}
                                      %
                                    </p>
                                  </div>
                                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                                    <p className="text-sm text-gray-600">
                                      Time Efficiency
                                    </p>
                                    <p className="text-xl font-bold text-yellow-600">
                                      {result.summary.performanceMetrics.timeEfficiency.toFixed(
                                        1
                                      )}
                                      %
                                    </p>
                                  </div>
                                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                                    <p className="text-sm text-gray-600">
                                      Completion
                                    </p>
                                    <p className="text-xl font-bold text-purple-600">
                                      {
                                        result.summary.performanceMetrics
                                          .completionRate
                                      }
                                      %
                                    </p>
                                  </div>
                                </div>

                                <Separator />

                                <div>
                                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                    <Award className="h-5 w-5" />
                                    Overall Assessment
                                  </h3>
                                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                                    {result.analytics?.overallAssessment ||
                                      "Overall assessment not available."}
                                  </p>
                                </div>

                                <div className="flex justify-between gap-3">
                                  <div>
                                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-green-600">
                                      <CheckCircle className="h-5 w-5" />
                                      Strengths
                                    </h3>
                                    <div className="space-y-2">
                                      {(result.analytics?.strengths || []).map(
                                        (strength, index) => (
                                          <div
                                            key={index}
                                            className="flex items-start gap-2 p-3 rounded-lg"
                                          >
                                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                            <p className="text-sm">
                                              {strength}
                                            </p>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>

                                  <div>
                                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-orange-600">
                                      <AlertCircle className="h-5 w-5" />
                                      Areas for Improvement
                                    </h3>
                                    <div className="space-y-2">
                                      {(
                                        result.analytics?.improvements || []
                                      ).map((improvement, index) => (
                                        <div
                                          key={index}
                                          className="flex items-start gap-2 p-3 rounded-lg"
                                        >
                                          <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                                          <p className="text-sm">
                                            {improvement}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  <div>
                                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-blue-600">
                                      <Lightbulb className="h-5 w-5" />
                                      Recommendations
                                    </h3>
                                    <div className="space-y-2">
                                      {(
                                        result.analytics?.recommendations || []
                                      ).map((recommendation, index) => (
                                        <div
                                          key={index}
                                          className="flex items-start gap-2 p-3 rounded-lg"
                                        >
                                          <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                          <p className="text-sm">
                                            {recommendation}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                {result.answers &&
                                  result.answers.length > 0 && (
                                    <>
                                      <Separator />
                                      <div>
                                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                          <FileText className="h-5 w-5" />
                                          Candidate Answers (
                                          {result.answers.length} questions)
                                        </h3>
                                        <div className="space-y-4 max-h-96 overflow-y-auto">
                                          {result.answers.map(
                                            (answer, index) => (
                                              <div
                                                key={answer.id}
                                                className="border rounded-lg p-4 bg-gray-50"
                                              >
                                                <div className="flex justify-between items-start mb-2">
                                                  <h4 className="font-medium text-sm">
                                                    Question {index + 1}
                                                  </h4>
                                                  <div className="flex gap-2">
                                                    <Badge
                                                      variant="outline"
                                                      className="text-xs"
                                                    >
                                                      {answer.type.toUpperCase()}
                                                    </Badge>
                                                    {answer.rating && (
                                                      <Badge
                                                        variant="secondary"
                                                        className="text-xs"
                                                      >
                                                        {answer.rating}/5
                                                      </Badge>
                                                    )}
                                                    {answer.isCorrect !==
                                                      undefined && (
                                                      <Badge
                                                        variant={
                                                          answer.isCorrect
                                                            ? "default"
                                                            : "destructive"
                                                        }
                                                        className="text-xs"
                                                      >
                                                        {answer.isCorrect
                                                          ? "Correct"
                                                          : "Incorrect"}
                                                      </Badge>
                                                    )}
                                                  </div>
                                                </div>

                                                <div className="space-y-3">
                                                  <div>
                                                    <p className="text-sm font-medium text-gray-700 mb-1">
                                                      Question:
                                                    </p>
                                                    <p className="text-sm text-gray-600 bg-white p-2 rounded border">
                                                      {answer.question}
                                                    </p>
                                                  </div>

                                                  <div>
                                                    <p className="text-sm font-medium text-gray-700 mb-1">
                                                      Candidate Answer:
                                                    </p>
                                                    <div className="bg-white p-2 rounded border">
                                                      {answer.type ===
                                                      "coding" ? (
                                                        <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                                                          {answer.userAnswer}
                                                        </pre>
                                                      ) : (
                                                        <p className="text-sm text-gray-800">
                                                          {answer.userAnswer}
                                                        </p>
                                                      )}
                                                      {answer.language && (
                                                        <Badge
                                                          variant="outline"
                                                          className="mt-2 text-xs"
                                                        >
                                                          {answer.language}
                                                        </Badge>
                                                      )}
                                                    </div>
                                                  </div>

                                                  {answer.correctAnswer &&
                                                    answer.type === "mcq" && (
                                                      <div>
                                                        <p className="text-sm font-medium text-gray-700 mb-1">
                                                          Correct Answer:
                                                        </p>
                                                        <p className="text-sm text-green-700 bg-green-50 p-2 rounded border">
                                                          {answer.correctAnswer}
                                                        </p>
                                                      </div>
                                                    )}

                                                  {answer.feedback && (
                                                    <div>
                                                      <p className="text-sm font-medium text-gray-700 mb-1">
                                                        AI Feedback:
                                                      </p>
                                                      <p className="text-sm text-gray-600 bg-yellow-50 p-2 rounded border">
                                                        {answer.feedback}
                                                      </p>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    </>
                                  )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {["coding", "mcq", "behavioral", "combo"].map((type) => {
          const filteredResults = interviewResults.filter(
            (result) => result.interview.interviewType === type
          );

          return (
            <TabsContent key={type} value={type} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {type === "coding" && <Code className="h-5 w-5" />}
                    {type === "mcq" && <Brain className="h-5 w-5" />}
                    {type === "behavioral" && (
                      <MessageSquare className="h-5 w-5" />
                    )}
                    {type === "combo" && <Layers className="h-5 w-5" />}
                    {type.charAt(0).toUpperCase() + type.slice(1)} Interview
                    Results ({filteredResults.length})
                  </CardTitle>
                  <CardDescription>
                    {type === "coding" &&
                      "Programming and algorithm challenges"}
                    {type === "mcq" && "Multiple choice technical questions"}
                    {type === "behavioral" &&
                      "Experience and soft skills questions"}
                    {type === "combo" &&
                      "Mixed interview format with multiple question types"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredResults.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        {type === "coding" && (
                          <Code className="h-6 w-6 text-gray-400" />
                        )}
                        {type === "mcq" && (
                          <Brain className="h-6 w-6 text-gray-400" />
                        )}
                        {type === "behavioral" && (
                          <MessageSquare className="h-6 w-6 text-gray-400" />
                        )}
                        {type === "combo" && (
                          <Layers className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                      <p className="text-gray-500 mb-2">
                        No {type} interviews found
                      </p>
                      <p className="text-sm text-gray-400">
                        {type === "coding" &&
                          "Coding interviews will appear here once candidates complete them"}
                        {type === "mcq" &&
                          "MCQ interviews will appear here once candidates complete them"}
                        {type === "behavioral" &&
                          "Behavioral interviews will appear here once candidates complete them"}
                        {type === "combo" &&
                          "Combo interviews will appear here once candidates complete them"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredResults.map((result) => {
                        const score =
                          result.summary.performanceMetrics.averageRating * 20;
                        return (
                          <div
                            key={result.interview.id}
                            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-medium text-lg">
                                  {result.interview.candidateName}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  {result.interview.jobPosition}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline">
                                    {result.interview.interviewType.toUpperCase()}
                                  </Badge>
                                  <span className="text-xs text-gray-500">
                                    {new Date(
                                      result.interview.completedAt
                                    ).toLocaleDateString()}
                                  </span>
                                  {getApprovalStatusBadge(
                                    result.approvalStatus
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge
                                  variant={getScoreBadgeVariant(score)}
                                  className="mb-2"
                                >
                                  {score.toFixed(1)}%
                                </Badge>
                                <p className="text-xs text-gray-500">
                                  {result.summary.totalTimeSpent}min
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                              <div>
                                <span className="text-gray-600">
                                  Questions:
                                </span>{" "}
                                {result.summary.totalQuestions}
                              </div>
                              <div>
                                <span className="text-gray-600">
                                  Completion:
                                </span>{" "}
                                {
                                  result.summary.performanceMetrics
                                    .completionRate
                                }
                                %
                              </div>
                              <div>
                                <span className="text-gray-600">Accuracy:</span>{" "}
                                {(
                                  result.summary.performanceMetrics.accuracy *
                                  10
                                ).toFixed(1)}
                                %
                              </div>
                              <div>
                                <span className="text-gray-600">
                                  Efficiency:
                                </span>{" "}
                                {result.summary.performanceMetrics.timeEfficiency.toFixed(
                                  1
                                )}
                                %
                              </div>
                            </div>

                            <div className="flex justify-between items-center gap-4">
                              <div className="flex-1">
                                <p className="text-sm text-gray-700 font-medium mb-1">
                                  Overall Assessment:
                                </p>
                                <p className="text-sm text-gray-600">
                                  {result.analytics?.overallAssessment ||
                                    "Assessment not available."}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                {result.approvalStatus === "pending" && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        handleApprovalAction(result, "approve")
                                      }
                                      className="text-green-600 border-green-600 hover:bg-green-50"
                                    >
                                      <ThumbsUp className="h-4 w-4 mr-1" />
                                      Approve
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        handleApprovalAction(result, "reject")
                                      }
                                      className="text-red-600 border-red-600 hover:bg-red-50"
                                    >
                                      <ThumbsDown className="h-4 w-4 mr-1" />
                                      Reject
                                    </Button>
                                  </>
                                )}
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setSelectedResult(result)}
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Details
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-4xl max-h-[80vh]">
                                    {/* Same detailed view as in overview tab */}
                                    <DialogHeader>
                                      <DialogTitle className="flex items-center gap-2">
                                        <Target className="h-5 w-5" />
                                        {type.charAt(0).toUpperCase() +
                                          type.slice(1)}{" "}
                                        Analysis:{" "}
                                        {result.interview.candidateName}
                                      </DialogTitle>
                                      <DialogDescription>
                                        {result.interview.interviewType.toUpperCase()}{" "}
                                        Interview •{" "}
                                        {result.interview.jobPosition}
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="max-h-[60vh] overflow-y-auto space-y-4 p-1">
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                                          <p className="text-sm text-gray-600">
                                            Overall Score
                                          </p>
                                          <p className="text-xl font-bold text-blue-600">
                                            {(
                                              result.summary.performanceMetrics
                                                .averageRating * 20
                                            ).toFixed(1)}
                                            %
                                          </p>
                                        </div>
                                        <div className="text-center p-3 bg-green-50 rounded-lg">
                                          <p className="text-sm text-gray-600">
                                            Accuracy
                                          </p>
                                          <p className="text-xl font-bold text-green-600">
                                            {(
                                              result.summary.performanceMetrics
                                                .accuracy * 10
                                            ).toFixed(1)}
                                            %
                                          </p>
                                        </div>
                                        <div className="text-center p-3 bg-yellow-50 rounded-lg">
                                          <p className="text-sm text-gray-600">
                                            Time Efficiency
                                          </p>
                                          <p className="text-xl font-bold text-yellow-600">
                                            {result.summary.performanceMetrics.timeEfficiency.toFixed(
                                              1
                                            )}
                                            %
                                          </p>
                                        </div>
                                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                                          <p className="text-sm text-gray-600">
                                            Completion
                                          </p>
                                          <p className="text-xl font-bold text-purple-600">
                                            {
                                              result.summary.performanceMetrics
                                                .completionRate
                                            }
                                            %
                                          </p>
                                        </div>
                                      </div>
                                      <Separator />
                                      <div>
                                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                          <Award className="h-5 w-5" />
                                          Overall Assessment
                                        </h3>
                                        <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                                          {result.analytics
                                            ?.overallAssessment ||
                                            "Overall assessment not available."}
                                        </p>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Enhanced Approval Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {approvalAction === "approve" && (
                <ThumbsUp className="h-5 w-5 text-green-600" />
              )}
              {approvalAction === "reject" && (
                <ThumbsDown className="h-5 w-5 text-red-600" />
              )}
              {approvalAction === "next_round" && (
                <ArrowRight className="h-5 w-5 text-blue-600" />
              )}
              {approvalAction === "schedule_interview" && (
                <Calendar className="h-5 w-5 text-purple-600" />
              )}
              {approvalAction === "send_feedback" && (
                <Send className="h-5 w-5 text-orange-600" />
              )}
              {approvalAction === "request_documents" && (
                <FileCheck className="h-5 w-5 text-yellow-600" />
              )}

              {approvalAction === "approve" && "Approve Candidate"}
              {approvalAction === "reject" && "Reject Candidate"}
              {approvalAction === "next_round" && "Move to Next Round"}
              {approvalAction === "schedule_interview" && "Schedule Interview"}
              {approvalAction === "send_feedback" && "Send Feedback"}
              {approvalAction === "request_documents" && "Request Documents"}
            </DialogTitle>
            <DialogDescription>
              {selectedCandidate && (
                <>
                  {approvalAction === "approve" &&
                    `Approve ${selectedCandidate.interview.candidateName} for the ${selectedCandidate.interview.jobPosition} position.`}
                  {approvalAction === "reject" &&
                    `Reject ${selectedCandidate.interview.candidateName}'s application.`}
                  {approvalAction === "next_round" &&
                    `Move ${selectedCandidate.interview.candidateName} to the next interview round.`}
                  {approvalAction === "schedule_interview" &&
                    `Schedule a follow-up interview with ${selectedCandidate.interview.candidateName}.`}
                  {approvalAction === "send_feedback" &&
                    `Send detailed feedback to ${selectedCandidate.interview.candidateName}.`}
                  {approvalAction === "request_documents" &&
                    `Request additional documents from ${selectedCandidate.interview.candidateName}.`}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* General Notes */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                {approvalAction === "send_feedback"
                  ? "Internal Notes"
                  : "Notes"}{" "}
                {approvalAction !== "send_feedback" && "(Optional)"}
              </label>
              <Textarea
                placeholder={`Add notes about your ${approvalAction} decision...`}
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Feedback Message for Send Feedback Action */}
            {approvalAction === "send_feedback" && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Feedback Message to Candidate *
                </label>
                <Textarea
                  placeholder="Enter detailed feedback for the candidate..."
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  rows={4}
                  required
                />
              </div>
            )}

            {/* Schedule Details for Interview/Next Round */}
            {(approvalAction === "schedule_interview" ||
              approvalAction === "next_round") && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Date{" "}
                    {approvalAction === "schedule_interview"
                      ? "*"
                      : "(Optional)"}
                  </label>
                  <input
                    type="date"
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    required={approvalAction === "schedule_interview"}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Time{" "}
                    {approvalAction === "schedule_interview"
                      ? "*"
                      : "(Optional)"}
                  </label>
                  <input
                    type="time"
                    value={interviewTime}
                    onChange={(e) => setInterviewTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    required={approvalAction === "schedule_interview"}
                  />
                </div>
              </div>
            )}

            {/* Next Round Details */}
            {approvalAction === "next_round" && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Next Round Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Technical Round, Final Interview, etc."
                  value={nextRoundDetails}
                  onChange={(e) => setNextRoundDetails(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApprovalDialogOpen(false)}
              disabled={approvalLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={submitApprovalAction}
              disabled={
                approvalLoading ||
                (approvalAction === "send_feedback" &&
                  !feedbackMessage.trim()) ||
                (approvalAction === "schedule_interview" &&
                  (!interviewDate || !interviewTime))
              }
              className={
                approvalAction === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : approvalAction === "reject"
                    ? "bg-red-600 hover:bg-red-700"
                    : approvalAction === "next_round"
                      ? "bg-blue-600 hover:bg-blue-700"
                      : approvalAction === "schedule_interview"
                        ? "bg-purple-600 hover:bg-purple-700"
                        : approvalAction === "send_feedback"
                          ? "bg-orange-600 hover:bg-orange-700"
                          : "bg-yellow-600 hover:bg-yellow-700"
              }
            >
              {approvalLoading
                ? "Processing..."
                : approvalAction === "approve"
                  ? "Approve"
                  : approvalAction === "reject"
                    ? "Reject"
                    : approvalAction === "next_round"
                      ? "Move to Next Round"
                      : approvalAction === "schedule_interview"
                        ? "Schedule Interview"
                        : approvalAction === "send_feedback"
                          ? "Send Feedback"
                          : "Request Documents"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video Playback Dialog */}
      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Interview Recording</DialogTitle>
            <DialogDescription>
              {selectedVideoResult?.interview.candidateName} -{" "}
              {selectedVideoResult?.interview.jobPosition}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedVideoUrl ? (
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  src={selectedVideoUrl}
                  controls
                  className="w-full h-auto"
                  onPlay={() => setVideoPlaying(true)}
                  onPause={() => setVideoPlaying(false)}
                  onEnded={() => setVideoPlaying(false)}
                >
                  Your browser does not support video playback.
                </video>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                <div className="text-center text-gray-500">
                  <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No video recording available</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleVideoPlayback}
                  disabled={!selectedVideoUrl}
                >
                  {videoPlaying ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Play
                    </>
                  )}
                </Button>
                {selectedVideoUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = selectedVideoUrl;
                      link.download = `interview-${selectedVideoResult?.interview.candidateName}.mp4`;
                      link.click();
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                )}
              </div>

              <div className="text-sm text-gray-500">
                Duration:{" "}
                {selectedVideoResult?.interview.duration
                  ? `${Math.floor(selectedVideoResult.interview.duration / 60)}:${String(selectedVideoResult.interview.duration % 60).padStart(2, "0")}`
                  : "Unknown"}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
