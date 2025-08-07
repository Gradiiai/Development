"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/shared/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/shared/card";
import { Input } from "@/components/ui/shared/input";
import { Label } from "@/components/ui/shared/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/shared/switch";
import { Badge } from "@/components/ui/shared/badge";
import { Separator } from "@/components/ui/shared/separator";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/shared/dialog";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Clock,
  Users,
  Settings,
  Layers,
  Code,
  MessageSquare,
  Loader2,
  AlertCircle,
  Calendar,
  ZapIcon,
  PlusIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useJobCampaignStore,
  InterviewRound,
} from "@/shared/store/jobCampaignStore";
import {
  useInterviewSetup,
  useQuestionBanks,
  useQuestionSets,
  useInterviewTemplates,
} from "@/shared/hooks/useInterviewSetup";
import { JobCampaignNavigation } from "@/components/job-campaign/JobCampaignNavigation";

const interviewTypeIcons = {
  behavioral: MessageSquare,
  coding: Code,
  mcq: Settings,
  combo: Layers,
};

const interviewTypeColors = {
  behavioral: "bg-blue-100 text-blue-800",
  coding: "bg-green-100 text-green-800",
  mcq: "bg-purple-100 text-purple-800",
  combo: "bg-orange-100 text-orange-800",
};

export default function InterviewSetupPage() {
  const router = useRouter();
  const { state, setCurrentStep } = useJobCampaignStore();
  const { campaignId } = state;

  const {
    interviewSetup,
    loading: setupLoading,
    error: setupError,
    fetchInterviewSetup,
    saveInterviewSetup,
  } = useInterviewSetup();

  // Set current step for navigation highlighting
  useEffect(() => {
    setCurrentStep(2);
  }, []); // Empty dependency array - only run once on mount

  // Fetch interview setup when campaignId is available
  useEffect(() => {
    if (campaignId) {
      console.log("Fetching interview setup for campaign:", campaignId);
      fetchInterviewSetup(campaignId);
    }
  }, [campaignId, fetchInterviewSetup]);

  const {
    questionBanks: questionCollections,
    loading: questionCollectionsLoading,
    error: questionCollectionsError,
  } = useQuestionBanks();

  // State for hierarchical question bank selection
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const {
    questionSets,
    loading: questionSetsLoading,
    error: questionSetsError,
  } = useQuestionSets(selectedBankId);

  const {
    interviewTemplates,
    loading: templatesLoading,
    error: templatesError,
  } = useInterviewTemplates();

  const {
    updateScoringParameters,
    addRound: addRoundToStore,
    removeRound: removeRoundFromStore,
    updateRound: updateRoundInStore,
  } = useJobCampaignStore();
  const { rounds, selectedTemplate } = state.scoringParameters;

  // Initialize default round if none exist
  useEffect(() => {
    if (rounds.length === 0) {
      const defaultRound = {
        id: "1",
        name: "Initial Screening",
        type: "behavioral" as const,
        timeLimit: { hours: 0, minutes: 30 },
        numberOfQuestions: 5,
        difficulty: "easy" as const,
        chooseRandom: true,
        instructions:
          "This round focuses on cultural fit and basic qualifications.",
        bankId: undefined, // No question bank selected by default
        questionBank: "", // No question type selected by default
        isEnabled: true,
      };
      updateScoringParameters({ rounds: [defaultRound] });
    }
  }, [rounds.length]); // Remove updateScoringParameters from dependencies
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for managing question sets for each round
  const [roundQuestionSets, setRoundQuestionSets] = useState<{
    [roundId: string]: Array<{
      id: string;
      bankId: string;
      questionType: string;
      numberOfQuestions: number;
      difficulty: "easy" | "medium" | "hard";
    }>;
  }>({});

  // Auto-scheduling configuration state (placeholder)
  const [autoSchedulingEnabled, setAutoSchedulingEnabled] = useState(false);
  const [scoreThreshold, setScoreThreshold] = useState(75);
  const [timeZone, setTimeZone] = useState("Asia/Kolkata");
  const [interviewInterval, setInterviewInterval] = useState("24");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [workingDays, setWorkingDays] = useState([
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
  ]);

  // Initialize question sets for rounds
  useEffect(() => {
    const newRoundQuestionSets: typeof roundQuestionSets = {};
    rounds.forEach((round) => {
      if (!roundQuestionSets[round.id]) {
        newRoundQuestionSets[round.id] = [
          {
            id: `${round.id}-qs-1`,
            bankId: round.bankId || "",
            questionType: round.questionBank || "",
            numberOfQuestions: round.numberOfQuestions || 5,
            difficulty:
              (round.difficulty === "mixed" ? "medium" : round.difficulty) ||
              "medium",
          },
        ];
      } else {
        newRoundQuestionSets[round.id] = roundQuestionSets[round.id];
      }
    });
    setRoundQuestionSets(newRoundQuestionSets);
  }, [rounds.length]);

  const addQuestionSet = (roundId: string) => {
    setRoundQuestionSets((prev) => ({
      ...prev,
      [roundId]: [
        ...(prev[roundId] || []),
        {
          id: `${roundId}-qs-${Date.now()}`,
          bankId: "",
          questionType: "",
          numberOfQuestions: 5,
          difficulty: "medium" as const,
        },
      ],
    }));
  };

  const removeQuestionSet = (roundId: string, questionSetId: string) => {
    setRoundQuestionSets((prev) => ({
      ...prev,
      [roundId]: prev[roundId]?.filter((qs) => qs.id !== questionSetId) || [],
    }));
  };

  const updateQuestionSet = (
    roundId: string,
    questionSetId: string,
    field: string,
    value: any
  ) => {
    setRoundQuestionSets((prev) => ({
      ...prev,
      [roundId]:
        prev[roundId]?.map((qs) =>
          qs.id === questionSetId ? { ...qs, [field]: value } : qs
        ) || [],
    }));
  };

  // Placeholder function for toggling working days
  const toggleWorkingDay = (day: string) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const loading =
    setupLoading || questionCollectionsLoading || templatesLoading;
  const hasError =
    setupError ||
    questionCollectionsError ||
    templatesError ||
    questionSetsError;

  // Apply template when selected
  const handleTemplateChange = (templateId: string) => {
    if (templateId === "none") {
      updateScoringParameters({ selectedTemplate: "" });
      return;
    }

    if (templateId && interviewTemplates && interviewTemplates.length > 0) {
      const template = interviewTemplates.find((t) => t.id === templateId);
      if (template && template.rounds) {
        // Convert template rounds to our format
        const templateRounds = template.rounds.map((round) => ({
          id:
            round.id ||
            Date.now().toString() + Math.random().toString(36).substring(2, 9),
          name: round.name,
          type: round.type as "behavioral" | "coding" | "mcq" | "combo",
          timeLimit: round.timeLimit,
          numberOfQuestions: round.numberOfQuestions || 5,
          difficulty: round.difficultyLevel
            ? (round.difficultyLevel as "easy" | "medium" | "hard")
            : "medium",
          chooseRandom: round.randomizeQuestions || true,
          instructions: round.instructions || "",
          bankId: undefined, // Templates don't have specific question banks
          questionBank: "", // No question type selected by default
          isEnabled: true,
        }));
        updateScoringParameters({
          selectedTemplate: templateId,
          rounds: templateRounds,
        });
      }
    }
  };

  const handleAddRound = () => {
    // Directly add a new round without showing dialog
    addRoundToStore("mcq"); // Default to MCQ type
  };

  const removeRound = (id: string) => {
    removeRoundFromStore(id);
  };

  const handleUpdateRound = (
    id: string,
    field: keyof InterviewRound,
    value: any
  ) => {
    updateRoundInStore(id, field, value);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      if (!campaignId) {
        setError(
          "Campaign ID not found. Please go back to the job details page."
        );
        setSaving(false);
        return;
      }

      // Validate that all rounds have names
      const invalidRounds = rounds.filter(
        (round) => !round.name || round.name.trim() === ""
      );
      if (invalidRounds.length > 0) {
        setError(
          "All interview rounds must have a name. Please fill in the missing round names."
        );
        setSaving(false);
        return;
      }

      const interviewData = {
        campaignId,
        template: selectedTemplate || undefined,
        rounds: rounds.map((round) => ({
          name: round.name.trim(),
          type: round.type,
          timeLimit: round.timeLimit,
          numberOfQuestions: (roundQuestionSets[round.id] || []).reduce(
            (total, qs) => total + qs.numberOfQuestions,
            0
          ), // Total questions from all question sets
          difficulty: round.difficulty, // Keep as fallback, but individual sets will have their own difficulty
          chooseRandom: round.chooseRandom,
          instructions: round.instructions,
          questionSets: roundQuestionSets[round.id] || [], // Include the question sets for this round
          // Legacy fields for compatibility
          questionCollectionId: round.bankId,
          questionType: round.questionBank,
          bankId: round.bankId,
        })),
      };

      const result = await saveInterviewSetup(interviewData);

      if (result.success) {
        // Update campaign status to active when interview setup is completed
        try {
          const statusResponse = await fetch(
            `/api/campaigns/jobs/${campaignId}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                status: "active",
              }),
            }
          );

          if (!statusResponse.ok) {
            console.warn("Failed to update campaign status to active");
          }
        } catch (statusError) {
          console.warn("Error updating campaign status:", statusError);
        }

        // Set current step to 3 (scoring parameters) and navigate
        setCurrentStep(3);
        router.push("/dashboard/job-campaign/scoring-parameters");
      } else {
        setError(result.error || "Failed to save interview setup");
      }
    } catch (err) {
      setError("Failed to save interview setup");
      console.error("Error saving interview setup:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading interview setup...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Error Alert */}
        {(error || hasError) && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || hasError}</AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          {/* 1. Create Job Campaigns headline */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Interview Setup
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="px-3 py-1">
                <Calendar className="w-4 h-4 mr-1" />
                Step 2
              </Badge>
            </div>
          </div>

          {/* 2. Job Campaign Navigation */}
          <div className="mb-6">
            <JobCampaignNavigation />
          </div>
        </motion.div>

        {/* Template Selection */}
        {interviewTemplates && interviewTemplates.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card>
              <CardHeader>
                <div className="space-y-3">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Interview Setup
                  </h2>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <p className="text-gray-600 whitespace-nowrap">
                        Step 2 of 4: 
                      </p>
                      <Progress value={50} className="h-1 w-60 [&>div]:bg-purple-600" />
                    </div>
                    <Button
                      onClick={handleAddRound}
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-2 bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200"
                    >
                      <p className="flex items-center text-purple-600 font-semibold bg-transparent rounded">
                        <PlusIcon className="w-5 h-5" />
                      </p>
                      Add Round
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Select Template</Label>
                  <Select
                    value={selectedTemplate || ""}
                    onValueChange={handleTemplateChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Custom Setup)</SelectItem>
                      {interviewTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTemplate && (
                    <p className="text-sm text-gray-600 mt-2">
                      {
                        interviewTemplates.find(
                          (t) => t.id === selectedTemplate
                        )?.description
                      }
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Interview Rounds */}
        <div className="space-y-6">
          {rounds.map((round, index) => {
            const IconComponent = interviewTypeIcons[round.type] || Settings;
            return (
              <motion.div
                key={round.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="border-2 transition-colors">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <ZapIcon className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            Round {index + 1}
                          </CardTitle>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {rounds.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRound(round.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="">
                      <div className="w-full flex justify-between items-center mb-4 gap-4">
                        {/* Round Name */}
                        <div className="space-y-2 w-[40%]">
                          <Label htmlFor={`name-${round.id}`}>Round Name</Label>
                          <Input
                            id={`name-${round.id}`}
                            value={round.name || ""}
                            onChange={(e) =>
                              handleUpdateRound(
                                round.id,
                                "name",
                                e.target.value
                              )
                            }
                            placeholder="e.g., Technical Assessment"
                          />
                        </div>
                        {/* Time Limit */}
                        <div className="space-y-2 w-[30%]">
                          <Label htmlFor={`timeLimit-${round.id}`}>
                            Time Limit (minutes)
                          </Label>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                              id={`timeLimit-${round.id}`}
                              type="number"
                              value={round.timeLimit?.minutes || 0}
                              onChange={(e) =>
                                handleUpdateRound(round.id, "timeLimit", {
                                  hours: round.timeLimit?.hours || 0,
                                  minutes: parseInt(e.target.value) || 0,
                                })
                              }
                              className="pl-10"
                              min="5"
                              max="180"
                            />
                          </div>
                        </div>

                        {/* Randomize Questions */}
                        <div className="flex flex-col gap-2 w-[30%]">
                          <Label className="text-sm font-medium">
                            Randomize Questions
                          </Label>
                          <Switch
                            checked={round.chooseRandom || false}
                            onCheckedChange={(checked) =>
                              handleUpdateRound(
                                round.id,
                                "chooseRandom",
                                checked
                              )
                            }
                          />
                        </div>
                      </div>

                      {/* Interview Type
                      <div className="space-y-2">
                        <Label>Interview Type</Label>
                        <Select
                          value={round.type || 'behavioral'}
                          onValueChange={(value) => handleUpdateRound(round.id, 'type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="behavioral">Behavioral</SelectItem>
                            <SelectItem value="coding">Coding</SelectItem>
                            <SelectItem value="mcq">MCQ</SelectItem>
                            <SelectItem value="combo">Combo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div> */}

                      {/* Question Bank Selection */}
                      <div className="space-y-4">
                        <table className="w-full border-collapse rounded-lg overflow-hidden">
                          <thead>
                            <tr className="bg-purple-100">
                              <th className="p-2 pl-4 border font-medium text-left">
                                Question Bank
                              </th>
                              <th className="p-2 pl-4 border font-medium text-left">
                                No. of Questions
                              </th>
                              <th className="p-2 pl-4 border font-medium text-left">
                                Difficulty Level
                              </th>
                              <th className="p-2 pl-4 border font-medium text-left">
                                Question Type
                              </th>
                              <th className="border text-left">
                                <Button
                                  onClick={() => addQuestionSet(round.id)}
                                  size="sm"
                                  className="bg-transparent hover:bg-transparent hover:text-purple-900 text-purple-600 border-purple-300"
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {(roundQuestionSets[round.id] || []).map(
                              (questionSet, qsIndex) => (
                                <tr key={questionSet.id} className="border">
                                  <td className="p-2">
                                    <Select
                                      value={questionSet.bankId}
                                      onValueChange={(value) => {
                                        updateQuestionSet(
                                          round.id,
                                          questionSet.id,
                                          "bankId",
                                          value
                                        );
                                        updateQuestionSet(
                                          round.id,
                                          questionSet.id,
                                          "questionType",
                                          ""
                                        ); // Reset question type when bank changes
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select Question Bank" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {(questionCollections as any[])
                                          .filter((bank) => bank.isActive)
                                          .map((bank) => (
                                            <SelectItem
                                              key={bank.id}
                                              value={bank.id}
                                            >
                                              {bank.name} ({bank.questionCount}{" "}
                                              questions)
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  <td className="p-2">
                                    <Input
                                      type="number"
                                      value={questionSet.numberOfQuestions}
                                      onChange={(e) =>
                                        updateQuestionSet(
                                          round.id,
                                          questionSet.id,
                                          "numberOfQuestions",
                                          parseInt(e.target.value) || 1
                                        )
                                      }
                                      min="1"
                                      max="50"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <Select
                                      value={questionSet.difficulty}
                                      onValueChange={(value) =>
                                        updateQuestionSet(
                                          round.id,
                                          questionSet.id,
                                          "difficulty",
                                          value
                                        )
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="easy">
                                          Easy
                                        </SelectItem>
                                        <SelectItem value="medium">
                                          Medium
                                        </SelectItem>
                                        <SelectItem value="hard">
                                          Hard
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  <td className="p-2">
                                    <Select
                                      value={questionSet.questionType}
                                      onValueChange={(value) =>
                                        updateQuestionSet(
                                          round.id,
                                          questionSet.id,
                                          "questionType",
                                          value
                                        )
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select Type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">
                                          None (Custom Questions)
                                        </SelectItem>
                                        {questionCollections
                                          .find(
                                            (bank: any) =>
                                              bank.id === questionSet.bankId
                                          )
                                          ?.questionTypes?.map(
                                            (qt: {
                                              type: string;
                                              count: number;
                                            }) => (
                                              <SelectItem
                                                key={qt.type}
                                                value={qt.type}
                                              >
                                                {qt.type.toUpperCase()}{" "}
                                                Questions ({qt.count} questions)
                                              </SelectItem>
                                            )
                                          )}
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  <td className="p-2">
                                    <button
                                      className="text-red-500 hover:text-red-700"
                                      onClick={() =>
                                        removeQuestionSet(
                                          round.id,
                                          questionSet.id
                                        )
                                      }
                                      disabled={
                                        (roundQuestionSets[round.id] || [])
                                          .length === 1
                                      }
                                    >
                                      🗑️
                                    </button>
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Instructions */}
                    <div className="space-y-2">
                      <Label htmlFor={`instructions-${round.id}`}>
                        Instructions for Candidates
                      </Label>
                      <Textarea
                        id={`instructions-${round.id}`}
                        value={round.instructions || ""}
                        onChange={(e) =>
                          handleUpdateRound(
                            round.id,
                            "instructions",
                            e.target.value
                          )
                        }
                        placeholder="Provide clear instructions for this interview round..."
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Auto-Scheduling Configuration - Single section for all rounds */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <Card className="bg-white border-2 transition-colors">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-2 rounded">
                  <div className="flex items-center">
                    <p className="flex items-center text-purple-600 font-semibold p-2 bg-purple-100 rounded mr-2">
                      <ZapIcon className="w-5 h-5" />
                    </p>
                    <h3 className="text-xl font-semibold text-gray-900">
                      Auto-Scheduling Configuration
                    </h3>
                  </div>
                  <Switch
                    checked={autoSchedulingEnabled}
                    onCheckedChange={setAutoSchedulingEnabled}
                  />
                </div>
                <p className="text-sm text-gray-600 bg-purple-50 p-2 rounded">
                  ℹ️ When enabled, candidates with resume scores above the
                  threshold will automatically have interviews scheduled.
                </p>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label>Score Threshold (%)</Label>
                    <Input
                      type="number"
                      value={scoreThreshold}
                      onChange={(e) =>
                        setScoreThreshold(parseInt(e.target.value) || 0)
                      }
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <Label>Time Zone</Label>
                    <Select value={timeZone} onValueChange={setTimeZone}>
                      <SelectTrigger>
                        <SelectValue placeholder="Asia/Kolkata (IST)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Kolkata">
                          Asia/Kolkata (IST)
                        </SelectItem>
                        {/* Add more time zones as needed */}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Interview Interval (hours)</Label>
                    <Select
                      value={interviewInterval}
                      onValueChange={setInterviewInterval}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="24 hours (1 day)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24">24 hours (1 day)</SelectItem>
                        {/* Add more intervals as needed */}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-6 p-2">
                  <div className="space-y-2 w-[40%]">
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 w-[60%]">
                    <Label>Working Days</Label>
                    <div className="flex flex-wrap gap-4">
                      {[
                        "Mon",
                        "Tue",
                        "Wed",
                        "Thu",
                        "Fri",
                        "Sat",
                        "Sun",
                      ].map((day) => (
                        <div
                          key={day}
                          className="flex items-center space-x-2 mt-2"
                        >
                          <input
                            type="checkbox"
                            id={`day-${day}`}
                            checked={workingDays.includes(day)}
                            onChange={() => toggleWorkingDay(day)}
                            className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 focus:ring-2"
                          />
                          <Label
                            htmlFor={`day-${day}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {day}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 flex justify-between"
        >
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => {
              setCurrentStep(1);
              router.push("/dashboard/job-campaign/job-details");
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Job Details
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Draft"
              )}
            </Button>
            <Button
              className="flex items-center gap-2"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Complete Setup
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
