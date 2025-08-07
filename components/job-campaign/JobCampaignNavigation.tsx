"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  Users,
  Target,
  Calendar,
  CheckCircle,
  Settings
} from "lucide-react";
import { useJobCampaignStore } from "@/shared/store/jobCampaignStore";
import { Badge } from "@/components/ui/shared/badge";

const navigationItems = [
  {
    name: "Job Details",
    href: "/dashboard/job-campaign/job-details",
    icon: Briefcase,
    description: "Basic job information and requirements",
    step: 1
  },
  {
    name: "Interview Setup",
    href: "/dashboard/job-campaign/interview-setup",
    icon: Calendar,
    description: "Configure interview rounds and questions",
    step: 2
  },
  {
    name: "Scoring Parameters",
    href: "/dashboard/job-campaign/scoring-parameters",
    icon: Target,
    description: "Set evaluation criteria and weights",
    step: 3
  },
  {
    name: "Success",
    href: "/dashboard/job-campaign/success",
    icon: CheckCircle,
    description: "Campaign completion and next steps",
    step: 4
  },
];

export function JobCampaignNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useJobCampaignStore();
  const { campaignId, currentStep } = state;

  // Check if we're on the main job-campaign page
  const isMainPage = pathname === "/dashboard/job-campaign";
  
  // Only show campaign-specific UI when not on main page
  const showCampaignUI = !isMainPage && campaignId;

  const isStepAccessible = (step: number | null) => {
    if (step === null) {
      // Candidates page is accessible if campaign exists
      return !!campaignId;
    }
    // Other steps are accessible based on current step
    return currentStep >= step;
  };

  const isStepCompleted = (step: number | null) => {
    if (step === null) return false;
    return currentStep > step;
  };

  const handleNavigation = (href: string, step: number | null) => {
    if (!isStepAccessible(step)) {
      return;
    }
    router.push(href);
  };

  // Don't show navigation on the main listing page
  if (isMainPage) {
    return null;
  }

  return (
    <div className="bg-white border-b border-gray-200 rounded-lg shadow-sm w-full">
      <div className="w-full px-4">
        <div className="flex items-center space-x-1 overflow-x-auto py-3">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const isAccessible = isStepAccessible(item.step);
            const isCompleted = isStepCompleted(item.step);
            
            return (
              <div key={item.name} className="flex-shrink-0">
                {isAccessible ? (
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-purple-100 text-purple-700 border border-purple-200"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    )}
                  >
                    <Icon className={cn(
                      "w-4 h-4",
                      isActive ? "text-purple-600" : "text-gray-400",
                      isCompleted && showCampaignUI && "text-green-600"
                    )} />
                    <span>{item.name}</span>
                    {isCompleted && showCampaignUI && (
                      <Badge variant="secondary" className="ml-1 bg-green-100 text-green-700">
                        ✓
                      </Badge>
                    )}
                    {item.step && showCampaignUI && (
                      <Badge variant="outline" className="ml-1">
                        {item.step}
                      </Badge>
                    )}
                  </Link>
                ) : (
                  <div className={cn(
                    "flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed opacity-50",
                    "text-gray-400"
                  )}>
                    <Icon className="w-4 h-4 text-gray-300" />
                    <span>{item.name}</span>
                    {item.step && showCampaignUI && (
                      <Badge variant="outline" className="ml-1 opacity-50">
                        {item.step}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}