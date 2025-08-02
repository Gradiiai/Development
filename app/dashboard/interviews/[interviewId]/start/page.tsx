"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Interview } from "@/lib/database/schema";
import { db } from "@/lib/database/connection";
import { eq } from "drizzle-orm";
import { Loader2, ChevronLeft, ChevronRight, CheckCircle, Circle, ArrowLeft, ArrowRight, Clock, User } from "lucide-react";
import QuestionSection from "./_components/QuestionSection";
import RecordAnswer from "./_components/RecordAnswer";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/shared/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/shared/card";
import { Badge } from "@/components/ui/shared/badge";
import Link from "next/link";

type BaseQuestion = {
  Question: string;
  Answer: string;
  type?: 'behavioral' | 'mcq' | 'coding';
};

type MCQOption = {
  id: string;
  text: string;
  isCorrect?: boolean;
};

type MCQQuestion = BaseQuestion & {
  type: 'mcq';
  options?: MCQOption[];
  explanation?: string;
};

type CodingQuestion = BaseQuestion & {
  type: 'coding';
  difficulty?: 'easy' | 'medium' | 'hard';
  examples?: {
    input: string;
    output: string;
    explanation?: string;
  }[];
  constraints?: string[];
  hints?: string[];
};

type BehavioralQuestion = BaseQuestion & {
  type?: 'behavioral';
};

type InterviewQuestion = MCQQuestion | CodingQuestion | BehavioralQuestion;

