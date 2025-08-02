'use client';

import { motion } from "framer-motion";
import { apiClient } from '@/lib/api-client';
import {
  Users,
  Target,
  BarChart3,
  Calendar,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Zap,
  Briefcase,
  Plus,
  ArrowRight,
  BookOpen,
  MessageSquare,
  MessageCircle,
  Settings,
  Upload,
  Download,
  Eye,
  Edit,
  Clock,
  CheckCircle,
  XCircle,
  Star,
  FileText,
  Activity,
  PieChart,
  LineChart,
  BarChart,
  Filter,
  MoreHorizontal,
  ExternalLink,
  UserPlus,
  CalendarPlus,
  RefreshCw,
  Link2,
  Code,
  Cpu,
  CheckSquare,
  Crown,
  User,
  Bell,
  Shield,
  HelpCircle
} from "lucide-react";
import AddNewInterview from "./AddNewInterview";
import InterviewList from "./InterviewList";

import CodingInterviewList from "./CodingInterviewList";
import DirectInterviewFlow from "./DirectInterviewFlow";
import AnalyticsSection from "./AnalyticsSection";
import SubscriptionStatus from "./SubscriptionStatus";
import Link from "next/link";
import { Button } from "@/components/ui/shared/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/shared/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/shared/tabs";
import { Badge } from "@/components/ui/shared/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/shared/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/shared/separator";
import { useState, useEffect } from "react";
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

interface DashboardClientProps {
  session: any;
  stats: {
    totalInterviews: number;
    completionRate: number;
    totalSessions: number;
    upcomingInterviews: number;
    pendingFeedback: number;
    totalCandidates: number;
    totalJobCampaigns: number;
    activeJobs: number;
    hiredCandidates: number;
  };
  interviews: any[];
  codingInterviews: any[];
  jobCampaigns: any[];
  candidates: any[];
  recentActivity: any[];
  chartData: {
    interviewTrends: any[];
    candidateStatus: any[];
    conversionRates: any[];
    usageStats: any[];
  };
  subscription: {
    plan: string;
    status: string;
    candidates: number;
    maxCandidates: number;
    expiryDate: Date;
  };
}

