"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/shared/card";
import { Button } from "@/components/ui/shared/button";
import { Badge } from "@/components/ui/shared/badge";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  Calendar,
  Clock,
  ExternalLink,
  Upload,
  Play,
  User,
  Star,
  Briefcase,
  CheckCircle,
  AlertCircle,
  Plus,
  MessageSquare,
} from "lucide-react";
import { useToast } from "@/shared/hooks/use-toast";
import { ResumeUpload } from "@/components/candidate/resume-upload";

interface CandidateDashboardData {
  candidate: {
    id: string;
    name: string;
    email: string;
    profileImage?: string;
  };
  resume: {
    id: string;
    name: string;
    url: string;
    uploadedAt: string;
    version: number;
  } | null;
  interviews: Array<{
    id: string;
    interviewId: string;
    type: string;
    round: number;
    roundName: string;
    scheduledAt: string;
    status: string;
    company: string;
    jobTitle: string;
    campaignName: string;
    canStart: boolean;
    interviewLink: string;
  }>;
  applications?: {
    total: number;
    pending: number;
    offers: number;
  };
  profileCompleteness?: number;
  upcomingInterviews?: Array<{
    id: string;
    position: string;
    company: string;
    type: string;
    round: string;
    date: string;
    time: string;
  }>;
  recentApplications?: Array<{
    id: string;
    position: string;
    company: string;
    appliedDate: string;
    status: string;
  }>;
  notifications?: Array<{
    id: string;
    title: string;
    message: string;
    time: string;
  }>;
}

const getInterviewTypeColor = (type: string) => {
  switch (type) {
    case "coding":
      return "bg-green-100 text-green-800";
    case "behavioral":
      return "bg-blue-100 text-blue-800";
    case "combo":
      return "bg-purple-100 text-purple-800";
    case "mcq":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'accepted':
    case 'offer':
      return 'bg-green-100 text-green-800';
    case 'rejected':
      return 'bg-red-100 text-red-800';
    case 'interview':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending':
      return <Clock className="h-3 w-3" />;
    case 'accepted':
    case 'offer':
      return <CheckCircle className="h-3 w-3" />;
    case 'rejected':
      return <AlertCircle className="h-3 w-3" />;
    case 'interview':
      return <Calendar className="h-3 w-3" />;
    default:
      return <Clock className="h-3 w-3" />;
  }
};

export default function CandidateDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [dashboardData, setDashboardData] = useState<CandidateDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/candidate/signin");
    } else if (status === "authenticated") {
      if (session.user.role !== "candidate") {
        router.push("/candidate/signin");
        return;
      }
      fetchDashboardData();
    }
  }, [status, router, session]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/candidates/dashboard');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      const result = await response.json();
      if (result.success) {
        setDashboardData(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching dashboard data:', err);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartInterview = (interviewLink: string) => {
    if (!session?.user?.email) {
      toast({
        title: "Authentication required",
        description: "Please sign in to start your interview",
        variant: "destructive"
      });
      router.push('/candidate/signin');
      return;
    }

    // Validate interview link before attempting URL construction
    if (!interviewLink || typeof interviewLink !== 'string' || interviewLink.trim() === '') {
      toast({
        title: "Interview link not available",
        description: "Please contact support if this issue persists",
        variant: "destructive"
      });
      return;
    }

    try {
      // Ensure the interview link includes the authenticated user's email
      const url = new URL(interviewLink, window.location.origin);
      url.searchParams.set('email', session.user.email);
      url.searchParams.set('authenticated', 'true'); // Mark as coming from authenticated dashboard
      
      // Navigate to the lobby page with authentication context
      router.push(url.pathname + url.search);
    } catch (error) {
      console.error('Invalid interview link:', error);
      toast({
        title: "Invalid interview link",
        description: "The interview link appears to be invalid. Please contact support.",
        variant: "destructive"
      });
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchDashboardData}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session || !dashboardData) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            {dashboardData.candidate.profileImage ? (
              <img 
                src={dashboardData.candidate.profileImage} 
                alt="Profile" 
                className="w-14 h-14 rounded-full object-cover"
              />
            ) : (
              <User className="w-8 h-8 text-white" />
            )}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">
              Welcome, {dashboardData.candidate.name}! 👋
            </h1>
            <p className="text-blue-100">
              Your interview portal - manage your resume and upcoming interviews
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resume Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span>Your Resume</span>
            </CardTitle>
            <CardDescription>
              Upload and manage your resume
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResumeUpload 
              currentResume={dashboardData.resume}
              onUploadSuccess={(resumeData) => {
                // Update the dashboard data with the new resume
                setDashboardData(prev => prev ? {
                  ...prev,
                  resume: resumeData.resume
                } : null);
              }}
            />
          </CardContent>
        </Card>

        {/* Interviews Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <span>Scheduled Interviews</span>
            </CardTitle>
            <CardDescription>
              Your upcoming interviews based on your email
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardData.interviews.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.interviews.map((interview) => (
                  <div key={interview.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge className={getInterviewTypeColor(interview.type)}>
                            {interview.type.toUpperCase()}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            Round {interview.round}
                          </span>
                        </div>
                        <h4 className="font-medium">{interview.jobTitle}</h4>
                        <p className="text-sm text-gray-600">{interview.company}</p>
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <Clock className="h-4 w-4" />
                          <span>{formatDate(interview.scheduledAt)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        {interview.canStart ? (
                          <Button 
                            size="sm"
                            onClick={() => handleStartInterview(interview.interviewLink)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Start Interview
                          </Button>
                        ) : (
                          <Badge variant="outline">
                            {interview.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No interviews scheduled</p>
                <p className="text-sm text-gray-400">
                  Your scheduled interviews will appear here
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Briefcase className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{dashboardData.applications?.total || 0}</p>
                <p className="text-sm text-gray-600">Applications</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{dashboardData.applications?.pending || 0}</p>
                <p className="text-sm text-gray-600">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{dashboardData.applications?.offers || 0}</p>
                <p className="text-sm text-gray-600">Offers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{dashboardData.profileCompleteness || 0}%</p>
                <p className="text-sm text-gray-600">Profile</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Interviews */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Upcoming Interviews</span>
                </CardTitle>
                <Button asChild variant="outline" size="sm">
                  <Link href="/candidate/interviews">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {(dashboardData.interviews?.length ?? 0) > 0 ? (
                <div className="space-y-4">
                  {dashboardData.interviews?.map((interview) => (
                    <div
                      key={interview.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="space-y-1">
                        <h4 className="font-medium">{interview.jobTitle}</h4>
                        <p className="text-sm text-gray-600">{interview.company}</p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">{interview.type}</Badge>
                          <Badge variant="secondary">{interview.roundName}</Badge>
                          {interview.campaignName && (
                            <Badge variant="outline">{interview.campaignName}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 sm:mt-0 text-right">
                        <p className="font-medium">{formatDate(interview.scheduledAt)}</p>
                        <p className="text-sm text-gray-600">{interview.status}</p>
                        {interview.canStart && interview.interviewLink ? (
                          <Button 
                            size="sm" 
                            className="mt-2"
                            onClick={() => handleStartInterview(interview.interviewLink)}
                          >
                            Start Interview
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="mt-2"
                            disabled
                          >
                            Prepare
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No upcoming interviews</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Keep applying to schedule more interviews
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Applications */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Briefcase className="h-5 w-5" />
                  <span>Recent Applications</span>
                </CardTitle>
                <Button asChild variant="outline" size="sm">
                  <Link href="/candidate/applications">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.recentApplications?.map((application) => (
                  <div
                    key={application.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="space-y-1">
                      <h4 className="font-medium">{application.position}</h4>
                      <p className="text-sm text-gray-600">{application.company}</p>
                      <p className="text-xs text-gray-500">
                        Applied: {application.appliedDate}
                      </p>
                    </div>
                    <div className="mt-3 sm:mt-0 flex items-center space-x-2">
                      <Badge className={getStatusColor(application.status)}>
                        <span className="flex items-center space-x-1">
                          {getStatusIcon(application.status)}
                          <span className="capitalize">{application.status}</span>
                        </span>
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Profile Completeness */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Profile Completeness</CardTitle>
              <CardDescription>
                Complete your profile to increase visibility
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Progress</span>
                    <span>{dashboardData.profileCompleteness || 0}%</span>
                  </div>
                  <Progress value={dashboardData.profileCompleteness || 0} className="h-2" />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Basic information</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Resume uploaded</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span>Add skills and experience</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span>Add portfolio projects</span>
                  </div>
                </div>
                <Button asChild className="w-full" size="sm">
                  <Link href="/candidate/profile">Complete Profile</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Notifications</CardTitle>
                <Button asChild variant="outline" size="sm">
                  <Link href="/candidate/notifications">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.notifications?.map((notification) => (
                  <div key={notification.id} className="space-y-1">
                    <div className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="text-xs text-gray-600">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/candidate/applications">
                    <Plus className="mr-2 h-4 w-4" />
                    New Application
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/candidate/documents">
                    <FileText className="mr-2 h-4 w-4" />
                    Upload Resume
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/candidate/messages">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Messages
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}