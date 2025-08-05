"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/shared/card";
import { Button } from "@/components/ui/shared/button";
import { Badge } from "@/components/ui/shared/badge";
import { Input } from "@/components/ui/shared/input";
import { useToast } from "@/shared/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Users,
  Calendar,
  MapPin,
  Briefcase,
  Eye,
  Edit,
  Trash2,
  Building2,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

// Interface for job campaign data
interface JobCampaign {
  id: string;
  campaignName: string;
  jobTitle: string;
  department: string;
  location: string;
  employmentType: string;
  experienceLevel: string;
  status: "draft" | "active" | "paused" | "closed";
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
  screeningCount?: number;
  shortlistedCount?: number;
  interviewedCount?: number;
  hiredCount?: number;
}

// Main component for job campaigns page
export default function JobCampaignsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<JobCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const { toast } = useToast();

  // Fetch job campaigns on session change
  useEffect(() => {
    fetchJobCampaigns();
  }, [session]);

  // Fetch job campaigns from API
  const fetchJobCampaigns = async () => {
    try {
      setLoading(true);
      const companyId = session?.user?.companyId;
      if (!companyId) return;

      const response = await fetch(`/api/campaigns/jobs?companyId=${companyId}`);
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching job campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get color classes based on campaign status
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "closed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Filter campaigns based on search and filters
  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch =
      campaign.campaignName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || campaign.status === statusFilter;
    const matchesDepartment = departmentFilter === "all" || campaign.department === departmentFilter;

    return matchesSearch && matchesStatus && matchesDepartment;
  });

  // Get unique departments for filter
  const departments = [...new Set(campaigns.map((c) => c.department))].filter(Boolean);

  // Handle creation of new campaign
  const handleCreateNew = () => {
    localStorage.removeItem("currentJobCampaignId");
    router.push("/dashboard/job-campaign/job-details");
  };

  // Navigate to campaign details
  const handleViewCampaign = (campaignId: string) => {
    localStorage.setItem("currentJobCampaignId", campaignId);
    router.push("/dashboard/job-campaign/job-details");
  };

  // Navigate to edit campaign
  const handleEditCampaign = (campaignId: string) => {
    localStorage.setItem("currentJobCampaignId", campaignId);
    router.push("/dashboard/job-campaign/job-details");
  };

  // Delete a campaign
  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm("Are you sure you want to delete this job campaign? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/campaigns/jobs/${campaignId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setCampaigns((prevCampaigns) => prevCampaigns.filter((campaign) => campaign.id !== campaignId));
        toast({
          title: "Success",
          description: "Job campaign deleted successfully!",
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: `Error deleting campaign: ${errorData.error}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting job campaign:", error);
      toast({
        title: "Error",
        description: "An error occurred while deleting the campaign. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <span className="ml-2">Loading job campaigns...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto">
        {/* Header section */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-3xl font-medium text-gray-900">Job Campaigns</h1>
          </div>

          {/* Filters section */}
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
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleCreateNew} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Campaign
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Campaigns grid section */}
        {filteredCampaigns.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
            <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {campaigns.length === 0 ? "No job campaigns yet" : "No campaigns match your filters"}
            </h3>
            <p className="text-gray-600 mb-6">
              {campaigns.length === 0
                ? "Create your first job campaign to start recruiting candidates"
                : "Try adjusting your search or filter criteria"}
            </p>
            {campaigns.length === 0 && (
              <Button onClick={handleCreateNew} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Campaign
              </Button>
            )}
          </motion.div>
        ) : (
          <div className="flex-col items-center">
            {filteredCampaigns.map((campaign, index) => (
              <motion.div
                key={campaign.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="cursor-pointer group mb-3" onClick={() => handleViewCampaign(campaign.id)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex gap-4 items-center">
                          <CardTitle className="text-lg font-semibold text-gray-900 transition-colors">
                            {campaign.campaignName}
                          </CardTitle>
                          <Badge className={`${getStatusColor(campaign.status)} border-0`}>
                            {campaign.status}
                          </Badge>
                          <div className="flex items-center text-sm text-gray-600" onClick={(e) => e.stopPropagation()}>
                            <Users className="w-4 h-4 mr-1" />
                            {campaign.candidatesCount || 0} candidates
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{campaign.jobTitle}</p>
                      </div>
                      <div className="flex items-center gap-3">
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
                        <Button variant="outline" size="sm" onClick={() => handleEditCampaign(campaign.id)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCampaign(campaign.id);
                          }}
                          className="bg-red-50 hover:bg-red-100"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                        <Button variant="outline" size="sm" className="bg-purple-600 hover:bg-purple-700">
                          <Plus className="w-4 h-4 text-white" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex justify-between items-center">
                    <div className="flex flex-col gap-3">
                      <div className="flex gap-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <Building2 className="w-4 h-4 mr-2" />
                          {campaign.department}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="w-4 h-4 mr-2" />
                          {campaign.location}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="w-4 h-4 mr-2" />
                          {campaign.experienceLevel}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="w-4 h-4 mr-2" />
                          Created {new Date(campaign.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="p-4 text-sm font-medium border border-gray-200 rounded-lg text-center">
                        <p>{campaign.candidatesCount || 0}</p>
                        <p>Applied</p>
                      </div>
                      <div className="p-4 text-sm font-medium border border-gray-200 rounded-lg text-center">
                        {/* <p>{campaign.screeningCount || 0}</p> */}
                        <p>0</p>
                        <p>Screening</p>
                      </div>
                      <div className="p-4 text-sm font-medium border border-gray-200 rounded-lg text-center">
                        {/* <p>{campaign.shortlistedCount || 0}</p> */}
                        <p>0</p>
                        <p>Shortlisted</p>
                      </div>
                      <div className="p-4 text-sm font-medium border border-gray-200 rounded-lg text-center">
                        {/* <p>{campaign.interviewedCount || 0}</p> */}
                        <p>0</p>
                        <p>Interviewed</p>
                      </div>
                      <div className="p-4 text-sm font-medium border border-gray-200 rounded-lg text-center">
                        {/* <p>{campaign.hiredCount || 0}</p> */}
                        <p>0</p>
                        <p>Hired</p>
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