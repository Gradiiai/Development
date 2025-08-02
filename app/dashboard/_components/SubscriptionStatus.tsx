'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Crown,
  Star,
  Gift,
  CreditCard,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  TrendingUp,
  Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Button } from '@/components/ui/shared/button';
import { Badge } from '@/components/ui/shared/badge';
import { Progress } from '@/components/ui/progress';
import { getPlanConfig, getPlanIcon } from '@/lib/plan-config';

interface SubscriptionData {
  subscriptionPlan: string;
  subscriptionStatus: string;
  monthlyRevenue: number;
  yearlyRevenue: number;
  maxUsers: number;
  maxInterviews: number;
  subscriptionStartDate: string;
  subscriptionEndDate: string;
  currentUsers: number;
  currentInterviews: number;
}

interface SubscriptionStatusProps {
  userEmail: string;
}



const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'past_due':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function SubscriptionStatus({ userEmail }: SubscriptionStatusProps) {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptionData();
  }, [userEmail]);

  const fetchSubscriptionData = async () => {
    try {
      const response = await fetch('/api/user/subscription');
      const data = await response.json();
      setSubscriptionData(data);
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="dashboard-card">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscriptionData) {
    return (
      <Card className="dashboard-card">
        <CardContent className="p-6">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Subscription Data</h3>
            <p className="text-gray-600">Unable to load subscription information.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const {
    subscriptionPlan,
    subscriptionStatus,
    monthlyRevenue,
    maxUsers,
    maxInterviews,
    subscriptionEndDate,
    currentUsers = 0,
    currentInterviews = 0
  } = subscriptionData;

  const userUsagePercentage = maxUsers > 0 ? (currentUsers / maxUsers) * 100 : 0;
  const interviewUsagePercentage = maxInterviews > 0 ? (currentInterviews / maxInterviews) * 100 : 0;
  const isUnlimited = maxUsers === -1 || maxInterviews === -1;

  const daysUntilExpiry = subscriptionEndDate 
    ? Math.ceil((new Date(subscriptionEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Main Subscription Card */}
      <Card className="dashboard-card overflow-hidden">
        <CardHeader className={`bg-gradient-to-r ${getPlanConfig(subscriptionPlan).gradient} text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getPlanIcon(subscriptionPlan)}
              <div>
                <CardTitle className="text-xl font-bold capitalize">
                  {subscriptionPlan} Plan
                </CardTitle>
                <p className="text-white/80 text-sm">
                  ${monthlyRevenue}/month
                </p>
              </div>
            </div>
            <Badge className={getStatusColor(subscriptionStatus)}>
              {subscriptionStatus === 'active' && <CheckCircle className="w-3 h-3 mr-1" />}
              {subscriptionStatus === 'past_due' && <Clock className="w-3 h-3 mr-1" />}
              {subscriptionStatus === 'cancelled' && <AlertTriangle className="w-3 h-3 mr-1" />}
              {subscriptionStatus?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Usage Limits */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4" />
                User Limits
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Users</span>
                  <span className="font-medium">
                    {currentUsers} / {maxUsers === -1 ? '∞' : maxUsers}
                  </span>
                </div>
                {!isUnlimited && (
                  <Progress value={userUsagePercentage} className="h-2" />
                )}
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Interviews</span>
                  <span className="font-medium">
                    {currentInterviews} / {maxInterviews === -1 ? '∞' : maxInterviews}
                  </span>
                </div>
                {!isUnlimited && (
                  <Progress value={interviewUsagePercentage} className="h-2" />
                )}
              </div>
            </div>

            {/* Subscription Details */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Subscription Details
              </h4>
              <div className="space-y-3">
                {daysUntilExpiry && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Days Remaining</span>
                    <span className={`font-medium ${
                      daysUntilExpiry < 7 ? 'text-red-600' : 
                      daysUntilExpiry < 30 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {daysUntilExpiry} days
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Renewal Date</span>
                  <span className="font-medium">
                    {subscriptionEndDate 
                      ? new Date(subscriptionEndDate).toLocaleDateString()
                      : 'N/A'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
            <Button className="button-primary flex-1">
              <TrendingUp className="w-4 h-4 mr-2" />
              Upgrade Plan
            </Button>
            <Button className="button-secondary flex-1">
              <Settings className="w-4 h-4 mr-2" />
              Manage Subscription
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage Alerts */}
      {(userUsagePercentage > 80 || interviewUsagePercentage > 80) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800">Usage Alert</h4>
              <p className="text-sm text-yellow-700 mt-1">
                You're approaching your plan limits. Consider upgrading to avoid service interruption.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}