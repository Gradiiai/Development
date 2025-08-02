import React from 'react';
import { Gift, CreditCard, Star, Crown } from 'lucide-react';

export interface PlanConfig {
  name: string;
  color: string;
  label: string;
  gradient: string;
  buttonText: string;
  hexColor: string;
}

export const getPlanConfig = (planName: string): PlanConfig => {
  const planConfigs: Record<string, PlanConfig> = {
    free: { 
      name: 'free',
      color: 'bg-gray-100 text-gray-800', 
      label: 'Free',
      gradient: 'from-gray-500 to-gray-600',
      buttonText: 'Start Free',
      hexColor: '#6b7280'
    },
    basic: { 
      name: 'basic',
      color: 'bg-blue-100 text-blue-800', 
      label: 'Basic',
      gradient: 'from-green-500 to-green-600',
      buttonText: 'Start Free Trial',
      hexColor: '#10b981'
    },
    pro: { 
      name: 'pro',
      color: 'bg-purple-100 text-purple-800', 
      label: 'Pro',
      gradient: 'from-blue-500 to-purple-500',
      buttonText: 'Start Free Trial',
      hexColor: '#3b82f6'
    },
    enterprise: { 
      name: 'enterprise',
      color: 'bg-orange-100 text-orange-800', 
      label: 'Enterprise',
      gradient: 'from-purple-500 to-pink-500',
      buttonText: 'Contact Sales',
      hexColor: '#8b5cf6'
    },
  };
  
  return planConfigs[planName.toLowerCase()] || planConfigs.free;
};

export const getPlanIcon = (planName: string) => {
  const iconMap: Record<string, () => React.ReactNode> = {
    free: () => React.createElement(Gift, { className: "h-6 w-6" }),
    basic: () => React.createElement(CreditCard, { className: "h-6 w-6" }),
    pro: () => React.createElement(Star, { className: "h-6 w-6" }),
    enterprise: () => React.createElement(Crown, { className: "h-6 w-6" })
  };
  
  const iconFunction = iconMap[planName.toLowerCase()] || iconMap.free;
  return iconFunction();
};