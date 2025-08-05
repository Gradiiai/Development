"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/shared/card";
import { Button } from "@/components/ui/shared/button";
import { Badge } from "@/components/ui/shared/badge";
import { Input } from "@/components/ui/shared/input";
import { useToast } from '@/shared/hooks/use-toast';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Users, 
  Calendar, 
  MapPin, 
  Briefcase,
  Eye,
  Edit,
  Trash2,
  Building2
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

interface JobCampaign {
  id: string;
  campaignName: string;
  jobTitle: string;
  department: string;
  location: string;
  employmentType: string;
  experienceLevel: string;
  status: 'draft' | 'active' | 'paused' | 'closed';
  createdAt: string;
  candidatesCount?: number;
  interviewsCount?: number;
  jobType?: string;
  salaryMin?: number;
  salaryMax?: number;
  skills?: string;
  requirements?: string;
  benefits?: string;
  jobDuties?: string;
  applicationDeadline?: string;
  targetHireDate?: string;
  isRemote?: boolean;
  isHybrid?: boolean;
}

export default function JobCampaignsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<JobCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
const [selectedCampaign, setSelectedCampaign] = useState(null);
const [isModalOpen, setIsModalOpen] = useState(false);
const [candidates, setCandidates] = useState([]);
  const { toast } = useToast();


  useEffect(() => {
    fetchJobCampaigns();
  }, [session]);

  const fetchJobCampaigns = async () => {
    try {
      setLoading(true);
      const companyId = session?.user?.companyId;
      if (!companyId) {
        setLoading(false);
        return;
      }
      
      const response = await fetch(`/api/campaigns/jobs?companyId=${companyId}`);
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching job campaigns:', error);
    } finally {
      setLoading(false);
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


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.campaignName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    const matchesDepartment = departmentFilter === 'all' || campaign.department === departmentFilter;
    
    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const departments = [...new Set(campaigns.map(c => c.department))].filter(Boolean);

  const handleCreateNew = () => {
    // Clear any existing campaign data
            // Campaign removed, storage will be updated via Redis
    router.push('/dashboard/job-campaign/job-details');
  };

  const handleViewCampaign = (campaignId: string) => {
    // Storage will be handled by job campaign store via Redis
    router.push('/dashboard/job-campaign/job-details');
  };

  const handleEditCampaign = (campaignId: string) => {
    // Storage will be handled by job campaign store via Redis
    router.push('/dashboard/job-campaign/job-details');
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this job campaign? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/campaigns/jobs/${campaignId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove the campaign from the local state for real-time sync
        setCampaigns(prevCampaigns => 
          prevCampaigns.filter(campaign => campaign.id !== campaignId)
        );
        
        // Show success message (you can replace this with a toast notification)
        alert('Job campaign deleted successfully!');
      } else {
        const errorData = await response.json();
        alert(`Error deleting campaign: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error deleting job campaign:', error);
      alert('An error occurred while deleting the campaign. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading job campaigns...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Job Campaigns</h1>
              <p className="text-gray-600">Manage your job postings and recruitment campaigns</p>
            </div>
            <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Create New Campaign
            </Button>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search campaigns..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Filter by department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Campaigns Grid */}
        {filteredCampaigns.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {campaigns.length === 0 ? 'No job campaigns yet' : 'No campaigns match your filters'}
            </h3>
            <p className="text-gray-600 mb-6">
              {campaigns.length === 0 
                ? 'Create your first job campaign to start recruiting candidates'
                : 'Try adjusting your search or filter criteria'
              }
            </p>
            {campaigns.length === 0 && (
              <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Campaign
              </Button>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((campaign, index) => (
              <motion.div
                key={campaign.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className="hover:shadow-lg transition-shadow duration-200 cursor-pointer group"
                  onClick={() => handleViewCampaign(campaign.id)}
                >       
                           <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {campaign.campaignName}
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1">{campaign.jobTitle}</p>
                      </div>
                      <Badge className={`${getStatusColor(campaign.status)} border-0`}>
                        {campaign.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <Building2 className="w-4 h-4 mr-2" />
                        {campaign.department}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2" />
                        {campaign.location}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        Created {new Date(campaign.createdAt).toLocaleDateString()}
                      </div>
                      
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <div className="flex items-center text-sm text-gray-600"
                          onClick={(e)=>e.stopPropagation()}>
                            <Users className="w-4 h-4 mr-1" />
                            {campaign.candidatesCount || 0} candidates
                          </div>
                          <div className="flex items-center gap-2">
                            
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/job-campaign/candidates?campaignId=${campaign.id}`);
                            }}
                            title="View Candidates"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          
                            {/* <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCampaignId(campaign.id);
                              setShowCandidatesModal(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button> */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditCampaign(campaign.id)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCampaign(campaign.id);
                            }}
                            className="text-red-600 hover:text-red-700 hover:border-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
  
    </div>
  );
}