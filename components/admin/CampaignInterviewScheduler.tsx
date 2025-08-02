'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/shared/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Input } from '@/components/ui/shared/input';
import { Label } from '@/components/ui/shared/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/shared/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, User, Settings, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface InterviewSetup {
  id: string;
  roundNumber: number;
  roundName: string;
  interviewType: string;
  timeLimit: number;
  numberOfQuestions?: number;
  difficultyLevel?: string;
  questionBankId?: string;
  instructions?: string;
  isActive: boolean;
}

interface CampaignInterviewSchedulerProps {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  campaignId: string;
  interviewSetups: InterviewSetup[];
  onInterviewScheduled?: () => void;
  trigger?: React.ReactNode;
}

interface ScheduleData {
  interviewSetupId: string;
  scheduledDate: string;
  scheduledTime: string;
  timezone: string;
  candidateNotes?: string;
  interviewerNotes?: string;
}

export default function CampaignInterviewScheduler({ 
  candidateId, 
  candidateName, 
  candidateEmail,
  campaignId,
  interviewSetups,
  onInterviewScheduled,
  trigger
}: CampaignInterviewSchedulerProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const activeSetups = interviewSetups.filter(setup => setup.isActive);
  
  const [formData, setFormData] = useState<ScheduleData>({
    interviewSetupId: activeSetups.length > 0 ? activeSetups[0].id : '',
    scheduledDate: '',
    scheduledTime: '',
    timezone: 'UTC',
    candidateNotes: '',
    interviewerNotes: ''
  });

  const selectedSetup = activeSetups.find(setup => setup.id === formData.interviewSetupId);

  const handleInputChange = (field: keyof ScheduleData, value: string) => {
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
      if (!formData.scheduledDate || !formData.scheduledTime || !formData.interviewSetupId) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Check if scheduled time is in the future
      const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
      if (scheduledDateTime <= new Date()) {
        toast.error('Scheduled time must be in the future');
        return;
      }

      const response = await fetch('/api/campaigns/interviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId,
          candidateId,
          interviewSetupId: formData.interviewSetupId,
          scheduledDate: formData.scheduledDate,
          scheduledTime: formData.scheduledTime,
          candidateNotes: formData.candidateNotes,
          interviewerNotes: formData.interviewerNotes
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Interview scheduled successfully!');
        setOpen(false);
        if (onInterviewScheduled) {
          onInterviewScheduled();
        }
        // Reset form
        setFormData({
          interviewSetupId: activeSetups.length > 0 ? activeSetups[0].id : '',
          scheduledDate: '',
          scheduledTime: '',
          timezone: 'UTC',
          candidateNotes: '',
          interviewerNotes: ''
        });
      } else {
        toast.error(data.error || 'Failed to schedule interview');
      }
    } catch (error) {
      console.error('Error scheduling interview:', error);
      toast.error('An error occurred while scheduling the interview');
    } finally {
      setLoading(false);
    }
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Campaign Interview
          </DialogTitle>
          <DialogDescription>
            Schedule an interview for {candidateName}. Interview details are pre-configured from the campaign setup.
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
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Name:</span> {candidateName}
                </div>
                <div>
                  <span className="font-medium">Email:</span> {candidateEmail}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interview Setup Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Interview Round
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="interviewSetup">Select Interview Round</Label>
                <Select 
                  value={formData.interviewSetupId} 
                  onValueChange={(value) => handleInputChange('interviewSetupId', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select interview round" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeSetups.map((setup) => (
                      <SelectItem key={setup.id} value={setup.id}>
                        Round {setup.roundNumber}: {setup.roundName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Show selected setup details */}
              {selectedSetup && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-900 mb-2">
                    <CheckCircle className="h-4 w-4" />
                    Interview Configuration
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs text-green-700">
                    <div>
                      <span className="font-medium">Type:</span> {selectedSetup.interviewType.toUpperCase()}
                    </div>
                    <div>
                      <span className="font-medium">Duration:</span> {selectedSetup.timeLimit} minutes
                    </div>
                    <div>
                      <span className="font-medium">Questions:</span> {selectedSetup.numberOfQuestions || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Difficulty:</span> {selectedSetup.difficultyLevel || 'Medium'}
                    </div>
                  </div>
                  {selectedSetup.questionBankId && (
                    <div className="mt-2 text-xs text-green-600">
                      ✓ Question bank configured
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scheduling Details */}
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
                    <SelectItem value="America/New_York">Eastern Time (EST/EDT)</SelectItem>
                    <SelectItem value="America/Chicago">Central Time (CST/CDT)</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time (MST/MDT)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time (PST/PDT)</SelectItem>
                    <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                    <SelectItem value="Europe/Paris">Paris (CET/CEST)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                    <SelectItem value="Asia/Shanghai">Shanghai (CST)</SelectItem>
                    <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="candidateNotes">Notes for Candidate (Optional)</Label>
                <Textarea
                  id="candidateNotes"
                  placeholder="Any additional instructions or information for the candidate..."
                  value={formData.candidateNotes}
                  onChange={(e) => handleInputChange('candidateNotes', e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interviewerNotes">Internal Notes (Optional)</Label>
                <Textarea
                  id="interviewerNotes"
                  placeholder="Internal notes for the interviewer or HR team..."
                  value={formData.interviewerNotes}
                  onChange={(e) => handleInputChange('interviewerNotes', e.target.value)}
                  rows={2}
                />
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