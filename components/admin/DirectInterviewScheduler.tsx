'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/shared/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Input } from '@/components/ui/shared/input';
import { Label } from '@/components/ui/shared/label';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/shared/dialog';
import { Calendar, Clock, User, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface CampaignJobDetails {
  campaignName: string;
  jobTitle: string;
  jobDescription: string;
  department?: string;
  location?: string;
}

interface InterviewSetup {
  id: string;
  roundNumber: number;
  roundName: string;
  title: string;
  description: string;
  interviewType: string;
  timeLimit: number;
  passingScore: number;
  isActive: boolean;
  // Optional database schema fields that might be available
  numberOfQuestions?: number;
  difficultyLevel?: string;
  questionBankId?: string;
  instructions?: string;
  // Legacy compatibility
  difficulty?: string;
  questionBank?: string;
}

interface DirectInterviewSchedulerProps {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  onInterviewScheduled?: () => void;
  trigger?: React.ReactNode;
  // Campaign context (optional for backward compatibility)
  campaignJobDetails?: CampaignJobDetails;
  interviewSetups?: InterviewSetup[];
  campaignId?: string;
}

interface DirectInterviewData {
  candidateId: string;
  interviewType: 'behavioral' | 'mcq' | 'coding' | 'combo';
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  interviewerId?: string;
  interviewLink?: string;
  timezone: string;
  difficultyLevel: 'easy' | 'medium' | 'hard';
  numberOfQuestions: number;
}

export default function DirectInterviewScheduler({ 
  candidateId, 
  candidateName, 
  candidateEmail,
  onInterviewScheduled, 
  trigger,
  campaignJobDetails,
  interviewSetups,
  campaignId
}: DirectInterviewSchedulerProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // Determine default values based on campaign setup or use defaults
  const getDefaultInterviewConfig = () => {
    if (interviewSetups && interviewSetups.length > 0) {
      // Use the first active interview setup as default
      const activeSetup = interviewSetups.find(setup => setup.isActive) || interviewSetups[0];
      return {
        interviewType: activeSetup.interviewType as 'behavioral' | 'mcq' | 'coding' | 'combo',
        difficulty: (activeSetup.difficultyLevel as 'easy' | 'medium' | 'hard') || (activeSetup.difficulty as 'easy' | 'medium' | 'hard') || 'medium',
        numberOfQuestions: activeSetup.numberOfQuestions || 10,
        duration: activeSetup.timeLimit || 60
      };
    }
    // Fallback to defaults for direct interviews
    return {
      interviewType: 'behavioral' as const,
      difficulty: 'medium' as const,
      numberOfQuestions: 10,
      duration: 60
    };
  };

  const defaultConfig = getDefaultInterviewConfig();
  
  const [formData, setFormData] = useState<DirectInterviewData>({
    candidateId: candidateId,
    interviewType: defaultConfig.interviewType,
    scheduledDate: '',
    scheduledTime: '',
    duration: defaultConfig.duration,
    timezone: 'UTC',
    difficultyLevel: defaultConfig.difficulty,
    numberOfQuestions: defaultConfig.numberOfQuestions,
    interviewLink: '',
    interviewerId: ''
  });

  const handleInputChange = (field: keyof DirectInterviewData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.scheduledDate || !formData.scheduledTime) {
        toast.error('Please select both date and time for the interview');
        return;
      }



      // Check if scheduled time is in the future
      const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
      if (scheduledDateTime <= new Date()) {
        toast.error('Scheduled time must be in the future');
        return;
      }

      // Get question bank from campaign setup if available
      const getQuestionBank = () => {
        if (interviewSetups && interviewSetups.length > 0) {
          const matchingSetup = interviewSetups.find(setup => 
            setup.interviewType === formData.interviewType && setup.isActive
          );
          return matchingSetup?.questionBankId || matchingSetup?.questionBank;
        }
        return undefined;
      };

      // Prepare data based on interview type
      let requestBody: any = {
        candidateName: candidateName,
        candidateEmail: candidateEmail,
        interviewDate: formData.scheduledDate,
        interviewTime: formData.scheduledTime,
        questionBank: getQuestionBank(),
      };

      let endpoint = '';

      switch (formData.interviewType) {
        case 'behavioral':
          endpoint = '/api/interviews/behavioral';
          requestBody = {
            ...requestBody,
            jobPosition: campaignJobDetails?.jobTitle || 'General Position',
            jobDescription: campaignJobDetails?.jobDescription || 'Direct interview assessment',
            yearsOfExperience: 0, // Default value
            resumeText: '',
            campaignId: campaignId || undefined,
            useQuestionBank: !!getQuestionBank(),
            numberOfQuestions: formData.numberOfQuestions,
            difficultyLevel: formData.difficultyLevel,
          };
          break;

        case 'mcq':
          endpoint = '/api/interviews/mcq';
          requestBody = {
            ...requestBody,
            jobPosition: campaignJobDetails?.jobTitle || 'General Position',
            jobDescription: campaignJobDetails?.jobDescription || 'Direct interview assessment',
            yearsOfExperience: 0, // Default value
            numberOfQuestions: formData.numberOfQuestions,
            difficulty: formData.difficultyLevel,
            resumeText: '',
            campaignId: campaignId || undefined,
            useQuestionBank: !!getQuestionBank(),
            difficultyLevel: formData.difficultyLevel,
          };
          break;

        case 'coding':
          endpoint = '/api/interviews/coding';
          requestBody = {
            ...requestBody,
            interviewTopic: campaignJobDetails?.jobTitle || 'General Coding Assessment',
            difficultyLevel: formData.difficultyLevel,
            problemDescription: campaignJobDetails?.jobDescription || 'Direct coding interview assessment',
            timeLimit: formData.duration,
            programmingLanguage: 'javascript', // Default
            campaignId: campaignId || undefined,
          };
          break;

        case 'combo':
          endpoint = '/api/interviews/combo';
          requestBody = {
            ...requestBody,
            jobPosition: campaignJobDetails?.jobTitle || 'General Position',
            jobDescription: campaignJobDetails?.jobDescription || 'Direct interview assessment',
            yearsOfExperience: 0, // Default value
            totalQuestions: formData.numberOfQuestions,
            difficulty: formData.difficultyLevel,
            resumeText: '',
            campaignId: campaignId || undefined,
            useQuestionBank: !!getQuestionBank(),
            difficultyLevel: formData.difficultyLevel,
          };
          break;

        default:
          throw new Error('Invalid interview type');
      }

      console.log(` Scheduling ${formData.interviewType} interview:`, requestBody);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to schedule interview');
      }

      toast.success(`${formData.interviewType.charAt(0).toUpperCase() + formData.interviewType.slice(1)} interview scheduled successfully!`);
      setOpen(false);
      onInterviewScheduled?.();
      
      // Reset form
      const resetConfig = getDefaultInterviewConfig();
      setFormData({
        candidateId: candidateId,
        interviewType: resetConfig.interviewType,
        scheduledDate: '',
        scheduledTime: '',
        duration: resetConfig.duration,
        timezone: 'UTC',
        difficultyLevel: resetConfig.difficulty,
        numberOfQuestions: resetConfig.numberOfQuestions,
        interviewLink: '',
        interviewerId: ''
      });

    } catch (error: any) {
      console.error('Error scheduling interview:', error);
      toast.error(error.message || 'Failed to schedule interview');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultQuestions = (type: string): number => {
    // Try to get from campaign setup first
    if (interviewSetups && interviewSetups.length > 0) {
      const matchingSetup = interviewSetups.find(setup => 
        setup.interviewType === type && setup.isActive
      );
      if (matchingSetup) {
        // Ensure a numeric fallback if numberOfQuestions is undefined
        return matchingSetup.numberOfQuestions ?? 5;
      }
    }
    
    // Fallback to defaults
    switch (type) {
      case 'mcq': return 10;
      case 'coding': return 3;
      case 'behavioral': return 5;
      case 'combo': return 8;
      default: return 5;
    }
  };

  const handleInterviewTypeChange = (type: string) => {
    handleInputChange('interviewType', type);
    handleInputChange('numberOfQuestions', getDefaultQuestions(type));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Interview
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {campaignJobDetails ? 'Schedule Campaign Interview' : 'Schedule Direct Interview'}
          </DialogTitle>
          <DialogDescription>
            {campaignJobDetails 
              ? `Schedule an interview for ${candidateName} for the ${campaignJobDetails.jobTitle} position in ${campaignJobDetails.campaignName}.`
              : `Schedule an interview for ${candidateName} without requiring a specific job campaign.`
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Candidate Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" />
                Candidate Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Name:</span> {candidateName}
                </div>
                <div>
                  <span className="font-medium">ID:</span> {candidateId}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interview Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Interview Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Show campaign interview setup info */}
              {interviewSetups && interviewSetups.length > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="text-sm font-medium text-blue-900 mb-1">
                    Campaign Interview Setup
                  </div>
                  <div className="text-xs text-blue-700">
                    {interviewSetups.filter(s => s.isActive).length} active round(s) configured for this campaign
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="interviewType">Interview Type</Label>
                  <Select 
                    value={formData.interviewType} 
                    onValueChange={handleInterviewTypeChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select interview type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="behavioral">Behavioral</SelectItem>
                      <SelectItem value="mcq">Multiple Choice (MCQ)</SelectItem>
                      <SelectItem value="coding">Coding</SelectItem>
                      <SelectItem value="combo">Combination</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="15"
                    max="180"
                    value={formData.duration}
                    onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficultyLevel">Difficulty Level</Label>
                  <Select 
                    value={formData.difficultyLevel} 
                    onValueChange={(value) => handleInputChange('difficultyLevel', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numberOfQuestions">Number of Questions</Label>
                  <Input
                    id="numberOfQuestions"
                    type="number"
                    min="1"
                    max="50"
                    value={formData.numberOfQuestions}
                    onChange={(e) => handleInputChange('numberOfQuestions', parseInt(e.target.value))}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Schedule Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduledDate">Interview Date</Label>
                  <Input
                    id="scheduledDate"
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scheduledTime">Interview Time</Label>
                  <Input
                    id="scheduledTime"
                    type="time"
                    value={formData.scheduledTime}
                    onChange={(e) => handleInputChange('scheduledTime', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select 
                    value={formData.timezone} 
                    onValueChange={(value) => handleInputChange('timezone', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Europe/Paris">Paris</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                      <SelectItem value="Asia/Shanghai">Shanghai</SelectItem>
                      <SelectItem value="Asia/Kolkata">India</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interviewLink">Meeting Link (Optional)</Label>
                  <Input
                    id="interviewLink"
                    type="url"
                    placeholder="https://meet.google.com/..."
                    value={formData.interviewLink}
                    onChange={(e) => handleInputChange('interviewLink', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>



          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Scheduling...' : 'Schedule Interview'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}