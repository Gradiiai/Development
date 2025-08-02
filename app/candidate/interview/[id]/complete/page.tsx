"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/shared/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/shared/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  Home,
  Briefcase,
  Calendar as CalendarIcon,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

interface Answer {
  questionId: string;
  question: string;
  selectedAnswer: {
    id: string;
    text: string;
    isCorrect: boolean;
  };
  correctAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
  marks: number;
  maxMarks: number;
}

interface Interview {
  id: string;
  title: string;
  companyName: string;
  jobTitle: string;
  completedAt: string;
  actualDuration: number;
  interviewType: string;
  score: number;
  maxScore: number;
  passed: boolean;
  answers: Answer[];
  questions: any[];
  timeSpent: number;
  totalQuestions: number;
  correctAnswers: number;
}

export default function InterviewComplete() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const interviewId = params.id as string;
  const email = searchParams.get("email");

  useEffect(() => {
    const fetchInterview = async () => {
      try {
        setLoading(true);

        if (!interviewId || !email) {
          throw new Error("Missing interview ID or email parameter");
        }

        // Build API URL with email parameter
        const response = await fetch(
          `/api/candidates/interview/${interviewId}/complete?email=${encodeURIComponent(email)}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch interview details");
        }

        const data = await response.json();
        setInterview(data.data || data);
      } catch (err) {
        console.error("Error fetching interview:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load interview details"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchInterview();
  }, [interviewId, email]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading interview details...</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Success Header */}
        <div className="text-center py-8">
          <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Interview Completed!
          </h1>
          <p className="text-lg text-gray-600 max-w-md mx-auto">
            Thank you for your time today. We'll review your interview and get
            back to you with next steps.
          </p>
        </div>

        {/* Interview Details */}
        <Card>
          <CardHeader className="text-center">
            <div className="space-y-1">
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                <Briefcase className="w-4 h-4" />
                <span>{interview.companyName}</span>
              </div>
              <CardTitle className="text-xl">{interview.jobTitle}</CardTitle>
              <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
                <span>
                  Completed:{" "}
                  {interview.completedAt &&
                  !isNaN(new Date(interview.completedAt).getTime())
                    ? format(
                        new Date(interview.completedAt),
                        "MMM dd, yyyy 'at' h:mm a"
                      )
                    : "Recently"}
                </span>
                <span>•</span>
                <span>Duration: {interview.actualDuration || 0} minutes</span>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Interview Results */}
        {interview.answers && interview.answers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="mb-6 text-center">Interview Results</CardTitle>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {interview.score || 0}
                  </div>
                  <div className="text-sm text-gray-600">Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {interview.correctAnswers || 0}
                  </div>
                  <div className="text-sm text-gray-600">Correct</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {(interview.totalQuestions - interview.correctAnswers) || 0}
                  </div>
                  <div className="text-sm text-gray-600">Incorrect</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {interview.totalQuestions || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total Questions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round((interview.timeSpent || 0) / 60)}m
                  </div>
                  <div className="text-sm text-gray-600">Time Spent</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <h3 className="font-semibold text-lg mb-4">
                  Question-wise Results
                </h3>
                {interview.answers.map((answer, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-2">
                          Q{index + 1}: {answer.question}
                        </h4>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-600">
                              Your Answer:
                            </span>
                            <span
                              className={`text-sm px-2 py-1 rounded ${
                                answer.isCorrect
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {answer.selectedAnswer?.text ||
                                "No answer selected"}
                            </span>
                          </div>
                          {!answer.isCorrect && (
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-600">
                                Correct Answer:
                              </span>
                              <span className="text-sm px-2 py-1 rounded text-green-800">
                                {answer.correctAnswer}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-sm">
                          <span
                            className={`font-medium ${
                              answer.isCorrect
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {answer.marks || 0}/{answer.maxMarks || 1}
                          </span>
                          <span className="text-gray-500 ml-1">marks</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {Math.round((answer.timeSpent || 0) / 60)}m{" "}
                          {(answer.timeSpent || 0) % 60}s
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle>What happens next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-blue-600">1</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Interview Review</p>
                  <p className="text-sm text-gray-600">
                    Our team will review your responses and assess your fit for
                    the role.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-blue-600">2</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    Decision & Follow-up
                  </p>
                  <p className="text-sm text-gray-600">
                    You'll receive an update within 3-5 business days about next
                    steps.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-blue-600">3</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    Next Round (if selected)
                  </p>
                  <p className="text-sm text-gray-600">
                    If you advance, we'll schedule your next interview round.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button onClick={() => router.push("/candidate")} className="flex-1">
            <Home className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push("/candidate/applications")}
            className="flex-1"
          >
            <Briefcase className="w-4 h-4 mr-2" />
            View Applications
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push("/candidate/interviews")}
            className="flex-1"
          >
            <CalendarIcon className="w-4 h-4 mr-2" />
            Interview History
          </Button>
        </div>
      </div>
    </div>
  );
}
