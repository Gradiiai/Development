"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Calendar, Clock, Camera, CameraOff, Play, AlertCircle, Briefcase, FileText, Award, Info, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/shared/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/shared/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/shared/badge";
import Link from "next/link";
import { isInterviewLinkExpired } from "@/lib/database/connection";

type InterviewDetails = {
  interviewId: string;
  jobPosition: string;
  jobDescription: string;
  jobExperience: string;
  createdBy: string;
  createdAt: Date;
  candidateName?: string | null;
  candidateEmail?: string | null;
  interviewDate?: string | null;
  interviewTime?: string | null;
  interviewStatus?: string | null;
};

type Props = {
  interviewDetails: InterviewDetails;
};

export default function InterviewClient({ interviewDetails }: Props) {
  const [webcamEnabled, setWebcamEnabled] = useState(false); // Default to disabled - user must explicitly enable
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'denied' | 'granted'>('prompt');
  const [isReady, setIsReady] = useState(false);
  const [recordingEnabled, setRecordingEnabled] = useState(false); // Default recording disabled
  const [audioEnabled, setAudioEnabled] = useState(false); // Default audio disabled

  // Calculate time remaining until expiration
  useEffect(() => {
    if (!interviewDetails.interviewDate || !interviewDetails.interviewTime) return;

    const calculateTimeRemaining = () => {
      // Create interview datetime
      const interviewDateTime = new Date(`${interviewDetails.interviewDate}T${interviewDetails.interviewTime}`);
      
      // Add 3 hours for expiration
      const expiryTime = new Date(interviewDateTime);
      expiryTime.setHours(expiryTime.getHours() + 3);
      
      // Calculate difference
      const now = new Date();
      const diff = expiryTime.getTime() - now.getTime();
      
      // Check if expired
      if (diff <= 0) {
        setIsExpired(true);
        setTimeRemaining("Expired");
        return;
      }
      
      // Calculate hours, minutes, seconds
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      // Format time remaining
      setTimeRemaining(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };
    
    // Update every second
    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);
    
    return () => clearInterval(interval);
  }, [interviewDetails.interviewDate, interviewDetails.interviewTime]);

  const handleCameraEnable = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setWebcamEnabled(true);
      setRecordingEnabled(true);
      setAudioEnabled(true);
      setPermissionStatus('granted');
      setIsReady(true);
      // Stop the stream immediately as we'll use react-webcam
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Camera access denied:', error);
      setPermissionStatus('denied');
      setWebcamEnabled(false);
      setRecordingEnabled(false);
      setAudioEnabled(false);
      setIsReady(false);
    }
  };

  if (isExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="mx-auto mb-6 p-4 bg-red-100 rounded-full w-fit"
              >
                <AlertCircle className="h-8 w-8 text-red-600" />
              </motion.div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Interview Expired</h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                This interview link has expired. Please contact the interviewer to reschedule.
              </p>
              <Link href="/dashboard">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200">
                  Return to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Briefcase className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Interview Setup
                </h1>
                <p className="text-sm text-gray-600">Prepare for your interview</p>
              </div>
            </div>
            {interviewDetails.interviewDate && interviewDetails.interviewTime && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center space-x-3 bg-amber-50 px-4 py-3 rounded-lg border border-amber-200"
              >
                <Clock className="h-5 w-5 text-amber-600" />
                <div className="text-right">
                  <p className="text-xs text-amber-700 font-medium">Link expires in</p>
                  <p className="font-mono font-bold text-amber-800 text-lg">{timeRemaining}</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.nav>
      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Interview Details Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Candidate Information Card */}
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-600 rounded-lg">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-lg font-semibold text-gray-900">Candidate Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {interviewDetails.candidateName && (
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="flex items-center space-x-3">
                        <User className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-gray-700">Candidate Name</span>
                      </div>
                      <span className="font-semibold text-gray-900">{interviewDetails.candidateName}</span>
                    </div>
                  )}
                  
                  {interviewDetails.interviewDate && (
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-100">
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-gray-700">Interview Date</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{interviewDetails.interviewDate}</p>
                        {interviewDetails.interviewTime && (
                          <p className="text-sm text-gray-600 flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {interviewDetails.interviewTime}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Job Details Card */}
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-600 rounded-lg">
                      <Briefcase className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-lg font-semibold text-gray-900">Position Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                    <div className="flex items-center space-x-3 mb-2">
                      <Briefcase className="h-4 w-4 text-purple-600" />
                      <span className="font-medium text-gray-700">Job Position</span>
                    </div>
                    <p className="font-semibold text-gray-900 text-lg">{interviewDetails.jobPosition}</p>
                  </div>
                  
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                    <div className="flex items-center space-x-3 mb-2">
                      <FileText className="h-4 w-4 text-orange-600" />
                      <span className="font-medium text-gray-700">Job Description</span>
                    </div>
                    <p className="text-gray-800 leading-relaxed">{interviewDetails.jobDescription}</p>
                  </div>
                  
                  <div className="p-4 bg-teal-50 rounded-lg border border-teal-100">
                    <div className="flex items-center space-x-3 mb-2">
                      <Award className="h-4 w-4 text-teal-600" />
                      <span className="font-medium text-gray-700">Experience Required</span>
                    </div>
                    <Badge variant="secondary" className="bg-teal-100 text-teal-800 font-semibold">
                      {interviewDetails.jobExperience} years
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

          </div>

          {/* Right Sidebar - Timer & Video Preview */}
          <div className="lg:col-span-1 space-y-6">
            {/* Timer Card */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="bg-emerald-600 text-white border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Clock className="h-5 w-5" />
                    </div>
                    <span className="text-lg font-semibold">Time Remaining</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold mb-2">
                      {timeRemaining}
                    </div>
                    <p className="text-emerald-100 text-sm">
                      Until interview expires
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Video Preview Card */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-600 rounded-lg">
                      <Camera className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-lg font-semibold text-gray-900">Video Preview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative bg-gray-100 rounded-lg aspect-video flex items-center justify-center overflow-hidden">
                    {webcamEnabled ? (
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-center"
                      >
                        <div className="p-3 bg-green-100 rounded-full mb-3 mx-auto w-fit">
                          <Camera className="h-6 w-6 text-green-600" />
                        </div>
                        <p className="text-green-700 font-semibold">Camera Active</p>
                        <p className="text-green-600 text-sm">Ready for interview</p>
                      </motion.div>
                    ) : (
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-center"
                      >
                        <div className="p-3 bg-gray-200 rounded-full mb-3 mx-auto w-fit">
                          <CameraOff className="h-6 w-6 text-gray-500" />
                        </div>
                        <p className="text-gray-600 font-medium">Camera Disabled</p>
                        <p className="text-gray-500 text-sm">Click below to enable</p>
                      </motion.div>
                    )}
                    
                    {/* Permission Status Indicator */}
                    <div className="absolute top-3 right-3">
                      <div className={`w-3 h-3 rounded-full ${webcamEnabled ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={webcamEnabled ? () => {
                      setWebcamEnabled(false);
                      setRecordingEnabled(false);
                      setAudioEnabled(false);
                      setPermissionStatus('prompt');
                      setIsReady(false);
                    } : handleCameraEnable}
                    variant={webcamEnabled ? "outline" : "default"}
                    className={`w-full ${
                      webcamEnabled 
                        ? 'border-red-200 text-red-600 hover:bg-red-50' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {webcamEnabled ? (
                      <>
                        <CameraOff className="h-4 w-4 mr-2" />
                        Disable Camera
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4 mr-2" />
                        Enable Camera
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Start Interview Card */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <Card className="border-0 shadow-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white overflow-hidden">
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="p-3 bg-white/20 rounded-full mx-auto w-fit">
                      <Play className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold">Ready to Begin?</h3>
                    <p className="text-green-100 text-sm leading-relaxed">
                      Ensure your camera and microphone are working properly before starting.
                    </p>
                    
                    {webcamEnabled && isReady ? (
                      <Link href={`/dashboard/interviews/${interviewDetails.interviewId}/start`}>
                        <Button
                          size="lg"
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 rounded-lg shadow-sm"
                        >
                          <Play className="h-5 w-5 mr-2" />
                          Start Interview
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        disabled
                        size="lg"
                        className="w-full bg-gray-300 text-gray-500 font-semibold py-4 rounded-lg cursor-not-allowed"
                      >
                        <AlertCircle className="h-5 w-5 mr-2" />
                        {!webcamEnabled ? 'Enable Camera First' : 'Preparing...'}
                      </Button>
                    )}
                    
                    {(!webcamEnabled || !isReady) && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg"
                      >
                        <div className="flex items-start space-x-3">
                          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-amber-800 font-medium text-sm">Important</p>
                            <p className="text-amber-700 text-sm mt-1">
                              {!webcamEnabled 
                                ? "Please enable your camera to proceed with the interview."
                                : "System is preparing your interview environment. Please wait..."
                              }
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Information Alert */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              <Alert className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg">
                <Info className="h-5 w-5 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong className="font-semibold">Important:</strong> Ensure stable internet connection and quiet environment for the best interview experience.
                </AlertDescription>
              </Alert>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
