"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Eye, 
  Users, 
  Calendar, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Mail, 
  ExternalLink,
  Filter,
  Search,
  MoreVertical,
  Download,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/shared/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/shared/card";
import { Badge } from "@/components/ui/shared/badge";
import { Input } from "@/components/ui/shared/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/shared/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/shared/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/shared/dropdown-menu";
import { toast } from "sonner";

interface Campaign {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'draft' | 'paused' | 'completed';
  createdAt: string;
  totalCandidates: number;
  completedInterviews: number;
  pendingInterviews: number;
  averageScore: number;
}

interface CandidateInterview {
  id: string;
  candidateEmail: string;
  candidateName: string;
  campaignId: string;
  campaignTitle: string;
  interviewType: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  sentAt: string;
  completedAt?: string;
  score?: number;
  interviewLink: string;
  feedback?: string;
}

const CampaignManagement = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [candidateInterviews, setCandidateInterviews] = useState<CandidateInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    fetchCampaigns();
    fetchCandidateInterviews();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/campaigns');
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to fetch campaigns');
    }
  };

  const fetchCandidateInterviews = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/campaigns/interviews');
      if (response.ok) {
        const data = await response.json();
        // Transform the data to match our interface
        const transformedData = data.map((item: any) => ({
          id: item.id,
          candidateEmail: item.candidateEmail || item.email || 'N/A',
          candidateName: item.candidateName || item.name || 'Unknown',
          campaignId: item.campaignId || '',
          campaignTitle: item.campaignTitle || item.jobTitle || 'Unknown Campaign',
          interviewType: item.interviewType || 'behavioral',
          status: item.status || 'scheduled',
          sentAt: item.createdAt || item.sentAt || new Date().toISOString(),
          completedAt: item.completedAt,
          score: item.score,
          interviewLink: item.interviewLink || item.link || '',
          feedback: item.feedback
        }));
        setCandidateInterviews(transformedData);
      }
    } catch (error) {
      console.error('Error fetching candidate interviews:', error);
      toast.error('Failed to fetch candidate interviews');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: "bg-green-100 text-green-800", label: "Active" },
      draft: { color: "bg-gray-100 text-gray-800", label: "Draft" },
      paused: { color: "bg-yellow-100 text-yellow-800", label: "Paused" },
      completed: { color: "bg-blue-100 text-blue-800", label: "Completed" },
      scheduled: { color: "bg-blue-100 text-blue-800", label: "Scheduled" },
      in_progress: { color: "bg-yellow-100 text-yellow-800", label: "In Progress" },
      cancelled: { color: "bg-red-100 text-red-800", label: "Cancelled" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled;
    return (
      <Badge className={`${config.color} border-0`}>
        {config.label}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Mail className="h-4 w-4 text-blue-600" />;
    }
  };

  const filteredInterviews = candidateInterviews.filter(interview => {
    const matchesSearch = interview.candidateEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         interview.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         interview.campaignTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || interview.status === statusFilter;
    const matchesCampaign = !selectedCampaign || interview.campaignId === selectedCampaign.id;
    
    return matchesSearch && matchesStatus && matchesCampaign;
  });

  const CampaignCard = ({ campaign }: { campaign: Campaign }) => (
    <Card className="hover:shadow-lg transition-shadow duration-300 cursor-pointer" 
          onClick={() => setSelectedCampaign(campaign)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{campaign.title}</CardTitle>
          {getStatusBadge(campaign.status)}
        </div>
        <p className="text-sm text-gray-600 line-clamp-2">{campaign.description}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{campaign.totalCandidates}</div>
            <div className="text-xs text-gray-500">Total Candidates</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{campaign.completedInterviews}</div>
            <div className="text-xs text-gray-500">Completed</div>
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
            style={{ 
              width: `${campaign.totalCandidates > 0 ? (campaign.completedInterviews / campaign.totalCandidates) * 100 : 0}%` 
            }}
          ></div>
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Progress: {campaign.totalCandidates > 0 ? Math.round((campaign.completedInterviews / campaign.totalCandidates) * 100) : 0}%</span>
          {campaign.averageScore > 0 && (
            <span>Avg Score: {campaign.averageScore.toFixed(1)}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const CandidateRow = ({ interview }: { interview: CandidateInterview }) => (
    <motion.tr
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="hover:bg-gray-50 transition-colors duration-200"
    >
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
              {interview.candidateName.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{interview.candidateName}</div>
            <div className="text-sm text-gray-500">{interview.candidateEmail}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{interview.campaignTitle}</div>
        <div className="text-sm text-gray-500">{interview.interviewType}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          {getStatusIcon(interview.status)}
          {getStatusBadge(interview.status)}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {new Date(interview.sentAt).toLocaleDateString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {interview.completedAt ? new Date(interview.completedAt).toLocaleDateString() : '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {interview.score !== undefined ? (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            interview.score >= 80 ? 'bg-green-100 text-green-800' :
            interview.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {interview.score}%
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => window.open(interview.interviewLink, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View Interview
            </DropdownMenuItem>
            {interview.feedback && (
              <DropdownMenuItem>
                <Eye className="h-4 w-4 mr-2" />
                View Feedback
              </DropdownMenuItem>
            )}
            <DropdownMenuItem>
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </motion.tr>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Campaign Overview</TabsTrigger>
          <TabsTrigger value="candidates">Candidate Tracking</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {selectedCampaign && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-blue-900">Selected Campaign: {selectedCampaign.title}</CardTitle>
                  <Button variant="outline" onClick={() => setSelectedCampaign(null)}>
                    View All Campaigns
                  </Button>
                </div>
              </CardHeader>
            </Card>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
          
          {campaigns.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Campaigns</h3>
                <p className="text-gray-500">Create your first campaign to start managing candidate interviews.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="candidates" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-1 gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search candidates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
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
            <Button onClick={fetchCandidateInterviews} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Candidate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Campaign & Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sent Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Completed Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredInterviews.map((interview) => (
                      <CandidateRow key={interview.id} interview={interview} />
                    ))}
                  </tbody>
                </table>
              </div>
              
              {filteredInterviews.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Candidates Found</h3>
                  <p className="text-gray-500">No candidates match your current filters.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Campaigns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{campaigns.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Candidates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{candidateInterviews.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Completed Interviews</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {candidateInterviews.filter(i => i.status === 'completed').length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Average Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {candidateInterviews.filter(i => i.score).length > 0 
                    ? (candidateInterviews.filter(i => i.score).reduce((acc, i) => acc + (i.score || 0), 0) / candidateInterviews.filter(i => i.score).length).toFixed(1)
                    : '0'
                  }%
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4" />
                <p>Detailed analytics coming soon...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CampaignManagement;