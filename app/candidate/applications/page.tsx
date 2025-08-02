"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/shared/card";
import { Badge } from "@/components/ui/shared/badge";
import { Button } from "@/components/ui/shared/button";
import { Input } from "@/components/ui/shared/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/shared/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/shared/dropdown-menu";
import {
  Search,
  Filter,
  Calendar,
  MapPin,
  Building2,
  Clock,
  Eye,
  MessageSquare,
  FileText,
  MoreVertical,
  Briefcase,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

interface Application {
  id: string;
  jobTitle: string;
  companyName: string;
  companyLogo?: string;
  location: string;
  appliedDate: Date;
  status: "applied" | "under_review" | "interview_scheduled" | "interview_completed" | "offer" | "rejected" | "withdrawn";
  jobType: "full-time" | "part-time" | "contract" | "internship";
  salary?: string;
  lastUpdate: Date;
  interviewDate?: Date;
  notes?: string;
  jobDescription?: string;
}

const statusConfig = {
  applied: {
    label: "Applied",
    color: "bg-blue-100 text-blue-800",
    icon: Clock,
  },
  under_review: {
    label: "Under Review",
    color: "bg-yellow-100 text-yellow-800",
    icon: Eye,
  },
  interview_scheduled: {
    label: "Interview Scheduled",
    color: "bg-purple-100 text-purple-800",
    icon: Calendar,
  },
  interview_completed: {
    label: "Interview Completed",
    color: "bg-indigo-100 text-indigo-800",
    icon: CheckCircle,
  },
  offer: {
    label: "Offer Received",
    color: "bg-green-100 text-green-800",
    icon: TrendingUp,
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-100 text-red-800",
    icon: XCircle,
  },
  withdrawn: {
    label: "Withdrawn",
    color: "bg-gray-100 text-gray-800",
    icon: AlertCircle,
  },
};



export default function CandidateApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [jobTypeFilter, setJobTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("appliedDate");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch applications on component mount
  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/candidates/applications');
      if (!response.ok) {
        throw new Error('Failed to fetch applications');
      }
      const data = await response.json();
      
      // Convert string dates to Date objects
      const applicationsWithDates = data.map((app: any) => ({
        ...app,
        appliedDate: new Date(app.appliedDate),
        lastUpdate: new Date(app.lastUpdate),
        interviewDate: app.interviewDate ? new Date(app.interviewDate) : undefined,
      }));
      
      setApplications(applicationsWithDates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching applications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateApplicationStatus = async (applicationId: string, newStatus: Application['status']) => {
    try {
      const response = await fetch(`/api/candidates/applications/${applicationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        throw new Error('Failed to update application');
      }
      // Update local state
      setApplications(prev => 
        prev.map(app => 
          app.id === applicationId ? { ...app, status: newStatus, lastUpdate: new Date() } : app
        )
      );
    } catch (err) {
      console.error('Error updating application:', err);
    }
  };

  const withdrawApplication = async (applicationId: string) => {
    await updateApplicationStatus(applicationId, 'withdrawn');
  };

  // Filter and sort applications
  useEffect(() => {
    let filtered = applications.filter((app) => {
      const matchesSearch = 
        app.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.location.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || app.status === statusFilter;
      const matchesJobType = jobTypeFilter === "all" || app.jobType === jobTypeFilter;
      
      return matchesSearch && matchesStatus && matchesJobType;
    });

    // Sort applications
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "appliedDate":
          return b.appliedDate.getTime() - a.appliedDate.getTime();
        case "lastUpdate":
          return b.lastUpdate.getTime() - a.lastUpdate.getTime();
        case "companyName":
          return a.companyName.localeCompare(b.companyName);
        case "jobTitle":
          return a.jobTitle.localeCompare(b.jobTitle);
        default:
          return 0;
      }
    });

    setFilteredApplications(filtered);
  }, [applications, searchTerm, statusFilter, jobTypeFilter, sortBy]);

  const getStatusCounts = () => {
    const counts = {
      all: applications.length,
      applied: 0,
      under_review: 0,
      interview_scheduled: 0,
      interview_completed: 0,
      offer: 0,
      rejected: 0,
      withdrawn: 0,
    };

    applications.forEach((app) => {
      counts[app.status]++;
    });

    return counts;
  };

  const statusCounts = getStatusCounts();

  const ApplicationCard = ({ application }: { application: Application }) => {
    const statusInfo = statusConfig[application.status];
    const StatusIcon = statusInfo.icon;

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                {application.companyLogo ? (
                  <img
                    src={application.companyLogo}
                    alt={application.companyName}
                    className="w-8 h-8 rounded"
                  />
                ) : (
                  <Building2 className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg text-gray-900 truncate">
                  {application.jobTitle}
                </h3>
                <p className="text-gray-600 font-medium">{application.companyName}</p>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  <MapPin className="w-4 h-4 mr-1" />
                  {application.location}
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
                <DropdownMenuItem>
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Contact Recruiter
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FileText className="w-4 h-4 mr-2" />
                  View Job Description
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="flex items-center justify-between mb-3">
            <Badge className={statusInfo.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusInfo.label}
            </Badge>
            <Badge variant="outline">
              <Briefcase className="w-3 h-3 mr-1" />
              {application.jobType.replace("-", " ")}
            </Badge>
          </div>
          
          {application.salary && (
            <p className="text-sm font-medium text-green-600 mb-2">
              {application.salary}
            </p>
          )}
          
          <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
            <span>Applied: {format(application.appliedDate, "MMM d, yyyy")}</span>
            <span>Updated: {format(application.lastUpdate, "MMM d, yyyy")}</span>
          </div>
          
          {application.interviewDate && (
            <div className="flex items-center text-sm text-purple-600 mb-2">
              <Calendar className="w-4 h-4 mr-1" />
              Interview: {format(application.interviewDate, "MMM d, yyyy 'at' h:mm a")}
            </div>
          )}
          
          {application.notes && (
            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
              {application.notes}
            </p>
          )}
          
          <div className="flex space-x-2 mt-4">
            <Button size="sm" variant="outline" className="flex-1">
              <Eye className="w-4 h-4 mr-1" />
              View Details
            </Button>
            {application.status === "interview_scheduled" && (
              <Button size="sm" className="flex-1">
                <Calendar className="w-4 h-4 mr-1" />
                Prepare
              </Button>
            )}
            {application.status === "offer" && (
              <Button size="sm" className="flex-1">
                <CheckCircle className="w-4 h-4 mr-1" />
                Respond
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Applications</h1>
        <p className="text-gray-600 mt-1">
          Track and manage your job applications
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Applications</p>
                <p className="text-2xl font-bold text-gray-900">{statusCounts.all}</p>
              </div>
              <Briefcase className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Under Review</p>
                <p className="text-2xl font-bold text-yellow-600">{statusCounts.under_review}</p>
              </div>
              <Eye className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Interviews</p>
                <p className="text-2xl font-bold text-purple-600">
                  {statusCounts.interview_scheduled + statusCounts.interview_completed}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Offers</p>
                <p className="text-2xl font-bold text-green-600">{statusCounts.offer}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search jobs, companies, or locations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={jobTypeFilter} onValueChange={setJobTypeFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Job Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="full-time">Full-time</SelectItem>
                  <SelectItem value="part-time">Part-time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="appliedDate">Applied Date</SelectItem>
                  <SelectItem value="lastUpdate">Last Update</SelectItem>
                  <SelectItem value="companyName">Company</SelectItem>
                  <SelectItem value="jobTitle">Job Title</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications List */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-8">
          <TabsTrigger value="all">All ({statusCounts.all})</TabsTrigger>
          <TabsTrigger value="applied">Applied ({statusCounts.applied})</TabsTrigger>
          <TabsTrigger value="under_review">Review ({statusCounts.under_review})</TabsTrigger>
          <TabsTrigger value="interview_scheduled">Interview ({statusCounts.interview_scheduled})</TabsTrigger>
          <TabsTrigger value="interview_completed">Completed ({statusCounts.interview_completed})</TabsTrigger>
          <TabsTrigger value="offer">Offers ({statusCounts.offer})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({statusCounts.rejected})</TabsTrigger>
          <TabsTrigger value="withdrawn">Withdrawn ({statusCounts.withdrawn})</TabsTrigger>
        </TabsList>
        
        <TabsContent value={statusFilter} className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : filteredApplications.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No applications found
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || statusFilter !== "all" || jobTypeFilter !== "all"
                    ? "Try adjusting your filters or search terms."
                    : "You haven't applied to any jobs yet."}
                </p>
                <Button>
                  <Search className="w-4 h-4 mr-2" />
                  Browse Jobs
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredApplications.map((application) => (
                <ApplicationCard key={application.id} application={application} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}