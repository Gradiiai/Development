'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Button } from '@/components/ui/shared/button';
import { Input } from '@/components/ui/shared/input';
import { Label } from '@/components/ui/shared/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shared/tabs';
import { Badge } from '@/components/ui/shared/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/shared/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { 
  CalendarIcon, 
  Clock, 
  Users, 
  FileText, 
  TrendingUp, 
  Download, 
  Upload, 
  Eye, 
  Edit, 
  Trash2,
  Plus,
  Search,
  Filter,
  BarChart3,
  UserCheck,
  Calendar as CalendarSchedule,
  MessageSquare,
  Star,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface JobCampaign {
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

interface Interview {
  id: string;
  candidateId: string;
  candidate: Candidate;
  scheduledAt: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  score?: number;
  interviewType: string;
  interviewerId?: string;
  interviewLink?: string;
  interviewerEmails: string[];
  meetingLink?: string;
}

interface InterviewSetup {
  id: string;
  roundName?: string;
  setupName?: string;
  roundNumber: number;
  interviewType: string;
  timeLimit: number;
  totalDuration?: number;
  numberOfQuestions: number;
  difficultyLevel: string;
  isActive: boolean;
}

interface AnalyticsData {
  totalInterviews: number;
  completedInterviews: number;
  averageScore: number;
  completionRate: string;
  insights: any[];
  performanceByType?: any[];
}

const CampaignInterviewManagement = () => {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('overview');
  const [campaigns, setCampaigns] = useState<JobCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [interviewSetups, setInterviewSetups] = useState<InterviewSetup[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [scheduleData, setScheduleData] = useState({
    date: new Date(),
    time: '',
    setupId: '',
    interviewerEmails: [''],
    meetingLink: '',
    notes: ''
  });
  const [interviewSent, setInterviewSent] = useState(false);
  const [sentInterviewData, setSentInterviewData] = useState<any>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);

  useEffect(() => {
    fetchCampaigns();
  }, []);

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

  useEffect(() => {
    if (selectedCampaign) {
      fetchCandidates();
      fetchInterviews();
      fetchInterviewSetups();
      fetchAnalytics();
    }
  }, [selectedCampaign]);

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
      toast.error('Failed to fetch campaigns');
    }
  };

  const fetchCandidates = async () => {
    if (!selectedCampaign) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/candidates/profiles?campaignId=${selectedCampaign}`);
      const data = await response.json();
      if (data.success) {
        setCandidates(data.candidates);
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
      toast.error('Failed to fetch candidates');
    } finally {
      setLoading(false);
    }
  };

  const fetchInterviews = async () => {
    if (!selectedCampaign) return;
    
    try {
      const response = await fetch(`/api/campaigns/interviews?campaignId=${selectedCampaign}`);
      const data = await response.json();
      if (data.interviews) {
        setInterviews(data.interviews);
      }
    } catch (error) {
      console.error('Error fetching interviews:', error);
    }
  };

  const fetchInterviewSetups = async () => {
    if (!selectedCampaign) return;
    
    try {
      const response = await fetch(`/api/interviews/setup?campaignId=${selectedCampaign}`);
      const data = await response.json();
      if (data.success) {
        setInterviewSetups(data.data);
      }
    } catch (error) {
      console.error('Error fetching interview setups:', error);
    }
  };

  const fetchAnalytics = async () => {
    if (!selectedCampaign) return;
    
    try {
      const response = await fetch(`/api/interview-analytics?type=overview&campaignId=${selectedCampaign}`);
      const data = await response.json();
      if (data.overview) {
        setAnalytics(data.overview);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handleScheduleInterview = async () => {
    if (!selectedCandidate || !scheduleData.setupId || !scheduleData.time) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const response = await fetch('/api/campaigns/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: selectedCandidate.id,
          campaignId: selectedCampaign,
          interviewSetupId: scheduleData.setupId,
          scheduledDate: format(scheduleData.date, 'yyyy-MM-dd'),
          scheduledTime: scheduleData.time,
          interviewerEmails: scheduleData.interviewerEmails.filter(email => email.trim()),
          meetingLink: scheduleData.meetingLink,
          notes: scheduleData.notes
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Interview link sent successfully!');
        setInterviewSent(true);
        setSentInterviewData({
          interviewId: data.data?.interviewId,
          candidateName: selectedCandidate.name,
          candidateEmail: selectedCandidate.email,
          scheduledAt: `${format(scheduleData.date, 'PPP')} at ${scheduleData.time}`,
          interviewLink: data.data?.interviewLink
        });
        fetchInterviews();
        fetchCandidates();
      } else {
        toast.error(data.error || 'Failed to schedule interview');
      }
    } catch (error) {
      console.error('Error scheduling interview:', error);
      toast.error('Failed to schedule interview');
    }
  };

  const resetScheduleForm = () => {
    setScheduleData({
      date: new Date(),
      time: '',
      setupId: '',
      interviewerEmails: [''],
      meetingLink: '',
      notes: ''
    });
    setSelectedCandidate(null);
    setInterviewSent(false);
    setSentInterviewData(null);
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

  const generateJobDescriptionPDF = async () => {
    if (!selectedCampaign) return;
    
    try {
      const response = await fetch('/api/job-description-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: selectedCampaign })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `job-description-${selectedCampaign}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Job description PDF downloaded successfully');
      } else {
        toast.error('Failed to generate PDF');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied': return 'bg-blue-100 text-blue-800';
      case 'screening': return 'bg-yellow-100 text-yellow-800';
      case 'interview': return 'bg-purple-100 text-purple-800';
      case 'hired': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      case 'hired': return <UserCheck className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const filteredCandidates = candidates.filter(candidate => {
    const matchesSearch = candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         candidate.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || candidate.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredInterviews = interviews.filter(interview => {
    const matchesSearch = interview.candidate?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         interview.candidate?.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || interview.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!selectedCampaign) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Select Campaign</CardTitle>
          <CardDescription>Choose a job campaign to manage interviews</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a job campaign" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.campaignName} - {campaign.jobTitle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Campaign Selection */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Campaign Interview Management</CardTitle>
              <CardDescription>Manage candidates, schedule interviews, and track performance</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={generateJobDescriptionPDF} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download JD PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a job campaign" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.campaignName} - {campaign.jobTitle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="candidates">Candidates</TabsTrigger>
          <TabsTrigger value="interviews">Interviews</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{candidates.length}</div>
                <p className="text-xs text-muted-foreground">
                  {candidates.filter(c => c.status === 'applied').length} new applications
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Scheduled Interviews</CardTitle>
                <CalendarSchedule className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{interviews.filter(i => i.status === 'scheduled').length}</div>
                <p className="text-xs text-muted-foreground">
                  {interviews.filter(i => i.status === 'in_progress').length} in progress
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed Interviews</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{interviews.filter(i => i.status === 'completed').length}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics ? `${analytics.completionRate}% completion rate` : 'Loading...'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics ? `${analytics.averageScore.toFixed(1)}%` : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Based on completed interviews
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Candidates Tab */}
        <TabsContent value="candidates" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Candidates</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search candidates..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="applied">Applied</SelectItem>
                      <SelectItem value="screening">Screening</SelectItem>
                      <SelectItem value="interview">Interview</SelectItem>
                      <SelectItem value="hired">Hired</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredCandidates.map((candidate) => (
                  <div key={candidate.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="font-medium">{candidate.name}</h3>
                        <p className="text-sm text-muted-foreground">{candidate.email}</p>
                        {candidate.experience && (
                          <p className="text-sm text-muted-foreground">{candidate.experience} experience</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(candidate.status)}>
                        {candidate.status}
                      </Badge>
                      <div className="text-sm text-muted-foreground">
                        Talent Fit: {candidate.talentFitScore || 0}%
                      </div>
                      {(candidate.talentFitScore || 0) >= 50 ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedCandidate(candidate);
                            setShowScheduleDialog(true);
                          }}
                        >
                          Send Interview Link
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Talent Fit below 50%
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Interviews Tab */}
        <TabsContent value="interviews" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Scheduled Interviews</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search interviews..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredInterviews.map((interview) => (
                  <div key={interview.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="font-medium">{interview.candidate?.name}</h3>
                        <p className="text-sm text-muted-foreground">{interview.candidate?.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(interview.scheduledAt), 'PPP p')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(interview.status)}>
                        {getStatusIcon(interview.status)}
                        <span className="ml-1">{interview.status}</span>
                      </Badge>
                      {interview.score && (
                        <div className="text-sm text-muted-foreground">
                          Score: {interview.score}%
                        </div>
                      )}
                      {interview.meetingLink && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer">
                            Join Meeting
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Interview Analytics</CardTitle>
              <CardDescription>Performance insights and trends</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{analytics.totalInterviews}</div>
                      <div className="text-sm text-muted-foreground">Total Interviews</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{analytics.completedInterviews}</div>
                      <div className="text-sm text-muted-foreground">Completed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{analytics.averageScore.toFixed(1)}%</div>
                      <div className="text-sm text-muted-foreground">Average Score</div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Completion Rate</h3>
                    <Progress value={parseFloat(analytics.completionRate)} className="w-full" />
                    <p className="text-sm text-muted-foreground mt-1">{analytics.completionRate}% of interviews completed</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No analytics data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Schedule Interview Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {interviewSent ? 'Interview Sent Successfully!' : 'Schedule Interview'}
            </DialogTitle>
            <DialogDescription>
              {interviewSent 
                ? `Interview link has been sent to ${sentInterviewData?.candidateName}`
                : `Schedule an interview for ${selectedCandidate?.name}`
              }
            </DialogDescription>
          </DialogHeader>
          
          {interviewSent ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Interview Successfully Scheduled</span>
                </div>
                <div className="text-sm text-green-700 space-y-1">
                  <p><strong>Candidate:</strong> {sentInterviewData?.candidateName}</p>
                  <p><strong>Email:</strong> {sentInterviewData?.candidateEmail}</p>
                  <p><strong>Scheduled:</strong> {sentInterviewData?.scheduledAt}</p>
                </div>
              </div>
              
              <div className="flex justify-between space-x-2">
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={handleViewResults}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Results
                  </Button>
                  <Button variant="outline" onClick={handleReschedule}>
                    <CalendarSchedule className="mr-2 h-4 w-4" />
                    Reschedule
                  </Button>
                </div>
                <Button onClick={handleCloseDialog}>
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(scheduleData.date, 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={scheduleData.date}
                        onSelect={(date) => date && setScheduleData(prev => ({ ...prev, date }))}
                        initialFocus
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label htmlFor="time">Time Slot (1-hour slots)</Label>
                  <Select value={scheduleData.time} onValueChange={(value) => setScheduleData(prev => ({ ...prev, time: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time slot" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTimeSlots.map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {slot} - {(parseInt(slot.split(':')[0]) + 1).toString().padStart(2, '0')}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
               <div>
                 <Label htmlFor="setup">Interview Setup</Label>
                 <Select value={scheduleData.setupId} onValueChange={(value) => setScheduleData(prev => ({ ...prev, setupId: value }))}>
                   <SelectTrigger>
                     <SelectValue placeholder="Select interview setup" />
                   </SelectTrigger>
                   <SelectContent>
                     {interviewSetups.map((setup) => (
                       <SelectItem key={setup.id} value={setup.id}>
                         {setup.roundName || setup.setupName} - {setup.interviewType}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
               <div>
                 <Label htmlFor="meetingLink">Meeting Link (Optional)</Label>
                 <Input
                   id="meetingLink"
                   placeholder="https://meet.google.com/..."
                   value={scheduleData.meetingLink}
                   onChange={(e) => setScheduleData(prev => ({ ...prev, meetingLink: e.target.value }))}
                 />
               </div>
               <div>
                 <Label htmlFor="notes">Notes (Optional)</Label>
                 <Textarea
                   id="notes"
                   placeholder="Additional notes for the interview..."
                   value={scheduleData.notes}
                   onChange={(e) => setScheduleData(prev => ({ ...prev, notes: e.target.value }))}
                 />
               </div>
               <div className="flex justify-end space-x-2">
                 <Button variant="outline" onClick={handleCloseDialog}>
                   Cancel
                 </Button>
                 <Button onClick={handleScheduleInterview}>
                   Schedule Interview
                 </Button>
               </div>
             </div>
           )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampaignInterviewManagement;