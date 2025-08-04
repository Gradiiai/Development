"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/shared/card";
import { Badge } from "@/components/ui/shared/badge";
import { Button } from "@/components/ui/shared/button";
import { Input } from "@/components/ui/shared/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/shared/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/shared/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/shared/dialog";
import {
  Search,
  Calendar,
  Clock,
  Video,
  MapPin,
  Building2,
  User,
  Phone,
  Mail,
  FileText,
  MoreVertical,
  Play,
  CheckCircle,
  AlertCircle,
  Star,
  MessageSquare,
  Download,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { format, isAfter, isBefore, addHours } from "date-fns";
import { useToast } from "@/shared/hooks/use-toast";

interface Interview {
  id: string;
  jobTitle: string;
  companyName: string;
  companyLogo?: string;
  interviewType: "behavioral" | "coding" | "mcq" | "combo";
  scheduledDate: Date;
  duration: number; // in minutes
  status: "scheduled" | "in_progress" | "completed" | "cancelled" | "rescheduled";
  location?: string;
  meetingLink?: string;
  interviewerName: string;
  interviewerTitle: string;
  interviewerEmail?: string;
  instructions?: string;
  preparationMaterials?: string[];
  feedback?: {
    rating: number;
    comments: string;
    strengths: string[];
    improvements: string[];
  };
  notes?: string;
  round: number;
  totalRounds: number;
}

const interviewTypeConfig = {
  behavioral: {
    label: "Behavioral",
    color: "bg-blue-100 text-blue-800",
    icon: MessageSquare,
  },
  technical: {
    label: "Technical",
    color: "bg-purple-100 text-purple-800",
    icon: FileText,
  },
  coding: {
    label: "Coding",
    color: "bg-green-100 text-green-800",
    icon: Play,
  },
  mcq: {
    label: "MCQ",
    color: "bg-orange-100 text-orange-800",
    icon: CheckCircle,
  },
  combo: {
    label: "Combined",
    color: "bg-indigo-100 text-indigo-800",
    icon: Star,
  },
};

const statusConfig = {
  scheduled: {
    label: "Scheduled",
    color: "bg-blue-100 text-blue-800",
    icon: Calendar,
  },
  in_progress: {
    label: "In Progress",
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
  },
  completed: {
    label: "Completed",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-100 text-red-800",
    icon: AlertCircle,
  },
  rescheduled: {
    label: "Rescheduled",
    color: "bg-orange-100 text-orange-800",
    icon: Calendar,
  },
};

// Default empty interviews array
const defaultInterviews: Interview[] = [];

export default function CandidateInterviews() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [interviews, setInterviews] = useState<Interview[]>(defaultInterviews);
  const [filteredInterviews, setFilteredInterviews] = useState<Interview[]>(defaultInterviews);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("upcoming");
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Handle joining an interview
  const handleJoinInterview = (interview: Interview) => {
    if (interview.meetingLink) {
      // Navigate to the lobby page
      router.push(interview.meetingLink);
    }
  };

  // Handle preparing for an interview
  const handlePrepareInterview = (interview: Interview) => {
    if (!session?.user?.email) {
      toast({
        title: "Authentication required",
        description: "Please sign in to access your interview",
        variant: "destructive"
      });
      router.push('/candidate/signin');
      return;
    }

    // Navigate to the lobby page with authentication context
    router.push(`/candidate/interview/${interview.id}/lobby?email=${encodeURIComponent(session.user.email)}&authenticated=true`);
  };

  // Fetch interviews data from dashboard API
  const fetchInterviews = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/candidates/dashboard');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      const data = await response.json();
      
      // Handle the new API response structure
      const allInterviews: Interview[] = [];
      
      // Process scheduled interviews from campaignInterviews
      if (data.data?.interviews) {
        const scheduledInterviews = data.data.interviews.map((interview: any) => ({
          id: interview.id,
          jobTitle: interview.jobTitle || interview.campaignName || 'Interview',
          companyName: interview.companyName || 'Company',
          interviewType: interview.type || interview.interviewType || 'behavioral' as const,
          scheduledDate: new Date(interview.scheduledAt),
          duration: interview.timeLimit || 60,
          status: interview.status === 'scheduled' ? 'scheduled' : 
                 interview.status === 'completed' ? 'completed' : 'scheduled',
          meetingLink: interview.interviewLink,
          interviewerName: 'Interviewer',
          interviewerTitle: 'HR Representative',
          round: interview.round || 1,
          totalRounds: 1,
          instructions: interview.difficultyLevel ? `Difficulty: ${interview.difficultyLevel}` : undefined,
        }));
        allInterviews.push(...scheduledInterviews);
      }
      
      // Also fetch from the existing interviews API for backward compatibility
      try {
        const interviewsResponse = await fetch('/api/candidates/interviews');
        if (interviewsResponse.ok) {
          const interviewsData = await interviewsResponse.json();
          
          // Process coding interviews
          if (interviewsData.interviews?.codingInterviews) {
            const codingInterviews = interviewsData.interviews.codingInterviews.map((interview: any) => ({
              id: interview.id,
              jobTitle: interview.interviewTopic || 'Coding Interview',
              companyName: 'Company',
              interviewType: 'coding' as const,
              scheduledDate: new Date(interview.interviewDate + ' ' + interview.interviewTime),
              duration: interview.timeLimit || 60,
              status: interview.interviewStatus === 'scheduled' ? 'scheduled' : 
                     interview.interviewStatus === 'completed' ? 'completed' : 'scheduled',
              meetingLink: interview.interviewLink,
              interviewerName: 'System',
              interviewerTitle: 'Automated Interview',
              round: 1,
              totalRounds: 1,
              instructions: `Programming Language: ${interview.programmingLanguage}\nDifficulty: ${interview.difficultyLevel}`,
            }));
            allInterviews.push(...codingInterviews);
          }
          
          // Process regular interviews
          if (interviewsData.interviews?.regularInterviews) {
            const regularInterviews = interviewsData.interviews.regularInterviews.map((interview: any) => ({
              id: interview.id,
              jobTitle: interview.jobPosition || 'Interview',
              companyName: 'Company',
              interviewType: interview.interviewType || 'behavioral' as const,
              scheduledDate: new Date(interview.interviewDate + ' ' + interview.interviewTime),
              duration: 60,
              status: interview.interviewStatus === 'scheduled' ? 'scheduled' : 
                     interview.interviewStatus === 'completed' ? 'completed' : 'scheduled',
              meetingLink: interview.interviewLink,
              interviewerName: 'Interviewer',
              interviewerTitle: 'HR Representative',
              round: 1,
              totalRounds: 1,
              instructions: interview.jobDescription,
            }));
            allInterviews.push(...regularInterviews);
          }
          
          // Process history interviews
          if (interviewsData.interviews?.historyInterviews) {
            const historyInterviews = interviewsData.interviews.historyInterviews.map((interview: any) => ({
              id: interview.id,
              jobTitle: interview.roundName || 'Interview',
              companyName: 'Company',
              interviewType: interview.interviewType || 'behavioral' as const,
              scheduledDate: new Date(interview.scheduledAt),
              duration: interview.duration || 60,
              status: interview.status === 'completed' ? 'completed' : 
                     interview.status === 'scheduled' ? 'scheduled' : 'scheduled',
              meetingLink: interview.interviewLink,
              interviewerName: interview.interviewerName || 'Interviewer',
              interviewerTitle: 'Interviewer',
              round: interview.roundNumber || 1,
              totalRounds: 1,
              feedback: interview.feedback ? {
                rating: interview.score || 0,
                comments: interview.feedback,
                strengths: [],
                improvements: []
              } : undefined,
            }));
            allInterviews.push(...historyInterviews);
          }
        }
      } catch (interviewsError) {
        console.warn('Could not fetch additional interviews data:', interviewsError);
      }
      
      // Remove duplicates based on ID
      const uniqueInterviews = allInterviews.filter((interview, index, self) => 
        index === self.findIndex(i => i.id === interview.id)
      );
      
      setInterviews(uniqueInterviews);
      setError(null);
    } catch (error) {
      console.error('Error fetching interviews:', error);
      setError('Failed to load interviews');
    } finally {
      setIsLoading(false);
    }
  };

  // Load interviews on component mount
  useEffect(() => {
    if (session?.user) {
      fetchInterviews();
    }
  }, [session]);

  // Filter interviews based on tab and search
  useEffect(() => {
    const now = new Date();
    let filtered = interviews.filter((interview) => {
      const matchesSearch = 
        interview.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        interview.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        interview.interviewerName.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (activeTab === "upcoming") {
        return matchesSearch && (interview.status === "scheduled" || isAfter(interview.scheduledDate, now));
      } else if (activeTab === "completed") {
        return matchesSearch && interview.status === "completed";
      } else if (activeTab === "cancelled") {
        return matchesSearch && (interview.status === "cancelled" || interview.status === "rescheduled");
      }
      
      return matchesSearch;
    });

    // Sort by date
    filtered.sort((a, b) => {
      if (activeTab === "upcoming") {
        return a.scheduledDate.getTime() - b.scheduledDate.getTime();
      }
      return b.scheduledDate.getTime() - a.scheduledDate.getTime();
    });

    setFilteredInterviews(filtered);
  }, [interviews, searchTerm, activeTab]);

  const getInterviewCounts = () => {
    const now = new Date();
    return {
      upcoming: interviews.filter(i => i.status === "scheduled" || isAfter(i.scheduledDate, now)).length,
      completed: interviews.filter(i => i.status === "completed").length,
      cancelled: interviews.filter(i => i.status === "cancelled" || i.status === "rescheduled").length,
    };
  };

  const counts = getInterviewCounts();

  const getTimeUntilInterview = (date: Date | string | null | undefined) => {
    if (!date) return "unknown";
    
    const interviewDate = new Date(date);
    if (isNaN(interviewDate.getTime())) return "unknown";
    
    const now = new Date();
    const diffMs = interviewDate.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else if (diffMs > 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `in ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    } else {
      return "now";
    }
  };

  const canJoinInterview = (interview: Interview) => {
    if (!interview.scheduledDate || !interview.meetingLink) return false;
    
    const interviewTime = new Date(interview.scheduledDate);
    if (isNaN(interviewTime.getTime())) return false;
    
    const now = new Date();
    const joinWindow = addHours(interviewTime, -0.25); // 15 minutes before
    const endWindow = addHours(interviewTime, interview.duration / 60);
    
    return isAfter(now, joinWindow) && isBefore(now, endWindow);
  };

  const InterviewCard = ({ interview }: { interview: Interview }) => {
    const typeInfo = interviewTypeConfig[interview.interviewType];
    const statusInfo = statusConfig[interview.status];
    const TypeIcon = typeInfo.icon;
    const StatusIcon = statusInfo.icon;
    const canJoin = canJoinInterview(interview);

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                {interview.companyLogo ? (
                  <img
                    src={interview.companyLogo}
                    alt={interview.companyName}
                    className="w-8 h-8 rounded"
                  />
                ) : (
                  <Building2 className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg text-gray-900 truncate">
                  {interview.jobTitle}
                </h3>
                <p className="text-gray-600 font-medium">{interview.companyName}</p>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  <User className="w-4 h-4 mr-1" />
                  {interview.interviewerName} • {interview.interviewerTitle}
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSelectedInterview(interview)}>
                  <FileText className="w-4 h-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                {interview.meetingLink && (
                  <DropdownMenuItem>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Meeting Link
                  </DropdownMenuItem>
                )}
                {interview.interviewerEmail && (
                  <DropdownMenuItem>
                    <Mail className="w-4 h-4 mr-2" />
                    Contact Interviewer
                  </DropdownMenuItem>
                )}
                {interview.preparationMaterials && (
                  <DropdownMenuItem>
                    <Download className="w-4 h-4 mr-2" />
                    Download Materials
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Badge className={typeInfo.color}>
                <TypeIcon className="w-3 h-3 mr-1" />
                {typeInfo.label}
              </Badge>
              <Badge className={statusInfo.color}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusInfo.label}
              </Badge>
            </div>
            <span className="text-sm text-gray-500">
              Round {interview.round} of {interview.totalRounds}
            </span>
          </div>
          
          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="w-4 h-4 mr-2" />
              {interview.scheduledDate && !isNaN(new Date(interview.scheduledDate).getTime()) 
                ? format(new Date(interview.scheduledDate), "EEEE, MMMM d, yyyy")
                : "Date not scheduled"
              }
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="w-4 h-4 mr-2" />
              {interview.scheduledDate && !isNaN(new Date(interview.scheduledDate).getTime()) 
                ? `${format(new Date(interview.scheduledDate), "h:mm a")} (${interview.duration} min)`
                : "Time not scheduled"
              }
              {interview.status === "scheduled" && interview.scheduledDate && (
                <span className="ml-2 text-blue-600 font-medium">
                  {getTimeUntilInterview(interview.scheduledDate)}
                </span>
              )}
            </div>
            {interview.location ? (
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-2" />
                {interview.location}
              </div>
            ) : interview.meetingLink ? (
              <div className="flex items-center text-sm text-gray-600">
                <Video className="w-4 h-4 mr-2" />
                Video Interview
              </div>
            ) : null}
          </div>
          
          {interview.instructions && (
            <div className="bg-blue-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-blue-800">
                <strong>Instructions:</strong> {interview.instructions}
              </p>
            </div>
          )}
          
          {interview.feedback && (
            <div className="bg-green-50 p-3 rounded-lg mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-800">Feedback Received</span>
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < interview.feedback!.rating
                          ? "text-yellow-400 fill-current"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-sm text-green-700">{interview.feedback.comments}</p>
            </div>
          )}
          
          <div className="flex space-x-2">
            {interview.meetingLink && interview.status === "scheduled" && (
              <Button 
                className="flex-1"
                onClick={() => handleJoinInterview(interview)}
              >
                <Video className="w-4 h-4 mr-1" />
                Start Interview
              </Button>
            )}
            {interview.status === "scheduled" && !interview.meetingLink && (
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => handlePrepareInterview(interview)}
              >
                <FileText className="w-4 h-4 mr-1" />
                Prepare
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setSelectedInterview(interview)}
              className={canJoin ? "" : "flex-1"}
            >
              <FileText className="w-4 h-4 mr-1" />
              Details
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Interviews</h1>
        <p className="text-gray-600 mt-1">
          Manage your upcoming and past interviews
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upcoming</p>
                <p className="text-2xl font-bold text-blue-600">{counts.upcoming}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{counts.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cancelled</p>
                <p className="text-2xl font-bold text-red-600">{counts.cancelled}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search interviews, companies, or interviewers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Interviews List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming">Upcoming ({counts.upcoming})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({counts.completed})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({counts.cancelled})</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : filteredInterviews.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No interviews found
                </h3>
                <p className="text-gray-600">
                  {searchTerm
                    ? "Try adjusting your search terms."
                    : `You don't have any ${activeTab} interviews.`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredInterviews.map((interview) => (
                <InterviewCard key={interview.id} interview={interview} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Interview Details Dialog */}
      <Dialog open={!!selectedInterview} onOpenChange={() => setSelectedInterview(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedInterview && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedInterview.jobTitle}</DialogTitle>
                <DialogDescription>
                  {selectedInterview.companyName} • {selectedInterview.interviewerName}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Interview Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                        {selectedInterview.scheduledDate && !isNaN(new Date(selectedInterview.scheduledDate).getTime()) 
                          ? format(new Date(selectedInterview.scheduledDate), "EEEE, MMMM d, yyyy")
                          : "Date not scheduled"
                        }
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-gray-400" />
                        {selectedInterview.scheduledDate && !isNaN(new Date(selectedInterview.scheduledDate).getTime()) 
                          ? `${format(new Date(selectedInterview.scheduledDate), "h:mm a")} (${selectedInterview.duration} min)`
                          : "Time not scheduled"
                        }
                      </div>
                      {selectedInterview.location && (
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                          {selectedInterview.location}
                        </div>
                      )}
                      {selectedInterview.meetingLink && (
                        <div className="flex items-center">
                          <Video className="w-4 h-4 mr-2 text-gray-400" />
                          <a
                            href={selectedInterview.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-500"
                          >
                            Join Meeting
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Interviewer</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-2 text-gray-400" />
                        {selectedInterview.interviewerName}
                      </div>
                      <div className="text-gray-600">{selectedInterview.interviewerTitle}</div>
                      {selectedInterview.interviewerEmail && (
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 mr-2 text-gray-400" />
                          <a
                            href={`mailto:${selectedInterview.interviewerEmail}`}
                            className="text-blue-600 hover:text-blue-500"
                          >
                            {selectedInterview.interviewerEmail}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {selectedInterview.instructions && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Instructions</h4>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-800">{selectedInterview.instructions}</p>
                    </div>
                  </div>
                )}
                
                {selectedInterview.preparationMaterials && selectedInterview.preparationMaterials.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Preparation Materials</h4>
                    <ul className="space-y-1">
                      {selectedInterview.preparationMaterials.map((material, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-600">
                          <FileText className="w-4 h-4 mr-2 text-gray-400" />
                          {material}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {selectedInterview.feedback && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Feedback</h4>
                    <div className="bg-green-50 p-4 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-green-800">Overall Rating</span>
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < selectedInterview.feedback!.rating
                                  ? "text-yellow-400 fill-current"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-green-800">Comments:</span>
                        <p className="text-sm text-green-700 mt-1">{selectedInterview.feedback.comments}</p>
                      </div>
                      {selectedInterview.feedback.strengths.length > 0 && (
                        <div>
                          <span className="font-medium text-green-800">Strengths:</span>
                          <ul className="list-disc list-inside text-sm text-green-700 mt-1">
                            {selectedInterview.feedback.strengths.map((strength, index) => (
                              <li key={index}>{strength}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {selectedInterview.feedback.improvements.length > 0 && (
                        <div>
                          <span className="font-medium text-green-800">Areas for Improvement:</span>
                          <ul className="list-disc list-inside text-sm text-green-700 mt-1">
                            {selectedInterview.feedback.improvements.map((improvement, index) => (
                              <li key={index}>{improvement}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}