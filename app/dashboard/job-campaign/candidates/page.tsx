'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useJobCampaignStore } from '@/shared/store/jobCampaignStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Button } from '@/components/ui/shared/button';
import { Input } from '@/components/ui/shared/input';
import { Badge } from '@/components/ui/shared/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/shared/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shared/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/shared/dialog';
import { Checkbox } from '@/components/ui/shared/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/shared/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import DirectInterviewScheduler from "@/components/admin/DirectInterviewScheduler";
import CampaignInterviewScheduler from "@/components/admin/CampaignInterviewScheduler";
import CandidateProfileModal from "@/components/candidate/candidateProfileModal";
import { Search, Filter, Download, Upload, Mail, Phone, MapPin, Calendar, User, Briefcase, FileText, Star, Users, TrendingUp, Trash2, MoreHorizontal, CheckCircle, AlertTriangle, XCircle, X, RefreshCw, ThumbsUp, ThumbsDown, Clock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  experience?: string;
  skills?: string[];
  status: string;
  appliedDate: string;
  resumeUrl?: string;
  campaignId: string;
  talentFitScore?: number;
  overallScore?: number;
  source?: string;
  campaignName?: string;
  jobTitle?: string;
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
}

interface CandidateInterview {
  id: string;
  setupId: string;
  interviewId: string;
  status: string;
  score?: number;
  completedAt?: string;
  roundNumber: number;
  roundName: string;
}

