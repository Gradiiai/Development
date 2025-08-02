'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Crown, Star, Gift, Search, Filter, Plus, MoreHorizontal, Calendar, DollarSign, TrendingUp, Users as UsersIcon, RefreshCw, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Button } from '@/components/ui/shared/button';
import { Badge } from '@/components/ui/shared/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/shared/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/shared/dropdown-menu';
import { SubscriptionModal } from '@/components/admin/SubscriptionModal';
import { getPlanConfig, getPlanIcon } from '@/lib/plan-config';

interface SubscriptionsClientProps {
  subscriptionData: any[];
}

export default function SubscriptionsClient({ subscriptionData }: SubscriptionsClientProps) {
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subscriptions, setSubscriptions] = useState(subscriptionData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchSubscriptions = async (showLoading = true) => {
    try {
      if (showLoading) setIsRefreshing(true);
      const response = await fetch('/api/admin/subscriptions');
      const data = await response.json();
      setSubscriptions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      if (showLoading) setIsRefreshing(false);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchSubscriptions(false); // Silent refresh
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleManualRefresh = () => {
    fetchSubscriptions(true);
  };

  const handleStripeSync = async () => {
    try {
      setIsSyncing(true);
      const response = await fetch('/api/admin/sync-stripe-plans', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to sync with Stripe');
      }
      
      const result = await response.json();
      console.log('Stripe sync result:', result);
      
      // Show success message
      const successCount = result.results?.filter((r: any) => r.status === 'success').length || 0;
      const errorCount = result.results?.filter((r: any) => r.status === 'error').length || 0;
      
      if (errorCount === 0) {
        alert(`Successfully synced ${successCount} plans with Stripe!`);
      } else {
        alert(`Synced ${successCount} plans successfully, ${errorCount} failed. Check console for details.`);
      }
      
      // Refresh subscriptions after sync
      fetchSubscriptions(true);
    } catch (error) {
      console.error('Error syncing with Stripe:', error);
      alert('Failed to sync with Stripe. Please check your Stripe configuration.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Calculate stats - ensure subscriptions is an array
  const totalSubscriptions = subscriptions.length;
  const activeSubscriptions = subscriptions.filter(s => s.subscriptionStatus === 'active').length;
  
  // Get plan counts dynamically from available plans
  const planCounts = {
    enterprise: subscriptions.filter(s => getPlanConfig(s.subscriptionPlan || 'free').name === 'enterprise').length,
    pro: subscriptions.filter(s => getPlanConfig(s.subscriptionPlan || 'free').name === 'pro').length,
    basic: subscriptions.filter(s => getPlanConfig(s.subscriptionPlan || 'free').name === 'basic').length,
    free: subscriptions.filter(s => getPlanConfig(s.subscriptionPlan || 'free').name === 'free').length,
  };

  const stats = [
    {
      title: 'Total Subscriptions',
      value: totalSubscriptions.toString(),
      icon: DollarSign,
      gradient: 'from-emerald-500 to-teal-500',
      bgGradient: 'from-emerald-50 to-teal-50',
    },
    {
      title: 'Active Subscriptions',
      value: activeSubscriptions.toString(),
      icon: CreditCard,
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50',
    },
    {
      title: 'Enterprise Plans',
      value: planCounts.enterprise.toString(),
      icon: Crown,
      gradient: getPlanConfig('enterprise').gradient,
      bgGradient: 'from-purple-50 to-indigo-50',
    },
    {
      title: 'Pro Plans',
      value: planCounts.pro.toString(),
      icon: TrendingUp,
      gradient: getPlanConfig('pro').gradient,
      bgGradient: 'from-orange-50 to-red-50',
    },
  ];

  // Generate plan stats dynamically from available plans
  const planStats = ['enterprise', 'pro', 'basic', 'free'].map(planName => {
    const config = getPlanConfig(planName);
    return {
      name: config.label,
      count: planCounts[planName as keyof typeof planCounts],
      color: config.gradient,
      bgColor: 'from-gray-50 to-slate-50', // Keep consistent background
      icon: getPlanIcon(planName),
    };
  });

  const getSubscriptionBadge = (plan: string | null, status: string | null) => {
    const config = getPlanConfig(plan || 'free');
    
    if (config.name === 'free') {
      return <Badge variant="outline">{config.label}</Badge>;
    } else {
      return <Badge className={`bg-gradient-to-r ${config.gradient} text-white`}>{config.label}</Badge>;
    }
  };

  const getStatusBadge = (status: string | null) => {
    if (status === 'active') {
      return <Badge className="bg-green-100 text-green-700">Active</Badge>;
    } else if (status === 'cancelled') {
      return <Badge className="bg-red-100 text-red-700">Cancelled</Badge>;
    } else if (status === 'past_due') {
      return <Badge className="bg-yellow-100 text-yellow-700">Past Due</Badge>;
    } else {
      return <Badge className="bg-gray-100 text-gray-700">Inactive</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 text-white"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/90 via-purple-600/90 to-pink-600/90"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <CreditCard className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Subscription Management</h1>
              <div className="flex items-center gap-4">
                <p className="text-indigo-100 text-lg">Monitor and manage all subscription plans</p>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                  <span className="text-xs text-indigo-200">
                    {autoRefresh ? 'Auto-refresh active' : 'Auto-refresh paused'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className="text-xs px-2 py-1 h-6 text-white hover:bg-white/20"
                  >
                    {autoRefresh ? 'Pause' : 'Resume'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={handleStripeSync}
              disabled={isSyncing}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
            >
              {isSyncing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              {isSyncing ? 'Syncing...' : 'Sync Stripe'}
            </Button>
            <Button 
              onClick={() => {
                setSelectedCompany(null);
                setIsModalOpen(true);
              }}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Plan
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Revenue Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className={`group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br ${stat.bgGradient} hover:scale-105 cursor-pointer`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-xl bg-gradient-to-r ${stat.gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Plan Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {planStats.map((plan, index) => {
          const Icon = plan.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className={`group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br ${plan.bgColor} hover:scale-105 cursor-pointer`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-bold text-gray-900">
                    {plan.name}
                  </CardTitle>
                  <div className={`p-2 rounded-xl bg-gradient-to-r ${plan.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <div className="h-5 w-5 text-white">{Icon}</div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900 mb-1">{plan.count}</div>
                  <div className="text-sm text-gray-600">Subscriptions</div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6"
      >
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search subscriptions..."
              className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="rounded-xl"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" className="rounded-xl">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl">
              Export
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Subscriptions Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 overflow-hidden"
      >
        <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-purple-50 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900">All Subscriptions</h2>
          <p className="text-gray-600 mt-1">Complete list of company subscriptions</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Limits</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((subscription) => {
                // Calculate revenue based on actual subscription plan
                const monthlyRevenue = subscription.monthlyRevenue || 0;
                
                return (
                  <TableRow key={subscription.id} className="hover:bg-purple-50/50 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold">
                          {subscription.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{subscription.name}</div>
                          <div className="text-sm text-gray-500">{subscription.domain || 'No domain'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getSubscriptionBadge(subscription.subscriptionPlan, subscription.subscriptionStatus)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(subscription.subscriptionStatus)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1 text-xs">
                          <UsersIcon className="w-3 h-3 text-gray-400" />
                          <span className="font-medium">
                            {subscription.maxUsers === -1 ? 'Unlimited' : `${subscription.maxUsers || 0} users`}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs">
                          <CreditCard className="w-3 h-3 text-gray-400" />
                          <span className="font-medium">
                            {subscription.maxInterviews === -1 ? 'Unlimited' : `${subscription.maxInterviews || 0} interviews`}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1 text-xs text-gray-600">
                          <Calendar className="w-3 h-3" />
                          <span>Start: {subscription.subscriptionStartDate ? new Date(subscription.subscriptionStartDate).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-gray-600">
                          <Calendar className="w-3 h-3" />
                          <span>End: {subscription.subscriptionEndDate ? new Date(subscription.subscriptionEndDate).toLocaleDateString() : 'No expiry'}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1">
                          <DollarSign className="w-3 h-3 text-emerald-500" />
                          <span className="font-semibold text-emerald-600 text-xs">${monthlyRevenue}/mo</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <DollarSign className="w-3 h-3 text-blue-500" />
                          <span className="font-semibold text-blue-600 text-xs">${subscription.yearlyRevenue || 0}/yr</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-purple-50">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedCompany(subscription);
                              setIsModalOpen(true);
                            }}
                          >
                            Change Plan
                          </DropdownMenuItem>
                          <DropdownMenuItem>Billing History</DropdownMenuItem>
                          <DropdownMenuItem>Send Invoice</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">Cancel Subscription</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </motion.div>

      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCompany(null);
        }}
        onSubscriptionUpdated={() => {
          fetchSubscriptions();
          setIsModalOpen(false);
          setSelectedCompany(null);
        }}
        onUpdate={handleManualRefresh}
        company={selectedCompany}
      />
    </div>
  );
}