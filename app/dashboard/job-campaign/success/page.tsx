"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/shared/card";
import { Button } from "@/components/ui/shared/button";
import { Badge } from "@/components/ui/shared/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  ArrowRight,
  ArrowLeft,
  Users,
  Calendar,
  Target
} from "lucide-react";
import { motion } from "framer-motion";
import { useJobCampaignStore } from "@/shared/store/jobCampaignStore";

// Job Campaign Success - Portal sync functionality removed

export default function JobCampaignSuccess() {
  const router = useRouter();
  const { state, setCurrentStep } = useJobCampaignStore();
  const { jobDetails } = state;
  const [isNavigating, setIsNavigating] = useState(false);

  const handleContinue = async () => {
    setIsNavigating(true);
    setCurrentStep(5);
    router.push('/dashboard/job-campaign/candidates');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">
              Job Campaign Created Successfully!
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your job campaign for <span className="font-semibold text-blue-600">{jobDetails?.jobTitle}</span> is ready. 
            You can now start managing candidates and conducting interviews.
          </p>
        </motion.div>

        {/* Progress Bar */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8"
        >
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Campaign Setup Progress</h3>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Step 4 of 5
              </Badge>
            </div>
            <Progress value={100} className="h-3" />
            <div className="flex justify-between text-sm text-gray-600 mt-2">
              <span>Job Details ✓</span>
              <span>Interview Setup ✓</span>
              <span>Scoring Parameters ✓</span>
              <span className="font-semibold text-green-600">Campaign Ready ✓</span>
            </div>
          </div>
        </motion.div>

        {/* Job Summary and Next Steps */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Job Summary */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  Job Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900">{jobDetails?.jobTitle}</h4>
                  <p className="text-sm text-gray-600">{jobDetails?.department}</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Location:</span>
                    <span className="text-sm font-medium">{jobDetails?.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Type:</span>
                    <span className="text-sm font-medium">{jobDetails?.employeeType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Experience:</span>
                    <span className="text-sm font-medium">{jobDetails?.experienceMin}-{jobDetails?.experienceMax} years</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Openings:</span>
                    <span className="text-sm font-medium">{jobDetails?.numberOfOpenings}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Next Steps */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 text-blue-600 mr-2" />
                  What's Next?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-gray-900">Manage Candidates</h4>
                      <p className="text-sm text-gray-600">Review applications and manage your candidate pipeline</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Calendar className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-gray-900">Schedule Interviews</h4>
                      <p className="text-sm text-gray-600">Set up interviews with qualified candidates</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Target className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-gray-900">Track Progress</h4>
                      <p className="text-sm text-gray-600">Monitor campaign performance and analytics</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Action Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 flex items-center justify-between"
        >
          <Button 
            variant="outline" 
            onClick={() => {
              setCurrentStep(3);
              router.push('/dashboard/job-campaign/scoring-parameters');
            }}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Scoring Parameters
          </Button>
          
          <Button 
            onClick={handleContinue}
            disabled={isNavigating}
            className="flex items-center bg-blue-600 hover:bg-blue-700"
          >
            {isNavigating ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Loading...
              </>
            ) : (
              <>
                Continue to Candidates
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}