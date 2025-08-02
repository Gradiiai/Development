'use client';

import { useEffect, useState } from 'react';
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
  HelpCircle,
  ArrowLeft,
  ArrowRight,
  Send
} from 'lucide-react';

interface MCQInterviewProps {
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

interface MCQQuestion {
  id: number;
  question: string;
  options: string[] | Array<{id: number; text: string; isCorrect: boolean}>;
  correctAnswer?: number;
  selectedAnswer?: number;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  explanation?: string;
}

export default function MCQInterviewPage({ params }: MCQInterviewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [interview, setInterview] = useState<InterviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [interviewId, setInterviewId] = useState<string | null>(null);

  const email = searchParams.get('email');

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

        // Check if interview is already completed
        if (data.interview?.status === 'completed') {
          setError('This interview has already been completed. Thank you for your participation.');
          setLoading(false);
          return;
        }

        // Filter questions for MCQ type
        const mcqQuestions = data.interview?.questions?.filter((q: any) => 
          q.type === 'mcq' || q.questionType === 'mcq'
        ) || [];

        if (mcqQuestions.length === 0) {
          throw new Error('No MCQ questions found for this interview. Please contact the administrator.');
        }

        const interviewInfo = data.interview;
        const interviewData = {
          id: interviewInfo.id,
          type: interviewInfo.interviewType,
          title: interviewInfo.title,
          companyName: interviewInfo.campaign?.companyName || 'Company',
          jobTitle: interviewInfo.campaign?.title || interviewInfo.title,
          duration: interviewInfo.duration,
          instructions: interviewInfo.description,
          questions: mcqQuestions,
          status: interviewInfo.status,
          candidateEmail: email || interviewInfo.candidateEmail || ''
        };
        
        setInterview(interviewData);
        setTimeRemaining((interviewInfo.duration || 30) * 60); // Convert minutes to seconds
        
        // Load saved answers if they exist
        if (interviewInfo.savedAnswers && typeof interviewInfo.savedAnswers === 'object') {
          setAnswers(interviewInfo.savedAnswers);
        }
        
        // Start interview if not already started
        if (interviewInfo.status === 'not_started' || interviewInfo.status === 'pending') {
          await startInterview();
        }
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
    } else if (timeRemaining === 0 && interview) {
      handleSubmitInterview(); // Auto-submit when time runs out
    }
  }, [timeRemaining, interview]);

  // Debug logging - moved here to maintain hook order
  useEffect(() => {
    const currentQ = interview?.questions?.[currentQuestion] as MCQQuestion;
    if (currentQ) {
      console.log('Current question:', currentQ);
      console.log('Question ID:', currentQ.id);
      console.log('Current answers state:', answers);
      console.log('Is this question answered?', answers[currentQ.id] !== undefined);
    }
  }, [currentQuestion, interview, answers]);

  const handleAnswerSelect = async (questionId: number | undefined, answerIndex: number) => {
    console.log(`Selecting answer for question ${questionId}, option ${answerIndex}`);
    
    // Validate inputs
    if (questionId === undefined || answerIndex === undefined || questionId === null) {
      console.error('Invalid question ID or answer index', { questionId, answerIndex });
      return;
    }
    
    const newAnswers = {
      ...answers,
      [questionId]: answerIndex
    };
    
    console.log('Updated answers:', newAnswers);
    console.log('Total answered:', Object.keys(newAnswers).length);
    
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
          questionType: 'mcq',
          email: email
        }),
      });
    } catch (err) {
      console.error('Error saving progress:', err);
      // Don't show error to user for auto-save failures
    }
  };

  const handleNextQuestion = () => {
    if (interview?.questions && currentQuestion < interview.questions.length - 1) {
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
      if (!email) {
        console.error('Missing email parameter');
        return;
      }
      
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
      
      const response = await fetch(`/api/candidates/interview/${interviewId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'submit',
          answers: answers,
          timeSpent: interview?.duration ? (interview.duration * 60 - timeRemaining) : 0,
          questionType: 'mcq',
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

      // Redirect to completion page with email parameter
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

  const currentQ = interview?.questions?.[currentQuestion] as MCQQuestion;
  const progress = interview?.questions ? ((currentQuestion + 1) / interview.questions.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <HelpCircle className="h-6 w-6 mr-2 text-blue-600" />
                  {interview?.title || 'MCQ Interview'}
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

        {/* Question */}
        {currentQ && (
          <Card className="mb-6">
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
              <h2 className="text-lg font-medium mb-6 text-gray-900">{currentQ.question}</h2>
              
              <div className="space-y-3">
                {currentQ.options?.map((option: any, index: number) => {
                  // Handle both string and object formats
                  const optionText = typeof option === 'string' ? option : option.text;
                  
                  return (
                    <label
                      key={index}
                      className={`flex items-start p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                        answers[currentQ.id ?? currentQuestion] === index
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestion}-${currentQ.id ?? currentQuestion}`}
                        value={index}
                        checked={answers[currentQ.id ?? currentQuestion] === index}
                        onChange={() => handleAnswerSelect(currentQ.id ?? currentQuestion, index)}
                        className="mt-1 mr-3 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <span className="text-gray-900 leading-relaxed">{optionText}</span>
                      </div>
                      {answers[currentQ.id ?? currentQuestion] === index && (
                        <CheckCircle className="h-5 w-5 text-blue-600 ml-2 flex-shrink-0" />
                      )}
                    </label>
                  );
                }) || []}
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
          </Card>
        )}

        {/* Navigation */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              {/* Previous button removed for sequential progression */}
              <div className="text-sm text-gray-600">
                Question {currentQuestion + 1} of {interview?.questions?.length || 0}
              </div>
              
              <div className="flex gap-2 max-w-md overflow-x-auto">
                {interview?.questions?.map((question: any, index: number) => {
                  const questionId = question?.id || index; // Fallback to index if no ID
                  const isAnswered = answers[questionId] !== undefined;
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
              
              {currentQuestion === (interview?.questions?.length || 0) - 1 ? (
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
              <div className="flex justify-between text-sm text-gray-600">
                <span>
                  Answered: {Object.keys(answers).filter(key => answers[parseInt(key)] !== undefined).length} of {interview?.questions?.length || 0}
                </span>
                <span>
                  Remaining: {Math.max(0, (interview?.questions?.length || 0) - Object.keys(answers).filter(key => answers[parseInt(key)] !== undefined).length)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}