'use client';

import { JobCampaignProvider } from '@/shared/store/jobCampaignStore';
import { JobCampaignNavigation } from '@/components/job-campaign/JobCampaignNavigation';

export default function JobCampaignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <JobCampaignProvider>
      <div className="min-h-screen bg-gray-50">
        <JobCampaignNavigation />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </JobCampaignProvider>
  );
}