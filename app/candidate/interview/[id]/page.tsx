'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/shared/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Badge } from '@/components/ui/shared/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Play,
  Clock,
  User,
  Building,
  FileText,
  Code,
  MessageSquare,
  HelpCircle,
  Shuffle,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Camera,
  Mic,
  Monitor,
  Settings
} from 'lucide-react';

interface InterviewStartProps {
  params: Promise<{ id: string }>;
}

interface InterviewData {
  id: string;
  type: string;
  title: string;
  candidateEmail: string;
  status: string;
  questions: any[];
  settings: {
    timeLimit?: number;
    difficulty?: string;
    instructions?: string;
    companyName?: string;
    jobTitle?: string;
    [key: string]: any;
  };
  maxScore: number;
  startedAt?: Date;
}

interface SystemCheck {
  camera: boolean;
  microphone: boolean;
  browser: boolean;
  connection: boolean;
}

export default function InterviewStartPage({ params }: InterviewStartProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [interview, setInterview] = useState<InterviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [systemChecks, setSystemChecks] = useState<SystemCheck>({
    camera: false,
    microphone: false,
    browser: true,
    connection: true
  });
  const [isStarting, setIsStarting] = useState(false);
  const [hasAgreedToTerms, setHasAgreedToTerms] = useState(false);

  const email = searchParams.get('email');

  // Resolve params on component mount
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params;
      setInterviewId(resolvedParams.id);
    };
    resolveParams();
  }, [params]);

  // Load interview data
  useEffect(() => {
    if (!email || !interviewId) {
      if (!email) {
        setError('Missing email parameter. Please check your interview link.');
        setLoading(false);
      }
      return;
    }

    loadInterviewData();
  }, [email, interviewId]);

  // System checks
  useEffect(() => {
    performSystemChecks();
  }, []);

  const loadInterviewData = async () => {
    try {
      // Use the unified API endpoint to load the interview
      const response = await fetch(
        `/api/candidates/interview/${interviewId}?email=${encodeURIComponent(email!)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load interview');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load interview');
      }

      setInterview(data.interview);
      setLoading(false);
    } catch (err) {
      console.error('Error loading interview:', err);
      setError(err instanceof Error ? err.message : 'Failed to load interview');
      setLoading(false);
    }
  };

  const performSystemChecks = async () => {
    try {
      // Check camera access
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setSystemChecks(prev => ({ ...prev, camera: true, microphone: true }));
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.warn('Camera/microphone access denied:', err);
      setSystemChecks(prev => ({ ...prev, camera: false, microphone: false }));
    }
  };

  const getInterviewTypeInfo = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'behavioral':
      case 'regular':
        return {
          icon: MessageSquare,
          title: 'Behavioral Interview',
          description: 'Answer behavioral questions about your experience and skills',
          color: 'bg-blue-100 text-blue-800 border-blue-200'
        };
      case 'coding':
        return {
          icon: Code,
          title: 'Coding Interview',
          description: 'Solve coding problems and demonstrate your programming skills',
          color: 'bg-green-100 text-green-800 border-green-200'
        };
      case 'mcq':
        return {
          icon: HelpCircle,
          title: 'Multiple Choice Questions',
          description: 'Answer technical multiple choice questions',
          color: 'bg-purple-100 text-purple-800 border-purple-200'
        };
      case 'combo':
        return {
          icon: Shuffle,
          title: 'Combination Interview',
          description: 'Mixed format with behavioral, coding, and MCQ questions',
          color: 'bg-orange-100 text-orange-800 border-orange-200'
        };
      default:
        return {
          icon: FileText,
          title: 'Interview',
          description: 'Complete your interview assessment',
          color: 'bg-gray-100 text-gray-800 border-gray-200'
        };
    }
  }

  const handleStartInterview = async () => {
    if (!hasAgreedToTerms) {
      setError('Please agree to the terms and conditions before starting.');
      return;
    }

    if (!interview) {
      setError('Interview data not loaded.');
      return;
    }

    setIsStarting(true);
    setError(null);

    try {
      // Navigate to the appropriate interview component based on type
      const interviewType = interview.type?.toLowerCase();
      let redirectUrl = '';
      
      switch (interviewType) {
        case 'coding':
          redirectUrl = `/candidate/interview/${interviewId}/coding?email=${encodeURIComponent(email!)}`;
          break;
        case 'mcq':
          redirectUrl = `/candidate/interview/${interviewId}/mcq?email=${encodeURIComponent(email!)}`;
          break;
        case 'regular':
          case 'behavioral':
          redirectUrl = `/candidate/interview/${interviewId}/regular?email=${encodeURIComponent(email!)}`;
          break;
        case 'combo':
          redirectUrl = `/candidate/interview/${interviewId}/combo?email=${encodeURIComponent(email!)}`;
          break;
        default:
          redirectUrl = `/candidate/interview/${interviewId}/regular?email=${encodeURIComponent(email!)}`;
      }
      
      router.push(redirectUrl);
    } catch (err) {
      console.error('Error starting interview:', err);
      setError(err instanceof Error ? err.message : 'Failed to start interview');
      setIsStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading interview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <CardTitle className="text-red-800">Error</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-center mb-4">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="w-full"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Interview Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-center">The interview could not be found or has expired.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const typeInfo = getInterviewTypeInfo(interview.type);
  const TypeIcon = typeInfo.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 p-4 bg-blue-100 rounded-full w-fit border-2 border-blue-200">
              <TypeIcon className="h-12 w-12 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {interview.title || typeInfo.title}
            </h1>
            <p className="text-gray-600">{typeInfo.description}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Interview Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Interview Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {interview.settings?.companyName && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Building className="h-4 w-4 text-gray-500 mr-2" />
                      <span className="text-gray-600">Company:</span>
                    </div>
                    <span className="font-medium">{interview.settings.companyName}</span>
                  </div>
                )}
                {interview.settings?.jobTitle && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-gray-500 mr-2" />
                      <span className="text-gray-600">Position:</span>
                    </div>
                    <span className="font-medium">{interview.settings.jobTitle}</span>
                  </div>
                )}
                {interview.settings?.timeLimit && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-gray-500 mr-2" />
                      <span className="text-gray-600">Duration:</span>
                    </div>
                    <span className="font-medium">{interview.settings.timeLimit} minutes</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <TypeIcon className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-gray-600">Type:</span>
                  </div>
                  <Badge className={typeInfo.color}>
                    {interview.type}
                  </Badge>
                </div>
                {interview.settings?.difficulty && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Difficulty:</span>
                    <Badge variant="outline">{interview.settings.difficulty}</Badge>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Questions:</span>
                  <span className="font-medium">{interview.questions?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Max Score:</span>
                  <span className="font-medium">{interview.maxScore}</span>
                </div>
              </CardContent>
            </Card>

            {/* System Check */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  System Check
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Camera className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-gray-600">Camera:</span>
                  </div>
                  <div className="flex items-center">
                    {systemChecks.camera ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`ml-1 text-sm ${
                      systemChecks.camera ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {systemChecks.camera ? 'Ready' : 'Not Available'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Mic className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-gray-600">Microphone:</span>
                  </div>
                  <div className="flex items-center">
                    {systemChecks.microphone ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`ml-1 text-sm ${
                      systemChecks.microphone ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {systemChecks.microphone ? 'Ready' : 'Not Available'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Monitor className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-gray-600">Browser:</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="ml-1 text-sm text-green-600">Compatible</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Instructions */}
          {interview.settings?.instructions && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{interview.settings.instructions}</p>
              </CardContent>
            </Card>
          )}

          {/* Terms and Start */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important:</strong> This interview will be recorded for evaluation purposes. 
                    Make sure you are in a quiet environment with stable internet connection.
                  </AlertDescription>
                </Alert>

                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={hasAgreedToTerms}
                    onChange={(e) => setHasAgreedToTerms(e.target.checked)}
                    className="mt-1"
                  />
                  <label htmlFor="terms" className="text-sm text-gray-700">
                    I agree to the terms and conditions and understand that this interview will be recorded. 
                    I confirm that I am ready to begin the interview.
                  </label>
                </div>

                <div className="text-center">
                  <Button
                    onClick={handleStartInterview}
                    disabled={!hasAgreedToTerms || isStarting}
                    size="lg"
                    className="px-8 py-3"
                  >
                    {isStarting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Starting Interview...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Start Interview
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}