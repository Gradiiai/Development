'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Crown, Star, Gift, Users, Calendar, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/shared/button';
import { Label } from '@/components/ui/shared/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/shared/badge';
import { Input } from '@/components/ui/shared/input';
import { toast } from 'sonner';
import { getPlanConfig, getPlanIcon } from '@/lib/plan-config';

interface SubscriptionPlan {
  id: string;
  planName: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxUsers: number;
  maxInterviews: number;
  features: string[];
  isActive: boolean;
}

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscriptionUpdated?: () => void;
  onUpdate?: () => void;
  company: {
    id: string;
    name: string;
    domain: string;
    subscriptionPlan: string | null;
    subscriptionStatus: string | null;
    maxUsers?: number | null;
    maxInterviews?: number | null;
    monthlyRevenue?: number | null;
    yearlyRevenue?: number | null;
    subscriptionStartDate?: string | null;
    subscriptionEndDate?: string | null;
  } | null;
}

export function SubscriptionModal({ isOpen, onClose, onSubscriptionUpdated, onUpdate, company }: SubscriptionModalProps) {
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [formData, setFormData] = useState({
    subscriptionPlan: company?.subscriptionPlan || 'basic',
    subscriptionStatus: company?.subscriptionStatus || 'active',
    maxUsers: company?.maxUsers || 1,
    maxInterviews: company?.maxInterviews || 10,
    monthlyRevenue: company?.monthlyRevenue || 0,
    yearlyRevenue: company?.yearlyRevenue || 0,
    subscriptionStartDate: company?.subscriptionStartDate ? new Date(company.subscriptionStartDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    subscriptionEndDate: company?.subscriptionEndDate ? new Date(company.subscriptionEndDate).toISOString().split('T')[0] : '',
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSubscriptionPlans();
    }
  }, [isOpen]);

  useEffect(() => {
    // Reset form data when company changes or modal opens
    setFormData({
      subscriptionPlan: company?.subscriptionPlan || 'basic',
      subscriptionStatus: company?.subscriptionStatus || 'active',
      maxUsers: company?.maxUsers || 1,
      maxInterviews: company?.maxInterviews || 10,
      monthlyRevenue: company?.monthlyRevenue || 0,
      yearlyRevenue: company?.yearlyRevenue || 0,
      subscriptionStartDate: company?.subscriptionStartDate ? new Date(company.subscriptionStartDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      subscriptionEndDate: company?.subscriptionEndDate ? new Date(company.subscriptionEndDate).toISOString().split('T')[0] : '',
    });
  }, [company, isOpen]);

  const fetchSubscriptionPlans = async () => {
    try {
      const response = await fetch('/api/subscription-plans');
      if (response.ok) {
        const data = await response.json();
        setSubscriptionPlans(data.plans || []);
      }
    } catch (error) {
      console.error('Failed to fetch subscription plans:', error);
      setSubscriptionPlans([]);
    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);

    try {
      if (company) {
        // Update existing subscription
        const response = await fetch('/api/admin/subscriptions', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companyId: company.id,
            ...formData,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update subscription');
        }

        toast.success('Subscription updated successfully!');
      } else {
        // Create new subscription plan
        const response = await fetch('/api/subscription-plans', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            planName: formData.subscriptionPlan,
            monthlyPrice: formData.monthlyRevenue,
            yearlyPrice: formData.yearlyRevenue,
            maxUsers: formData.maxUsers,
            maxInterviews: formData.maxInterviews,
            features: [], // Default empty features array
            isActive: formData.subscriptionStatus === 'active',
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create subscription plan');
        }

        toast.success('Subscription plan created successfully!');
      }
      
      onSubscriptionUpdated?.();
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error('Error with subscription:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process subscription');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePlanChange = (plan: string) => {
    const selectedPlan = Array.isArray(subscriptionPlans) ? subscriptionPlans.find(p => p.planName === plan) : null;
    
    if (selectedPlan) {
      setFormData(prev => ({
        ...prev,
        subscriptionPlan: plan,
        monthlyRevenue: selectedPlan.monthlyPrice,
        yearlyRevenue: selectedPlan.yearlyPrice,
        maxUsers: selectedPlan.maxUsers,
        maxInterviews: selectedPlan.maxInterviews
      }));
    } else {
      // If no plan found, just update the plan name
      setFormData(prev => ({
        ...prev,
        subscriptionPlan: plan
      }));
    }
  };



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Don't render if modal is not open
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
          >
            {/* Header */}
            <div className={`bg-gradient-to-r ${getPlanConfig(formData.subscriptionPlan).gradient} p-6 text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    {getPlanIcon(formData.subscriptionPlan)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{company ? 'Manage Subscription' : 'Create Subscription Plan'}</h2>
                    <p className="text-white/80 text-sm">{company ? company.name : 'New Plan'}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-white hover:bg-white/20 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Company Info - Only show when editing existing subscription */}
            {company && (
              <div className="p-6 border-b border-gray-100">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Company:</span>
                    <span className="font-medium">{company.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Domain:</span>
                    <span className="font-medium">{company.domain}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Current Status:</span>
                    <Badge className={getStatusColor(company.subscriptionStatus || 'inactive')}>
                      {company.subscriptionStatus || 'inactive'}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Subscription Plan */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Subscription Plan
                </Label>
                <Select value={formData.subscriptionPlan} onValueChange={handlePlanChange}>
                  <SelectTrigger className="w-full">
                    <div className="flex items-center space-x-2">
                      {getPlanIcon(formData.subscriptionPlan)}
                      <SelectValue placeholder="Select plan" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(subscriptionPlans) && subscriptionPlans.length > 0 ? subscriptionPlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.planName}>
                        <div className="flex items-center space-x-2">
                          {getPlanIcon(plan.planName)}
                          <span>{plan.planName.charAt(0).toUpperCase() + plan.planName.slice(1)} Plan</span>
                        </div>
                      </SelectItem>
                    )) : (
                      <SelectItem value="basic">Basic Plan</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Subscription Status */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Subscription Status
                </Label>
                <Select value={formData.subscriptionStatus} onValueChange={(value) => handleInputChange('subscriptionStatus', value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Pricing Section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                    <DollarSign className="w-4 h-4" />
                    <span>Monthly Revenue</span>
                  </Label>
                  <Input
                    type="number"
                    value={formData.monthlyRevenue}
                    onChange={(e) => handleInputChange('monthlyRevenue', parseInt(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                    <DollarSign className="w-4 h-4" />
                    <span>Yearly Revenue</span>
                  </Label>
                  <Input
                    type="number"
                    value={formData.yearlyRevenue}
                    onChange={(e) => handleInputChange('yearlyRevenue', parseInt(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>

              {/* Usage Limits Section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>Max Users</span>
                  </Label>
                  <Input
                    type="number"
                    value={formData.maxUsers === -1 ? '' : formData.maxUsers}
                    onChange={(e) => handleInputChange('maxUsers', e.target.value === '' ? -1 : parseInt(e.target.value) || 0)}
                    placeholder="Unlimited"
                    min="-1"
                  />
                  <p className="text-xs text-gray-500">Use -1 for unlimited</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                    <CreditCard className="w-4 h-4" />
                    <span>Max Interviews</span>
                  </Label>
                  <Input
                    type="number"
                    value={formData.maxInterviews === -1 ? '' : formData.maxInterviews}
                    onChange={(e) => handleInputChange('maxInterviews', e.target.value === '' ? -1 : parseInt(e.target.value) || 0)}
                    placeholder="Unlimited"
                    min="-1"
                  />
                  <p className="text-xs text-gray-500">Use -1 for unlimited</p>
                </div>
              </div>

              {/* Subscription Dates Section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>Start Date</span>
                  </Label>
                  <Input
                    type="date"
                    value={formData.subscriptionStartDate}
                    onChange={(e) => handleInputChange('subscriptionStartDate', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>End Date</span>
                  </Label>
                  <Input
                    type="date"
                    value={formData.subscriptionEndDate}
                    onChange={(e) => handleInputChange('subscriptionEndDate', e.target.value)}
                  />
                  <p className="text-xs text-gray-500">Leave empty for no expiration</p>
                </div>
              </div>

              {/* Plan Summary */}
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center space-x-2">
                  {getPlanIcon(formData.subscriptionPlan)}
                  <span>Current Configuration</span>
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Plan:</span>
                      <span className="font-medium capitalize">{formData.subscriptionPlan}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="font-medium capitalize">{formData.subscriptionStatus}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Max Users:</span>
                      <span className="font-medium">{formData.maxUsers === -1 ? 'Unlimited' : formData.maxUsers}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Monthly:</span>
                      <span className="font-medium text-green-600">${formData.monthlyRevenue}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Yearly:</span>
                      <span className="font-medium text-green-600">${formData.yearlyRevenue}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Max Interviews:</span>
                      <span className="font-medium">{formData.maxInterviews === -1 ? 'Unlimited' : formData.maxInterviews}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className={`flex-1 bg-gradient-to-r ${getPlanConfig(formData.subscriptionPlan).gradient} hover:opacity-90`}
                  disabled={isLoading}
                >
                  {isLoading ? (company ? 'Updating...' : 'Creating...') : (company ? 'Update Subscription' : 'Create Plan')}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}