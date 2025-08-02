"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/shared/card";
import { Button } from "@/components/ui/shared/button";
import { Input } from "@/components/ui/shared/input";
import CircularProgress from "@/components/admin/CircularProgress";
import { Badge } from "@/components/ui/shared/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/shared/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/shared/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/shared/dialog";
import DirectInterviewScheduler from "@/components/admin/DirectInterviewScheduler";
import CandidateProfileModal from "@/components/candidate/candidateProfileModal";
import {
  Search,
  Filter,
  Download,
  Upload,
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  Briefcase,
  FileText,
  Star,
  Ellipsis,
  EyeIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
  Trash,
  RefreshCcw,
} from "lucide-react";
import { toast } from "sonner";

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
  campaignName?: string;
  jobTitle?: string;
  talentFitScore?: number;
  overallScore?: number;
}

interface JobCampaign {
  id: string;
  campaignName: string;
  jobTitle: string;
  status: string;
  numberOfOpenings: number;
  createdAt: string;
}

export default function CandidatesPage() {
  const { data: session } = useSession();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [campaigns, setCampaigns] = useState<JobCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [showUpload, setShowUpload] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    null
  );
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [campaignInterviewSetups, setCampaignInterviewSetups] = useState<{[key: string]: any[]}>({});

  useEffect(() => {
    if (session?.user?.companyId) {
      fetchCampaigns();
      fetchCandidates();
    }
  }, [session]);

  // Fetch interview setups for campaign candidates
  useEffect(() => {
    const campaignIds = [...new Set(candidates.filter(c => c.campaignId).map(c => c.campaignId))];
    campaignIds.forEach(campaignId => {
      if (campaignId && !campaignInterviewSetups[campaignId]) {
        fetchInterviewSetupsForCampaign(campaignId);
      }
    });
  }, [candidates]);

  const fetchCampaigns = async () => {
    if (!session?.user?.companyId) return;

    try {
      const response = await fetch(
        `/api/campaigns/jobs?companyId=${session.user.companyId}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCampaigns(data.data || []);
        }
      } else {
        console.error("Failed to fetch campaigns:", response.statusText);
        toast.error("Failed to fetch campaigns");
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      toast.error("Failed to fetch campaigns");
    }
  };

  const fetchCandidates = async () => {
    if (!session?.user?.companyId) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/candidates?companyId=${session.user.companyId}`
      );
      if (response.ok) {
        const data = await response.json();
        // The API now returns the candidates array directly
        setCandidates(Array.isArray(data) ? data : []);
      } else {
        console.error("Failed to fetch candidates:", response.statusText);
        toast.error("Failed to fetch candidates");
      }
    } catch (error) {
      console.error("Error fetching candidates:", error);
      toast.error("Failed to fetch candidates");
    } finally {
      setLoading(false);
    }
  };

  const fetchInterviewSetupsForCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/campaigns/jobs/${campaignId}/interview-setups`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCampaignInterviewSetups(prev => ({
            ...prev,
            [campaignId]: data.data || []
          }));
        }
      } else {
        console.error(`Failed to fetch interview setups for campaign ${campaignId}:`, response.statusText);
      }
    } catch (error) {
      console.error(`Error fetching interview setups for campaign ${campaignId}:`, error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "applied":
        return "bg-blue-100 text-blue-800";
      case "screening":
        return "bg-yellow-100 text-yellow-800";
      case "interview":
        return "bg-purple-100 text-purple-800";
      case "hired":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleResumeUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;

    // Check if we have a default campaign to upload to
    // Allow upload without campaign - will be assigned to a default or unassigned status
    let defaultCampaignId = "";
    if (campaigns.length > 0) {
      defaultCampaignId =
        campaignFilter !== "all" ? campaignFilter : campaigns[0]?.id;
    }

    setUploadingResume(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append("resumes", file);
      });
      // Use the determined campaign ID (can be empty if no campaigns exist)
      formData.append("campaignId", defaultCampaignId || "");
      formData.append("source", "manual_upload");

      const response = await fetch("/api/candidates/resumes/upload", {
        method: "PUT",
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`Successfully uploaded ${data.processed} resumes`);
        fetchCandidates(); // Refresh candidates list
        setShowUpload(false);
      } else {
        toast.error(data.error || "Failed to upload resumes");
      }
    } catch (error) {
      console.error("Error uploading resumes:", error);
      toast.error("Failed to upload resumes");
    } finally {
      setUploadingResume(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setSelectedFiles(files);
      handleResumeUpload(files);
    }
  };

  const filteredCandidates = candidates.filter((candidate) => {
    const matchesSearch =
      candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || candidate.status === statusFilter;
    const matchesCampaign =
      campaignFilter === "all" || candidate.campaignId === campaignFilter;

    let matchesTab = true;
    if (activeTab !== "all") {
      if (activeTab === "unassigned") {
        matchesTab = candidate.status === "unassigned" || !candidate.campaignId;
      } else {
        matchesTab = candidate.status === activeTab;
      }
    }

    return matchesSearch && matchesStatus && matchesCampaign && matchesTab;
  });

  const candidatesByStatus = {
    all: candidates.length,
    applied: candidates.filter((c) => c.status === "applied").length,
    screening: candidates.filter((c) => c.status === "screening").length,
    interview: candidates.filter((c) => c.status === "interview").length,
    hired: candidates.filter((c) => c.status === "hired").length,
    rejected: candidates.filter((c) => c.status === "rejected").length,
    unassigned: candidates.filter(
      (c) => c.status === "unassigned" || !c.campaignId
    ).length,
  };

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
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">All Candidates</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Manage and track all candidates across campaigns
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUpload(true)}
          >
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xl sm:text-2xl font-bold">
              {candidatesByStatus.all}
            </div>
            <p className="text-xs text-gray-600">Total Candidates</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">
              {candidatesByStatus.applied}
            </div>
            <p className="text-xs text-gray-600">Applied</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xl sm:text-2xl font-bold text-yellow-600">
              {candidatesByStatus.screening}
            </div>
            <p className="text-xs text-gray-600">Screening</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xl sm:text-2xl font-bold text-purple-600">
              {candidatesByStatus.interview}
            </div>
            <p className="text-xs text-gray-600">Interview</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {candidatesByStatus.hired}
            </div>
            <p className="text-xs text-gray-600">Hired</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xl sm:text-2xl font-bold text-red-600">
              {candidatesByStatus.rejected}
            </div>
            <p className="text-xs text-gray-600">Rejected</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
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
              <SelectTrigger className="w-full sm:w-[180px]">
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
            <Select value={campaignFilter} onValueChange={setCampaignFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.campaignName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Candidates Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 overflow-x-auto">
          <TabsTrigger value="all">All ({candidatesByStatus.all})</TabsTrigger>
          <TabsTrigger value="applied">
            Applied ({candidatesByStatus.applied})
          </TabsTrigger>
          <TabsTrigger value="screening">
            Screening ({candidatesByStatus.screening})
          </TabsTrigger>
          <TabsTrigger value="interview">
            Interview ({candidatesByStatus.interview})
          </TabsTrigger>
          <TabsTrigger value="hired">
            Hired ({candidatesByStatus.hired})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({candidatesByStatus.rejected})
          </TabsTrigger>
          <TabsTrigger value="unassigned">
            Unassigned ({candidatesByStatus.unassigned})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredCandidates.length === 0 ? (
            <Card>
              <CardContent className="p-6 sm:p-8 text-center">
                <User className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                  No candidates found
                </h3>
                <p className="text-gray-600 text-sm sm:text-base">
                  No candidates match your current filters.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredCandidates.map((candidate) => {
                const campaign = campaigns.find(
                  (c) => c.id === candidate.campaignId
                );
                return (
                  <Card
                    key={candidate.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4 sm:p-6">
                      {/* Top Column */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="w-full flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                          {/* Name and Job Title */}
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                              <AvatarImage
                                src={`https://api.dicebear.com/7.x/initials/svg?seed=${candidate.name}`}
                              />
                              <AvatarFallback>
                                {candidate.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                                {candidate.name}
                              </h3>
                              <p className="text-xs sm:text-sm text-gray-600">
                                {candidate.jobTitle}
                              </p>
                            </div>
                          </div>

                          {/* Talent Fit Score, Resume and View Profile Buttons */}
                          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                            {candidate.talentFitScore && (
                              <div className="relative group flex items-center gap-2 text-xs">
                                Talent Fit Score:
                                <div>
                                  <CircularProgress
                                    score={candidate.talentFitScore}
                                  />
                                  <div className="absolute right-0 top-full mt-1 hidden group-hover:flex flex-col bg-white border border-gray-200 rounded-md shadow-lg z-20 p-4 text-sm text-gray-700 transition-all duration-75">
                                    {candidate.skills &&
                                      typeof candidate.skills === "string" &&
                                      (() => {
                                        try {
                                          const skills = JSON.parse(
                                            candidate.skills
                                          );
                                          // Define 4 background colors for random assignment
                                          const bgColors = [
                                            "bg-[#FFDCFC]",
                                            "bg-[#F1FFE9]",
                                            "bg-[#FFE5D3]",
                                            "bg-[#DAE4FF]",
                                            "bg-[#CCF8FE]",
                                          ];
                                          // Function to get random color
                                          const getRandomColor = () =>
                                            bgColors[
                                              Math.floor(
                                                Math.random() * bgColors.length
                                              )
                                            ];
                                          return (
                                            <div className="space-y-4">
                                              {skills.technical?.length > 0 && (
                                                <div className="flex flex-nowrap text-nowrap items-center gap-2">
                                                  <ul className="mt-2 flex gap-2 flex-nowrap">
                                                    <span className="font-semibold text-gray-900">
                                                      Technical Skills :
                                                    </span>
                                                    {skills.technical
                                                      .slice(0, 2)
                                                      .map(
                                                        (
                                                          skill: string,
                                                          index: number
                                                        ) => (
                                                          <li
                                                            key={index}
                                                            className={`text-gray-700 list-none px-2 py-1 rounded-3xl text-xs text-nowrap ${getRandomColor()}`}
                                                          >
                                                            {skill}
                                                          </li>
                                                        )
                                                      )}
                                                  </ul>
                                                </div>
                                              )}
                                              {skills.languages?.length > 0 && (
                                                <div>
                                                  <ul className="mt-2 flex gap-2 flex-wrap">
                                                    <span className="font-semibold text-gray-900">
                                                      Languages :
                                                    </span>
                                                    {skills.languages
                                                      .slice(0, 2)
                                                      .map(
                                                        (
                                                          lang: string,
                                                          index: number
                                                        ) => (
                                                          <li
                                                            key={index}
                                                            className={`text-gray-700 list-none px-2 py-1 rounded-3xl text-xs text-nowrap ${getRandomColor()}`}
                                                          >
                                                            {lang}
                                                          </li>
                                                        )
                                                      )}
                                                  </ul>
                                                </div>
                                              )}
                                              {skills.frameworks?.length >
                                                0 && (
                                                <div>
                                                  <ul className="mt-2 flex gap-2 flex-nowrap">
                                                    <span className="font-semibold text-gray-900">
                                                      Frameworks :
                                                    </span>
                                                    {skills.frameworks
                                                      .slice(0, 2)
                                                      .map(
                                                        (
                                                          framework: string,
                                                          index: number
                                                        ) => (
                                                          <li
                                                            key={index}
                                                            className={`text-gray-700 list-none px-2 py-1 rounded-3xl text-xs text-nowrap ${getRandomColor()}`}
                                                          >
                                                            {framework}
                                                          </li>
                                                        )
                                                      )}
                                                  </ul>
                                                </div>
                                              )}
                                              {skills.tools?.length > 0 && (
                                                <div>
                                                  <ul className="mt-2 flex gap-2 flex-nowrap">
                                                    <span className="font-semibold text-gray-900">
                                                      Tools :
                                                    </span>
                                                    {skills.tools
                                                      .slice(0, 2)
                                                      .map(
                                                        (
                                                          tool: string,
                                                          index: number
                                                        ) => (
                                                          <li
                                                            key={index}
                                                            className={`text-gray-700 list-none px-2 py-1 rounded-3xl text-xs text-nowrap ${getRandomColor()}`}
                                                          >
                                                            {tool}
                                                          </li>
                                                        )
                                                      )}
                                                  </ul>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        } catch (error) {
                                          return (
                                            <div className="text-red-600">
                                              Error parsing skills
                                            </div>
                                          );
                                        }
                                      })()}
                                  </div>
                                </div>
                              </div>
                            )}

                            {candidate.resumeUrl && (
                              <Button variant="outline" size="sm" asChild>
                                <a
                                  href={candidate.resumeUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedCandidateId(candidate.id);
                                setShowProfileModal(true);
                              }}
                            >
                              <EyeIcon className="h-4 w-4" />
                            </Button>

                            <DirectInterviewScheduler
                              candidateId={candidate.id}
                              candidateName={candidate.name}
                              candidateEmail={candidate.email}
                              // Pass campaign context if candidate is campaign-based
                              campaignJobDetails={candidate.campaignId ? {
                                campaignName: candidate.campaignName || 'Campaign',
                                jobTitle: candidate.jobTitle || 'Position',
                                jobDescription: `Interview for ${candidate.jobTitle || 'position'} in ${candidate.campaignName || 'campaign'}`,
                                department: undefined,
                                location: candidate.location
                              } : undefined}
                              interviewSetups={candidate.campaignId ? campaignInterviewSetups[candidate.campaignId] : undefined}
                              campaignId={candidate.campaignId || undefined}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Bottom Column */}
                      <div className="text-xs text-gray-600 flex flex-col sm:flex-row sm:justify-between mt-4 sm:mt-7 gap-4">
                        {/* Left */}
                        <div className="flex flex-col justify-end w-full sm:w-[40%] px-0 sm:px-4 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-4">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              <span>{candidate.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-nowrap">
                              <Calendar className="h-4 w-4" />
                              <span>
                                Applied{" "}
                                {candidate.appliedDate
                                  ? new Date(
                                      candidate.appliedDate
                                    ).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    })
                                  : "Unknown"}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2">
                            {candidate.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                <span>
                                  {candidate.phone
                                    ? candidate.phone
                                    : "Unknown"}
                                </span>
                              </div>
                            )}
                            {candidate.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>
                                  {candidate.location
                                    ? candidate.location
                                    : "Unknown"}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right */}
                        <div className="w-full sm:w-[55%] flex flex-wrap gap-2 sm:ml-4 sm:justify-end items-end">
                          {/* Candidate Status Button */}
                          <button className="flex gap-2 px-3 py-2 border-[1px] border-emerald-400 text-[10px] rounded-md text-emerald-400 font-semibold">
                            <ThumbsUpIcon size={16} />
                            Approved
                          </button>
                          <button className="flex gap-2 px-3 py-2 border-[1px] border-red-400 text-[10px] rounded-md text-red-400 font-semibold">
                            <ThumbsDownIcon size={16} />
                            Rejected
                          </button>
                          <button className="flex gap-2 px-3 py-2 border-[1px] border-gray-400 text-[10px] rounded-md text-nowrap font-semibold">
                            <Calendar size={16} />
                            Schedule Interview
                          </button>
                          <div className="relative group">
                            <button className="px-3 py-2 border-[1px] border-gray-400 text-[10px] rounded-md hover:bg-gray-100 transition-colors">
                              <Ellipsis size={16} />
                            </button>
                            <div className="absolute right-0 top-full mt-3 hidden group-hover:flex flex-col bg-white border border-gray-200 rounded-md shadow-lg z-20 text-nowrap">
                              <button
                                className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-3"
                                onClick={() =>
                                  console.log("Recalculated Talent Fit Score")
                                } // Placeholder for Option1 action
                              >
                                <RefreshCcw size={16} />
                                Recalculate Talent Fit Score
                              </button>
                              <button
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 transition-colors flex items-center gap-3 text-red-600"
                                onClick={() => console.log("Deleted Candidate")} // Placeholder for Option2 action
                              >
                                <Trash size={16} />
                                Delete Candidate
                              </button>
                            </div>
                          </div>
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
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Candidate Resumes</DialogTitle>
            <DialogDescription>
              Select one or more resume files to upload and automatically parse
              candidate information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center">
              <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-xs sm:text-sm text-gray-600 mb-4">
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
                onClick={() =>
                  document.getElementById("resume-upload")?.click()
                }
                disabled={uploadingResume}
              >
                {uploadingResume ? "Uploading..." : "Select Files"}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Supported formats: PDF, DOC, DOCX. Maximum file size: 10MB per
              file.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Candidate Profile Modal */}
      {selectedCandidateId && (
        <CandidateProfileModal
          isOpen={showProfileModal}
          onClose={() => {
            setShowProfileModal(false);
            setSelectedCandidateId(null);
          }}
          candidateId={selectedCandidateId}
        />
      )}
    </div>
  );
}
