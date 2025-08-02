"use client";

import { useSession } from "next-auth/react";
import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/shared/card";
import {
  Briefcase,
  CalendarDays,
  FileText,
  Loader2,
  PlayCircle,
  MessageSquare,
  User,
  Mail,
  Link as LinkIcon,
  MoreVertical,
  Edit,
  Trash2,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  SortAsc,
  SortDesc,
} from "lucide-react";
import { motion, AnimatePresence, easeOut } from "framer-motion";
import { Button } from "@/components/ui/shared/button";
import { Input } from "@/components/ui/shared/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import moment from "moment";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/shared/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/shared/dialog";
import { useToast } from "@/shared/hooks/use-toast";

type InterviewData = {
  id: string; // Changed from number to string to match UUID
  interviewQuestions: string;
  jobPosition: string;
  jobDescription: string;
  jobExperience: string;
  fileData: string | null;
  createdBy: string;
  createdAt: Date;
  interviewId: string;
  candidateName: string | null;
  candidateEmail: string | null;
  interviewDate: string | null;
  interviewTime: string | null;
  interviewStatus: string | null;
  interviewLink: string | null;
  linkExpiryTime: Date | null;
  interviewType: "combo" | "mcq" | "coding" | "behavioral" | null;
};

const InterviewList = () => {
  const { data: session, status } = useSession();
  const isLoaded = status !== "loading";
  const [interviewList, setInterviewList] = useState<InterviewData[]>([]);
  const [filteredList, setFilteredList] = useState<InterviewData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [interviewToDelete, setInterviewToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const router = useRouter();
  const { toast } = useToast();

  const fetchInterviews = async () => {
    if (!isLoaded || !session?.user?.id) return;

    try {
      setIsLoading(true);
      
      // Fetch from both endpoints in parallel
      const [campaignResponse, behavioralResponse] = await Promise.all([
        fetch('/api/campaigns/interviews'),
        fetch('/api/interviews')
      ]);
      
      let allInterviews: any[] = [];
      
      // Process campaign interviews
      if (campaignResponse.ok) {
        const campaignData = await campaignResponse.json();
        if (campaignData.interviews) {
          // Transform campaign interviews to match expected format
          const transformedCampaign = campaignData.interviews.map((interview: any) => ({
            id: interview.id,
            interviewId: interview.interviewId,
            jobPosition: interview.setup?.jobPosition || 'Unknown Position',
            jobDescription: interview.setup?.description || 'No description available',
            jobExperience: interview.setup?.experienceRequired || '0',
            candidateName: interview.candidate?.name || null,
            candidateEmail: interview.candidate?.email || null,
            interviewDate: interview.scheduledAt ? new Date(interview.scheduledAt).toISOString().split('T')[0] : null,
            interviewTime: interview.scheduledAt ? new Date(interview.scheduledAt).toTimeString().split(' ')[0].substring(0, 5) : null,
            interviewStatus: interview.status || null,
            interviewLink: interview.interviewLink || null,
            linkExpiryTime: interview.linkExpiryTime || null,
            interviewType: interview.interviewType || 'behavioral',
            createdBy: session.user.id,
            createdAt: interview.createdAt || new Date(),
            fileData: null
          }));
          allInterviews = [...allInterviews, ...transformedCampaign];
        }
      }
      
      // Process behavioral interviews
      if (behavioralResponse.ok) {
        const behavioralData = await behavioralResponse.json();
        if (Array.isArray(behavioralData)) {
          // Transform behavioral interviews to match the expected format
          const transformedBehavioral = behavioralData.map((interview: any) => ({
            id: interview.id || interview.interviewId,
            interviewId: interview.interviewId,
            jobPosition: interview.jobPosition || 'Unknown Position',
            jobDescription: interview.jobDescription || 'No description available',
            jobExperience: interview.jobExperience || '0',
            candidateName: interview.candidateName || null,
            candidateEmail: interview.candidateEmail || null,
            interviewDate: interview.interviewDate || null,
            interviewTime: interview.interviewTime || null,
            interviewStatus: interview.interviewStatus || null,
            interviewLink: interview.interviewLink || null,
            linkExpiryTime: interview.linkExpiryTime || null,
            interviewType: interview.interviewType || 'behavioral',
            createdBy: session.user.id,
            createdAt: interview.createdAt || new Date(),
            fileData: interview.fileData || null
          }));
          allInterviews = [...allInterviews, ...transformedBehavioral];
        }
      }
      
      // Remove duplicates based on interviewId
      const uniqueInterviews = allInterviews.filter((interview, index, self) => 
        index === self.findIndex(i => i.interviewId === interview.interviewId)
      );
      
      const typedResult = uniqueInterviews.map((interview: any) => ({
        ...interview,
        interviewType: interview.interviewType as "combo" | "mcq" | "coding" | "behavioral" | null
      }));
      
      setInterviewList(typedResult);
      setFilteredList(typedResult);
    } catch (err) {
      setError("Failed to fetch interview list. Please try again later.");
      console.error("Error fetching interviews:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, [session, isLoaded]);

  // Filter and sort functionality
  useEffect(() => {
    let filtered = [...interviewList];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (interview) =>
          interview.jobPosition.toLowerCase().includes(searchTerm.toLowerCase()) ||
          interview.candidateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          interview.candidateEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          interview.jobDescription.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (interview) => interview.interviewStatus?.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case "date":
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case "position":
          aValue = a.jobPosition.toLowerCase();
          bValue = b.jobPosition.toLowerCase();
          break;
        case "candidate":
          aValue = (a.candidateName || "").toLowerCase();
          bValue = (b.candidateName || "").toLowerCase();
          break;
        case "experience":
          aValue = parseInt(a.jobExperience) || 0;
          bValue = parseInt(b.jobExperience) || 0;
          break;
        case "status":
          aValue = a.interviewStatus || "";
          bValue = b.interviewStatus || "";
          break;
        default:
          aValue = a.id;
          bValue = b.id;
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredList(filtered);
  }, [interviewList, searchTerm, statusFilter, sortBy, sortOrder]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength
      ? `${text.substring(0, maxLength)}...`
      : text;
  };

  const handleStartInterview = (interviewId: string) => {
    router.push(`/dashboard/interviews/${interviewId}`);
  };

  const handleViewFeedback = (interviewId: string) => {
    router.push(`/dashboard/interviews/${interviewId}/feedback`);
  };

  const handleEditInterview = (interviewId: string) => {
    // We'll implement the edit functionality in the next update
    router.push(`/dashboard/interviews/${interviewId}/edit`);
  };

  const handleDeleteClick = (interviewId: string) => {
    setInterviewToDelete(interviewId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteInterview = async () => {
    if (!interviewToDelete) return;
    
    try {
      setIsDeleting(true);
      
      // Find the interview to determine its type and get the correct ID
      const interviewToDeleteObj = interviewList.find(interview => interview.interviewId === interviewToDelete);
      
      if (!interviewToDeleteObj) {
        throw new Error('Interview not found');
      }
      
      let deleteResponse;
      
      // Try deleting from behavioral interviews first (if it's a behavioral interview)
      if (interviewToDeleteObj?.interviewType === 'behavioral') {
        deleteResponse = await fetch(`/api/interviews?interviewId=${interviewToDelete}`, {
          method: 'DELETE',
        });
      } else {
        // For campaign interviews, use the database ID
        deleteResponse = await fetch(`/api/campaigns/interviews?interviewId=${interviewToDeleteObj.id}`, {
          method: 'DELETE',
        });
      }
      
      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json();
        throw new Error(errorData.error || 'Failed to delete interview');
      }
      
      // Update the local state
      const updatedList = interviewList.filter((interview) => interview.interviewId !== interviewToDelete);
      setInterviewList(updatedList);
      setFilteredList(updatedList);
      
      // Show success message
      toast({
        title: "Interview deleted",
        description: "The interview has been successfully deleted.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error deleting interview:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete the interview. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setInterviewToDelete(null);
    }
  };

  const copyInterviewLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({
        title: 'Link copied',
        description: 'Interview link copied to clipboard',
        variant: 'default',
      });
  };

  const getStatusColor = (status: string | null) => {
    if (!status) return "text-gray-600 bg-gray-50";
    
    switch (status.toLowerCase()) {
      case "scheduled":
        return "text-teal-600 bg-teal-50";
      case "completed":
        return "text-green-600 bg-green-50";
      case "no-show":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const formatDateTime = (date: string | null, time: string | null) => {
    if (!date) return "Not scheduled";
    return `${moment(date).format("MMM D, YYYY")}${time ? " at " + time : ""}`;
  };

  const isLinkExpired = (expiryTime: Date | null) => {
    if (!expiryTime) return false;
    return new Date() > new Date(expiryTime);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: easeOut
      }
    }
  };

  if (!isLoaded) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center p-12"
      >
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Loading interviews...</p>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-8 text-center"
      >
        <div className="inline-block p-6 rounded-2xl glass-card border border-red-200 text-red-600">
          <XCircle className="w-8 h-8 mx-auto mb-3 text-red-500" />
          <p className="font-medium">{error}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Search and Filter Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search interviews, candidates, or positions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-10">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="no-show">No Show</SelectItem>
              </SelectContent>
            </Select>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 px-3">
                  {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                  <span className="ml-2 hidden sm:inline">Sort</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleSort("date")}>
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Date Created
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort("position")}>
                  <Briefcase className="mr-2 h-4 w-4" />
                  Position
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort("candidate")}>
                  <User className="mr-2 h-4 w-4" />
                  Candidate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort("experience")}>
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Experience
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort("status")}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Status
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Results count */}
        <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
          <span>
            Showing {filteredList.length} of {interviewList.length} interviews
          </span>
          {(searchTerm || statusFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
              }}
              className="h-8 px-2 text-xs"
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <motion.div 
          variants={itemVariants}
          className="flex items-center justify-center p-12"
        >
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-3" />
            <p className="text-sm text-gray-600">Loading interviews...</p>
          </div>
        </motion.div>
      ) : interviewList.length === 0 ? (
        <motion.div 
          variants={itemVariants}
          className="text-center p-12"
        >
          <div className="inline-block p-8 rounded-3xl glass-card border border-white/30 text-gray-600 shadow-glow-subtle">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-teal-500 opacity-70" />
            </motion.div>
            <h3 className="text-xl font-bold gradient-text-teal mb-2">No interviews found</h3>
            <p className="text-sm text-gray-500">Schedule your first interview to get started</p>
          </div>
        </motion.div>
      ) : filteredList.length === 0 ? (
        <motion.div 
          variants={itemVariants}
          className="text-center p-12"
        >
          <div className="inline-block p-8 rounded-3xl glass-card border border-white/30 text-gray-600 shadow-glow-subtle">
            <Filter className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No interviews match your filters</h3>
            <p className="text-gray-600">Try adjusting your search criteria or clear the filters</p>
          </div>
        </motion.div>
      ) : (
        <motion.div 
          variants={containerVariants}
          className="grid gap-8"
        >
          <AnimatePresence>
            {filteredList.map((interview, index) => (
              <motion.div
                key={interview.id}
                variants={itemVariants}
                layout
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group"
              >
                <Card className="overflow-hidden glass-card border border-white/30 rounded-3xl shadow-glow-subtle group-hover:shadow-glow-hover transition-all duration-300">
                  <CardHeader className="pb-6 bg-gradient-to-r from-teal-50/50 via-blue-50/30 to-purple-50/50 border-b border-white/30">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <motion.div
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            className="p-2 bg-teal-50 rounded-xl group-hover:shadow-lg transition-all duration-300"
                          >
                            <Briefcase className="h-5 w-5 text-teal-600" />
                          </motion.div>
                          <div className="flex-1">
                            <CardTitle className="text-xl font-bold gradient-text-teal">
                              {interview.jobPosition}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                                interview.interviewType === 'combo' ? 'bg-purple-100 text-purple-700' :
                                interview.interviewType === 'mcq' ? 'bg-blue-100 text-blue-700' :
                                interview.interviewType === 'coding' ? 'bg-green-100 text-green-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {interview.interviewType === 'combo' ? 'Combo Interview' :
                                 interview.interviewType === 'mcq' ? 'MCQ Interview' :
                                 interview.interviewType === 'coding' ? 'Coding Interview' :
                                 'Behavioral Interview'}
                              </span>
                            </div>
                          </div>
                        </div>
                        {interview.candidateName && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 ml-11">
                            <User className="h-4 w-4 text-teal-500" />
                            <span className="font-medium">{interview.candidateName}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {interview.interviewStatus && (
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${getStatusColor(
                              interview.interviewStatus
                            )}`}
                          >
                            {interview.interviewStatus === "completed" && <CheckCircle2 className="h-3 w-3" />}
                            {interview.interviewStatus === "scheduled" && <Clock className="h-3 w-3" />}
                            {interview.interviewStatus === "no-show" && <XCircle className="h-3 w-3" />}
                            {interview.interviewStatus || "Draft"}
                          </motion.div>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl hover:bg-white/50">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </motion.div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 glass-card border border-white/30">
                            <DropdownMenuItem onClick={() => handleEditInterview(interview.interviewId)} className="hover:bg-teal-50">
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Edit Interview</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/30" />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteClick(interview.interviewId)}
                              className="text-red-600 focus:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Delete Interview</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {interview.interviewDate && (
                          <motion.div 
                            whileHover={{ scale: 1.02 }}
                            className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-teal-50/50 to-blue-50/50 border border-white/50"
                          >
                            <CalendarDays className="h-5 w-5 text-teal-600" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{formatDateTime(interview.interviewDate, interview.interviewTime)}</p>
                              <p className="text-xs text-gray-500">Interview Date</p>
                            </div>
                          </motion.div>
                        )}
                        <motion.div 
                          whileHover={{ scale: 1.02 }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-purple-50/50 to-pink-50/50 border border-white/50"
                        >
                          <Briefcase className="h-5 w-5 text-purple-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{interview.jobExperience} years</p>
                            <p className="text-xs text-gray-500">Experience Required</p>
                          </div>
                        </motion.div>
                      </div>
                      
                      {interview.candidateEmail && (
                        <motion.div 
                          whileHover={{ scale: 1.01 }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-50/50 to-teal-50/50 border border-white/50"
                        >
                          <Mail className="h-5 w-5 text-emerald-600" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{interview.candidateEmail}</p>
                            <p className="text-xs text-gray-500">Candidate Email</p>
                          </div>
                        </motion.div>
                      )}
                      
                      <div className="p-4 rounded-xl bg-gradient-to-r from-gray-50/50 to-slate-50/50 border border-white/50">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Job Description</h4>
                        <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">
                          {truncateText(interview.jobDescription, 150)}
                        </p>
                      </div>
                      
                      {interview.interviewLink && (
                        <motion.div 
                          whileHover={{ scale: 1.01 }}
                          className="flex items-center justify-between p-4 rounded-xl glass-card border border-white/50 bg-gradient-to-r from-indigo-50/30 to-blue-50/30"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <LinkIcon className="h-5 w-5 text-indigo-600" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate max-w-[250px]">{interview.interviewLink}</p>
                              <p className="text-xs text-gray-500">Interview Link</p>
                            </div>
                          </div>
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => copyInterviewLink(interview.interviewLink!)}
                              disabled={isLinkExpired(interview.linkExpiryTime)}
                              className={`h-9 text-xs px-4 rounded-xl font-medium transition-all duration-200 ${
                                isLinkExpired(interview.linkExpiryTime) 
                                  ? "text-red-500 border-red-200 hover:bg-red-50" 
                                  : "text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                              }`}>
                              {isLinkExpired(interview.linkExpiryTime) ? "Expired" : "Copy Link"}
                            </Button>
                          </motion.div>
                        </motion.div>
                      )}
                      
                      {interview.fileData && (
                        <motion.div 
                          whileHover={{ scale: 1.02 }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-50/50 to-orange-50/50 border border-white/50"
                        >
                          <FileText className="h-5 w-5 text-amber-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Resume Attached</p>
                            <p className="text-xs text-gray-500">PDF Document</p>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="p-6 border-t border-white/30 bg-gradient-to-r from-white/50 to-gray-50/50">
                    <div className="flex gap-4 w-full">
                      <motion.div 
                        whileHover={{ scale: 1.02 }} 
                        whileTap={{ scale: 0.98 }}
                        className="flex-1"
                      >
                        <Button
                          onClick={() => handleViewFeedback(interview.interviewId)}
                          className="h-12 w-full bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          <MessageSquare className="w-5 h-5 mr-2" />
                          View Feedback
                        </Button>
                      </motion.div>
                    </div>
                  </CardFooter>
                </Card>
              </motion.div>
             ))}
           </AnimatePresence>
         </motion.div>
       )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md glass-card border border-white/30 rounded-3xl">
          <DialogHeader className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
              className="mx-auto mb-4 p-3 bg-red-50 rounded-full w-fit"
            >
              <Trash2 className="h-6 w-6 text-red-600" />
            </motion.div>
            <DialogTitle className="text-2xl font-bold gradient-text-teal">Delete Interview</DialogTitle>
            <DialogDescription className="text-gray-600 mt-2 leading-relaxed">
              Are you sure you want to delete this interview? This action cannot be undone and all associated data will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center mt-6 gap-3">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={isDeleting}
                className="h-11 px-6 rounded-xl border-2 border-gray-200 hover:bg-gray-50 font-medium"
              >
                Cancel
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteInterview}
                disabled={isDeleting}
                className="h-11 px-6 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 font-medium shadow-lg"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Interview
                  </>
                )}
              </Button>
            </motion.div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default InterviewList;