export default function StartInterviewPage() {
  const params = useParams();
  const interviewId = params.interviewId as string;
  
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [interviewData, setInterviewData] = useState<any>(null);
  const [interviewQuestions, setInterviewQuestions] = useState<
    InterviewQuestion[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for MCQ answers and coding submissions
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, string>>({});
  const [codingSubmissions, setCodingSubmissions] = useState<Record<number, { code: string; language: string }>>({});

  // Fetch interview data
  useEffect(() => {
    const fetchInterviewData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch from the proper API endpoint instead of direct DB access
        const response = await fetch(`/api/interviews/${interviewId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch interview data');
        }
        
        const result = await response.json();
        
        if (!result || !result.data) {
          throw new Error('Invalid interview data received');
        }
        
        const interviewData = result.data;
        setInterviewData(interviewData);

        // Parse the AI-generated questions from the database
        try {
          if (!interviewData.interviewQuestions) {
            throw new Error('No interview questions found');
          }
          
          const interviewQuestionsData = typeof interviewData.interviewQuestions === 'string' 
            ? JSON.parse(interviewData.interviewQuestions)
            : interviewData.interviewQuestions;
            
          if (!Array.isArray(interviewQuestionsData) || interviewQuestionsData.length === 0) {
            throw new Error('Invalid or empty questions data');
          }
          
          setInterviewQuestions(interviewQuestionsData);
          console.log('Loaded AI-generated questions from database:', interviewQuestionsData.length);
        } catch (parseError) {
          console.error("Error parsing interview questions:", parseError);
          setError("Failed to load interview questions - Invalid data format");
        }
      } catch (error) {
        console.error("Error fetching interview data:", error);
        setError(error instanceof Error ? error.message : "Failed to load interview data");
      } finally {
        setIsLoading(false);
      }
    };

    if (interviewId) {
      fetchInterviewData();
    }
  }, [interviewId]);

  // Log when interviewQuestions updates
  useEffect(() => {
    console.log("interviewQuestions updated:", interviewQuestions);
  }, [interviewQuestions]);

  // Handle navigation between questions
  const handleNextQuestion = () => {
    setActiveQuestionIndex((prevIndex) =>
      prevIndex < interviewQuestions.length - 1 ? prevIndex + 1 : prevIndex
    );
  };

  // Handle previous question
  const handlePreviousQuestion = () => {
    setActiveQuestionIndex((prevIndex) => 
      prevIndex > 0 ? prevIndex - 1 : prevIndex
    );
  };

  // Handle MCQ answer selection
  const handleMCQAnswer = (questionIndex: number, selectedOption: string) => {
    setMcqAnswers(prev => ({
      ...prev,
      [questionIndex]: selectedOption
    }));
  };

  // Handle coding submission
  const handleCodingSubmit = (questionIndex: number, code: string, language: string) => {
    setCodingSubmissions(prev => ({
      ...prev,
      [questionIndex]: { code, language }
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading your interview...</p>
        </motion.div>
      </div>
    );
  }

  if (error || !interviewData || interviewQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-rose-50 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-8"
        >
          <div className="text-red-500 text-xl font-semibold mb-4">
            {error || "No interview questions found."}
          </div>
          <Link href="/dashboard">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const isLastQuestion = activeQuestionIndex === interviewQuestions.length - 1;
  const isFirstQuestion = activeQuestionIndex === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header with Progress */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Interview in Progress</h1>
                <p className="text-sm text-gray-600">{interviewData?.jobPosition}</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              <Clock className="h-4 w-4 mr-1" />
              Question {activeQuestionIndex + 1} of {interviewQuestions.length}
            </Badge>
          </div>
          
          {/* Step Indicator */}
          <div className="flex items-center justify-center space-x-2 mb-2">
            {interviewQuestions.map((_, index) => {
              const isActive = index === activeQuestionIndex;
              const isCompleted = index < activeQuestionIndex;
              
              return (
                <motion.div
                  key={index}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center"
                >
                  <div className={`relative flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${
                    isCompleted 
                      ? 'bg-green-500 text-white' 
                      : isActive 
                        ? 'bg-blue-500 text-white ring-4 ring-blue-200' 
                        : 'bg-gray-200 text-gray-500'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <span className="text-sm font-semibold">{index + 1}</span>
                    )}
                  </div>
                  {index < interviewQuestions.length - 1 && (
                    <div className={`w-12 h-1 mx-2 transition-all duration-300 ${
                      isCompleted ? 'bg-green-300' : 'bg-gray-200'
                    }`} />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <motion.div 
          key={activeQuestionIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 xl:grid-cols-5 gap-8"
        >
          {/* Question Section */}
          <div className="xl:col-span-2">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <QuestionSection
                activeQuestionIndex={activeQuestionIndex}
                interviewQuestions={interviewQuestions}
                onMCQAnswer={handleMCQAnswer}
                onCodingSubmit={handleCodingSubmit}
                mcqAnswers={mcqAnswers}
                codingSubmissions={codingSubmissions}
              />
            </motion.div>
          </div>
          
          {/* Recording Section */}
          <div className="xl:col-span-3">
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <RecordAnswer
                activeQuestionIndex={activeQuestionIndex}
                interviewData={interviewData}
                interviewQuestions={interviewQuestions}
              />
            </motion.div>
          </div>
        </motion.div>
        
        {/* Navigation Controls */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex justify-between items-center mt-8 p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg"
        >
          <Button 
            variant="outline" 
            onClick={handlePreviousQuestion}
            disabled={isFirstQuestion}
            className={`flex items-center gap-2 px-6 py-3 transition-all duration-300 ${
              isFirstQuestion 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-gray-50 hover:shadow-md'
            }`}
          >
            <ArrowLeft size={16} />
            Previous
          </Button>
          
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">Progress</p>
            <div className="flex items-center space-x-2">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${((activeQuestionIndex + 1) / interviewQuestions.length) * 100}%` }}
                  transition={{ duration: 0.5 }}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                />
              </div>
              <span className="text-sm font-semibold text-gray-700">
                {Math.round(((activeQuestionIndex + 1) / interviewQuestions.length) * 100)}%
              </span>
            </div>
          </div>
          
          {isLastQuestion ? (
            <Link href={`/dashboard/interviews/${interviewId}/feedback`}>
              <Button 
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
              >
                Complete Interview
                <CheckCircle size={16} />
              </Button>
            </Link>
          ) : (
            <Button 
              onClick={handleNextQuestion}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
            >
              Next Question
              <ArrowRight size={16} />
            </Button>
          )}
        </motion.div>
      </div>
    </div>
  );
}