const DashboardStats = ({ stats }: { stats: DashboardClientProps['stats'] }) => {
  const statCards = [
    {
      title: "Total Interviews",
      value: stats.totalInterviews,
      icon: MessageSquare,
      bgColor: "bg-emerald-50",
      iconColor: "text-emerald-600",
      borderColor: "border-emerald-200",
      trend: stats.totalInterviews > 0 ? `+${Math.round((stats.totalInterviews / 10) * 100)}%` : "+0%",
      trendUp: stats.totalInterviews > 0
    },
    {
      title: "Active Jobs",
      value: stats.activeJobs,
      icon: Briefcase,
      bgColor: "bg-gray-50",
      iconColor: "text-gray-600",
      borderColor: "border-gray-200",
      trend: `${stats.totalJobCampaigns} total`,
      trendUp: null
    },
    {
      title: "Total Candidates",
      value: stats.totalCandidates,
      icon: Users,
      bgColor: "bg-gray-50",
      iconColor: "text-gray-600",
      borderColor: "border-gray-200",
      trend: `${stats.hiredCandidates} hired`,
      trendUp: null
    },
    {
      title: "Completion Rate",
      value: `${stats.completionRate}%`,
      icon: Target,
      bgColor: "bg-gray-50",
      iconColor: "text-gray-600",
      borderColor: "border-gray-200",
      trend: stats.completionRate > 50 ? `+${Math.round(stats.completionRate / 10)}%` : "+0%",
      trendUp: stats.completionRate > 50
    },
    {
      title: "Upcoming",
      value: stats.upcomingInterviews,
      icon: Calendar,
      bgColor: "bg-gray-50",
      iconColor: "text-gray-600",
      borderColor: "border-gray-200",
      trend: `${stats.pendingFeedback} pending`,
      trendUp: null
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 mb-8">
      {statCards.map((card, index) => {
        const IconComponent = card.icon;
        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ y: -2 }}
            className={`bg-white rounded-xl border ${card.borderColor} p-6 shadow-sm hover:shadow-md transition-all duration-200 group cursor-pointer`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 ${card.bgColor} rounded-lg shrink-0 group-hover:scale-105 transition-transform duration-200`}>
                <IconComponent className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              {card.trend && (
                <div className={`flex items-center gap-1 text-xs font-medium ${
                  card.trendUp === true ? 'text-green-600' : 
                  card.trendUp === false ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {card.trendUp === true && <TrendingUp className="w-3 h-3" />}
                  {card.trendUp === false && <TrendingDown className="w-3 h-3" />}
                  <span>{card.trend}</span>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900">
                {card.value}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

// Chart color schemes - Clean green theme
const CHART_COLORS = ['#10B981', '#6B7280', '#D1D5DB', '#9CA3AF', '#F3F4F6', '#E5E7EB'];
const PRIMARY_GREEN = '#10B981';
const SECONDARY_GRAY = '#6B7280';

// Chart Components
const InterviewTrendsChart = ({ data }: { data: any[] }) => (
  <ResponsiveContainer width="100%" height={300}>
    <RechartsLineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
      <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
      <YAxis stroke="#6b7280" fontSize={12} />
      <Tooltip 
        contentStyle={{ 
          backgroundColor: 'white', 
          border: '1px solid #e5e7eb', 
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }} 
      />
      <Line type="monotone" dataKey="interviews" stroke="#3B82F6" strokeWidth={3} dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }} />
      <Line type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }} />
    </RechartsLineChart>
  </ResponsiveContainer>
);

const CandidateStatusChart = ({ data }: { data: any[] }) => (
  <ResponsiveContainer width="100%" height={300}>
    <RechartsPieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        innerRadius={60}
        outerRadius={120}
        paddingAngle={5}
        dataKey="value"
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
        ))}
      </Pie>
      <Tooltip />
    </RechartsPieChart>
  </ResponsiveContainer>
);

const ConversionRatesChart = ({ data }: { data: any[] }) => (
  <ResponsiveContainer width="100%" height={300}>
    <RechartsBarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
      <XAxis dataKey="stage" stroke="#6b7280" fontSize={12} />
      <YAxis stroke="#6b7280" fontSize={12} />
      <Tooltip 
        contentStyle={{ 
          backgroundColor: 'white', 
          border: '1px solid #e5e7eb', 
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }} 
      />
      <Bar dataKey="rate" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
    </RechartsBarChart>
  </ResponsiveContainer>
);

