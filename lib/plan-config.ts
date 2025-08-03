import React from 'react';
import { Gift, Zap, Star, Building, Crown } from 'lucide-react';

export interface PlanConfig {
  name: string;
  color: string;
  label: string;
  gradient: string;
  buttonText: string;
  hexColor: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  maxInterviews?: number;
  maxUsers?: number;
}

export const getPlanConfig = (planName: string): PlanConfig => {
  const planConfigs: Record<string, PlanConfig> = {
    // Legacy support
    free: { 
      name: 'free',
      color: 'bg-gray-100 text-gray-800', 
      label: 'Free',
      gradient: 'from-gray-500 to-gray-600',
      buttonText: 'Start Free',
      hexColor: '#6b7280',
      monthlyPrice: 0,
      yearlyPrice: 0,
      maxInterviews: 10,
      maxUsers: 2
    },
    // New plan structure
    starter: { 
      name: 'starter',
      color: 'bg-blue-100 text-blue-800', 
      label: 'Starter',
      gradient: 'from-blue-500 to-cyan-500',
      buttonText: 'Start Free Trial',
      hexColor: '#3b82f6',
      monthlyPrice: 29,
      yearlyPrice: 290,
      maxInterviews: 50,
      maxUsers: 5
    },
    scale: { 
      name: 'scale',
      color: 'bg-purple-100 text-purple-800', 
      label: 'Scale',
      gradient: 'from-purple-500 to-pink-500',
      buttonText: 'Start Free Trial',
      hexColor: '#8b5cf6',
      monthlyPrice: 79,
      yearlyPrice: 790,
      maxInterviews: 200,
      maxUsers: 25
    },
    enterprise: { 
      name: 'enterprise',
      color: 'bg-green-100 text-green-800', 
      label: 'Enterprise',
      gradient: 'from-green-500 to-emerald-500',
      buttonText: 'Contact Sales',
      hexColor: '#10b981',
      monthlyPrice: 199,
      yearlyPrice: 1990,
      maxInterviews: 1000,
      maxUsers: 100
    },
    custom: { 
      name: 'custom',
      color: 'bg-orange-100 text-orange-800', 
      label: 'Custom',
      gradient: 'from-orange-500 to-red-500',
      buttonText: 'Contact Sales',
      hexColor: '#f97316',
      monthlyPrice: 0,
      yearlyPrice: 0,
      maxInterviews: -1,
      maxUsers: -1
    },
    // Legacy mappings for backward compatibility
    basic: { 
      name: 'starter',
      color: 'bg-blue-100 text-blue-800', 
      label: 'Starter',
      gradient: 'from-blue-500 to-cyan-500',
      buttonText: 'Start Free Trial',
      hexColor: '#3b82f6',
      monthlyPrice: 29,
      yearlyPrice: 290,
      maxInterviews: 50,
      maxUsers: 5
    },
    pro: { 
      name: 'scale',
      color: 'bg-purple-100 text-purple-800', 
      label: 'Scale',
      gradient: 'from-purple-500 to-pink-500',
      buttonText: 'Start Free Trial',
      hexColor: '#8b5cf6',
      monthlyPrice: 79,
      yearlyPrice: 790,
      maxInterviews: 200,
      maxUsers: 25
    },
  };
  
  return planConfigs[planName.toLowerCase()] || planConfigs.free;
};

export const getPlanIcon = (planName: string) => {
  const iconMap: Record<string, () => React.ReactNode> = {
    free: () => React.createElement(Gift, { className: "h-6 w-6" }),
    starter: () => React.createElement(Zap, { className: "h-6 w-6" }),
    scale: () => React.createElement(Star, { className: "h-6 w-6" }),
    enterprise: () => React.createElement(Building, { className: "h-6 w-6" }),
    custom: () => React.createElement(Crown, { className: "h-6 w-6" }),
    // Legacy mappings
    basic: () => React.createElement(Zap, { className: "h-6 w-6" }),
    pro: () => React.createElement(Star, { className: "h-6 w-6" })
  };
  
  const iconFunction = iconMap[planName.toLowerCase()] || iconMap.free;
  return iconFunction();
};

// Helper function to get all available plans
export const getAllPlans = (): PlanConfig[] => {
  return [
    getPlanConfig('starter'),
    getPlanConfig('scale'),
    getPlanConfig('enterprise'),
    getPlanConfig('custom')
  ];
};

// Helper function to format price
export const formatPrice = (price: number): string => {
  if (price === 0) return 'Custom';
  return `$${price.toLocaleString()}`;
};

// Helper function to format limits
export const formatLimits = (limit: number): string => {
  if (limit === -1) return 'Unlimited';
  return limit.toLocaleString();
};