"use client";

import { motion } from "framer-motion";
import { apiClient } from "@/lib/api-client";
import {
  Users,
  Target,
  Calendar,
  Briefcase,
  Plus,
  BookOpen,
  MessageSquare,
  UserPlus,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/shared/card";

// Interface for dashboard props
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

// Component to display key dashboard statistics
const DashboardStats = ({ stats }: { stats: DashboardClientProps["stats"] }) => {
  const statCards = [
    {
      title: "Total Interviews",
      value: stats.totalInterviews,
      icon: MessageSquare,
      bgColor: "bg-emerald-50",
      iconColor: "text-emerald-600",
      borderColor: "border-emerald-200",
      trend: stats.totalInterviews > 0 ? `+${Math.round((stats.totalInterviews / 10) * 100)}%` : "+0%",
      trendUp: stats.totalInterviews > 0,
    },
    {
      title: "Active Jobs",
      value: stats.activeJobs,
      icon: Briefcase,
      bgColor: "bg-gray-50",
      iconColor: "text-gray-600",
      borderColor: "border-gray-200",
      trend: `${stats.totalJobCampaigns} total`,
      trendUp: null,
    },
    {
      title: "Total Candidates",
      value: stats.totalCandidates,
      icon: Users,
      bgColor: "bg-gray-50",
      iconColor: "text-gray-600",
      borderColor: "border-gray-200",
      trend: `${stats.hiredCandidates} hired`,
      trendUp: null,
    },
    {
      title: "Completion Rate",
      value: `${stats.completionRate}%`,
      icon: Target,
      bgColor: "bg-gray-50",
      iconColor: "text-gray-600",
      borderColor: "border-gray-200",
      trend: stats.completionRate > 50 ? `+${Math.round(stats.completionRate / 10)}%` : "+0%",
      trendUp: stats.completionRate > 50,
    },
    {
      title: "Upcoming",
      value: stats.upcomingInterviews,
      icon: Calendar,
      bgColor: "bg-gray-50",
      iconColor: "text-gray-600",
      borderColor: "border-gray-200",
      trend: `${stats.pendingFeedback} pending`,
      trendUp: null,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 mb-8">
      {statCards.map((card, index) => {
        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ y: -2 }}
            className="bg-white rounded-xl p-6 shadow-sm border-[1px] border-gray-200 transition-all duration-200 group cursor-pointer"
          >
            <div className="space-y-1 text-center">
              <p className="text-2xl font-medium text-gray-900">{card.value}</p>
              <p className="text-sm font-medium text-gray-600">{card.title}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

// Main dashboard component
export default function DashboardClient({
  session,
  stats,
  interviews = [],
  codingInterviews = [],
  jobCampaigns = [],
  candidates = [],
  recentActivity = [],
  subscription,
}: DashboardClientProps) {
  // Animation variants for container
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
  };

  // Animation variants for items
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Welcome header section */}
      <motion.div variants={itemVariants} className="mb-5">
        <div className="flex items-center">
          <h1 className="text-3xl font-medium text-gray-900">
            Welcome, {session?.user?.name || "User"}
          </h1>
        </div>
      </motion.div>

      {/* Stats section */}
      <motion.div variants={itemVariants}>
        <DashboardStats stats={stats} />
      </motion.div>

      {/* Quick actions section */}
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="font-medium">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Link href="/dashboard/job-campaign">
              <div className="group cursor-pointer">
                <div className="bg-purple-200 rounded-lg p-4 flex flex-col items-center justify-center gap-2">
                  <span className="text-sm font-medium flex justify-center items-center gap-3">
                    <Plus className="w-4 h-4 text-purple-600" />
                    <p>Add Job</p>
                  </span>
                </div>
              </div>
            </Link>
            <Link href="/dashboard/candidates">
              <div className="group cursor-pointer">
                <div className="bg-purple-200 rounded-lg p-4 flex flex-col items-center justify-center gap-2">
                  <span className="text-sm font-medium flex justify-center items-center gap-3">
                    <UserPlus className="w-4 h-4 text-purple-600" />
                    <p>Add Candidate</p>
                  </span>
                </div>
              </div>
            </Link>
            <div className="group cursor-pointer">
              <div className="bg-purple-200 rounded-lg p-4 flex flex-col items-center justify-center gap-2">
                <span className="text-sm font-medium flex justify-center items-center gap-3">
                  <MessageSquare className="w-4 h-4 text-purple-600" />
                  <p>Start Interview</p>
                </span>
              </div>
            </div>
            <Link href="/dashboard/question-bank">
              <div className="group cursor-pointer">
                <div className="bg-purple-200 rounded-lg p-4 flex flex-col items-center justify-center gap-2">
                  <span className="text-sm font-medium flex justify-center items-center gap-3">
                    <BookOpen className="w-4 h-4 text-purple-600" />
                    <p>Question Bank</p>
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent activity section */}
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="font-medium">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.slice(0, 5).map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-100 transition-colors"
                >
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Activity className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.timestamp).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
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
    </motion.div>
  );
}