export default function DashboardClient({ 
  session, 
  stats, 
  interviews = [], 
  codingInterviews = [],
  jobCampaigns = [],
  candidates = [],
  recentActivity = [],
  chartData = {
    interviewTrends: [],
    candidateStatus: [],
    conversionRates: [],
    usageStats: []
  },
  subscription
}: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState('overview');
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Welcome Header */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-8"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <Zap className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                Welcome back, {session?.user?.name || 'User'}! 👋
              </h1>
              <p className="text-gray-600">
                Here's your recruitment dashboard overview.
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              <p className="text-xs text-gray-500">
                {new Date().toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Section */}
      <motion.div variants={itemVariants}>
        <DashboardStats stats={stats} />
      </motion.div>

      {/* Main Dashboard Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="bg-white rounded-xl border border-gray-200 p-1 mb-6 overflow-x-auto">
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 gap-1 bg-transparent">
              <TabsTrigger 
                value="overview" 
                className="flex items-center gap-2 data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:border-green-200 border border-transparent rounded-lg px-3 py-2 text-sm font-medium transition-all"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger 
                value="jobs" 
                className="flex items-center gap-2 data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:border-green-200 border border-transparent rounded-lg px-3 py-2 text-sm font-medium transition-all"
              >
                <Briefcase className="w-4 h-4" />
                <span className="hidden sm:inline">Jobs</span>
              </TabsTrigger>
              <TabsTrigger 
                value="candidates" 
                className="flex items-center gap-2 data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:border-green-200 border border-transparent rounded-lg px-3 py-2 text-sm font-medium transition-all"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Candidates</span>
              </TabsTrigger>
              <TabsTrigger 
                value="interviews" 
                className="flex items-center gap-2 data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:border-green-200 border border-transparent rounded-lg px-3 py-2 text-sm font-medium transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Interviews</span>
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="flex items-center gap-2 data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:border-green-200 border border-transparent rounded-lg px-3 py-2 text-sm font-medium transition-all"
              >
                <Activity className="w-4 h-4" />
                <span className="hidden sm:inline">Analytics</span>
              </TabsTrigger>
              <TabsTrigger 
                value="settings" 
                className="flex items-center gap-2 data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:border-green-200 border border-transparent rounded-lg px-3 py-2 text-sm font-medium transition-all"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="w-5 h-5 text-blue-600" />
                    Interview Trends
                  </CardTitle>
                  <CardDescription>Monthly interview activity and completion rates</CardDescription>
                </CardHeader>
                <CardContent>
                  <InterviewTrendsChart data={chartData.interviewTrends} />
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-green-600" />
                    Candidate Status
                  </CardTitle>
                  <CardDescription>Distribution of candidates by status</CardDescription>
                </CardHeader>
                <CardContent>
                  <CandidateStatusChart data={chartData.candidateStatus} />
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Link href="/dashboard/job-campaign">
                    <div className="group cursor-pointer">
                      <div className="bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl p-6 h-20 flex flex-col items-center justify-center gap-2 transition-all duration-200 group-hover:shadow-md">
                        <Plus className="w-6 h-6 text-green-600" />
                        <span className="text-sm font-medium text-green-700">Add Job</span>
                      </div>
                    </div>
                  </Link>
                  <Link href="/dashboard/candidates">
                    <div className="group cursor-pointer">
                      <div className="bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl p-6 h-20 flex flex-col items-center justify-center gap-2 transition-all duration-200 group-hover:shadow-md">
                        <UserPlus className="w-6 h-6 text-blue-600" />
                        <span className="text-sm font-medium text-blue-700">Add Candidate</span>
                      </div>
                    </div>
                  </Link>
                  <div className="group cursor-pointer">
                    <div className="bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl p-6 h-20 flex flex-col items-center justify-center gap-2 transition-all duration-200 group-hover:shadow-md">
                      <MessageSquare className="w-6 h-6 text-purple-600" />
                      <span className="text-sm font-medium text-purple-700">Start Interview</span>
                    </div>
                  </div>
                  <Link href="/dashboard/question-bank">
                    <div className="group cursor-pointer">
                      <div className="bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl p-6 h-20 flex flex-col items-center justify-center gap-2 transition-all duration-200 group-hover:shadow-md">
                        <BookOpen className="w-6 h-6 text-orange-600" />
                        <span className="text-sm font-medium text-orange-700">Question Bank</span>
                      </div>
                    </div>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest updates and actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.length > 0 ? (
                    recentActivity.slice(0, 5).map((activity, index) => (
                      <div key={index} className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-100 transition-colors">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Activity className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                          <p className="text-xs text-gray-500">{new Date(activity.timestamp).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <Activity className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="font-medium">No recent activity</p>
                      <p className="text-sm text-gray-400 mt-1">Your activity will appear here</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Job Management</h2>
                  <p className="text-gray-600 mt-1">Create and manage job postings</p>
                </div>
                <Link href="/dashboard/job-campaign">
                  <Button className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 px-6 py-2 rounded-lg transition-colors">
                    <Plus className="w-4 h-4" />
                    Add New Job
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Job Stats */}
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-gray-900">Job Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Active Jobs</span>
                      <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">{stats.activeJobs}</div>
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Total Campaigns</span>
                      <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">{stats.totalJobCampaigns}</div>
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Hired Candidates</span>
                      <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold">{stats.hiredCandidates}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Jobs */}
              <Card className="lg:col-span-2 bg-white border border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-gray-900">Recent Job Postings</CardTitle>
                  <CardDescription className="text-gray-600">Latest job campaigns and their status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {jobCampaigns.length > 0 ? (
                      jobCampaigns.slice(0, 5).map((job, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                              <Briefcase className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{job.title}</h4>
                              <p className="text-sm text-gray-600">{job.department} • {job.location}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                              job.status === 'active' 
                                ? 'bg-green-100 text-green-700 border border-green-200' 
                                : 'bg-gray-100 text-gray-700 border border-gray-200'
                            }`}>
                              {job.status}
                            </div>
                            <Button variant="ghost" size="sm" className="hover:bg-gray-200">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <Briefcase className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="font-medium mb-2">No job postings yet</p>
                        <p className="text-sm text-gray-400 mb-4">Create your first job posting to get started</p>
                        <Link href="/dashboard/job-campaign">
                          <Button className="bg-green-600 hover:bg-green-700 text-white">
                            Create First Job
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Job Actions */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900">Job Management Actions</CardTitle>
                <CardDescription className="text-gray-600">Quick actions for job management</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Link href="/dashboard/job-campaign">
                    <div className="group cursor-pointer">
                      <div className="bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl p-6 h-20 flex flex-col items-center justify-center gap-2 transition-all duration-200 group-hover:shadow-md">
                        <Plus className="w-6 h-6 text-green-600" />
                        <span className="text-sm font-medium text-green-700">Create Job Posting</span>
                      </div>
                    </div>
                  </Link>
                  {/* Portal Sync removed - functionality deprecated */}
                  <Link href="/dashboard/job-campaign/templates">
                    <div className="group cursor-pointer">
                      <div className="bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl p-6 h-20 flex flex-col items-center justify-center gap-2 transition-all duration-200 group-hover:shadow-md">
                        <FileText className="w-6 h-6 text-blue-600" />
                        <span className="text-sm font-medium text-blue-700">Job Templates</span>
                      </div>
                    </div>
                  </Link>
                  <div className="group cursor-pointer">
                    <div className="bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl p-6 h-20 flex flex-col items-center justify-center gap-2 transition-all duration-200 group-hover:shadow-md">
                      <BarChart3 className="w-6 h-6 text-purple-600" />
                      <span className="text-sm font-medium text-purple-700">Job Analytics</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Candidates Tab */}
          <TabsContent value="candidates" className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Candidate Management</h2>
                  <p className="text-gray-600 mt-1">Manage and track candidates</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button variant="outline" className="border-gray-300 hover:bg-gray-50 flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Upload CSV
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Add Candidate
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Candidate Stats */}
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-gray-900">Candidate Pipeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Applied</span>
                        <span className="text-lg font-bold text-blue-600">45</span>
                      </div>
                      <Progress value={75} className="h-2 bg-blue-100" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Screening</span>
                        <span className="text-lg font-bold text-yellow-600">25</span>
                      </div>
                      <Progress value={50} className="h-2 bg-yellow-100" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Interview</span>
                        <span className="text-lg font-bold text-purple-600">20</span>
                      </div>
                      <Progress value={40} className="h-2 bg-purple-100" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Hired</span>
                        <span className="text-lg font-bold text-green-600">8</span>
                      </div>
                      <Progress value={20} className="h-2 bg-green-100" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Candidates */}
              <Card className="lg:col-span-3 bg-white border border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-gray-900">Recent Candidates</CardTitle>
                  <CardDescription className="text-gray-600">Latest candidate applications</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {candidates.length > 0 ? (
                      candidates.slice(0, 5).map((candidate, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors">
                          <div className="flex items-center gap-4">
                            <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
                              <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">{candidate.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-semibold text-gray-900">{candidate.name}</h4>
                              <p className="text-sm text-gray-600">{candidate.email} • {candidate.position}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                              candidate.status === 'hired' 
                                ? 'bg-green-100 text-green-700 border border-green-200' 
                                : candidate.status === 'interview'
                                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                : 'bg-gray-100 text-gray-700 border border-gray-200'
                            }`}>
                              {candidate.status}
                            </div>
                            <Button variant="ghost" size="sm" className="hover:bg-gray-200">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <Users className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="font-medium mb-2">No candidates yet</p>
                        <p className="text-sm text-gray-400 mb-4">Add your first candidate to get started</p>
                        <Button className="bg-green-600 hover:bg-green-700 text-white">
                          Add First Candidate
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Candidate Actions */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900">Candidate Management Actions</CardTitle>
                <CardDescription className="text-gray-600">Bulk actions and candidate management tools</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="group cursor-pointer">
                    <div className="bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl p-6 h-20 flex flex-col items-center justify-center gap-2 transition-all duration-200 group-hover:shadow-md">
                      <Upload className="w-6 h-6 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700">Bulk Upload</span>
                    </div>
                  </div>
                  {/* Portal Sync removed - functionality deprecated */}
                  <div className="group cursor-pointer">
                    <div className="bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl p-6 h-20 flex flex-col items-center justify-center gap-2 transition-all duration-200 group-hover:shadow-md">
                      <RefreshCw className="w-6 h-6 text-green-600" />
                      <span className="text-sm font-medium text-green-700">Refresh Data</span>
                    </div>
                  </div>
                  <div className="group cursor-pointer">
                    <div className="bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl p-6 h-20 flex flex-col items-center justify-center gap-2 transition-all duration-200 group-hover:shadow-md">
                      <Link2 className="w-6 h-6 text-purple-600" />
                      <span className="text-sm font-medium text-purple-700">Link Interviews</span>
                    </div>
                  </div>
                  <div className="group cursor-pointer">
                    <div className="bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl p-6 h-20 flex flex-col items-center justify-center gap-2 transition-all duration-200 group-hover:shadow-md">
                      <Download className="w-6 h-6 text-orange-600" />
                      <span className="text-sm font-medium text-orange-700">Export Data</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Interviews Tab */}
          <TabsContent value="interviews" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Interview Management</h2>
                <p className="text-gray-600">Schedule and manage interviews</p>
              </div>
              <DirectInterviewFlow />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Interview Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Interview Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Interviews</span>
                    <Badge variant="secondary">{stats.totalInterviews}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Completed</span>
                    <Badge variant="default">{Math.round(stats.completionRate)}%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Upcoming</span>
                    <Badge variant="outline">{stats.upcomingInterviews}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pending Feedback</span>
                    <Badge variant="destructive">{stats.pendingFeedback}</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Interviews */}
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle>Recent Interviews</CardTitle>
                  <CardDescription>Latest scheduled and completed interviews</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(interviews && interviews.length > 0) || (codingInterviews && codingInterviews.length > 0) ? (
                      <div className="space-y-4">
                        {interviews && <InterviewList />}
                        {codingInterviews && <CodingInterviewList />}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No interviews scheduled yet</p>
                        <DirectInterviewFlow />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Interview Types */}
            <Card>
              <CardHeader>
                <CardTitle>Interview Types</CardTitle>
                <CardDescription>Create different types of interviews</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Button variant="outline" className="w-full h-16 flex flex-col gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Behavioral
                  </Button>
                  <Button variant="outline" className="w-full h-16 flex flex-col gap-2">
                    <Code className="w-5 h-5" />
                    Coding
                  </Button>
                  <Button variant="outline" className="w-full h-16 flex flex-col gap-2">
                    <Cpu className="w-5 h-5" />
                    Technical
                  </Button>
                  <Button variant="outline" className="w-full h-16 flex flex-col gap-2">
                    <CheckSquare className="w-5 h-5" />
                    Multiple Choice
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Analytics & Reports</h2>
                <p className="text-gray-600">Track performance and generate insights</p>
              </div>
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export Report
              </Button>
            </div>

            {/* Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    Conversion Rates
                  </CardTitle>
                  <CardDescription>Application to hire conversion funnel</CardDescription>
                </CardHeader>
                <CardContent>
                  <ConversionRatesChart data={chartData.conversionRates.length > 0 ? chartData.conversionRates : [

                  ]} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-green-600" />
                    Usage Statistics
                  </CardTitle>
                  <CardDescription>Platform usage and activity metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {chartData.usageStats.length > 0 ? (
                      chartData.usageStats.map((stat, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{stat.metric}</span>
                            <span className="font-medium">{stat.value}</span>
                          </div>
                          <Progress value={stat.percentage} className="h-2" />
                        </div>
                      ))
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Interviews Created</span>
                            <span className="font-medium">24</span>
                          </div>
                          <Progress value={80} className="h-2" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Candidates Processed</span>
                            <span className="font-medium">156</span>
                          </div>
                          <Progress value={65} className="h-2" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Jobs Posted</span>
                            <span className="font-medium">8</span>
                          </div>
                          <Progress value={40} className="h-2" />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Analytics Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Analytics Tools</CardTitle>
                <CardDescription>Generate reports and insights</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button variant="outline" className="w-full h-16 flex flex-col gap-2">
                    <FileText className="w-5 h-5" />
                    Generate Report
                  </Button>
                  <Button variant="outline" className="w-full h-16 flex flex-col gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Performance Metrics
                  </Button>
                  <Button variant="outline" className="w-full h-16 flex flex-col gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Custom Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Subscription & Settings</h2>
                <p className="text-gray-600">Manage your plan and company settings</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Current Plan */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-600" />
                    Current Plan
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{subscription.plan}</h3>
                    <p className="text-sm text-gray-600">Status: {subscription.status}</p>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Interviews Used</span>
                      <span>{stats.totalInterviews}/100</span>
                    </div>
                    <Progress value={(stats.totalInterviews / 100) * 100} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Candidates</span>
                      <span>{subscription.candidates}/{subscription.maxCandidates}</span>
                    </div>
                    <Progress value={(subscription.candidates / subscription.maxCandidates) * 100} className="h-2" />
                  </div>
                  <Button className="w-full">
                    <Crown className="w-4 h-4 mr-2" />
                    Upgrade Plan
                  </Button>
                </CardContent>
              </Card>

              {/* Company Settings */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Company Profile</CardTitle>
                  <CardDescription>Manage your company information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Company Name</label>
                      <input 
                        type="text" 
                        className="w-full p-2 border rounded-lg" 
                        placeholder="Your Company Name"
                        defaultValue={session?.user?.name || ''}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Industry</label>
                      <select className="w-full p-2 border rounded-lg">
                        <option>Technology</option>
                        <option>Healthcare</option>
                        <option>Finance</option>
                        <option>Education</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Company Size</label>
                      <select className="w-full p-2 border rounded-lg">
                        <option>1-10 employees</option>
                        <option>11-50 employees</option>
                        <option>51-200 employees</option>
                        <option>201-1000 employees</option>
                        <option>1000+ employees</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Location</label>
                      <input 
                        type="text" 
                        className="w-full p-2 border rounded-lg" 
                        placeholder="City, Country"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button>Save Changes</Button>
                    <Button variant="outline">Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Settings Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Account Management</CardTitle>
                <CardDescription>Manage your account and preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Button variant="outline" className="w-full h-16 flex flex-col gap-2">
                    <User className="w-5 h-5" />
                    Profile Settings
                  </Button>
                  <Button variant="outline" className="w-full h-16 flex flex-col gap-2">
                    <Bell className="w-5 h-5" />
                    Notifications
                  </Button>
                  <Button variant="outline" className="w-full h-16 flex flex-col gap-2">
                    <Shield className="w-5 h-5" />
                    Security
                  </Button>
                  <Button variant="outline" className="w-full h-16 flex flex-col gap-2">
                    <HelpCircle className="w-5 h-5" />
                    Support
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}