export default function JobCampaignCandidatesPage() {
  const { data: session } = useSession();
  const { state } = useJobCampaignStore();
  const { campaignId, jobDetails } = state;
  
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'warning';
    message: string;
    details?: any;
  }>({ show: false, type: 'success', message: '', details: null });
  const [recalculatingScores, setRecalculatingScores] = useState<Set<string>>(new Set());
  
  // New state for approval/rejection
  const [approvalDialog, setApprovalDialog] = useState<{
    open: boolean;
    action: 'approve' | 'reject' | 'next_round' | null;
    candidate: Candidate | null;
    notes: string;
  }>({
    open: false,
    action: null,
    candidate: null,
    notes: ''
  });
  const [processingAction, setProcessingAction] = useState(false);
  const [interviewSetups, setInterviewSetups] = useState<InterviewSetup[]>([]);
  const [candidateInterviews, setCandidateInterviews] = useState<Record<string, CandidateInterview[]>>({});

  useEffect(() => {
    if (campaignId) {
      fetchCandidates();
      fetchInterviewSetups();
    }
  }, [campaignId]);

  // Fetch interview setups for the campaign
  const fetchInterviewSetups = async () => {
    if (!campaignId) return;
    
    try {
      const response = await fetch(`/api/campaigns/jobs/${campaignId}/interview-setups`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setInterviewSetups(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching interview setups:', error);
    }
  };

  // Fetch candidate interviews for a specific candidate
  const fetchCandidateInterviews = async (candidateId: string) => {
    try {
      const response = await fetch(`/api/candidates/${candidateId}/interviews`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCandidateInterviews(prev => ({
            ...prev,
            [candidateId]: data.data || []
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching candidate interviews:', error);
    }
  };

  // Check if candidate is from direct interview or campaign
  const isDirectInterview = (candidate: Candidate) => {
    return candidate.campaignName === 'Direct Interview' || candidate.jobTitle === 'Direct Interview';
  };

  // Get next round for candidate
  const getNextRound = (candidateId: string) => {
    const interviews = candidateInterviews[candidateId] || [];
    const completedRounds = interviews.filter(i => i.status === 'completed' && i.score && i.score >= 70);
    const nextRoundNumber = completedRounds.length + 1;
    return interviewSetups.find(setup => setup.roundNumber === nextRoundNumber && setup.isActive);
  };

  // Get candidate's current round status
  const getCandidateRoundStatus = (candidateId: string) => {
    const interviews = candidateInterviews[candidateId] || [];
    const completedRounds = interviews.filter(i => i.status === 'completed');
    const passedRounds = completedRounds.filter(i => i.score && i.score >= 70);
    const totalRounds = interviewSetups.filter(s => s.isActive).length;
    
    return {
      completed: completedRounds.length,
      passed: passedRounds.length,
      total: totalRounds,
      canProceed: passedRounds.length === completedRounds.length && completedRounds.length > 0
    };
  };

  // Handle candidate action (approve/reject/next round)
  const handleCandidateAction = (candidate: Candidate, action: 'approve' | 'reject' | 'next_round') => {
    setApprovalDialog({
      open: true,
      action,
      candidate,
      notes: ''
    });
    
    // Fetch candidate interviews if not already loaded
    if (!candidateInterviews[candidate.id]) {
      fetchCandidateInterviews(candidate.id);
    }
  };

  // Process approval/rejection
  const confirmCandidateAction = async () => {
    if (!approvalDialog.candidate || !approvalDialog.action) return;
    
    setProcessingAction(true);
    
    try {
      const payload: any = {
        action: approvalDialog.action,
        recruiterNotes: approvalDialog.notes.trim() || undefined,
      };
      
      if (approvalDialog.action === 'reject') {
        payload.rejectionReason = approvalDialog.notes.trim() || 'No specific reason provided';
      }
      
      const response = await fetch(`/api/candidates/${approvalDialog.candidate.id}/approval`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        // Update candidate status in local state
        setCandidates(prev => prev.map(c => 
          c.id === approvalDialog.candidate!.id 
            ? { ...c, status: result.data.status }
            : c
        ));
        
        let message = '';
        switch (approvalDialog.action) {
          case 'approve':
            message = `Candidate ${approvalDialog.candidate.name} has been approved`;
            break;
          case 'reject':
            message = `Candidate ${approvalDialog.candidate.name} has been rejected`;
            break;
          case 'next_round':
            message = `Candidate ${approvalDialog.candidate.name} has been moved to the next round`;
            break;
        }
        
        toast.success(message);
        setApprovalDialog({ open: false, action: null, candidate: null, notes: '' });
      } else {
        toast.error(result.error || 'Failed to process action');
      }
    } catch (error) {
      console.error('Error processing approval action:', error);
      toast.error('Network error occurred while processing action');
    } finally {
      setProcessingAction(false);
    }
  };

  // Selection and deletion functions
  const handleSelectCandidate = (candidateId: string) => {
    const newSelected = new Set(selectedCandidates);
    if (newSelected.has(candidateId)) {
      newSelected.delete(candidateId);
    } else {
      newSelected.add(candidateId);
    }
    setSelectedCandidates(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedCandidates.size === filteredCandidates.length) {
      setSelectedCandidates(new Set());
    } else {
      setSelectedCandidates(new Set(filteredCandidates.map(c => c.id)));
    }
  };

  const handleDeleteCandidate = (candidateId: string) => {
    setCandidateToDelete(candidateId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!candidateToDelete) return;
    
    setIsDeleting(true);
    setDeletionStatus({ show: false, type: 'success', message: '', details: null });
    
    try {
      const response = await fetch(`/api/candidates/${candidateToDelete}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        // Remove from local state
        setCandidates(prev => prev.filter(c => c.id !== candidateToDelete));
        setSelectedCandidates(prev => {
          const newSet = new Set(prev);
          newSet.delete(candidateToDelete);
          return newSet;
        });
        
        // Show success message with details
        const message = result.deletionSummary?.filesDeletionSuccess 
          ? `Candidate "${result.deletionSummary.candidateName}" and all files deleted successfully`
          : `Candidate "${result.deletionSummary.candidateName}" deleted, but some files may still exist in storage`;
        
        setDeletionStatus({
          show: true,
          type: result.deletionSummary?.filesDeletionSuccess ? 'success' : 'warning',
          message,
          details: result.deletionSummary
        });
        
        toast.success(message);
        
        // Auto-hide status after 5 seconds
        setTimeout(() => {
          setDeletionStatus(prev => ({ ...prev, show: false }));
        }, 5000);
      } else {
        const errorMessage = result.error || 'Failed to delete candidate';
        setDeletionStatus({
          show: true,
          type: 'error',
          message: errorMessage,
          details: result
        });
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error deleting candidate:', error);
      const errorMessage = 'Network error occurred while deleting candidate';
      setDeletionStatus({
        show: true,
        type: 'error',
        message: errorMessage,
        details: error
      });
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setCandidateToDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCandidates.size === 0) return;
    
    setIsDeleting(true);
    setDeletionStatus({ show: false, type: 'success', message: '', details: null });
    
    try {
      const deletePromises = Array.from(selectedCandidates).map(async candidateId => {
        const response = await fetch(`/api/candidates/${candidateId}`, { method: 'DELETE' });
        const result = await response.json();
        return { candidateId, success: response.ok && result.success, result };
      });
      
      const results = await Promise.all(deletePromises);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      // Remove successfully deleted candidates from local state
      const successfulIds = new Set(successful.map(r => r.candidateId));
      setCandidates(prev => prev.filter(c => !successfulIds.has(c.id)));
      setSelectedCandidates(new Set());
      
      // Show comprehensive feedback
      const totalFiles = successful.length;
      const filesDeleted = successful.filter(r => r.result.deletionSummary?.filesDeletionSuccess).length;
      
      let message: string;
      let type: 'success' | 'warning' | 'error';
      
      if (failed.length === 0) {
        if (filesDeleted === totalFiles) {
          message = `Successfully deleted ${successful.length} candidates and all associated files`;
          type = 'success';
        } else {
          message = `Successfully deleted ${successful.length} candidates, but ${totalFiles - filesDeleted} files may still exist in storage`;
          type = 'warning';
        }
      } else {
        message = `Deleted ${successful.length} of ${selectedCandidates.size} candidates. ${failed.length} failed to delete.`;
        type = 'error';
      }
      
      setDeletionStatus({
        show: true,
        type,
        message,
        details: {
          total: selectedCandidates.size,
          successful: successful.length,
          failed: failed.length,
          filesDeleted,
          totalFiles
        }
      });
      
      toast[type](message);
      
      // Auto-hide status after 7 seconds for bulk operations
      setTimeout(() => {
        setDeletionStatus(prev => ({ ...prev, show: false }));
      }, 7000);
      
    } catch (error) {
      console.error('Error deleting candidates:', error);
      const errorMessage = 'Network error occurred during bulk deletion';
      setDeletionStatus({
        show: true,
        type: 'error',
        message: errorMessage,
        details: error
      });
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRecalculateScore = async (candidateId: string) => {
    setRecalculatingScores(prev => new Set(prev).add(candidateId));
    
    try {
      const response = await fetch(`/api/candidates/${candidateId}/talent-fit-score`, {
           method: 'POST',
         });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        // Update the candidate's scores in local state
        setCandidates(prev => prev.map(candidate => 
          candidate.id === candidateId 
            ? { ...candidate, talentFitScore: result.data.talentFitScore }
            : candidate
        ));
        
        toast.success(`Talent fit score recalculated successfully: ${result.data.talentFitScore}%`);
      } else {
        toast.error(result.error || 'Failed to recalculate talent fit score');
      }
    } catch (error) {
      console.error('Error recalculating score:', error);
      toast.error('Network error occurred while recalculating score');
    } finally {
      setRecalculatingScores(prev => {
        const newSet = new Set(prev);
        newSet.delete(candidateId);
        return newSet;
      });
    }
  };

  const handleBulkRecalculateScores = async () => {
    if (selectedCandidates.size === 0) return;
    
    const candidateIds = Array.from(selectedCandidates);
    setRecalculatingScores(prev => new Set([...prev, ...candidateIds]));
    
    try {
      const recalculatePromises = candidateIds.map(async candidateId => {
        const response = await fetch(`/api/candidates/${candidateId}/talent-fit-score`, {
          method: 'POST',
        });
        const result = await response.json();
        return { candidateId, success: response.ok && result.success, result };
      });
      
      const results = await Promise.all(recalculatePromises);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      // Update scores for successful recalculations
      setCandidates(prev => prev.map(candidate => {
        const successfulResult = successful.find(r => r.candidateId === candidate.id);
        return successfulResult 
          ? { ...candidate, talentFitScore: successfulResult.result.data.talentFitScore }
          : candidate;
      }));
      
      // Show feedback
      if (failed.length === 0) {
        toast.success(`Successfully recalculated scores for ${successful.length} candidates`);
      } else {
        toast.warning(`Recalculated ${successful.length} of ${candidateIds.length} scores. ${failed.length} failed.`);
      }
      
    } catch (error) {
      console.error('Error bulk recalculating scores:', error);
      toast.error('Network error occurred during bulk score recalculation');
    } finally {
      setRecalculatingScores(prev => {
        const newSet = new Set(prev);
        candidateIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    }
  };

  const fetchCandidates = async () => {
    if (!campaignId) {
      toast.error('No campaign selected');
      return;
    }
    
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      if (statusFilter !== 'all') queryParams.append('status', statusFilter);
      if (sourceFilter !== 'all') queryParams.append('source', sourceFilter);
      if (searchQuery) queryParams.append('search', searchQuery);
      
      const response = await fetch(`/api/campaigns/jobs/${campaignId}/candidates?${queryParams}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCandidates(data.data || []);
        } else {
          toast.error(data.error || 'Failed to fetch candidates');
        }
      } else {
        toast.error('Failed to fetch candidates');
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
      toast.error('Failed to fetch candidates');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied': return 'bg-blue-100 text-blue-800';
      case 'screening': return 'bg-yellow-100 text-yellow-800';
      case 'interview': return 'bg-purple-100 text-purple-800';
      case 'hired': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'shortlisted': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleResumeUpload = async (files: FileList) => {
    if (!files || files.length === 0 || !campaignId) return;
    
    setUploadingResume(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('resumes', file);
      });
      formData.append('campaignId', campaignId);
      formData.append('source', 'manual_upload');

              const response = await fetch('/api/candidates/resumes/upload', {
        method: 'PUT',
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success(`Successfully uploaded ${data.processed} resumes`);
        fetchCandidates();
        setShowUpload(false);
      } else {
        toast.error(data.error || 'Failed to upload resumes');
      }
    } catch (error) {
      console.error('Error uploading resumes:', error);
      toast.error('Failed to upload resumes');
    } finally {
      setUploadingResume(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      handleResumeUpload(files);
    }
  };

  const filteredCandidates = candidates.filter(candidate => {
    const matchesSearch = candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         candidate.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || candidate.status === statusFilter;
    const matchesSource = sourceFilter === 'all' || candidate.source === sourceFilter;
    
    let matchesTab = true;
    if (activeTab !== 'all') {
      matchesTab = candidate.status === activeTab;
    }
    
    return matchesSearch && matchesStatus && matchesSource && matchesTab;
  });

  const candidatesByStatus = {
    all: candidates.length,
    applied: candidates.filter(c => c.status === 'applied').length,
    screening: candidates.filter(c => c.status === 'screening').length,
    shortlisted: candidates.filter(c => c.status === 'shortlisted').length,
    interview: candidates.filter(c => c.status === 'interview').length,
    hired: candidates.filter(c => c.status === 'hired').length,
    rejected: candidates.filter(c => c.status === 'rejected').length,
  };

  const averageScore = candidates.length > 0 
    ? Math.round(candidates.reduce((sum, c) => sum + (c.talentFitScore || 0), 0) / candidates.length)
    : 0;

  if (!campaignId) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Campaign Selected</h3>
            <p className="text-gray-600">Please select a campaign to view candidates.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading candidates...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Campaign Candidates</h1>
          <p className="text-gray-600 mt-1">
            {jobDetails.campaignName ? `${jobDetails.campaignName} - ${jobDetails.jobTitle}` : 'Manage candidates for this campaign'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowUpload(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Resume
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{candidatesByStatus.all}</div>
                <p className="text-xs text-gray-600">Total Candidates</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{candidatesByStatus.shortlisted}</div>
                <p className="text-xs text-gray-600">Shortlisted</p>
              </div>
              <Star className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-600">{candidatesByStatus.interview}</div>
                <p className="text-xs text-gray-600">In Interview</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-600">{averageScore}%</div>
                <p className="text-xs text-gray-600">Avg Score</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
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
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="applied">Applied</SelectItem>
                <SelectItem value="screening">Screening</SelectItem>
                <SelectItem value="shortlisted">Shortlisted</SelectItem>
                <SelectItem value="interview">Interview</SelectItem>
                <SelectItem value="hired">Hired</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="manual_upload">Manual Upload</SelectItem>
                <SelectItem value="job_board">Job Board</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="direct_application">Direct Application</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchCandidates}>
              <Filter className="h-4 w-4 mr-2" />
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedCandidates.size > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={selectedCandidates.size === filteredCandidates.length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm font-medium">
                  {selectedCandidates.size} of {filteredCandidates.length} candidates selected
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkRecalculateScores}
                  disabled={Array.from(selectedCandidates).some(id => recalculatingScores.has(id))}
                >
                  {Array.from(selectedCandidates).some(id => recalculatingScores.has(id)) ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      Recalculating Talent Fit Scores...
                    </div>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Recalculate Talent Fit Scores ({selectedCandidates.size})
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </div>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected ({selectedCandidates.size})
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Candidates Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="all">All ({candidatesByStatus.all})</TabsTrigger>
          <TabsTrigger value="applied">Applied ({candidatesByStatus.applied})</TabsTrigger>
          <TabsTrigger value="screening">Screening ({candidatesByStatus.screening})</TabsTrigger>
          <TabsTrigger value="shortlisted">Shortlisted ({candidatesByStatus.shortlisted})</TabsTrigger>
          <TabsTrigger value="interview">Interview ({candidatesByStatus.interview})</TabsTrigger>
          <TabsTrigger value="hired">Hired ({candidatesByStatus.hired})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({candidatesByStatus.rejected})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredCandidates.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No candidates found</h3>
                <p className="text-gray-600">
                  {candidates.length === 0 
                    ? "No candidates have applied to this campaign yet. Upload resumes or share the job posting to get started."
                    : "No candidates match your current filters."
                  }
                </p>
                {candidates.length === 0 && (
                  <Button className="mt-4" onClick={() => setShowUpload(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload First Resume
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredCandidates.map((candidate) => {
                return (
                  <Card key={candidate.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <Checkbox
                            checked={selectedCandidates.has(candidate.id)}
                            onCheckedChange={() => handleSelectCandidate(candidate.id)}
                            className="mt-1"
                          />
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${candidate.name}`} />
                            <AvatarFallback>
                              {candidate.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-semibold">{candidate.name}</h3>
                              <Badge className={getStatusColor(candidate.status)}>
                                {candidate.status}
                              </Badge>
                              {candidate.source && (
                                <Badge variant="outline" className="text-xs">
                                  {candidate.source.replace('_', ' ')}
                                </Badge>
                              )}
                            </div>
                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                <span>{candidate.email}</span>
                              </div>
                              {candidate.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4" />
                                  <span>{candidate.phone}</span>
                                </div>
                              )}
                              {candidate.location && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4" />
                                  <span>{candidate.location}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>Applied {candidate.appliedDate ? new Date(candidate.appliedDate).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                }) : 'Unknown'}</span>
                              </div>
                              {candidate.talentFitScore && (
                                <div className="flex items-center gap-2 mt-2">
                                  <Star className="h-4 w-4 text-yellow-500" />
                                  <span className="font-medium">{candidate.talentFitScore}%</span>
                                  <span className="text-xs text-gray-500">Talent Fit</span>
                                </div>
                              )}
                            </div>
                            {(() => {
                              let skillsArray = [];
                              if (candidate.skills) {
                                if (Array.isArray(candidate.skills)) {
                                  skillsArray = candidate.skills;
                                } else if (typeof candidate.skills === 'string') {
                                  try {
                                    skillsArray = JSON.parse(candidate.skills);
                                    if (!Array.isArray(skillsArray)) {
                                      skillsArray = [candidate.skills];
                                    }
                                  } catch {
                                    skillsArray = [candidate.skills];
                                  }
                                }
                              }
                              
                              return skillsArray.length > 0 && (
                                <div className="mt-3">
                                  <div className="flex flex-wrap gap-1">
                                    {skillsArray.slice(0, 5).map((skill, index) => (
                                      <Badge key={index} variant="secondary" className="text-xs">
                                        {skill}
                                      </Badge>
                                    ))}
                                    {skillsArray.length > 5 && (
                                      <Badge variant="secondary" className="text-xs">
                                        +{skillsArray.length - 5} more
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          {/* First row - Basic actions */}
                          <div className="flex flex-wrap gap-2">
                            {candidate.resumeUrl && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4 mr-1" />
                                  Resume
                                </a>
                              </Button>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedCandidateId(candidate.id);
                                setShowProfile(true);
                              }}
                            >
                              View Profile
                            </Button>
                            
                            {/* Interview type indicator */}
                            <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs">
                              {isDirectInterview(candidate) ? (
                                <>
                                  <User className="h-3 w-3" />
                                  Direct
                                </>
                              ) : (
                                <>
                                  <Briefcase className="h-3 w-3" />
                                  Campaign ({interviewSetups.filter(s => s.isActive).length} rounds)
                                </>
                              )}
                            </div>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleRecalculateScore(candidate.id)}
                                  disabled={recalculatingScores.has(candidate.id)}
                                >
                                  {recalculatingScores.has(candidate.id) ? (
                                    <div className="flex items-center">
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                      Recalculating Talent Fit Score...
                                    </div>
                                  ) : (
                                    <>
                                      <RefreshCw className="h-4 w-4 mr-2" />
                                      Recalculate Talent Fit Score
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteCandidate(candidate.id)}
                                  className="text-red-600 focus:text-red-600"
                                  disabled={isDeleting}
                                >
                                  {isDeleting ? (
                                    <div className="flex items-center">
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                                      Deleting...
                                    </div>
                                  ) : (
                                    <>
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete Candidate
                                    </>
                                  )}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          
                          {/* Second row - Candidate action buttons */}
                          {candidate.status !== 'hired' && candidate.status !== 'rejected' && (
                            <div className="flex flex-wrap gap-2">
                              {/* Approve Button */}
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-green-600 border-green-600 hover:bg-green-50"
                                onClick={() => handleCandidateAction(candidate, 'approve')}
                              >
                                <ThumbsUp className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              
                              {/* Next Round Button (only for campaign candidates) */}
                              {!isDirectInterview(candidate) && (() => {
                                const roundStatus = getCandidateRoundStatus(candidate.id);
                                const nextRound = getNextRound(candidate.id);
                                
                                return nextRound && roundStatus.canProceed && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                    onClick={() => handleCandidateAction(candidate, 'next_round')}
                                  >
                                    <ArrowRight className="h-4 w-4 mr-1" />
                                    Round {nextRound.roundNumber}
                                  </Button>
                                );
                              })()}
                              
                              {/* Reject Button */}
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-red-600 border-red-600 hover:bg-red-50"
                                onClick={() => handleCandidateAction(candidate, 'reject')}
                              >
                                <ThumbsDown className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                              
                              <CampaignInterviewScheduler 
                                candidateId={candidate.id} 
                                candidateName={candidate.name} 
                                candidateEmail={candidate.email}
                                campaignId={campaignId || ''}
                                interviewSetups={interviewSetups}
                                onInterviewScheduled={() => {
                                  fetchCandidates();
                                  toast.success('Interview scheduled successfully!');
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Candidate Resumes</DialogTitle>
            <DialogDescription>
              Upload resumes for candidates applying to {jobDetails.campaignName || 'this campaign'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-4">
                Drag and drop resume files here, or click to browse
              </p>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
                id="resume-upload"
                disabled={uploadingResume}
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('resume-upload')?.click()}
                disabled={uploadingResume}
              >
                {uploadingResume ? 'Uploading...' : 'Select Files'}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Supported formats: PDF, DOC, DOCX. Maximum file size: 10MB per file.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Candidate Profile Modal */}
      {selectedCandidateId && (
        <CandidateProfileModal
          isOpen={showProfile}
          onClose={() => {
            setShowProfile(false);
            setSelectedCandidateId(null);
          }}
          candidateId={selectedCandidateId}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Candidate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this candidate? This action cannot be undone and will remove all associated data including interviews, documents, and scores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </div>
              ) : (
                'Delete Candidate'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deletion Status Notification */}
      {deletionStatus.show && (
        <div className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-lg shadow-lg border ${
          deletionStatus.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          deletionStatus.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
          'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center">
                {deletionStatus.type === 'success' && (
                  <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                )}
                {deletionStatus.type === 'warning' && (
                  <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
                )}
                {deletionStatus.type === 'error' && (
                  <XCircle className="h-5 w-5 mr-2 text-red-600" />
                )}
                <h4 className="font-medium">
                  {deletionStatus.type === 'success' ? 'Success' :
                   deletionStatus.type === 'warning' ? 'Partial Success' : 'Error'}
                </h4>
              </div>
              <p className="mt-1 text-sm">{deletionStatus.message}</p>
               {deletionStatus.details && deletionStatus.type !== 'error' && (
                 <div className="mt-2 text-xs opacity-75">
                   {/* Single candidate deletion details */}
                   {deletionStatus.details.totalRecordsDeleted && (
                     <p>Records deleted: {deletionStatus.details.totalRecordsDeleted}</p>
                   )}
                   {deletionStatus.details.resumeUrl && (
                     <p>Resume file: {deletionStatus.details.filesDeletionSuccess ? 'Deleted' : 'May still exist'}</p>
                   )}
                   {/* Bulk deletion details */}
                   {deletionStatus.details.total && (
                     <div>
                       <p>Total: {deletionStatus.details.total} | Successful: {deletionStatus.details.successful} | Failed: {deletionStatus.details.failed}</p>
                       {deletionStatus.details.totalFiles > 0 && (
                         <p>Files deleted: {deletionStatus.details.filesDeleted}/{deletionStatus.details.totalFiles}</p>
                       )}
                     </div>
                   )}
                 </div>
               )}
            </div>
            <button
              onClick={() => setDeletionStatus(prev => ({ ...prev, show: false }))}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Candidate Approval Dialog */}
      <Dialog open={approvalDialog.open} onOpenChange={(open) => setApprovalDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {approvalDialog.action === 'approve' ? 'Approve Candidate' :
               approvalDialog.action === 'reject' ? 'Reject Candidate' :
               'Next Interview Round'}
            </DialogTitle>
            <DialogDescription>
              {approvalDialog.action === 'approve' && 'Are you sure you want to approve this candidate?'}
              {approvalDialog.action === 'reject' && 'Are you sure you want to reject this candidate?'}
              {approvalDialog.action === 'next_round' && `Send candidate to the next interview round?`}
            </DialogDescription>
          </DialogHeader>
          
          {approvalDialog.candidate && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium">{approvalDialog.candidate.name}</h4>
                <p className="text-sm text-gray-600">{approvalDialog.candidate.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs px-2 py-1 bg-gray-200 rounded">
                    {isDirectInterview(approvalDialog.candidate) ? 'Direct Interview' : 'Campaign Interview'}
                  </span>
                  {!isDirectInterview(approvalDialog.candidate) && (
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      {interviewSetups.filter(s => s.isActive).length} rounds
                    </span>
                  )}
                </div>
              </div>

              {approvalDialog.action === 'next_round' && approvalDialog.candidate && (() => {
                const nextRound = getNextRound(approvalDialog.candidate.id);
                return nextRound && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h5 className="font-medium text-blue-900">Next Round Details</h5>
                    <p className="text-sm text-blue-700">Round {nextRound.roundNumber}: {nextRound.title}</p>
                    <p className="text-xs text-blue-600 mt-1">{nextRound.description}</p>
                  </div>
                );
              })()}

              <div className="space-y-2">
                <label htmlFor="approval-notes" className="text-sm font-medium">
                  Notes (Optional)
                </label>
                <textarea
                  id="approval-notes"
                  value={approvalDialog.notes}
                  onChange={(e) => setApprovalDialog(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add any notes about this decision..."
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setApprovalDialog(prev => ({ ...prev, open: false }))}
              disabled={processingAction}
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmCandidateAction}
              disabled={processingAction}
              className={
                approvalDialog.action === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                approvalDialog.action === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                'bg-blue-600 hover:bg-blue-700'
              }
            >
              {processingAction ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                <>
                  {approvalDialog.action === 'approve' && 'Approve Candidate'}
                  {approvalDialog.action === 'reject' && 'Reject Candidate'}
                  {approvalDialog.action === 'next_round' && 'Send to Next Round'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}