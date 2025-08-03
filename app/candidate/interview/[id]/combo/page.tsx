'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { Button } from '@/components/ui/shared/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Badge } from '@/components/ui/shared/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  CheckCircle,
  AlertTriangle, 
  Loader2,
  Shuffle,
  ArrowLeft,
  ArrowRight,
  Send,
  Code,
  MessageSquare,
  HelpCircle,
  Play,
  Square,
  Mic,
  Camera,
  VideoOff,
  Video
} from 'lucide-react';
import { useToast } from '@/shared/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ComboInterviewProps {
  params: Promise<{ id: string }>;
}

interface Question {
  id: number;
  type: 'mcq' | 'coding' | 'regular';
  question: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  options?: string[];
  correctAnswer?: number;
  selectedAnswer?: number;
  answer?: string;
  language?: string;
  starterCode?: string;
}

export default function ComboInterviewPage({ params }: ComboInterviewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const email = searchParams.get('email');

  const [interview, setInterview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(5400); // 90 minutes
  const [isRecording, setIsRecording] = useState(false);
  const [interviewId, setInterviewId] = useState<string | null>(null);

  // Video recording refs and state
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [fullInterviewRecording, setFullInterviewRecording] = useState<Blob | null>(null);

  console.log('Combo interview email parameter:', email);
  console.log('Search params:', Object.fromEntries(searchParams.entries()));

  // Initialize media stream for video recording
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        
        setStream(mediaStream);
        
        // Set video preview
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        
        // Initialize MediaRecorder
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
          const mediaRecorder = new MediaRecorder(mediaStream, {
            mimeType: 'video/webm;codecs=vp9'
          });
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              recordedChunksRef.current.push(event.data);
            }
          };
          
          mediaRecorder.onstop = () => {
            const fullVideoBlob = new Blob(recordedChunksRef.current, {
              type: 'video/webm'
            });
            setFullInterviewRecording(fullVideoBlob);
            console.log('Full interview recording completed:', fullVideoBlob.size, 'bytes');
          };
          
          mediaRecorderRef.current = mediaRecorder;
          console.log('MediaRecorder initialized for combo interview');
        }
      } catch (err) {
        console.error('Error accessing media devices:', err);
      }
    };

    initializeMedia();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Start recording when interview begins
  const startFullInterviewRecording = () => {
    if (mediaRecorderRef.current && !isRecording) {
      recordedChunksRef.current = [];
      mediaRecorderRef.current.start(1000); // Record in 1-second chunks
      setIsRecording(true);
      console.log('Full interview recording started');
    }
  };

  // Stop recording when interview is submitted
  const stopFullInterviewRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      console.log('Full interview recording stopped');
    }
  };

  // Resolve params on component mount
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params;
      setInterviewId(resolvedParams.id);
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    if (!email || !interviewId) {
      if (!email) {
        setError('Missing email parameter');
        setLoading(false);
      }
      return;
    }

    // Validate email and load interview data
    const validateAndLoadInterview = async () => {
      try {
        // Build URL with email parameter
        const url = `/api/candidates/interview/${interviewId}?email=${encodeURIComponent(email)}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load interview');
        }

        const data = await response.json();
        const interviewInfo = data.interview || data;
        
        console.log('Combo interview API response:', data);
        console.log('Interview info:', interviewInfo);
        console.log('Raw questions:', interviewInfo.questions);
        
        // Use all questions for combo interview
        const allQuestions = interviewInfo.questions || [];

        if (allQuestions.length === 0) {
          console.error('No questions found in combo interview');
          throw new Error('No questions found for this interview. Please contact the administrator.');
        }

        console.log('Processed questions for combo:', allQuestions);

        const interviewData = {
          id: interviewInfo.id,
          type: interviewInfo.interviewType || interviewInfo.type,
          title: interviewInfo.title,
          companyName: interviewInfo.campaign?.companyName,
          jobTitle: interviewInfo.campaign?.jobTitle,
          duration: interviewInfo.duration,
          instructions: interviewInfo.instructions,
          questions: allQuestions,
          status: interviewInfo.status,
          candidateEmail: email || interviewInfo.candidateEmail || ''
        };
        
        setInterview(interviewData);
        
        // Start interview if not already started
        if (interviewInfo.status === 'not_started') {
          await startInterview();
        }
        
        setIsInterviewStarted(interviewInfo.status !== 'not_started');
        
        // Set timer based on actual duration
        setTimeRemaining(interviewInfo.duration * 60); // Convert minutes to seconds
        setLoading(false);
      } catch (err) {
        console.error('Error loading interview:', err);
        setError(err instanceof Error ? err.message : 'Failed to load interview');
        setLoading(false);
      }
    };

    validateAndLoadInterview();
  }, [email, interviewId, searchParams]);

  // Timer effect
  useEffect(() => {
    if (timeRemaining > 0 && interview) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0) {
      handleSubmitInterview();
    }
  }, [timeRemaining, interview]);

  const handleAnswerChange = (questionId: number, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestion < interview.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const startInterview = async () => {
    try {
      // Start full interview recording
      startFullInterviewRecording();
      
      const response = await fetch(`/api/candidates/interview/${interviewId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateEmail: email }),
      });

      if (response.ok) {
        setIsInterviewStarted(true);
        console.log('Interview started successfully with recording');
      } else {
        console.error('Failed to start interview');
      }
    } catch (error) {
      console.error('Error starting interview:', error);
    }
  };

  const handleSubmitInterview = async () => {
    try {
      // Stop full interview recording
      stopFullInterviewRecording();
      
      const formattedAnswers = Object.entries(answers).map(([index, answer]) => ({
        questionIndex: parseInt(index),
        questionId: interview.questions[parseInt(index)]?.id || `q${index}`,
        question: interview.questions[parseInt(index)]?.question || interview.questions[parseInt(index)]?.title || '',
        answer: answer,
        timestamp: new Date().toISOString(),
        questionType: interview.questions[parseInt(index)]?.type || 'unknown'
      }));

      // Determine programming language from coding questions
      const codingQuestions = interview.questions.filter((q: any) => q.type === 'coding');
      const programmingLanguage = codingQuestions.length > 0 ? 
        (codingQuestions[0].language || 'javascript') : null;

      const submissionData = {
        candidateEmail: email,
        answers: formattedAnswers,
        totalQuestions: interview.questions.length,
        answeredQuestions: Object.keys(answers).length,
        interviewDuration: Math.floor((5400 - timeRemaining) / 60), // Duration in minutes
        completedAt: new Date().toISOString(),
        interviewType: 'combo',
        programmingLanguage: programmingLanguage
      };

      // Wait a moment for recording to finalize
      setTimeout(async () => {
        try {
          let videoRecordingUrl = null;
          
          // Upload video recording if available
          if (fullInterviewRecording) {
            videoRecordingUrl = await uploadInterviewVideo(fullInterviewRecording);
          }
          
          // Submit interview with all data including video URL
          const response = await fetch(`/api/candidates/interview/${interviewId}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...submissionData,
              videoRecordingUrl
            }),
          });

          if (response.ok) {
            toast({
              title: "Interview Submitted",
              description: "Your interview has been successfully submitted with video recording.",
            });
            
            router.push(`/candidate/interview/${interviewId}/complete?email=${encodeURIComponent(email || '')}`);
          } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to submit interview');
          }
        } catch (error) {
          console.error('Error in submission process:', error);
          throw error;
        }
      }, 2000); // Wait 2 seconds for recording to finalize
      
    } catch (error) {
      console.error('Error submitting interview:', error);
      toast({
        title: "Error",
        description: "Failed to submit interview. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Upload interview video to storage
  const uploadInterviewVideo = async (videoBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('video', videoBlob, `interview-${interviewId}-${Date.now()}.webm`);
      formData.append('interviewId', interviewId || '');
      formData.append('candidateEmail', email || '');
      formData.append('interviewType', 'combo');

      const uploadResponse = await fetch('/api/interviews/upload-video', {
        method: 'POST',
        body: formData,
      });

      if (uploadResponse.ok) {
        console.log('Interview video uploaded successfully');
      } else {
        console.error('Failed to upload interview video');
      }
    } catch (error) {
      console.error('Error uploading video:', error);
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // Here you would implement actual recording logic
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'mcq': return 'text-blue-600 bg-blue-100';
      case 'coding': return 'text-purple-600 bg-purple-100';
      case 'regular': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const renderQuestion = (question: Question) => {
    const questionId = question.id || currentQuestion; // Use index if no id
    
    switch (question.type) {
      case 'mcq':
        return (
          <div className="space-y-3">
            {question.options?.map((option, index) => (
              <label
                key={index}
                className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                  answers[questionId] === index
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name={`question-${questionId}`}
                  value={index}
                  checked={answers[questionId] === index}
                  onChange={() => handleAnswerChange(questionId, index)}
                  className="mr-3"
                />
                <span className="text-gray-900">{option}</span>
              </label>
            ))}
          </div>
        );
      
      case 'coding':
        return (
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300 text-sm">Language: {question.language || 'JavaScript'}</span>
                <button 
                  onClick={() => handleAnswerChange(questionId, question.starterCode || '')}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  Reset Code
                </button>
              </div>
              <textarea
                value={answers[questionId] || question.starterCode || ''}
                onChange={(e) => handleAnswerChange(questionId, e.target.value)}
                className="w-full h-64 bg-gray-800 text-green-400 font-mono text-sm p-4 border border-gray-700 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Write your code here..."
              />
            </div>
            <div className="flex justify-between items-center text-sm text-gray-500">
              <span>{(answers[questionId] || question.starterCode || '').length} characters</span>
              <div className="flex space-x-2">
                <button className="text-blue-600 hover:text-blue-700">Run Code</button>
                <button className="text-green-600 hover:text-green-700">Test</button>
              </div>
            </div>
          </div>
        );
      
      case 'regular':
      default:
        return (
          <div className="space-y-4">
            <textarea
              value={answers[questionId] || ''}
              onChange={(e) => handleAnswerChange(questionId, e.target.value)}
              placeholder="Type your answer here..."
              className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <div className="text-sm text-gray-500">
              {(answers[questionId] || '').length} characters
            </div>
          </div>
        );
    }
  };

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'mcq': return Code;
      case 'coding': return Code;
      case 'regular': return MessageSquare;
      default: return Code;
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

  const currentQ = interview.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / interview.questions.length) * 100;

  // Debug current question
  console.log('Current combo question:', {
    index: currentQuestion,
    total: interview.questions.length,
    question: currentQ,
    hasQuestionField: !!currentQ?.Question,
    hasLowercaseQuestionField: !!currentQ?.question,
    questionText: currentQ?.Question || currentQ?.question,
    questionType: currentQ?.type
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Shuffle className="h-6 w-6 mr-2 text-blue-600" />
                  {interview.title}
                </h1>
                <p className="text-gray-600">Question {currentQuestion + 1} of {interview.questions.length}</p>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-mono flex items-center ${
                  timeRemaining < 600 ? 'text-red-600' : 'text-gray-900'
                }`}>
                  <Clock className="h-5 w-5 mr-2" />
                  {formatTime(timeRemaining)}
                </div>
                <p className="text-sm text-gray-500">Time remaining</p>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recording Controls - Only show for regular questions */}
        {currentQ.type === 'regular' && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button
                    onClick={toggleRecording}
                    variant={isRecording ? "destructive" : "secondary"}
                    className="flex items-center space-x-2"
                  >
                    {isRecording ? (
                      <Square className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    <span>{isRecording ? 'Stop Recording' : 'Start Recording'}</span>
                  </Button>
                  {isRecording && (
                    <div className="flex items-center space-x-2 text-red-600">
                      <Mic className="w-4 h-4 animate-pulse" />
                      <span className="text-sm">Recording in progress</span>
                    </div>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  💡 Tip: Record your answers for better evaluation
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Question */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          {/* Camera Preview - Left Column */}
          <div className="col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Camera className="h-5 w-5 mr-2" />
                  Camera Feed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
                  {stream ? (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 flex items-center space-x-2">
                        {isRecording && (
                          <div className="bg-red-600 text-white px-2 py-1 rounded text-xs font-medium flex items-center">
                            <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></div>
                            REC
                          </div>
                        )}
                        <div className="bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">
                          Live
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white">
                      <div className="text-center">
                        <VideoOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm opacity-75">Camera Loading...</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Question Content - Right Columns */}
          <div className="col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl flex items-center">
                    {(() => {
                      const IconComponent = getQuestionTypeIcon(currentQ.type);
                      return <IconComponent className="h-5 w-5 mr-2" />;
                    })()}
                    Question {currentQuestion + 1}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge className={getTypeColor(currentQ.type)}>
                      {currentQ.type.toUpperCase()}
                    </Badge>
                    {currentQ.difficulty && (
                      <Badge className={getDifficultyColor(currentQ.difficulty)}>
                        {currentQ.difficulty.charAt(0).toUpperCase() + currentQ.difficulty.slice(1)}
                      </Badge>
                    )}
                    {currentQ.category && (
                      <Badge variant="outline">
                        {currentQ.category}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <h2 className="text-lg font-medium mb-6 text-gray-900">{currentQ.Question || currentQ.question || 'Question text not available'}</h2>
                
                {renderQuestion(currentQ)}
                
                {timeRemaining < 600 && (
                  <Alert className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Less than 10 minutes remaining! Please complete your answers.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Navigation */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              {/* Previous button removed for sequential progression */}
              <div className="text-sm text-gray-600">
                Question {currentQuestion + 1} of {interview?.questions?.length || 0}
              </div>
              
              <div className="flex gap-2 max-w-md overflow-x-auto">
                {interview.questions.map((q: Question, index: number) => {
                  const isCurrent = index === currentQuestion;
                  const IconComponent = getQuestionTypeIcon(q.type);
                  
                  return (
                    <div
                      key={index}
                      className={`w-12 h-12 rounded-lg text-sm font-medium transition-all duration-200 flex flex-col items-center justify-center relative ${
                        isCurrent
                          ? 'bg-blue-600 text-white shadow-lg'
                          : index < currentQuestion
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                      style={{ cursor: 'default' }}
                    >
                      <span className="text-xs">{index + 1}</span>
                      <IconComponent className="h-3 w-3" />
                      {index < currentQuestion && (
                        <CheckCircle className="h-3 w-3 absolute -top-1 -right-1 bg-white rounded-full" />
                      )}
                    </div>
                  );
                })}
              </div>
              
              {currentQuestion === interview.questions.length - 1 ? (
                <Button
                  onClick={handleSubmitInterview}
                  className="bg-green-600 hover:bg-green-700 flex items-center"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Submit Interview
                </Button>
              ) : (
                <Button
                  onClick={handleNextQuestion}
                  className="flex items-center"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
            
            {/* Question Summary */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                <div className="text-center">
                  <span className="block font-medium text-gray-900">{Object.keys(answers).length}</span>
                  <span>Answered</span>
                </div>
                <div className="text-center">
                  <span className="block font-medium text-gray-900">{interview.questions.length - Object.keys(answers).length}</span>
                  <span>Remaining</span>
                </div>
                <div className="text-center">
                  <span className="block font-medium text-gray-900">{interview.questions.length}</span>
                  <span>Total</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}