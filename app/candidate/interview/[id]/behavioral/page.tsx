'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/shared/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Badge } from '@/components/ui/shared/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Mic,
  MicOff,
  Video,
  VideoOff,
  ArrowRight,
  Send,
  Keyboard,
  Play,
  Pause,
  Square
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

// TypeScript declarations for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface BehavioralInterviewProps {
  params: Promise<{ id: string }>;
}

interface InterviewData {
  id: string;
  type: string;
  title: string;
  companyName: string;
  jobTitle: string;
  duration: number;
  instructions: string;
  questions: any[];
  status: string;
  candidateEmail: string;
}

interface BehavioralQuestion {
  id: number;
  question?: string;
  Question?: string; // Handle both formats from different tables
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  followUpQuestions?: string[];
  timeLimit?: number;
}

export default function BehavioralInterviewPage({ params }: BehavioralInterviewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // State
  const [interview, setInterview] = useState<InterviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [interviewId, setInterviewId] = useState<string | null>(null);
  
  // Media state
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  
  // Speech recognition state
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  
  // Input mode state
  const [inputMode, setInputMode] = useState<'typing' | 'speech'>('typing');
  const [typedAnswer, setTypedAnswer] = useState('');

  const email = searchParams.get('email');

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      setSpeechSupported(true);
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        console.log('Speech recognition started');
        setListening(true);
      };
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        setTranscript(prev => prev + finalTranscript + interimTranscript);
      };
      
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setListening(false);
      };
      
      recognition.onend = () => {
        console.log('Speech recognition ended');
        setListening(false);
      };
      
      recognitionRef.current = recognition;
    } else {
      console.warn('Speech recognition not supported');
      setSpeechSupported(false);
    }
  }, []);

  // Resolve params on component mount
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params;
      setInterviewId(resolvedParams.id);
    };
    resolveParams();
  }, [params]);

  // Start camera and microphone
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        console.log('Requesting media access...');
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: true
        });
        
        console.log('Media stream obtained:', mediaStream);
        setStream(mediaStream);
        setIsVideoEnabled(true);
        setIsMicEnabled(true);
        
        // Set video source and ensure it plays
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          
          // Ensure video starts playing
          videoRef.current.onloadedmetadata = () => {
            console.log('Video metadata loaded');
            if (videoRef.current) {
              videoRef.current.play().catch(err => {
                console.error('Error playing video:', err);
              });
            }
          };
        }

        // Initialize media recorder for video recording
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
          const mediaRecorder = new MediaRecorder(mediaStream, {
            mimeType: 'video/webm;codecs=vp9'
          });
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              recordedChunksRef.current.push(event.data);
              console.log('Video chunk recorded:', event.data.size, 'bytes');
            }
          };
          
          mediaRecorder.onstart = () => {
            console.log('MediaRecorder started');
          };
          
          mediaRecorder.onstop = () => {
            console.log('MediaRecorder stopped, total chunks:', recordedChunksRef.current.length);
          };
          
          mediaRecorder.onerror = (event) => {
            console.error('MediaRecorder error:', event);
          };
          
          mediaRecorderRef.current = mediaRecorder;
          console.log('Media recorder initialized with VP9');
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
          const mediaRecorder = new MediaRecorder(mediaStream, {
            mimeType: 'video/webm'
          });
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              recordedChunksRef.current.push(event.data);
              console.log('Video chunk recorded:', event.data.size, 'bytes');
            }
          };
          
          mediaRecorder.onstart = () => {
            console.log('MediaRecorder started');
          };
          
          mediaRecorder.onstop = () => {
            console.log('MediaRecorder stopped, total chunks:', recordedChunksRef.current.length);
          };
          
          mediaRecorder.onerror = (event) => {
            console.error('MediaRecorder error:', event);
          };
          
          mediaRecorderRef.current = mediaRecorder;
          console.log('Media recorder initialized with WebM fallback');
        } else {
          console.warn('MediaRecorder not supported for video recording');
        }
        
      } catch (err) {
        console.error('Error accessing media devices:', err);
        setError('Failed to access camera and microphone. Please grant permissions and refresh the page.');
      }
    };

    initializeMedia();

    // Cleanup function
    return () => {
      if (stream) {
        console.log('Cleaning up media stream');
        stream.getTracks().forEach(track => {
          track.stop();
          console.log('Stopped track:', track.kind);
        });
      }
      if (recognitionRef.current && listening) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Load interview data
  useEffect(() => {
    if (!email || !interviewId) {
      if (!email) {
        setError('Missing email parameter');
        setLoading(false);
      }
      return;
    }

    const validateAndLoadInterview = async () => {
      try {
        const response = await fetch(
          `/api/candidates/interview/${interviewId}?email=${encodeURIComponent(email)}`,
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

        console.log('Interview data loaded:', data.interview);
        console.log('Questions:', data.interview.questions);
        
        setInterview(data.interview);
        
        // Set initial time remaining
        if (data.interview.duration) {
          setTimeRemaining(data.interview.duration * 60);
        }

        // Start interview automatically
        await startInterview();
        
      } catch (err) {
        console.error('Error loading interview:', err);
        setError(err instanceof Error ? err.message : 'Failed to load interview');
      } finally {
        setLoading(false);
      }
    };

    validateAndLoadInterview();
  }, [email, interviewId]);

  // Timer effect
  useEffect(() => {
    if (timeRemaining > 0 && interview) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && interview) {
      handleSubmitInterview();
    }
  }, [timeRemaining, interview]);

  // Sync speech transcript with current answer
  useEffect(() => {
    if (inputMode === 'speech' && transcript) {
      const currentQ = interview?.questions?.[currentQuestion] as BehavioralQuestion;
      if (currentQ) {
        setAnswers(prevAnswers => ({
          ...prevAnswers,
          [currentQ.id]: transcript
        }));
      }
    }
  }, [transcript, inputMode, currentQuestion, interview]);

  // Debug current question
  useEffect(() => {
    if (interview && interview.questions) {
      console.log('Current question index:', currentQuestion);
      console.log('Total questions:', interview.questions.length);
      console.log('Current question object:', interview.questions[currentQuestion]);
    }
  }, [currentQuestion, interview]);

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleMicrophone = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicEnabled(audioTrack.enabled);
      }
    }
  };

  const startRecording = () => {
    if (mediaRecorderRef.current && !isRecording && stream) {
      try {
        recordedChunksRef.current = [];
        mediaRecorderRef.current.start(1000); // Record in 1-second chunks
        setIsRecording(true);
        console.log('Video recording started');
      } catch (err) {
        console.error('Error starting recording:', err);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        console.log('Video recording stopped');
      } catch (err) {
        console.error('Error stopping recording:', err);
      }
    }
  };

  const startSpeechRecognition = () => {
    if (recognitionRef.current && speechSupported) {
      setTranscript('');
      recognitionRef.current.start();
      setInputMode('speech');
      startRecording(); // Start video recording when speech starts
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current && listening) {
      recognitionRef.current.stop();
      stopRecording(); // Stop video recording when speech stops
    }
  };

  const clearTranscript = () => {
    setTranscript('');
    const currentQ = interview?.questions?.[currentQuestion] as BehavioralQuestion;
    if (currentQ) {
      handleAnswerChange(currentQ.id, '');
    }
  };

  const switchToTyping = () => {
    const currentQ = interview?.questions?.[currentQuestion] as BehavioralQuestion;
    if (currentQ) {
      setTypedAnswer(answers[currentQ.id] || '');
    }
    setInputMode('typing');
    if (listening) {
      stopSpeechRecognition();
    }
  };

  const handleAnswerChange = async (questionId: number, answer: string) => {
    const newAnswers = {
      ...answers,
      [questionId]: answer
    };
    
    setAnswers(newAnswers);
    
    // Auto-save progress
    try {
      if (!email) return;
      
      await fetch(`/api/candidates/interview/${interviewId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'save_progress',
          answers: newAnswers,
          timeSpent: interview?.duration ? (interview.duration * 60 - timeRemaining) : 0,
          questionType: 'behavioral',
          email: email
        }),
      });
    } catch (err) {
      console.error('Error saving progress:', err);
    }
  };

  const handleNextQuestion = () => {
    if (interview?.questions && currentQuestion < interview.questions.length - 1) {
      // Reset for next question
      setTranscript('');
      setTypedAnswer('');
      if (listening) {
        stopSpeechRecognition();
      }
      setInputMode('typing');
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const startInterview = async () => {
    try {
      if (!email) return;
      
      await fetch(`/api/candidates/interview/${interviewId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start',
          email: email
        }),
      });
    } catch (err) {
      console.error('Error starting interview:', err);
    }
  };

  const handleSubmitInterview = async () => {
    try {
      if (!email) {
        setError('Missing email parameter');
        return;
      }
      
      if (listening) {
        stopSpeechRecognition();
      }
      
      const response = await fetch(`/api/candidates/interview/${interviewId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'submit',
          answers: answers,
          timeSpent: interview?.duration ? (interview.duration * 60 - timeRemaining) : 0,
          questionType: 'behavioral',
          email: email
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit interview');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to submit interview');
      }

      router.push(`/candidate/interview/${interviewId}/complete?email=${encodeURIComponent(email)}`);
    } catch (err) {
      console.error('Error submitting interview:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit interview');
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hard': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading behavioral interview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertDescription>Interview not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  const currentQ = interview?.questions?.[currentQuestion] as BehavioralQuestion;
  const progress = interview?.questions ? ((currentQuestion + 1) / interview.questions.length) * 100 : 0;
  const currentAnswer = inputMode === 'speech' ? transcript : (typedAnswer || answers[currentQ?.id] || '');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {interview.title}
                </h1>
                <p className="text-gray-600">Question {currentQuestion + 1} of {interview?.questions?.length || 0}</p>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-mono flex items-center ${
                  timeRemaining < 300 ? 'text-red-600' : 'text-gray-900'
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Camera Feed */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Video Feed</span>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleVideo}
                    className={isVideoEnabled ? 'text-green-600' : 'text-red-600'}
                  >
                    {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleMicrophone}
                    className={isMicEnabled ? 'text-green-600' : 'text-red-600'}
                  >
                    {isMicEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-64 bg-gray-900 rounded-lg object-cover"
                />
                {isRecording && (
                  <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-medium flex items-center">
                    <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></div>
                    Recording
                  </div>
                )}
              </div>
              
              {/* Recording Status */}
              <div className="mt-3 text-center">
                <Badge variant={isRecording ? "destructive" : "outline"}>
                  {isRecording ? "Recording Interview" : "Ready to Record"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Question and Answer */}
          <Card className="lg:col-span-2">
            {currentQ ? (
              <>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">Question {currentQuestion + 1}</CardTitle>
                    <div className="flex items-center space-x-2">
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
                  <h2 className="text-lg font-medium mb-6 text-gray-900">
                    {currentQ.question || currentQ.Question || 'Question not available'}
                  </h2>
                  
                  {/* Input Mode Toggle */}
                  <div className="mb-4 flex space-x-2">
                    <Button
                      variant={inputMode === 'typing' ? 'default' : 'outline'}
                      size="sm"
                      onClick={switchToTyping}
                      className="flex items-center"
                    >
                      <Keyboard className="h-4 w-4 mr-2" />
                      Type Answer
                    </Button>
                    {speechSupported && (
                      <Button
                        variant={inputMode === 'speech' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setInputMode('speech')}
                        className="flex items-center"
                      >
                        <Mic className="h-4 w-4 mr-2" />
                        Speak Answer
                      </Button>
                    )}
                    {!speechSupported && (
                      <p className="text-sm text-gray-500 flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Speech recognition not supported in this browser
                      </p>
                    )}
                  </div>

                  {/* Answer Input */}
                  <div className="space-y-4">
                    {inputMode === 'typing' ? (
                      <Textarea
                        placeholder="Share your experience and provide specific examples..."
                        value={typedAnswer}
                        onChange={(e) => {
                          setTypedAnswer(e.target.value);
                          handleAnswerChange(currentQ.id, e.target.value);
                        }}
                        className="min-h-[200px] text-base leading-relaxed"
                      />
                    ) : (
                      <div className="space-y-4">
                        {/* Speech Recognition Area */}
                        <div className="border rounded-lg p-4 min-h-[200px] bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <p>Coming Soon</p>
                            {/* <p className="text-sm font-medium text-gray-700">
                              {listening ? 'Listening...' : 'Click to start speaking'}
                            </p> */}
                            {/* <div className="flex space-x-2">
                              {!listening ? (
                                <Button
                                  size="sm"
                                  onClick={startSpeechRecognition}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                  disabled={!speechSupported}
                                >
                                  <Play className="h-4 w-4 mr-1" />
                                  Start
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={stopSpeechRecognition}
                                  variant="outline"
                                >
                                  <Square className="h-4 w-4 mr-1" />
                                  Stop
                                </Button>
                              )}
                            </div> */}
                          </div>
                          
                          <div className="text-base leading-relaxed text-gray-900">
                            {transcript || (
                              <span className="text-gray-500 italic">
                                Your spoken answer will appear here...
                              </span>
                            )}
                          </div>
                          
                          {listening && (
                            <div className="flex items-center mt-2 text-sm text-red-600">
                              <div className="w-2 h-2 bg-red-600 rounded-full mr-2 animate-pulse"></div>
                              Listening for speech...
                            </div>
                          )}
                        </div>

                        {transcript && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={clearTranscript}
                          >
                            Clear & Restart
                          </Button>
                        )}
                      </div>
                    )}
                    
                    {currentQ.followUpQuestions && currentQ.followUpQuestions.length > 0 && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Consider these follow-up points:</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                          {currentQ.followUpQuestions.map((followUp, index) => (
                            <li key={index}>{followUp}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  {timeRemaining < 300 && (
                    <Alert className="mt-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Warning:</strong> Less than 5 minutes remaining!
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </>
            ) : (
              <CardContent>
                <Alert className="max-w-md">
                  <AlertDescription>
                    No questions available for this interview. Please contact the administrator.
                  </AlertDescription>
                </Alert>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Navigation */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Question {currentQuestion + 1} of {interview?.questions?.length || 0}
              </div>
              
              <div className="flex gap-2 max-w-md overflow-x-auto">
                {interview?.questions?.map((question: any, index: number) => {
                  const questionId = question?.id || index;
                  const isAnswered = answers[questionId] !== undefined && answers[questionId].trim() !== '';
                  const isCurrent = index === currentQuestion;
                  
                  return (
                    <div
                      key={index}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center ${
                        isCurrent
                          ? 'bg-blue-600 text-white shadow-lg'
                          : index < currentQuestion
                          ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                          : isAnswered
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {index + 1}
                      {isAnswered && !isCurrent && (
                        <CheckCircle className="h-3 w-3 ml-1" />
                      )}
                    </div>
                  );
                })}
              </div>
              
              {currentQuestion === interview.questions.length - 1 ? (
                <Button
                  onClick={handleSubmitInterview}
                  className="flex items-center"
                  disabled={!currentAnswer || currentAnswer.trim() === ''}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Submit Interview
                </Button>
              ) : (
                <Button
                  onClick={handleNextQuestion}
                  className="flex items-center"
                  disabled={!currentAnswer || currentAnswer.trim() === ''}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
            
            {/* Question Summary */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm text-gray-600">
                <span>
                  Answered: {Object.keys(answers).filter(key => answers[parseInt(key)]?.trim()).length} of {interview?.questions?.length || 0}
                </span>
                <span>
                  Remaining: {Math.max(0, (interview?.questions?.length || 0) - Object.keys(answers).filter(key => answers[parseInt(key)]?.trim()).length)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}