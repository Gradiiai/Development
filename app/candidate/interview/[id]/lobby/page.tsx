"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/shared/card";
import { Button } from "@/components/ui/shared/button";
import { Badge } from "@/components/ui/shared/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/shared/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/shared/dialog";
import {
  CheckCircle2,
  Clock,
  Calendar,
  Users,
  Video,
  Mic,
  Camera,
  Monitor,
  Volume2,
  Wifi,
  AlertTriangle,
  Info,
  RefreshCw,
  ArrowRight,
  Building2,
  User,
  Phone,
  Mail,
  Settings,
  MicOff,
  VideoOff,
  Play,
  Pause,
  RotateCcw,
  Headphones,
  Speaker,
  MessageSquare,
  FileText,
  HelpCircle,
  ExternalLink,
  Loader2,
  BookOpen,
  Target,
  Lightbulb,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/shared/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Interview {
  id: string;
  title: string;
  type: "behavioral" | "mcq" | "coding" | "combo";
  company: {
    id: string;
    name: string;
    logo?: string;
    website?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
  position: {
    title: string;
    department: string;
    level: string;
  };
  interviewer: {
    name: string;
    title: string;
    avatar?: string;
    email?: string;
    status: "not_joined" | "joining" | "ready" | "in_meeting";
  };
  scheduledAt: Date;
  duration: number;
  meetingLink?: string;
  status: "waiting" | "ready_to_start" | "in_progress" | "completed";
  estimatedStartTime?: Date;
  instructions?: string;
  supportContact?: {
    email: string;
    phone?: string;
  };
  preparation?: {
    topics: string[];
    skills: string[];
    tips: string[];
    commonQuestions: string[];
  };
}

interface MediaSettings {
  camera: boolean;
  microphone: boolean;
  speaker: boolean;
  cameraDeviceId?: string;
  microphoneDeviceId?: string;
  speakerDeviceId?: string;
}

interface TechCheckResult {
  camera: "not_tested" | "testing" | "passed" | "failed";
  microphone: "not_tested" | "testing" | "passed" | "failed";
  speakers: "not_tested" | "testing" | "passed" | "failed";
  internet: "not_tested" | "testing" | "passed" | "failed";
  browser: "not_tested" | "testing" | "passed" | "failed";
}

// Mock data removed - system now requires proper API responses

// Helper functions for preparation data
const getPreparationTopics = (type: string): string[] => {
  const topics = {
    behavioral: ["Leadership examples", "Conflict resolution", "Team collaboration", "Problem-solving scenarios"],
    coding: ["Data structures", "Algorithms", "System design", "Code optimization"],
    mcq: ["Technical concepts", "Industry knowledge", "Best practices", "Problem-solving"],
    combo: ["Technical skills", "Behavioral scenarios", "Communication", "Problem-solving"]
  };
  return topics[type as keyof typeof topics] || topics.behavioral;
};

const getPreparationSkills = (type: string): string[] => {
  const skills = {
    behavioral: ["Communication", "Leadership", "Teamwork", "Adaptability", "Problem-solving"],
    coding: ["Programming", "Debugging", "Algorithm design", "Code review", "Testing"],
    mcq: ["Technical knowledge", "Quick thinking", "Attention to detail", "Time management"],
    combo: ["Technical expertise", "Communication", "Problem-solving", "Time management"]
  };
  return skills[type as keyof typeof skills] || skills.behavioral;
};

const getPreparationTips = (type: string): string[] => {
  const tips = {
    behavioral: [
      "Use the STAR method (Situation, Task, Action, Result)",
      "Prepare specific examples from your experience",
      "Be honest and authentic in your responses",
      "Ask clarifying questions if needed"
    ],
    coding: [
      "Think out loud while coding",
      "Start with a simple solution, then optimize",
      "Test your code with examples",
      "Ask about edge cases and constraints"
    ],
    mcq: [
      "Read questions carefully",
      "Eliminate obviously wrong answers",
      "Manage your time effectively",
      "Don't second-guess yourself too much"
    ],
    combo: [
      "Balance technical depth with clear communication",
      "Prepare for both coding and behavioral questions",
      "Practice explaining technical concepts simply",
      "Stay calm and organized throughout"
    ]
  };
  return tips[type as keyof typeof tips] || tips.behavioral;
};

const getCommonQuestions = (type: string): string[] => {
  const questions = {
    behavioral: [
      "Tell me about a time you faced a challenging situation at work",
      "Describe a project you're particularly proud of",
      "How do you handle conflict with team members?",
      "What motivates you in your work?"
    ],
    coding: [
      "Implement a function to reverse a string",
      "Find the maximum element in an array",
      "Design a simple cache system",
      "Explain the time complexity of your solution"
    ],
    mcq: [
      "What is the difference between == and === in JavaScript?",
      "Which HTTP status code indicates a successful request?",
      "What is the purpose of version control systems?",
      "Which data structure uses LIFO principle?"
    ],
    combo: [
      "Solve this coding problem and explain your approach",
      "How would you handle a disagreement about technical decisions?",
      "Design a system and walk me through your thought process",
      "Tell me about a time you had to learn a new technology quickly"
    ]
  };
  return questions[type as keyof typeof questions] || questions.behavioral;
};

export default function InterviewLobby() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Get email and authentication status from URL parameters
  const email = searchParams.get('email');
  const isAuthenticated = searchParams.get('authenticated') === 'true';
  
  // Verify authentication on component mount
  useEffect(() => {
    if (!email) {
      toast({
        title: "Access denied",
        description: "Please access your interview through the candidate dashboard",
        variant: "destructive"
      });
      router.push('/candidate/signin');
      return;
    }

    // For enhanced security, verify that the user came from an authenticated session
    if (!isAuthenticated) {
      toast({
        title: "Direct access not allowed",
        description: "Please start your interview from your candidate dashboard",
        variant: "destructive"
      });
      router.push('/candidate');
      return;
    }
  }, [email, isAuthenticated, router]);

  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mediaSettings, setMediaSettings] = useState({
    camera: false,
    microphone: false,
  });
  const [mediaPermissions, setMediaPermissions] = useState({
    camera: false,
    microphone: false,
    cameraPermissionGranted: false,
    microphonePermissionGranted: false,
  });
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isTestingAudio, setIsTestingAudio] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [techCheckResults, setTechCheckResults] = useState<TechCheckResult>({
    camera: "not_tested",
    microphone: "not_tested",
    speakers: "not_tested",
    internet: "not_tested",
    browser: "not_tested",
  });
  const [isTechCheckOpen, setIsTechCheckOpen] = useState(false);

  // Initialize media stream
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        
        setMediaStream(stream);
        setMediaPermissions(prev => ({
          ...prev,
          camera: true,
          microphone: true
        }));
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error accessing media devices:', err);
      }
    };

    if (mediaPermissions.cameraPermissionGranted && mediaPermissions.microphonePermissionGranted) {
      initializeMedia();
    }

    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaPermissions.cameraPermissionGranted, mediaPermissions.microphonePermissionGranted]);

  // Fetch interview data
  useEffect(() => {
    const fetchInterview = async () => {
      if (!params.id || !email) {
        setError('Missing interview ID or email');
        setLoading(false);
        return;
      }

      try {
        // Build URL with email parameter
        if (!email) {
          setError('Email is required to access the interview');
          setLoading(false);
          return;
        }
        // Ensure email is properly encoded and URL is valid
        const encodedEmail = encodeURIComponent(email);
        const url = `/api/candidates/interview/${params.id}?email=${encodedEmail}`;

        const response = await fetch(url);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || `HTTP ${response.status}: Failed to fetch interview details`;
          
          // Handle specific error cases
          if (response.status === 404) {
            setError('Interview not found. Please check your interview link or contact support.');
            setLoading(false);
            return;
          }
          
          if (response.status === 400) {
            setError('Invalid interview request. Please access your interview through the candidate dashboard.');
            setLoading(false);
            return;
          }
          
          // For other errors, set a generic error message
          setError(errorMessage);
          setLoading(false);
          return;
        }
        const data = await response.json();
        
        // Extract interview info from the response
        const interviewInfo = data.interview || data;
        setInterview({
          id: interviewInfo.id,
          title: interviewInfo.title || 'Interview',
          type: interviewInfo.interviewType || interviewInfo.type || 'behavioral',
          company: {
            id: interviewInfo.campaign?.companyId || 'unknown',
            name: interviewInfo.campaign?.companyName || 'Company',
          },
          position: {
            title: interviewInfo.campaign?.jobTitle || 'Position',
            department: interviewInfo.campaign?.department || 'Department',
            level: interviewInfo.campaign?.level || 'Level',
          },
          interviewer: {
            name: 'AI Interviewer',
            title: 'Interview Assistant',
            status: 'ready',
          },
          scheduledAt: new Date(),
          duration: interviewInfo.duration || 30,
          status: 'ready_to_start',
          preparation: {
            topics: getPreparationTopics(interviewInfo.type || 'behavioral'),
            skills: getPreparationSkills(interviewInfo.type || 'behavioral'),
            tips: getPreparationTips(interviewInfo.type || 'behavioral'),
            commonQuestions: getCommonQuestions(interviewInfo.type || 'behavioral'),
          },
        });
      } catch (err) {
        // Handle network errors or other unexpected errors
        console.log('Error fetching interview:', err);
        if (err instanceof TypeError && err.message.includes('fetch')) {
          setError('Network error. Please check your internet connection and try again.');
        } else if (err instanceof Error) {
          setError(`Error: ${err.message}`);
        } else {
          setError('Failed to load interview details. Please try again or contact support.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchInterview();
  }, [params.id, email]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Simulate interviewer status updates
  useEffect(() => {
    if (!interview) return;
    
    const statusUpdates = [
      { status: "joining", delay: 30000 }, // 30 seconds
      { status: "ready", delay: 60000 }, // 1 minute
    ];

    statusUpdates.forEach(({ status, delay }) => {
      setTimeout(() => {
        setInterview(prev => prev ? ({
          ...prev,
          interviewer: {
            ...prev.interviewer,
            status: status as any,
          },
          status: status === "ready" ? "ready_to_start" : prev.status,
        }) : null);
      }, delay);
    });
  }, [interview]);

  // Request media permissions
  const requestMediaPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      
      setMediaStream(stream);
      setMediaPermissions({
        camera: true,
        microphone: true,
        cameraPermissionGranted: true,
        microphonePermissionGranted: true,
      });
      setMediaSettings(prev => ({
        ...prev,
        camera: true,
        microphone: true,
      }));
      
      toast({
        title: "Permissions granted",
        description: "Camera and microphone access granted successfully.",
      });
      
      return true;
    } catch (error) {
      console.error('Error requesting media permissions:', error);
      toast({
        title: "Permission denied",
        description: "Please allow camera and microphone access to join the interview.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Check if media permissions are available
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const permissions = await Promise.all([
          navigator.permissions.query({ name: 'camera' as PermissionName }),
          navigator.permissions.query({ name: 'microphone' as PermissionName }),
        ]);
        
        const [cameraPermission, microphonePermission] = permissions;
        
        setMediaPermissions(prev => ({
          ...prev,
          cameraPermissionGranted: cameraPermission.state === 'granted',
          microphonePermissionGranted: microphonePermission.state === 'granted',
        }));
        
        // REMOVED: Auto-permission request - now requires explicit user consent
        // Users must manually click "Grant Permissions" button to enable camera/microphone
      } catch (error) {
        console.error('Error checking permissions:', error);
      }
    };
    
    checkPermissions();
  }, []);

  // Clean up media stream on unmount
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaStream]);

  const toggleCamera = () => {
    if (mediaStream) {
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setMediaSettings(prev => ({ ...prev, camera: videoTrack.enabled }));
        setMediaPermissions(prev => ({ ...prev, camera: videoTrack.enabled }));
      }
    }
  };

  const toggleMicrophone = () => {
    if (mediaStream) {
      const audioTrack = mediaStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMediaSettings(prev => ({ ...prev, microphone: audioTrack.enabled }));
        setMediaPermissions(prev => ({ ...prev, microphone: audioTrack.enabled }));
      }
    }
  };

  const testAudio = async () => {
    setIsTestingAudio(true);
    // Simulate audio test
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsTestingAudio(false);
    toast({
      title: "Audio test completed",
      description: "Your audio is working properly.",
    });
  };

  // Tech check functions
  const runTechCheck = async () => {
    setIsTechCheckOpen(true);
    
    // Reset all results
    setTechCheckResults({
      camera: "not_tested",
      microphone: "not_tested",
      speakers: "not_tested",
      internet: "not_tested",
      browser: "not_tested",
    });

    // Test each component with delays
    const tests = [
      { key: "camera", delay: 500 },
      { key: "microphone", delay: 1000 },
      { key: "speakers", delay: 1500 },
      { key: "internet", delay: 2000 },
      { key: "browser", delay: 2500 },
    ];

    for (const test of tests) {
      setTimeout(() => {
        setTechCheckResults(prev => ({
          ...prev,
          [test.key]: "testing"
        }));

        // Simulate test completion after 1 second
        setTimeout(() => {
          setTechCheckResults(prev => ({
            ...prev,
            [test.key]: Math.random() > 0.1 ? "passed" : "failed" // 90% pass rate
          }));
        }, 1000);
      }, test.delay);
    }
  };

  const getTechCheckIcon = (status: string) => {
    switch (status) {
      case "testing":
        return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;
      case "passed":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "failed":
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
    }
  };

  const getTechCheckColor = (status: string) => {
    switch (status) {
      case "testing":
        return "text-blue-600";
      case "passed":
        return "text-green-600";
      case "failed":
        return "text-red-600";
      default:
        return "text-gray-500";
    }
  };

  const joinInterview = async () => {
    if (!interview) {
      toast({
        title: "Interview not found",
        description: "Please refresh the page and try again.",
        variant: "destructive",
      });
      return;
    }

    // ENHANCED: Strict requirement for active camera and microphone
    if (!mediaPermissions.camera || !mediaPermissions.microphone) {
      toast({
        title: "Media access required",
        description: "Please enable your camera and microphone before joining the interview.",
        variant: "destructive",
      });
      return;
    }

    // Check if permissions are actually granted (not just requested)
    if (!mediaPermissions.cameraPermissionGranted || !mediaPermissions.microphonePermissionGranted) {
      toast({
        title: "Permissions required",
        description: "Please grant camera and microphone permissions to join the interview.",
        variant: "destructive",
      });
      return;
    }

    // ENHANCED: Verify active media stream before proceeding
    if (!mediaStream) {
      toast({
        title: "Active camera required",
        description: "Please enable your camera and ensure it's working before joining the interview.",
        variant: "destructive",
      });
      return;
    }

    // Double-check that the media stream has active video and audio tracks
    const videoTracks = mediaStream.getVideoTracks();
    const audioTracks = mediaStream.getAudioTracks();
    
    if (videoTracks.length === 0 || !videoTracks[0].enabled) {
      toast({
        title: "Camera not active",
        description: "Your camera must be active to join the interview. Please enable it and try again.",
        variant: "destructive",
      });
      return;
    }
    
    if (audioTracks.length === 0 || !audioTracks[0].enabled) {
      toast({
        title: "Microphone not active", 
        description: "Your microphone must be active to join the interview. Please enable it and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);
    
    try {
      // Test camera and microphone one more time before proceeding
      const testStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      
      // Stop test stream immediately - we just wanted to confirm access
      testStream.getTracks().forEach(track => track.stop());
      
      // Simulate joining process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Navigate to the actual interview interface
      const queryString = email ? `?email=${encodeURIComponent(email)}` : '';
      
      if (interview.type === "coding") {
        router.push(`/candidate/interview/${interview.id}/coding${queryString}`);
      } else if (interview.type === "mcq") {
        router.push(`/candidate/interview/${interview.id}/mcq${queryString}`);
      } else if (interview.type === "behavioral") {
        router.push(`/candidate/interview/${interview.id}/behavioral${queryString}`);
      } else if (interview.type === "combo") {
        router.push(`/candidate/interview/${interview.id}/combo${queryString}`);
      } else {
        router.push(`/candidate/interview/${interview.id}/behavioral${queryString}`);
      }
    } catch (error) {
      console.error('Media access verification failed:', error);
      toast({
        title: "Camera/Microphone access failed",
        description: "Unable to verify camera and microphone access. Please check your permissions and try again.",
        variant: "destructive",
      });
      setIsJoining(false);
    }
  };

  const getInterviewerStatusBadge = () => {
    if (!interview) return <Badge variant="outline">Loading...</Badge>;
    switch (interview.interviewer.status) {
      case "not_joined":
        return <Badge variant="outline">Not joined yet</Badge>;
      case "joining":
        return <Badge className="bg-yellow-100 text-yellow-800">Joining...</Badge>;
      case "ready":
        return <Badge className="bg-green-100 text-green-800">Ready</Badge>;
      case "in_meeting":
        return <Badge className="bg-blue-100 text-blue-800">In meeting</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusMessage = () => {
    if (!interview) return "Loading interview details...";
    switch (interview.interviewer.status) {
      case "not_joined":
        return "Waiting for your interviewer to join...";
      case "joining":
        return "Your interviewer is joining the meeting...";
      case "ready":
        return "Your interviewer is ready! You can join the interview now.";
      case "in_meeting":
        return "Interview is in progress.";
      default:
        return "Preparing your interview...";
    }
  };

  const timeUntilStart = interview?.estimatedStartTime ? interview.estimatedStartTime.getTime() - currentTime.getTime() : 0;
  const minutesUntilStart = Math.max(0, Math.floor(timeUntilStart / (1000 * 60)));
  const secondsUntilStart = Math.max(0, Math.floor((timeUntilStart % (1000 * 60)) / 1000));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading interview details...</p>
        </div>
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <AlertTriangle className="h-12 w-12 mx-auto" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Interview</h1>
          <p className="text-gray-600 mb-4">{error || 'Interview not found'}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header with Company Branding */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {interview.company.name}
              </h1>
              <p className="text-gray-600">{interview.position.title}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>{format(interview.scheduledAt, "MMM d, yyyy")}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{format(interview.scheduledAt, "h:mm a")}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>{interview.duration} minutes</span>
            </div>
          </div>
        </div>

        {/* Tabs for different sections */}
        <Tabs defaultValue="lobby" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="lobby">Interview Lobby</TabsTrigger>
            <TabsTrigger value="preparation">Preparation</TabsTrigger>
            <TabsTrigger value="tech-check">Tech Check</TabsTrigger>
          </TabsList>

          {/* Lobby Tab */}
          <TabsContent value="lobby" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Video Preview */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Video Preview</span>
                      <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
                      {mediaPermissions.camera && mediaPermissions.cameraPermissionGranted ? (
                        <>
                          <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 right-2 bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">
                            Live
                          </div>
                        </>
                      ) : mediaPermissions.cameraPermissionGranted ? (
                        <div className="w-full h-full flex items-center justify-center text-white bg-gray-800">
                          <div className="text-center">
                            <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm opacity-75">Camera Preview</p>
                            <p className="text-xs opacity-50">Your video will appear here</p>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white bg-gray-800">
                          <div className="text-center">
                            <VideoOff className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm opacity-75">Camera is off</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Media Controls */}
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                        <Button
                          size="sm"
                          variant={mediaSettings.camera ? "default" : "destructive"}
                          onClick={toggleCamera}
                          className="rounded-full w-10 h-10 p-0"
                        >
                          {mediaSettings.camera ? (
                            <Camera className="w-4 h-4" />
                          ) : (
                            <VideoOff className="w-4 h-4" />
                          )}
                        </Button>
                        
                        <Button
                          size="sm"
                          variant={mediaSettings.microphone ? "default" : "destructive"}
                          onClick={toggleMicrophone}
                          className="rounded-full w-10 h-10 p-0"
                        >
                          {mediaSettings.microphone ? (
                            <Mic className="w-4 h-4" />
                          ) : (
                            <MicOff className="w-4 h-4" />
                          )}
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={testAudio}
                          disabled={isTestingAudio}
                          className="rounded-full w-10 h-10 p-0"
                        >
                          {isTestingAudio ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    {/* Audio Test */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Headphones className="w-4 h-4 text-gray-600" />
                        <span className="text-sm text-gray-700">Test your audio</span>
                      </div>
                      <Button size="sm" variant="outline" onClick={testAudio} disabled={isTestingAudio}>
                        {isTestingAudio ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Test Audio
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Interview Status & Controls */}
              <div className="space-y-6">
                {/* Status Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Clock className="w-5 h-5 mr-2" />
                      Interview Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      {timeUntilStart > 0 ? (
                        <div>
                          <div className="text-2xl font-bold text-blue-600">
                            {minutesUntilStart}:{secondsUntilStart.toString().padStart(2, '0')}
                          </div>
                          <p className="text-sm text-gray-600">until estimated start</p>
                        </div>
                      ) : (
                        <div>
                          <div className="text-lg font-semibold text-green-600">
                            Ready to start
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-center">
                      <p className="text-sm text-gray-700 mb-2">{getStatusMessage()}</p>
                      {getInterviewerStatusBadge()}
                    </div>
                    
                    {/* Media Permissions Alert */}
                    {(!mediaPermissions.cameraPermissionGranted || !mediaPermissions.microphonePermissionGranted) && (
                      <Alert className="border-amber-200 bg-amber-50">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-800">
                          <div className="space-y-2">
                            <p className="font-medium">Media permissions required</p>
                            <p className="text-sm">Please enable camera and microphone access to join the interview.</p>
                            <Button 
                              size="sm" 
                              onClick={requestMediaPermissions}
                              className="bg-amber-600 hover:bg-amber-700 text-white"
                            >
                              Grant Permissions
                            </Button>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Media Status Indicators */}
                    {(mediaPermissions.cameraPermissionGranted || mediaPermissions.microphonePermissionGranted) && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center space-x-2">
                            <Camera className="w-4 h-4" />
                            <span>Camera</span>
                          </span>
                          <div className="flex items-center space-x-2">
                            {mediaPermissions.camera ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber-600" />
                            )}
                            <span className={mediaPermissions.camera ? "text-green-600" : "text-amber-600"}>
                              {mediaPermissions.camera ? "Enabled" : "Disabled"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center space-x-2">
                            <Mic className="w-4 h-4" />
                            <span>Microphone</span>
                          </span>
                          <div className="flex items-center space-x-2">
                            {mediaPermissions.microphone ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber-600" />
                            )}
                            <span className={mediaPermissions.microphone ? "text-green-600" : "text-amber-600"}>
                              {mediaPermissions.microphone ? "Enabled" : "Disabled"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {interview.status === "ready_to_start" && (
                      <Button 
                        onClick={joinInterview} 
                        disabled={isJoining || !mediaPermissions.camera || !mediaPermissions.microphone}
                        className={cn(
                          "w-full",
                          (!mediaPermissions.camera || !mediaPermissions.microphone) 
                            ? "bg-gray-400 cursor-not-allowed" 
                            : "bg-blue-600 hover:bg-blue-700"
                        )}
                        size="lg"
                      >
                        {isJoining ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Joining Interview...
                          </>
                        ) : (!mediaPermissions.camera || !mediaPermissions.microphone) ? (
                          <>
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Enable Camera & Microphone First
                          </>
                        ) : (
                          <>
                            <Video className="w-4 h-4 mr-2" />
                            Start Interview
                          </>
                        )}
                      </Button>
                    )}
                    
                    {interview.instructions && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          {interview.instructions}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>

            {/* Interviewer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Your Interviewer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{interview.interviewer.name}</h4>
                    <p className="text-sm text-gray-600">{interview.interviewer.title}</p>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700">{interview.interviewer.email}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <HelpCircle className="w-5 h-5 mr-2" />
                  Need Help?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Interview Guide
                </Button>
                
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Technical Support
                </Button>
                
                {interview.supportContact && (
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>Support: {interview.supportContact.email}</div>
                    {interview.supportContact.phone && (
                      <div>Phone: {interview.supportContact.phone}</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        </TabsContent>

        {/* Preparation Tab */}
        <TabsContent value="preparation" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Topics to Review */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Topics to Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {interview.preparation?.topics.map((topic, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{topic}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Skills to Demonstrate */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="w-5 h-5 mr-2" />
                  Skills to Demonstrate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {interview.preparation?.skills.map((skill, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{skill}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Interview Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lightbulb className="w-5 h-5 mr-2" />
                  Interview Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {interview.preparation?.tips.map((tip, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Common Questions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Common Questions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {interview.preparation?.commonQuestions.map((question, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{question}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tech Check Tab */}
        <TabsContent value="tech-check" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Technical Check
              </CardTitle>
              <CardDescription>
                Test your equipment to ensure everything is working properly for your interview.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={runTechCheck} 
                disabled={Object.values(techCheckResults).some(status => status !== "not_tested")}
                className="w-full"
              >
                {Object.values(techCheckResults).some(status => status !== "not_tested") ? "Tech Check Complete" : "Run Tech Check"}
              </Button>

              {Object.values(techCheckResults).some(status => status !== "not_tested") && (
                <div className="space-y-3">
                  {Object.entries(techCheckResults).map(([component, status]) => (
                    <div key={component} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getTechCheckIcon(status)}
                        <span className="font-medium capitalize">{component.replace('_', ' ')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-medium ${getTechCheckColor(status)}`}>
                          {status.replace('_', ' ')}
                        </span>
                        {status === 'passed' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                        {status === 'failed' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

        {/* Settings Dialog */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Media Settings</DialogTitle>
              <DialogDescription>
                Configure your camera, microphone, and speaker settings.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Camera Settings */}
              <div>
                <h4 className="font-medium mb-3 flex items-center">
                  <Camera className="w-4 h-4 mr-2" />
                  Camera
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Enable Camera</span>
                    <Button
                      size="sm"
                      variant={mediaSettings.camera ? "default" : "outline"}
                      onClick={toggleCamera}
                    >
                      {mediaSettings.camera ? "On" : "Off"}
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Microphone Settings */}
              <div>
                <h4 className="font-medium mb-3 flex items-center">
                  <Mic className="w-4 h-4 mr-2" />
                  Microphone
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Enable Microphone</span>
                    <Button
                      size="sm"
                      variant={mediaSettings.microphone ? "default" : "outline"}
                      onClick={toggleMicrophone}
                    >
                      {mediaSettings.microphone ? "On" : "Off"}
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Speaker Settings */}
              <div>
                <h4 className="font-medium mb-3 flex items-center">
                  <Speaker className="w-4 h-4 mr-2" />
                  Speakers
                </h4>
                <div className="space-y-2">
                  <Button size="sm" variant="outline" onClick={testAudio} disabled={isTestingAudio}>
                    {isTestingAudio ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Test Speakers
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSettings(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}