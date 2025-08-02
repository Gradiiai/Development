'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface RegularInterviewProps {
  params: Promise<{ id: string }>;
}

interface InterviewQuestion {
  id: number;
  question: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  answer?: string;
}

export default function RegularInterviewPage({ params }: RegularInterviewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [interview, setInterview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [timeRemaining, setTimeRemaining] = useState(3600); // 60 minutes
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  
  // Speech recognition state
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [browserSupportsSpeechRecognition, setBrowserSupportsSpeechRecognition] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [speechRecognitionErrors, setSpeechRecognitionErrors] = useState(0);
  
  // Initialize speech recognition on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setBrowserSupportsSpeechRecognition(true);
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = true;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = 'en-US';
        
        recognitionInstance.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setTranscript(prev => prev + finalTranscript + ' ');
            // Reset error counter on successful recognition
            setSpeechRecognitionErrors(0);
          }
        };
        
        recognitionInstance.onstart = () => {
          setListening(true);
        };
        
        recognitionInstance.onend = () => {
          setListening(false);
        };
        
        recognitionInstance.onerror = (event: any) => {
          // Handle different types of speech recognition errors
          if (event.error === 'no-speech') {
            // This is a common error when no speech is detected, don't log as error
            console.log('No speech detected, continuing...');
            // Only restart if we haven't had too many consecutive errors
            setSpeechRecognitionErrors(prev => {
              const newCount = prev + 1;
              if (newCount < 5) {
                // Automatically restart recognition after a brief delay
                setTimeout(() => {
                  if (recognitionInstance && !listening) {
                    try {
                      recognitionInstance.start();
                    } catch (e) {
                      // Ignore if already running
                    }
                  }
                }, 1000);
              } else {
                console.warn('Too many speech recognition errors, stopping auto-restart');
              }
              return newCount;
            });
          } else if (event.error === 'audio-capture') {
            console.warn('Audio capture error - microphone may not be available');
            setSpeechRecognitionErrors(prev => prev + 1);
          } else if (event.error === 'not-allowed') {
            console.warn('Speech recognition not allowed - check microphone permissions');
            setSpeechRecognitionErrors(prev => prev + 1);
          } else {
            console.warn('Speech recognition error:', event.error);
            setSpeechRecognitionErrors(prev => prev + 1);
          }
          setListening(false);
        };
        
        setRecognition(recognitionInstance);
      }
    }
  }, []);
  const [interviewId, setInterviewId] = useState<string | null>(null);

  

  // Resolve params on component mount
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params;
      setInterviewId(resolvedParams.id);
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    const email = searchParams.get('email');
    
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
        
        if (!email) {
          throw new Error('Missing email parameter');
        }

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
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to load interview');
        }

        const interviewInfo = data.interview;
        
        // Filter questions for regular/behavioral type
        const regularQuestions = interviewInfo.questions?.filter((q: any) => 
          q.type === 'regular' || q.type === 'behavioral' || q.questionType === 'regular' || q.questionType === 'behavioral'
        ) || [];

        const interviewData = {
          id: interviewInfo.id,
          type: interviewInfo.interviewType,
          title: interviewInfo.title,
          companyName: interviewInfo.campaign?.companyName || 'Company',
          jobTitle: interviewInfo.campaign?.title || interviewInfo.title,
          duration: interviewInfo.duration,
          instructions: interviewInfo.description,
          questions: regularQuestions.length > 0 ? regularQuestions : [
            {
              id: 1,
              question: interviewInfo.description || 'Please introduce yourself and discuss your experience relevant to this position.',
              category: 'General',
              difficulty: 'easy'
            }
          ],
          status: interviewInfo.status,
          email: email
        };
        
        setInterview(interviewData);
        setTimeRemaining((interviewInfo.duration || 30) * 60); // Convert minutes to seconds
        
        // Start interview if not already started
        if (interviewInfo.status === 'not_started') {
          await startInterview(email);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error loading interview:', err);
        setError(err instanceof Error ? err.message : 'Failed to load interview');
        setLoading(false);
      }
    };

    validateAndLoadInterview();
  }, [interviewId, searchParams]);

  // Timer effect
  useEffect(() => {
    if (timeRemaining > 0 && interview) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && interview) {
      handleSubmitInterview(); // Auto-submit when time runs out
    }
  }, [timeRemaining, interview]);

  const handleAnswerChange = (questionId: number, answer: string) => {
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

  const startInterview = async (candidateEmail: string) => {
    try {
      await fetch(`/api/candidates/interview/${interviewId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start',
          email: candidateEmail
        }),
      });
    } catch (err) {
      console.error('Error starting interview:', err);
    }
  };

  const handleSubmitInterview = async () => {
    try {
      if (!interview?.email) {
        setError('Missing email parameter');
        return;
      }
      
      const response = await fetch(`/api/interviews/${interviewId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers: Object.entries(answers).map(([index, answer]) => ({
            questionId: `q${index}`,
            answer: answer,
            timeSpent: 30 // Default time per question
          })),
          totalTimeSpent: interview?.duration ? (interview.duration * 60 - timeRemaining) : 0,
          candidateEmail: interview.email
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

      // Redirect to completion page with email parameter
      const redirectUrl = `/candidate/interview/${interviewId}/complete?email=${encodeURIComponent(interview.email)}`;
      router.push(redirectUrl);
    } catch (err) {
      console.error('Error submitting interview:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit interview');
    }
  };

  // Auto-update answers with transcript
  useEffect(() => {
    if (transcript && interview?.questions[currentQuestion]) {
      const currentQ = interview.questions[currentQuestion];
      const currentAnswer = answers[currentQ.id || 0] || '';
      
      // Only update if transcript has new content
      if (!currentAnswer.includes(transcript.trim())) {
        handleAnswerChange(currentQ.id || 0, currentAnswer + transcript + ' ');
      }
    }
  }, [transcript, currentQuestion, interview]);

  // Auto-start recording and speech recognition when interview loads
  useEffect(() => {
    if (interview && !loading && !error && !isRecording) {
      // Auto-start recording and speech recognition after a short delay
      const timer = setTimeout(() => {
        startRecording();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [interview, loading, error]);



  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setRecordedChunks(prev => [...prev, blob]);
        // Stop all tracks to release camera/microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start();
       setMediaRecorder(recorder);
       setVideoStream(stream);
       setIsRecording(true);
       
       // Start speech recognition
        startSpeechRecognition();
      
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Unable to access camera/microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    
    stopSpeechRecognition();
    
    setIsRecording(false);
     setMediaRecorder(null);
     setVideoStream(null);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startSpeechRecognition = () => {
    if (browserSupportsSpeechRecognition && recognition && !listening) {
      try {
        // Additional check to prevent starting if already running
        if (recognition.state !== 'running') {
          recognition.start();
        }
      } catch (error) {
        // Only log non-trivial errors
        if (error instanceof Error && error.name !== 'InvalidStateError') {
          console.warn('Error starting speech recognition:', error);
        }
        // If already started, just update the listening state
        if (error instanceof Error && error.name === 'InvalidStateError') {
          setListening(true);
        }
      }
    }
  };

  const stopSpeechRecognition = () => {
    if (browserSupportsSpeechRecognition && recognition && listening) {
      try {
        recognition.stop();
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
    }
  };

  const resetTranscript = () => {
    setTranscript('');
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading interview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/candidate')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQ = interview?.questions?.[currentQuestion] || {};
  // Handle both Question (from AI) and question (legacy) formats
  const questionText = currentQ.Question || currentQ.question || 'Question not available';
  const progress = ((currentQuestion + 1) / interview.questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{interview.title}</h1>
              <p className="text-gray-600">Question {currentQuestion + 1} of {interview.questions.length}</p>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-mono ${
                timeRemaining < 300 ? 'text-red-600' : 'text-gray-900'
              }`}>
                {formatTime(timeRemaining)}
              </div>
              <p className="text-sm text-gray-500">Time remaining</p>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Recording Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleRecording}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                  isRecording 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${
                  isRecording ? 'bg-white animate-pulse' : 'bg-red-500'
                }`}></div>
                <span>{isRecording ? 'Stop Recording' : 'Start Recording'}</span>
              </button>
              {isRecording && (
                <div className="flex items-center space-x-2 text-red-600">
                  <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                  <span className="text-sm">Recording in progress</span>
                </div>
              )}
              {listening && (
                <div className="flex items-center space-x-2 text-blue-600">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  <span className="text-sm">Listening for speech...</span>
                </div>
              )}
            </div>
            <div className="text-sm text-gray-500">
              {browserSupportsSpeechRecognition ? (
                <span>💡 Tip: Your speech will be automatically transcribed</span>
              ) : (
                <span className="text-amber-600">⚠️ Speech recognition not available in this browser</span>
              )}
            </div>
          </div>
          
          {/* Video Preview and Transcript */}
          {(isRecording || transcript) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Video Preview */}
              {isRecording && videoStream && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Camera Preview</h4>
                  <video
                    ref={(video) => {
                      if (video && videoStream) {
                        video.srcObject = videoStream;
                      }
                    }}
                    autoPlay
                    muted
                    className="w-full h-32 bg-gray-900 rounded-lg object-cover"
                  />
                </div>
              )}
              
              {/* Live Transcript */}
              {(transcript || listening) && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    Live Transcript {listening && <span className="text-blue-600">(Listening...)</span>}
                  </h4>
                  <div className="h-32 p-3 bg-gray-50 rounded-lg overflow-y-auto text-sm">
                    {transcript || (listening ? 'Start speaking to see transcript...' : 'Transcript will appear here as you speak...')}
                  </div>
                  {transcript && (
                    <button
                      onClick={resetTranscript}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Clear transcript
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Question */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                getDifficultyColor(currentQ.difficulty || 'medium')
              }`}>
                {currentQ.difficulty ? currentQ.difficulty.charAt(0).toUpperCase() + currentQ.difficulty.slice(1) : 'Medium'}
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {currentQ.category || 'General'}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Question {currentQuestion + 1} of {interview.questions.length}
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <h2 className="text-xl font-semibold text-gray-900 leading-relaxed">
              {questionText}
            </h2>
          </div>
          
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Your Answer:
            </label>
            {!browserSupportsSpeechRecognition && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                <p className="text-sm text-yellow-800">
                  📝 Speech recognition is not available. Please type your answer below.
                </p>
              </div>
            )}
            <textarea
              value={answers[currentQ.id || 0] || ''}
              onChange={(e) => handleAnswerChange(currentQ.id || 0, e.target.value)}
              placeholder={browserSupportsSpeechRecognition ? "Type your answer here or speak to use voice input..." : "Type your answer here..."}
              className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <div className="text-sm text-gray-500">
              {answers[currentQ.id || 0]?.length || 0} characters
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center">
            {/* Previous button removed for sequential progression */}
            <div className="text-sm text-gray-600">
              Question {currentQuestion + 1} of {interview?.questions?.length || 0}
            </div>
            
            <div className="flex gap-2">
              {interview.questions.map((_: any, index: number) => (
                <div
                  key={index}
                  className={`w-8 h-8 rounded text-sm flex items-center justify-center ${
                    index === currentQuestion
                      ? 'bg-blue-600 text-white'
                      : index < currentQuestion
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                  style={{ cursor: 'default' }}
                >
                  {index + 1}
                </div>
              ))}
            </div>
            
            {currentQuestion === interview.questions.length - 1 ? (
              <button
                onClick={handleSubmitInterview}
                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
              >
                Submit Interview
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}