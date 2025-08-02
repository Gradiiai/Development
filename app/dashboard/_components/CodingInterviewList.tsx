"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/shared/card";
import {
  Code,
  CalendarDays,
  Clock,
  Loader2,
  PlayCircle,
  Eye,
  User,
  Mail,
  Link,
  MoreVertical,
  Edit,
  Trash2,
  AlertCircle,
  Filter,
  Search,
  SortAsc,
  SortDesc,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock3,
} from "lucide-react";
import { Button } from "@/components/ui/shared/button";
import { Input } from "@/components/ui/shared/input";
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
} from "@/components/ui/shared/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/shared/badge";
import { useToast } from "@/shared/hooks/use-toast";

type CodingInterviewData = {
  id: number;
  codingQuestions: string;
  interviewId: string;
  interviewTopic: string;
  difficultyLevel: string;
  problemDescription: string;
  timeLimit: number;
  programmingLanguage: string;
  createdBy: string;
  createdAt: Date;
  candidateName: string | null;
  candidateEmail: string | null;
  interviewDate: string | null;
  interviewTime: string | null;
  interviewStatus: string | null;
  interviewLink: string | null;
  linkExpiryTime: Date | null;
};

const CodingInterviewList = () => {
  const { data: session, status } = useSession();
  const isLoaded = status !== "loading";
  const [interviewList, setInterviewList] = useState<CodingInterviewData[]>([]);
  const [filteredList, setFilteredList] = useState<CodingInterviewData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [interviewToDelete, setInterviewToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const getCodingInterviewList = async () => {
      if (!isLoaded || !session?.user?.id) return;

      try {
        setIsLoading(true);
        const response = await fetch('/api/interviews/coding');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch coding interviews');
        }

        setInterviewList(data.data);
        setFilteredList(data.data);
      } catch (err) {
        setError(
          "Failed to fetch coding interview list. Please try again later."
        );
        console.error("Error fetching coding interviews:", err);
      } finally {
        setIsLoading(false);
      }
    };

    getCodingInterviewList();
  }, [session, isLoaded]);

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength
      ? `${text.substring(0, maxLength)}...`
      : text;
  };

  const handleStartInterview = (interviewId: string) => {
    router.push(`/dashboard/codingInterview/${interviewId}`);
  };

  const handleViewSolution = (interviewId: string) => {
    router.push(`/dashboard/codingInterview/${interviewId}/coding-feedback`);
  };

  const handleEditInterview = (interviewId: string) => {
    router.push(`/dashboard/codingInterview/${interviewId}/edit`);
  };

  const handleDeleteClick = (interviewId: string) => {
    setInterviewToDelete(interviewId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteInterview = async () => {
    if (!interviewToDelete) return;
    
    try {
      setIsDeleting(true);
      
      // Delete the interview via API
              const response = await fetch(`/api/interviews/coding?interviewId=${interviewToDelete}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete coding interview');
      }
      
      // Update the local state
      const updatedList = interviewList.filter((interview) => interview.interviewId !== interviewToDelete);
      setInterviewList(updatedList);
      setFilteredList(updatedList);
      
      // Show success message
      toast({
        title: "Coding interview deleted",
        description: "The coding interview has been successfully deleted.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error deleting coding interview:", error);
      toast({
        title: "Error",
        description: "Failed to delete the coding interview. Please try again.",
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
      title: "Link copied",
      description: "Interview link copied to clipboard",
      variant: "default",
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "text-green-600 bg-green-50";
      case "medium":
        return "text-yellow-600 bg-yellow-50";
      case "hard":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
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
    return `${moment(date).format("MMM D, YYYY")}${time ? ' at ' + time : ''}`;
  };

  const isLinkExpired = (expiryTime: Date | null) => {
    if (!expiryTime) return false;
    return new Date() > new Date(expiryTime);
  };

  // Filter and sort functionality
  useEffect(() => {
    let filtered = [...interviewList];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (interview) =>
          interview.interviewTopic.toLowerCase().includes(searchTerm.toLowerCase()) ||
          interview.candidateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          interview.candidateEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          interview.programmingLanguage.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (interview) => interview.interviewStatus?.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Apply difficulty filter
    if (difficultyFilter !== "all") {
      filtered = filtered.filter(
        (interview) => interview.difficultyLevel.toLowerCase() === difficultyFilter.toLowerCase()
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
        case "topic":
          aValue = a.interviewTopic.toLowerCase();
          bValue = b.interviewTopic.toLowerCase();
          break;
        case "candidate":
          aValue = (a.candidateName || "").toLowerCase();
          bValue = (b.candidateName || "").toLowerCase();
          break;
        case "difficulty":
          const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
          aValue = difficultyOrder[a.difficultyLevel.toLowerCase() as keyof typeof difficultyOrder] || 0;
          bValue = difficultyOrder[b.difficultyLevel.toLowerCase() as keyof typeof difficultyOrder] || 0;
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
  }, [interviewList, searchTerm, statusFilter, difficultyFilter, sortBy, sortOrder]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "no-show":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "scheduled":
        return <Clock3 className="h-4 w-4 text-teal-600" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-600" />;
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block p-4 rounded-lg bg-red-50 text-red-600">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search interviews, candidates, or topics..."
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
            
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-[140px] h-10">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
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
                <DropdownMenuItem onClick={() => handleSort("topic")}>
                  <Code className="mr-2 h-4 w-4" />
                  Topic
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort("candidate")}>
                  <User className="mr-2 h-4 w-4" />
                  Candidate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort("difficulty")}>
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Difficulty
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
          {(searchTerm || statusFilter !== "all" || difficultyFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setDifficultyFilter("all");
              }}
              className="h-8 px-2 text-xs"
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Loading interviews...</p>
          </div>
        </div>
      ) : interviewList.length === 0 ? (
        <div className="text-center p-12">
          <div className="inline-block p-8 rounded-2xl bg-gradient-to-br from-teal-50 to-blue-50 text-gray-600">
            <div className="w-16 h-16 mx-auto mb-4 bg-teal-100 rounded-full flex items-center justify-center">
              <Code className="h-8 w-8 text-teal-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No coding interviews yet</h3>
            <p className="text-gray-600 mb-4">Create your first coding interview to get started</p>
            <div className="text-sm text-gray-500">
              <p>• Set up technical challenges</p>
              <p>• Schedule candidate assessments</p>
              <p>• Track interview progress</p>
            </div>
          </div>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="text-center p-12">
          <div className="inline-block p-8 rounded-2xl bg-gray-50 text-gray-600">
            <Filter className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No interviews match your filters</h3>
            <p className="text-gray-600">Try adjusting your search criteria or clear the filters</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredList.map((interview) => (
            <Card
              key={interview.id}
              className="overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-200 rounded-2xl bg-white group hover:border-teal-200"
            >
              <CardHeader className="pb-4 bg-gradient-to-r from-teal-50 via-blue-50 to-white border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-teal-100 rounded-lg group-hover:bg-teal-200 transition-colors">
                        <Code className="h-4 w-4 text-teal-600" />
                      </div>
                      <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-teal-700 transition-colors">
                        {interview.interviewTopic}
                      </CardTitle>
                    </div>
                    {interview.candidateName && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        <span className="font-medium">{interview.candidateName}</span>
                        {interview.candidateEmail && (
                          <>
                            <span className="text-gray-400">•</span>
                            <Mail className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[200px]">{interview.candidateEmail}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {getStatusIcon(interview.interviewStatus)}
                      <Badge
                        variant="secondary"
                        className={`text-xs font-medium ${getStatusColor(interview.interviewStatus)}`}
                      >
                        {interview.interviewStatus || "Draft"}
                      </Badge>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs font-medium ${getDifficultyColor(interview.difficultyLevel)}`}
                    >
                      {interview.difficultyLevel}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-teal-100 transition-colors">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => handleEditInterview(interview.interviewId)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Edit Interview</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyInterviewLink(interview.interviewLink!)}>
                          <Link className="mr-2 h-4 w-4" />
                          <span>Copy Link</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteClick(interview.interviewId)}
                          className="text-red-600 focus:text-red-700"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-5 pb-4">
                <div className="space-y-4">
                  {/* Interview Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {interview.interviewDate && (
                      <div className="flex items-center gap-2 text-sm">
                        <div className="p-1.5 bg-teal-100 rounded-md">
                          <CalendarDays className="h-3.5 w-3.5 text-teal-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{formatDateTime(interview.interviewDate, interview.interviewTime)}</p>
                          <p className="text-xs text-gray-500">Scheduled</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <div className="p-1.5 bg-blue-100 rounded-md">
                        <Clock className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{interview.timeLimit} minutes</p>
                        <p className="text-xs text-gray-500">Duration</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="p-1.5 bg-purple-100 rounded-md">
                        <Code className="h-3.5 w-3.5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 capitalize">{interview.programmingLanguage}</p>
                        <p className="text-xs text-gray-500">Language</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Problem Description */}
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Problem Description</h4>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {truncateText(interview.problemDescription, 150)}
                    </p>
                  </div>
                  
                  {/* Interview Link */}
                  {interview.interviewLink && (
                    <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg p-3 border border-teal-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <Link className="h-4 w-4 text-teal-600" />
                          <span className="font-medium text-teal-800">Interview Link</span>
                          {isLinkExpired(interview.linkExpiryTime) && (
                            <Badge variant="destructive" className="text-xs">Expired</Badge>
                          )}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => copyInterviewLink(interview.interviewLink!)}
                          disabled={isLinkExpired(interview.linkExpiryTime)}
                          className="h-7 text-xs px-3 border-teal-200 text-teal-700 hover:bg-teal-100"
                        >
                          {isLinkExpired(interview.linkExpiryTime) ? "Expired" : "Copy"}
                        </Button>
                      </div>
                      <p className="text-xs text-teal-600 mt-1 truncate">{interview.interviewLink}</p>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-4 pb-4 border-t border-gray-100 bg-gradient-to-r from-white to-teal-50">
                <div className="flex gap-3 w-full">
                  <Button
                    onClick={() => handleStartInterview(interview.interviewId)}
                    className="h-10 flex-1 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-medium shadow-md hover:shadow-lg transition-all"
                  >
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Start Interview
                  </Button>
                  <Button
                    onClick={() => handleViewSolution(interview.interviewId)}
                    variant="outline"
                    className="h-10 flex-1 border-teal-200 text-teal-700 hover:bg-teal-50 hover:border-teal-300 transition-all"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Results
                  </Button>
                  <Button
                    onClick={() => handleEditInterview(interview.interviewId)}
                    variant="outline"
                    size="sm"
                    className="h-10 px-3 border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <DialogTitle className="text-xl font-bold text-gray-900">Delete Coding Interview</DialogTitle>
            </div>
            <DialogDescription className="text-gray-600 mt-2">
              Are you sure you want to delete this coding interview? This action cannot be undone and will permanently remove:
            </DialogDescription>
            <ul className="mt-2 ml-4 list-disc text-sm space-y-1 text-gray-600">
              <li>Interview configuration and questions</li>
              <li>Candidate responses and submissions</li>
              <li>All associated feedback and results</li>
            </ul>
          </DialogHeader>
          <DialogFooter className="sm:justify-end mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
              className="mr-3"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteInterview}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Permanently
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CodingInterviewList;
