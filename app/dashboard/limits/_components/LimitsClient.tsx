'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Target, 
  BarChart3, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Code,
  User,
  Building2,
  CreditCard,
  Activity,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/shared/badge';
import { Button } from '@/components/ui/shared/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shared/tabs';
import { Separator } from '@/components/ui/shared/separator';
import { getPlanConfig } from '@/lib/plan-config';

interface LimitsData {
  user: {
    name: string;
    email: string;
    role: string;
    companyName: string;
  };
  subscription: {
    plan: string;
    status: string;
    monthlyRevenue: number;
    yearlyRevenue: number;
    startDate: string | null;
    endDate: string | null;
  };
  limits: {
    maxUsers: number;
    maxInterviews: number;
    currentUsers: number;
    currentInterviews: number;
    behavioralInterviews: number;
    codingInterviews: number;
  };
  recentActivity: {
    interviews: Array<{
      id: string;
      candidateName: string;
      position: string;
      status: string;
      createdAt: string;
      type: 'behavioral';
    }>;
    codingInterviews: Array<{
      id: string;
      candidateName: string;
      position: string;
      status: string;
      createdAt: string;
      difficulty: string;
      type: 'coding';
    }>;
  };
}

interface LimitsClientProps {
  data: LimitsData;
}

export default function LimitsClient({ data }: LimitsClientProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [limitsData, setLimitsData] = useState(data);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Simulate API call to refresh data
      await new Promise(resolve => setTimeout(resolve, 1000));
      // In a real app, you would fetch fresh data here
      window.location.reload();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getUsersProgress = () => {
    return Math.min((limitsData.limits.currentUsers / limitsData.limits.maxUsers) * 100, 100);
  };

  const getInterviewsProgress = () => {
    return Math.min((limitsData.limits.currentInterviews / limitsData.limits.maxInterviews) * 100, 100);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlanBadge = (plan: string) => {
    const config = getPlanConfig(plan);
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const allRecentActivity = [
    ...limitsData.recentActivity.interviews,
    ...limitsData.recentActivity.codingInterviews
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {limitsData.user.companyName} - Usage Overview
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Current subscription: {getPlanBadge(limitsData.subscription.plan)}
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Usage Limits Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                User Limit
              </CardTitle>
              <div className="text-2xl font-bold">
                {limitsData.limits.currentUsers}/{limitsData.limits.maxUsers}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Progress value={getUsersProgress()} className="h-2" />
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{getUsersProgress().toFixed(1)}% used</span>
                  <span>{limitsData.limits.maxUsers - limitsData.limits.currentUsers} remaining</span>
                </div>
                {getUsersProgress() > 80 && (
                  <div className="flex items-center gap-1 text-amber-600 text-xs">
                    <AlertTriangle className="h-3 w-3" />
                    Approaching user limit
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-green-600" />
                Interview Limit
              </CardTitle>
              <div className="text-2xl font-bold">
                {limitsData.limits.currentInterviews}/{limitsData.limits.maxInterviews}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Progress value={getInterviewsProgress()} className="h-2" />
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{getInterviewsProgress().toFixed(1)}% used</span>
                  <span>{limitsData.limits.maxInterviews - limitsData.limits.currentInterviews} remaining</span>
                </div>
                {getInterviewsProgress() > 80 && (
                  <div className="flex items-center gap-1 text-amber-600 text-xs">
                    <AlertTriangle className="h-3 w-3" />
                    Approaching interview limit
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4 text-teal-600" />
              Behavioral Interviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{limitsData.limits.behavioralInterviews}</div>
            <p className="text-xs text-gray-600">Total conducted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Code className="h-4 w-4 text-purple-600" />
              Coding Interviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{limitsData.limits.codingInterviews}</div>
            <p className="text-xs text-gray-600">Total conducted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              ${limitsData.subscription.monthlyRevenue}/mo
            </div>
            <p className="text-xs text-gray-600">
              ${limitsData.subscription.yearlyRevenue}/year
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Latest interviews and activities in your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All Activity</TabsTrigger>
              <TabsTrigger value="behavioral">Behavioral</TabsTrigger>
              <TabsTrigger value="coding">Coding</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {allRecentActivity.length > 0 ? (
                <div className="space-y-3">
                  {allRecentActivity.slice(0, 10).map((activity, index) => (
                    <motion.div
                      key={`${activity.type}-${activity.id}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {activity.type === 'behavioral' ? (
                          <User className="h-4 w-4 text-teal-600" />
                        ) : (
                          <Code className="h-4 w-4 text-purple-600" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{activity.candidateName}</p>
                          <p className="text-xs text-gray-600">
                            {activity.position} • {activity.type === 'coding' && 'difficulty' in activity ? activity.difficulty : 'Behavioral'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(activity.status)}>
                          {activity.status}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(activity.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent activity found</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="behavioral" className="space-y-4">
              {limitsData.recentActivity.interviews.length > 0 ? (
                <div className="space-y-3">
                  {limitsData.recentActivity.interviews.map((interview, index) => (
                    <motion.div
                      key={interview.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-teal-600" />
                        <div>
                          <p className="font-medium text-sm">{interview.candidateName}</p>
                          <p className="text-xs text-gray-600">{interview.position}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(interview.status)}>
                          {interview.status}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(interview.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No behavioral interviews found</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="coding" className="space-y-4">
              {limitsData.recentActivity.codingInterviews.length > 0 ? (
                <div className="space-y-3">
                  {limitsData.recentActivity.codingInterviews.map((interview, index) => (
                    <motion.div
                      key={interview.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Code className="h-4 w-4 text-purple-600" />
                        <div>
                          <p className="font-medium text-sm">{interview.candidateName}</p>
                          <p className="text-xs text-gray-600">
                            {interview.position} • {interview.difficulty}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(interview.status)}>
                          {interview.status}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(interview.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No coding interviews found</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Subscription Info */}
      {limitsData.subscription.startDate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Start Date</p>
                <p className="font-medium">
                  {new Date(limitsData.subscription.startDate).toLocaleDateString()}
                </p>
              </div>
              {limitsData.subscription.endDate && (
                <div>
                  <p className="text-sm text-gray-600">End Date</p>
                  <p className="font-medium">
                    {new Date(limitsData.subscription.endDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <Badge className={limitsData.subscription.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {limitsData.subscription.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}