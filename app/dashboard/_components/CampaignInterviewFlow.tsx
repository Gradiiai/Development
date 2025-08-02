'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Button } from '../../../components/ui/shared/button';
import { Input } from '../../../components/ui/shared/input';
import { Label } from '../../../components/ui/shared/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Badge } from '../../../components/ui/shared/badge';
import { Avatar, AvatarFallback } from '../../../components/ui/shared/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../components/ui/shared/dialog';
import { Calendar } from '../../../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import { useToast } from '@/shared/hooks/use-toast';
import { format } from 'date-fns';
import { 
  Search, 
  Send, 
  Users, 
  Briefcase, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Mail,
  User,
  FileText,
  Settings,
  CalendarIcon,
  Eye,
  ExternalLink,
  Calendar as CalendarSchedule
} from 'lucide-react';

interface Campaign {
  id: string;
  campaignName: string;
  jobTitle: string;
  status: string;
  numberOfOpenings: number;
  createdAt: string;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  experience?: string;
  status: 'applied' | 'screening' | 'interview' | 'hired' | 'rejected';
  overallScore?: number;
  talentFitScore?: number;
  source: string;
  appliedAt: string;
  cvScore?: number;
  parsedResumeData?: any;
}

interface InterviewSetup {
  id: string;
  roundName?: string;
  setupName?: string;
  roundNumber: number;
  interviewType: string;
  timeLimit: number;
  numberOfQuestions: number;
  difficultyLevel: string;
  isActive: boolean;
}

