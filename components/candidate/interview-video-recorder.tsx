"use client";

import React, { useState, useEffect } from 'react';
import VideoRecorder from './video-recorder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Button } from '@/components/ui/shared/button';
import { Badge } from '@/components/ui/shared/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Video, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Play,
  Pause,
  Square
} from 'lucide-react';
import { useToast } from '@/shared/hooks/use-toast';

interface InterviewVideoRecorderProps {
  interviewId: string;
  candidateId: string;
  currentQuestion: {
    id: string;
    index: number;
    question: string;
    timeLimit?: number;
  };
  onRecordingComplete?: (questionId: string, azureUrl: string) => void;
  className?: string;
}

export const InterviewVideoRecorder: React.FC<InterviewVideoRecorderProps> = ({
  interviewId,
  candidateId,
  currentQuestion,
  onRecordingComplete,
  className = ""
}) => {
  const { toast } = useToast();
  const [hasRecorded, setHasRecorded] = useState(false);
  const [azureUrl, setAzureUrl] = useState<string>('');
  const [isRecordingStarted, setIsRecordingStarted] = useState(false);

  const handleRecordingCompleteLocal = (url: string, blob: Blob) => {
    setHasRecorded(true);
    toast({
      title: "Question Recorded",
      description: `Your response to question ${currentQuestion.index + 1} has been recorded.`,
    });
  };

  const handleUploadComplete = (uploadedAzureUrl: string) => {
    setAzureUrl(uploadedAzureUrl);
    
    if (onRecordingComplete) {
      onRecordingComplete(currentQuestion.id, uploadedAzureUrl);
    }

    toast({
      title: "Response Uploaded",
      description: "Your interview response has been saved successfully.",
      duration: 3000,
    });
  };

  // Reset state when question changes
  useEffect(() => {
    setHasRecorded(false);
    setAzureUrl('');
    setIsRecordingStarted(false);
  }, [currentQuestion.id]);

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Video className="h-5 w-5" />
              <span>Record Your Response</span>
            </div>
            <Badge variant="outline">
              Question {currentQuestion.index + 1}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Question Display */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Question:</strong> {currentQuestion.question}
            </AlertDescription>
          </Alert>

          {/* Time Limit Info */}
          {currentQuestion.timeLimit && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Time limit: {Math.floor(currentQuestion.timeLimit / 60)} minutes</span>
            </div>
          )}

          {/* Recording Status */}
          {hasRecorded && azureUrl && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="text-green-800">
                Your response has been recorded and uploaded successfully!
              </AlertDescription>
            </Alert>
          )}

          {/* Video Recorder Component */}
          <VideoRecorder
            interviewId={interviewId}
            candidateId={candidateId}
            questionId={currentQuestion.id}
            questionIndex={currentQuestion.index}
            onRecordingComplete={handleRecordingCompleteLocal}
            onUploadComplete={handleUploadComplete}
            maxDuration={currentQuestion.timeLimit || 300} // Use question time limit or default 5 minutes
            showPreview={true}
            autoUpload={true} // Auto upload for interviews
            saveToDatabase={true} // Save metadata to database for interviews
            className="w-full"
          />

          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Recording Instructions:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Make sure your camera and microphone are working</li>
              <li>• Speak clearly and maintain eye contact with the camera</li>
              <li>• Your recording will automatically upload when you stop</li>
              <li>• You can re-record if needed before moving to the next question</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InterviewVideoRecorder;