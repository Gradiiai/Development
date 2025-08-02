'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Users, ArrowLeft, Briefcase } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shared/tabs';
import { Button } from '@/components/ui/shared/button';
import { useRouter } from 'next/navigation';
import DirectInterviewFlow from '../_components/DirectInterviewFlow';
import CampaignInterviewFlow from '../_components/CampaignInterviewFlow';

export default function InterviewsPage() {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = React.useState(0);

  const handleInterviewCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
          
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Interview Management
            </h1>
            <p className="text-gray-600">Create direct interviews or manage campaign-based recruitment</p>
          </div>

          <div className="w-32"></div>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs defaultValue="direct" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-white border border-gray-200 rounded-lg p-1">
              <TabsTrigger 
                value="direct" 
                className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-md transition-all duration-200"
              >
                <Users className="h-4 w-4" />
                Direct Interviews
              </TabsTrigger>
              <TabsTrigger 
                value="campaign" 
                className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-md transition-all duration-200"
              >
                <Briefcase className="h-4 w-4" />
                Campaign Interviews
              </TabsTrigger>
            </TabsList>

            <TabsContent value="direct" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg border border-gray-200 p-6"
              >
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Direct Interview Setup</h2>
                  <p className="text-gray-600">Create standalone interviews with manual candidate entry. Only PDF resume upload allowed.</p>
                </div>
                <DirectInterviewFlow key={refreshKey} onInterviewCreated={handleInterviewCreated} />
              </motion.div>
            </TabsContent>

            <TabsContent value="campaign" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg border border-gray-200 p-6"
              >
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Campaign-Based Interviews</h2>
                  <p className="text-gray-600">Manage interviews for candidates from active job campaigns with pre-configured settings.</p>
                </div>
                <CampaignInterviewFlow key={refreshKey} />
              </motion.div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};