const CampaignInterviewFlow: React.FC = () => {
  const { data: session } = useSession();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [interviewSetups, setInterviewSetups] = useState<InterviewSetup[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sendingInterviews, setSendingInterviews] = useState<Set<string>>(new Set());
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [scheduleData, setScheduleData] = useState({
    date: null as Date | null,
    time: '',
    setupId: ''
  });
  const [interviewSent, setInterviewSent] = useState(false);
  const [sentInterviewData, setSentInterviewData] = useState<any>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (selectedCampaign) {
      fetchCandidates();
      fetchInterviewSetups();
    }
  }, [selectedCampaign]);

  useEffect(() => {
    if (showScheduleDialog) {
      generateTimeSlots();
    }
  }, [showScheduleDialog, scheduleData.date]);

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
      const timeString = `${hour.toString().padStart(2, '0')}:00`;
      slots.push(timeString);
    }
    setAvailableTimeSlots(slots);
  };

  const fetchCampaigns = async () => {
    if (!session?.user?.companyId) return;
    
    try {
      const response = await fetch(`/api/campaigns/jobs?companyId=${session.user.companyId}`);
      const data = await response.json();
      if (data.success) {
        setCampaigns(data.data || []);
        if (data.data && data.data.length > 0) {
          setSelectedCampaign(data.data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch campaigns',
        variant: 'destructive'
      });
    }
  };

  const fetchCandidates = async () => {
    if (!selectedCampaign) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/candidates/profiles?campaignId=${selectedCampaign}`);
      const data = await response.json();
      if (data.success) {
        setCandidates(data.candidates || []);
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch candidates',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchInterviewSetups = async () => {
    if (!selectedCampaign) return;
    
    try {
      const response = await fetch(`/api/interviews/setup?campaignId=${selectedCampaign}`);
      const data = await response.json();
      if (data.success) {
        setInterviewSetups(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching interview setups:', error);
    }
  };

  const sendInterview = (candidate: Candidate) => {
    if (interviewSetups.length === 0) {
      toast({
        title: 'No Interview Setup',
        description: 'Please configure interview setup for this campaign first',
        variant: 'destructive'
      });
      return;
    }

    setSelectedCandidate(candidate);
    setShowScheduleDialog(true);
    // Set default setup to first active one
    const activeSetup = interviewSetups.find((setup: InterviewSetup) => setup.isActive) || interviewSetups[0];
    setScheduleData(prev => ({ ...prev, setupId: activeSetup.id }));
  };

  const handleScheduleInterview = async () => {
    if (!selectedCandidate || !scheduleData.setupId || !scheduleData.date || !scheduleData.time) {
      toast({
        title: 'Missing Information',
        description: 'Please select a date, time slot and interview setup',
        variant: 'destructive'
      });
      return;
    }

    setSendingInterviews((prev: Set<string>) => new Set(prev).add(selectedCandidate.id));

    try {
      const response = await fetch('/api/campaigns/interviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          candidateId: selectedCandidate.id,
          campaignId: selectedCampaign,
          interviewSetupId: scheduleData.setupId,
          scheduledDate: scheduleData.date ? format(scheduleData.date, 'yyyy-MM-dd') : '',
          scheduledTime: scheduleData.time
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Interview Sent',
          description: `Interview link sent to ${selectedCandidate.name} successfully`,
        });
        setInterviewSent(true);
        setSentInterviewData({
          interviewId: data.data?.interviewId,
          candidateName: selectedCandidate.name,
          candidateEmail: selectedCandidate.email,
          scheduledAt: `${format(scheduleData.date, 'PPP')} at ${scheduleData.time}`,
          interviewLink: data.data?.interviewLink
        });
        fetchCandidates();
      } else {
        throw new Error(data.error || 'Failed to send interview');
      }
    } catch (error) {
      console.error('Error sending interview:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send interview',
        variant: 'destructive'
      });
    } finally {
      setSendingInterviews((prev: Set<string>) => {
        const newSet = new Set(prev);
        newSet.delete(selectedCandidate.id);
        return newSet;
      });
    }
  };

  const resetScheduleForm = () => {
    setScheduleData({
      date: null,
      time: '',
      setupId: ''
    });
    setSelectedCandidate(null);
    setInterviewSent(false);
    setSentInterviewData(null);
    setIsDatePickerOpen(false);
  };

  const handleViewResults = () => {
    if (sentInterviewData?.interviewId) {
      window.open(`/dashboard/interviews/results/${sentInterviewData.interviewId}`, '_blank');
    }
  };

  const handleReschedule = () => {
    setInterviewSent(false);
    setSentInterviewData(null);
    // Keep the dialog open for rescheduling
  };

  const handleCloseDialog = () => {
    setShowScheduleDialog(false);
    resetScheduleForm();
  };

  const filteredCandidates = candidates.filter((candidate: Candidate) => {
    const matchesSearch = candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         candidate.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || candidate.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied': return 'bg-blue-100 text-blue-800';
      case 'screening': return 'bg-yellow-100 text-yellow-800';
      case 'interview': return 'bg-purple-100 text-purple-800';
      case 'hired': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'hired': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'interview': return <Clock className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Campaign Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Select Campaign
          </CardTitle>
          <CardDescription>
            Choose a job campaign to manage candidate interviews
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a campaign" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{campaign.campaignName}</span>
                    <Badge className="ml-2">
                      {campaign.jobTitle}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedCampaign && (
        <>
          {/* Interview Setup Info */}
          {interviewSetups.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Interview Configuration
                </CardTitle>
                <CardDescription>
                  Pre-configured interview settings for this campaign
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {interviewSetups.map((setup: InterviewSetup) => (
                    <div key={setup.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{setup.roundName || setup.setupName}</h4>
                        {setup.isActive && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">Active</Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Type: {setup.interviewType}</p>
                        <p>Questions: {setup.numberOfQuestions}</p>
                        <p>Difficulty: {setup.difficultyLevel}</p>
                        <p>Duration: {setup.timeLimit} min</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search candidates by name or email..."
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
                    <SelectItem value="applied">Applied</SelectItem>
                    <SelectItem value="screening">Screening</SelectItem>
                    <SelectItem value="interview">Interview</SelectItem>
                    <SelectItem value="hired">Hired</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Candidates List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Candidates ({filteredCandidates.length})
              </CardTitle>
              <CardDescription>
                Send interviews to candidates with pre-configured settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : filteredCandidates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {candidates.length === 0 ? 'No candidates found for this campaign' : 'No candidates match your filters'}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredCandidates.map((candidate: Candidate) => (
                    <div key={candidate.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarFallback>
                            {candidate.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{candidate.name}</h4>
                            <Badge className={getStatusColor(candidate.status)}>
                              <div className="flex items-center gap-1">
                                {getStatusIcon(candidate.status)}
                                {candidate.status}
                              </div>
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {candidate.email}
                            </div>
                            {candidate.experience && (
                              <div className="flex items-center gap-1">
                                <Briefcase className="h-3 w-3" />
                                {candidate.experience}
                              </div>
                            )}
                            {candidate.cvScore && (
                              <div className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                CV Score: {candidate.cvScore}%
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              Talent Fit: {candidate.talentFitScore || 0}%
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {(candidate.talentFitScore || 0) >= 30 ? (
                          <Button
                            onClick={() => sendInterview(candidate)}
                            disabled={sendingInterviews.has(candidate.id) || candidate.status === 'interview' || candidate.status === 'hired'}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            {sendingInterviews.has(candidate.id) ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="mr-2 h-4 w-4" />
                                Send Interview Link
                              </>
                            )}
                          </Button>
                        ) : (
                          <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">
                            Talent Fit below 30%
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Schedule Interview Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {interviewSent ? 'Interview Sent Successfully!' : 'Schedule Interview'}
            </DialogTitle>
          </DialogHeader>
          
          {!interviewSent ? (
            <div className="space-y-4">
              <div>
                <Label>Candidate</Label>
                <p className="text-sm text-gray-600">
                  {selectedCandidate?.name} ({selectedCandidate?.email})
                </p>
              </div>
              
              <div>
                <Label>Interview Setup</Label>
                <Select 
                  value={scheduleData.setupId} 
                  onValueChange={(value) => setScheduleData(prev => ({ ...prev, setupId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select interview setup" />
                  </SelectTrigger>
                  <SelectContent>
                    {interviewSetups.map((setup: InterviewSetup) => (
                      <SelectItem key={setup.id} value={setup.id}>
                        {setup.roundName || setup.setupName} - {setup.interviewType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Date</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={scheduleData.date ? format(scheduleData.date, 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        setScheduleData(prev => ({ ...prev, date: new Date(e.target.value) }));
                      }
                    }}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="flex-1"
                  />
                  <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon">
                        <CalendarIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduleData.date || undefined}
                        onSelect={(date) => {
                          if (date) {
                            setScheduleData(prev => ({ ...prev, date }));
                            setIsDatePickerOpen(false);
                          }
                        }}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return date < today;
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <div>
                <Label>Time Slot</Label>
                <Select 
                  value={scheduleData.time} 
                  onValueChange={(value) => setScheduleData(prev => ({ ...prev, time: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTimeSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={handleCloseDialog} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleScheduleInterview} 
                  className="flex-1"
                  disabled={!scheduleData.time || !scheduleData.setupId}
                >
                  Send Interview
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <h3 className="font-semibold text-green-800">Interview Sent Successfully!</h3>
                <p className="text-sm text-green-600 mt-1">
                  The interview link has been sent to the candidate.
                </p>
              </div>
              
              <div className="space-y-2">
                <div>
                  <Label className="text-sm font-medium">Candidate</Label>
                  <p className="text-sm text-gray-600">{sentInterviewData?.candidateName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-sm text-gray-600">{sentInterviewData?.candidateEmail}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Scheduled Time</Label>
                  <p className="text-sm text-gray-600">{sentInterviewData?.scheduledAt}</p>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                   variant="outline" 
                   onClick={handleViewResults}
                   className="flex-1"
                   disabled={!sentInterviewData?.interviewId}
                 >
                   <ExternalLink className="h-4 w-4 mr-2" />
                   View Results
                 </Button>
                <Button 
                  variant="outline" 
                  onClick={handleReschedule}
                  className="flex-1"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Reschedule
                </Button>
              </div>
              
              <Button 
                variant="default" 
                onClick={handleCloseDialog}
                className="w-full mt-2"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampaignInterviewFlow;