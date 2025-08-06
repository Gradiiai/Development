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
  const [campaignInterviewSetups, setCampaignInterviewSetups] = useState<{
    [key: string]: any[];
  }>({});

  useEffect(() => {
    if (session?.user?.companyId) {
      fetchCampaigns();
      fetchCandidates();
    }
  }, [session]);

  // Fetch interview setups for campaign candidates
  useEffect(() => {
    const campaignIds = [
      ...new Set(
        candidates.filter((c) => c.campaignId).map((c) => c.campaignId)
      ),
    ];
    campaignIds.forEach((campaignId) => {
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
      const response = await fetch(
        `/api/campaigns/jobs/${campaignId}/interview-setups`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCampaignInterviewSetups((prev) => ({
            ...prev,
            [campaignId]: data.data || [],
          }));
        }
      } else {
        console.error(
          `Failed to fetch interview setups for campaign ${campaignId}:`,
          response.statusText
        );
      }
    } catch (error) {
      console.error(
        `Error fetching interview setups for campaign ${campaignId}:`,
        error
      );
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
      formData.append("campaignId", defaultCampaignId || "");
      formData.append("source", "manual_upload");

      const response = await fetch("/api/candidates/resumes/upload", {
        method: "PUT",
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`Successfully uploaded ${data.processed} resumes`);
        fetchCandidates();
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="ml-2 text-sm sm:text-base text-gray-600">Loading candidates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-medium">All Candidates</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="text-lg sm:text-xl font-medium mb-1">
                {candidatesByStatus.all}
              </div>
              <p className="text-xs sm:text-sm text-gray-600">Total Candidates</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="text-lg sm:text-xl font-medium mb-1">
                {candidatesByStatus.applied}
              </div>
              <p className="text-xs sm:text-sm text-gray-600">Applied</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="text-lg sm:text-xl font-medium mb-1">
                {candidatesByStatus.screening}
              </div>
              <p className="text-xs sm:text-sm text-gray-600">Screening</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="text-lg sm:text-xl font-medium mb-1">
                {candidatesByStatus.interview}
              </div>
              <p className="text-xs sm:text-sm text-gray-600">Interview</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="text-lg sm:text-xl font-medium mb-1">
                {candidatesByStatus.hired}
              </div>
              <p className="text-xs sm:text-sm text-gray-600">Hired</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="text-lg sm:text-xl font-medium mb-1">
                {candidatesByStatus.rejected}
              </div>
              <p className="text-xs sm:text-sm text-gray-600">Rejected</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-3">
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search candidates by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowUpload(true)}
                className="gap-2 w-full sm:w-auto"
              >
                <Upload className="h-4 w-4" />
                <p className="font-normal text-xs sm:text-sm">Upload Resume</p>
              </Button>
              <Button variant="outline" className="gap-2 w-full sm:w-auto">
                <Download className="h-4 w-4" />
                <p className="font-normal text-xs sm:text-sm">Export Resume</p>
              </Button>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-36">
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
                <SelectTrigger className="w-full sm:w-44">
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
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 overflow-x-auto w-full">
            <TabsTrigger value="all" className="text-xs sm:text-sm">All ({candidatesByStatus.all})</TabsTrigger>
            <TabsTrigger value="applied" className="text-xs sm:text-sm">
              Applied ({candidatesByStatus.applied})
            </TabsTrigger>
            <TabsTrigger value="screening" className="text-xs sm:text-sm">
              Screening ({candidatesByStatus.screening})
            </TabsTrigger>
            <TabsTrigger value="interview" className="text-xs sm:text-sm">
              Interview ({candidatesByStatus.interview})
            </TabsTrigger>
            <TabsTrigger value="hired" className="text-xs sm:text-sm">
              Hired ({candidatesByStatus.hired})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="text-xs sm:text-sm">
              Rejected ({candidatesByStatus.rejected})
            </TabsTrigger>
            <TabsTrigger value="unassigned" className="text-xs sm:text-sm">
              Unassigned ({candidatesByStatus.unassigned})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4 sm:mt-6">
            {filteredCandidates.length === 0 ? (
              <Card>
                <CardContent className="p-4 sm:p-6 text-center">
                  <User className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400 mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-2">
                    No candidates found
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    No candidates match your current filters.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:gap-4">
                {filteredCandidates.map((candidate) => {
                  const campaign = campaigns.find(
                    (c) => c.id === candidate.campaignId
                  );
                  return (
                    <Card
                      key={candidate.id}
                      className="hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-3 sm:p-4">
                        {/* Top Column */}
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                          <div className="w-full flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                            {/* Name and Job Title */}
                            <div className="flex items-center space-x-2 sm:space-x-3">
                              <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
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
                                <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                                  {candidate.name}
                                </h3>
                                <p className="text-xs sm:text-sm text-gray-600">
                                  {candidate.jobTitle}
                                </p>
                              </div>
                            </div>

                            {/* Talent Fit Score, Resume and View Profile Buttons */}
                            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                              <div className="flex items-center gap-1 sm:gap-2 text-gray-500 cursor-pointer text-xs sm:text-sm">
                                <RefreshCcw size={14} />
                                <p>Recalculate</p>
                              </div>
                              {candidate.talentFitScore && (
                                <div className="relative group flex items-center gap-1 sm:gap-2 text-xs">
                                  <div>
                                    <CircularProgress
                                      score={candidate.talentFitScore}
                                    />
                                    <div className="absolute right-0 bottom-full mb-2 hidden group-hover:flex flex-col bg-white rounded-md border-[1px] border-gray-200 shadow-sm z-20 p-3 sm:p-4 text-xs sm:text-sm text-gray-700 transition-all duration-75">
                                      {candidate.skills &&
                                        typeof candidate.skills === "string" &&
                                        (() => {
                                          try {
                                            const skills = JSON.parse(
                                              candidate.skills
                                            );
                                            const bgColors = [
                                              "bg-[#FFDCFC]",
                                              "bg-[#F1FFE9]",
                                              "bg-[#FFE5D3]",
                                              "bg-[#DAE4FF]",
                                              "bg-[#CCF8FE]",
                                            ];
                                            const getRandomColor = () =>
                                              bgColors[
                                                Math.floor(
                                                  Math.random() * bgColors.length
                                                )
                                              ];
                                            return (
                                              <div className="space-y-3 sm:space-y-4">
                                                {skills.technical?.length > 0 && (
                                                  <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                                    <span className="font-semibold text-gray-900 text-xs sm:text-sm">
                                                      Technical Skills:
                                                    </span>
                                                    <ul className="flex flex-wrap gap-1 sm:gap-2">
                                                      {skills.technical
                                                        .slice(0, 2)
                                                        .map(
                                                          (
                                                            skill: string,
                                                            index: number
                                                          ) => (
                                                            <li
                                                              key={index}
                                                              className={`text-gray-700 list-none px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-3xl text-xs ${getRandomColor()}`}
                                                            >
                                                              {skill}
                                                            </li>
                                                          )
                                                        )}
                                                    </ul>
                                                  </div>
                                                )}
                                                {skills.languages?.length > 0 && (
                                                  <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                                    <span className="font-semibold text-gray-900 text-xs sm:text-sm">
                                                      Languages:
                                                    </span>
                                                    <ul className="flex flex-wrap gap-1 sm:gap-2">
                                                      {skills.languages
                                                        .slice(0, 2)
                                                        .map(
                                                          (
                                                            lang: string,
                                                            index: number
                                                          ) => (
                                                            <li
                                                              key={index}
                                                              className={`text-gray-700 list-none px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-3xl text-xs ${getRandomColor()}`}
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
                                                  <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                                    <span className="font-semibold text-gray-900 text-xs sm:text-sm">
                                                      Frameworks:
                                                    </span>
                                                    <ul className="flex flex-wrap gap-1 sm:gap-2">
                                                      {skills.frameworks
                                                        .slice(0, 2)
                                                        .map(
                                                          (
                                                            framework: string,
                                                            index: number
                                                          ) => (
                                                            <li
                                                              key={index}
                                                              className={`text-gray-700 list-none px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-3xl text-xs ${getRandomColor()}`}
                                                            >
                                                              {framework}
                                                            </li>
                                                          )
                                                        )}
                                                    </ul>
                                                  </div>
                                                )}
                                                {skills.tools?.length > 0 && (
                                                  <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                                    <span className="font-semibold text-gray-900 text-xs sm:text-sm">
                                                      Tools:
                                                    </span>
                                                    <ul className="flex flex-wrap gap-1 sm:gap-2">
                                                      {skills.tools
                                                        .slice(0, 2)
                                                        .map(
                                                          (
                                                            tool: string,
                                                            index: number
                                                          ) => (
                                                            <li
                                                              key={index}
                                                              className={`text-gray-700 list-none px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-3xl text-xs ${getRandomColor()}`}
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
                                              <div className="text-red-600 text-xs sm:text-sm">
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
                              <Select value={candidate.status}>
                                <SelectTrigger className="w-full sm:w-36 text-xs sm:text-sm">
                                  <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="scheduled">Scheduled Interview</SelectItem>
                                  <SelectItem value="approved">Approved</SelectItem>
                                  <SelectItem value="rejected">Rejected</SelectItem>
                                  <SelectItem value="applied">Applied</SelectItem>
                                  <SelectItem value="screening">Screening</SelectItem>
                                  <SelectItem value="shortlisted">Shortlisted</SelectItem>
                                  <SelectItem value="interview">Interviewed</SelectItem>
                                  <SelectItem value="hired">Hired</SelectItem>
                                  <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-red-100 hover:bg-red-200"
                              >
                                <Trash className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Column */}
                        <div className="text-xs sm:text-sm text-gray-600 flex flex-col sm:flex-row sm:justify-between mt-3 sm:mt-4 gap-2 sm:gap-4">
                          <div className="flex flex-col w-full sm:w-auto space-y-2 sm:space-y-3">
                            <div className="flex flex-wrap gap-2 sm:gap-4">
                              <div className="flex items-center gap-1 sm:gap-2">
                                <Mail className="h-4 w-4" />
                                <span>{candidate.email}</span>
                              </div>
                              <div className="flex items-center gap-1 sm:gap-2 text-nowrap">
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
                              {candidate.phone && (
                                <div className="flex items-center gap-1 sm:gap-2">
                                  <Phone className="h-4 w-4" />
                                  <span>
                                    {candidate.phone
                                      ? candidate.phone
                                      : "Unknown"}
                                  </span>
                                </div>
                              )}
                              {candidate.location && (
                                <div className="flex items-center gap-1 sm:gap-2 text-nowrap">
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
          <DialogContent className="w-[90vw] max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Resumes</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 sm:space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 sm:p-4 text-center">
                <FileText className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400 mx-auto mb-3 sm:mb-4" />
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
              <p className="text-xs sm:text-sm text-gray-500">
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
    </div>
  );
}