'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/shared/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Input } from '@/components/ui/shared/input';
import { Label } from '@/components/ui/shared/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/shared/switch';
import { Badge } from '@/components/ui/shared/badge';
import { Separator } from '@/components/ui/shared/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, ArrowRight, Plus, Trash2, Clock, Users, Settings, Layers, Code, MessageSquare, Loader2, AlertCircle, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useJobCampaignStore, InterviewRound } from '@/shared/store/jobCampaignStore';
import { useInterviewSetup, useQuestionBanks, useQuestionSets, useInterviewTemplates } from '@/shared/hooks/useInterviewSetup';



const interviewTypeIcons = {
  behavioral: MessageSquare,
  coding: Code,
  mcq: Settings,
  combo: Layers,
};

const interviewTypeColors = {
  behavioral: 'bg-blue-100 text-blue-800',
  coding: 'bg-green-100 text-green-800',
  mcq: 'bg-purple-100 text-purple-800',
  combo: 'bg-orange-100 text-orange-800',
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
    saveInterviewSetup
  } = useInterviewSetup();

  // Fetch interview setup when campaignId is available
  useEffect(() => {
    if (campaignId) {
      console.log('Fetching interview setup for campaign:', campaignId);
      fetchInterviewSetup(campaignId);
    }
  }, [campaignId, fetchInterviewSetup]);
  
  const {
    questionBanks: questionCollections,
    loading: questionCollectionsLoading,
    error: questionCollectionsError
  } = useQuestionBanks();
  
  // State for hierarchical question bank selection
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const {
    questionSets,
    loading: questionSetsLoading,
    error: questionSetsError
  } = useQuestionSets(selectedBankId);
  
  
  const {
    interviewTemplates,
    loading: templatesLoading,
    error: templatesError
  } = useInterviewTemplates();

  const { updateScoringParameters, addRound: addRoundToStore, removeRound: removeRoundFromStore, updateRound: updateRoundInStore } = useJobCampaignStore();
  const { rounds, selectedTemplate } = state.scoringParameters;
  
  // Initialize default round if none exist
  useEffect(() => {
    if (rounds.length === 0) {
      const defaultRound = {
        id: '1',
        name: 'Initial Screening',
        type: 'behavioral' as const,
        timeLimit: { hours: 0, minutes: 30 },
        numberOfQuestions: 5,
        difficulty: 'easy' as const,
        chooseRandom: true,
        instructions: 'This round focuses on cultural fit and basic qualifications.',
        bankId: undefined, // No question bank selected by default
        questionBank: '', // No question type selected by default
        isEnabled: true
      };
      updateScoringParameters({ rounds: [defaultRound] });
    }
  }, [rounds.length, updateScoringParameters]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  

  
  const loading = setupLoading || questionCollectionsLoading || templatesLoading;
  const hasError = setupError || questionCollectionsError || templatesError || questionSetsError;

  // Apply template when selected
  const handleTemplateChange = (templateId: string) => {
    if (templateId === 'none') {
      updateScoringParameters({ selectedTemplate: '' });
      return;
    }
    
    if (templateId && interviewTemplates && interviewTemplates.length > 0) {
      const template = interviewTemplates.find(t => t.id === templateId);
      if (template && template.rounds) {
        // Convert template rounds to our format
        const templateRounds = template.rounds.map(round => ({
          id: round.id || Date.now().toString() + Math.random().toString(36).substring(2, 9),
          name: round.name,
          type: round.type as 'behavioral' | 'coding' | 'mcq' | 'combo',
          timeLimit: round.timeLimit,
          numberOfQuestions: round.numberOfQuestions || 5,
          difficulty: round.difficultyLevel ? (round.difficultyLevel as 'easy' | 'medium' | 'hard') : 'medium',
          chooseRandom: round.randomizeQuestions || true,
          instructions: round.instructions || '',
          bankId: undefined, // Templates don't have specific question banks
          questionBank: '', // No question type selected by default
          isEnabled: true
        }));
        updateScoringParameters({ 
          selectedTemplate: templateId,
          rounds: templateRounds 
        });
      }
    }
  };

  const addRound = () => {
    addRoundToStore();
  };

  const removeRound = (id: string) => {
    removeRoundFromStore(id);
  };

  const handleUpdateRound = (id: string, field: keyof InterviewRound, value: any) => {
    updateRoundInStore(id, field, value);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      if (!campaignId) {
        setError('Campaign ID not found. Please go back to the job details page.');
        setSaving(false);
        return;
      }
      
      // Validate that all rounds have names
      const invalidRounds = rounds.filter(round => !round.name || round.name.trim() === '');
      if (invalidRounds.length > 0) {
        setError('All interview rounds must have a name. Please fill in the missing round names.');
        setSaving(false);
        return;
      }
      
      const interviewData = {
        campaignId,
        template: selectedTemplate || undefined,
        rounds: rounds.map(round => ({
          name: round.name.trim(),
          type: round.type,
          timeLimit: round.timeLimit,
          numberOfQuestions: round.numberOfQuestions,
          difficulty: round.difficulty,
          chooseRandom: round.chooseRandom,
          instructions: round.instructions,
          questionCollectionId: round.bankId, // Use bankId (UUID) for question collection
          questionType: round.questionBank, // questionBank is actually the question type
          bankId: round.bankId // Also pass bankId for compatibility
        })),

      };
      
      const result = await saveInterviewSetup(interviewData);
      
      if (result.success) {
        // Update campaign status to active when interview setup is completed
        try {
          const statusResponse = await fetch(`/api/campaigns/jobs/${campaignId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'active'
            }),
          });
          
          if (!statusResponse.ok) {
            console.warn('Failed to update campaign status to active');
          }
        } catch (statusError) {
          console.warn('Error updating campaign status:', statusError);
        }
        
        // Set current step to 3 (scoring parameters) and navigate
        setCurrentStep(3);
        router.push('/dashboard/job-campaign/scoring-parameters');
      } else {
        setError(result.error || 'Failed to save interview setup');
      }
    } catch (err) {
      setError('Failed to save interview setup');
      console.error('Error saving interview setup:', err);
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
            <AlertDescription>
              {error || hasError}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Interview Setup</h1>
              <p className="text-gray-600">Step 2 of 5: Configure Interview Rounds</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="px-3 py-1">
                <Calendar className="w-4 h-4 mr-1" />
                Step 2
              </Badge>
              <Button onClick={addRound} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Round
              </Button>
            </div>
          </div>
          <Progress value={40} className="h-2" />
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
                <CardTitle className="text-lg">Interview Templates</CardTitle>
                <CardDescription>Select a template to quickly set up your interview rounds</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Select Template</Label>
                                      <Select value={selectedTemplate || ''} onValueChange={handleTemplateChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Custom Setup)</SelectItem>
                      {interviewTemplates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTemplate && (
                    <p className="text-sm text-gray-600 mt-2">
                      {interviewTemplates.find(t => t.id === selectedTemplate)?.description}
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
                <Card className="border-2 hover:border-blue-200 transition-colors">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <IconComponent className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Round {index + 1}</CardTitle>
                          <CardDescription>Configure interview parameters</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={interviewTypeColors[round.type] || 'bg-gray-100 text-gray-800'}>
                          {round.type.replace('-', ' ')}
                        </Badge>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Round Name */}
                      <div className="space-y-2">
                        <Label htmlFor={`name-${round.id}`}>Round Name</Label>
                        <Input
                          id={`name-${round.id}`}
                          value={round.name || ''}
                          onChange={(e) => handleUpdateRound(round.id, 'name', e.target.value)}
                          placeholder="e.g., Technical Assessment"
                        />
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
                    {/* // ... existing code ... */}
                      <div className="space-y-4">
                        <Label>Question Bank</Label>

                        {/* Step 1: Select Bank */}
                        <div className="space-y-2">
                          <Label className="text-sm text-gray-600">1. </Label>
                          <Select
                            value={round.bankId || ''}
                            onValueChange={(value) => {
                              handleUpdateRound(round.id, 'bankId', value || null);
                              handleUpdateRound(round.id, 'questionBank', ''); // Reset question type when bank changes
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a question bank" />
                            </SelectTrigger>
                            <SelectContent>
                              {(questionCollections as any[])
                                .filter((bank) => bank.isActive)
                                .map((bank) => (
                                  <SelectItem key={bank.id} value={bank.id}>
                                    {bank.name} ({bank.questionCount} questions)
                                  </SelectItem>

                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Step 2: Select Question Set */}
                        {round.bankId ? (
                          <div className="space-y-2">
                            <Label className="text-sm text-gray-600">2. Select Question Type</Label>

                            <Select
                              value={round.questionBank || ''}
                              onValueChange={(value) => handleUpdateRound(round.id, 'questionBank', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Choose question type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None (Custom Questions)</SelectItem>

                                {questionCollections
                                  .find((bank: any) => bank.id === round.bankId)
                                  ?.questionTypes?.map((qt: { type: string; count: number }) => (
                                    <SelectItem key={qt.type} value={qt.type}>
                                      {qt.type.toUpperCase()} Questions ({qt.count} questions)
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-md">
                            <p className="text-sm text-gray-600">
                              First select a question bank to see available question types (MCQ, Coding, Behavioral, Combo)
                            </p>
                          </div>
                        )}
                      </div>
                      {/* Time Limit */}
                      <div className="space-y-2">
                        <Label htmlFor={`timeLimit-${round.id}`}>Time Limit (minutes)</Label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <Input
                            id={`timeLimit-${round.id}`}
                            type="number"
                            value={round.timeLimit?.minutes || 0}
                            onChange={(e) => handleUpdateRound(round.id, 'timeLimit', { hours: round.timeLimit?.hours || 0, minutes: parseInt(e.target.value) || 0 })}
                            className="pl-10"
                            min="5"
                            max="180"
                          />
                        </div>
                      </div>

                      {/* Number of Questions */}
                      <div className="space-y-2">
                        <Label htmlFor={`questions-${round.id}`}>Number of Questions</Label>
                        <Input
                          id={`questions-${round.id}`}
                          type="number"
                          value={round.numberOfQuestions || 0}
                          onChange={(e) => handleUpdateRound(round.id, 'numberOfQuestions', parseInt(e.target.value) || 1)}
                          min="1"
                          max="50"
                        />
                      </div>

                      {/* Difficulty Level */}
                      <div className="space-y-2">
                        <Label>Difficulty Level</Label>
                        <Select
                          value={round.difficulty || 'medium'}
                          onValueChange={(value) => handleUpdateRound(round.id, 'difficulty', value)}
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


                    </div>

                    {/* Randomize Questions */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">Randomize Questions</Label>
                        <p className="text-sm text-gray-600">Shuffle questions for each candidate</p>
                      </div>
                      <Switch
                        checked={round.chooseRandom || false}
                        onCheckedChange={(checked) => handleUpdateRound(round.id, 'chooseRandom', checked)}
                      />
                    </div>

                    {/* Instructions */}
                    <div className="space-y-2">
                      <Label htmlFor={`instructions-${round.id}`}>Instructions for Candidates</Label>
                      <Textarea
                        id={`instructions-${round.id}`}
                        value={round.instructions || ''}
                        onChange={(e) => handleUpdateRound(round.id, 'instructions', e.target.value)}
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
              router.push('/dashboard/job-campaign/job-details');
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
                'Save Draft'
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