"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useReactMediaRecorder } from 'react-media-recorder';
import { Button } from '@/components/ui/shared/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Badge } from '@/components/ui/shared/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Square, 
  Play, 
  Pause, 
  Download, 
  Upload, 
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { useToast } from '@/shared/hooks/use-toast';
import azureStorageService from '@/lib/integrations/storage/azure';

interface VideoRecorderProps {
  interviewId?: string;
  candidateId?: string;
  questionId?: string;
  questionIndex?: number;
  onRecordingComplete?: (url: string, blob: Blob) => void;
  onUploadComplete?: (azureUrl: string) => void;
  maxDuration?: number; // in seconds
  showPreview?: boolean;
  autoUpload?: boolean;
  saveToDatabase?: boolean; // Whether to save metadata to database
  className?: string;
}

export const VideoRecorder: React.FC<VideoRecorderProps> = ({
  interviewId,
  candidateId,
  questionId,
  questionIndex,
  onRecordingComplete,
  onUploadComplete,
  maxDuration = 300, // 5 minutes default
  showPreview = true,
  autoUpload = false,
  saveToDatabase = false,
  className = ""
}) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [hasPermissions, setHasPermissions] = useState<boolean | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const {
    status,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    mediaBlobUrl,
    previewStream,
    clearBlobUrl
  } = useReactMediaRecorder({
    video: true,
    audio: true,
    askPermissionOnMount: true,
    blobPropertyBag: {
      type: 'video/webm;codecs=vp9,opus'
    },
    mediaRecorderOptions: {
      audioBitsPerSecond: 128000,
      videoBitsPerSecond: 2500000,
    },
    onStart: () => {
      setRecordingDuration(0);
      intervalRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1;
          if (newDuration >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          return newDuration;
        });
      }, 1000);
      
      toast({
        title: "Recording Started",
        description: "Your interview recording has begun.",
      });
    },
    onStop: (blobUrl, blob) => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      toast({
        title: "Recording Stopped",
        description: `Recording completed (${formatDuration(recordingDuration)})`,
      });

      if (onRecordingComplete) {
        onRecordingComplete(blobUrl, blob);
      }

      if (autoUpload && blob) {
        handleUpload(blob);
      }
    },
    // onError is not available in this version of react-media-recorder
    // Error handling is done through status monitoring
  });

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, []);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const checkPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      setHasPermissions(true);
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Permission error:', error);
      setHasPermissions(false);
      toast({
        title: "Permissions Required",
        description: "Please allow camera and microphone access to record video.",
        variant: "destructive",
      });
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = (): number => {
    return (recordingDuration / maxDuration) * 100;
  };

  const handleUpload = async (blob: Blob) => {
    if (!blob) {
      toast({
        title: "Upload Error",
        description: "No recording to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const baseFileName = interviewId 
        ? `interview-${interviewId}-${timestamp}`
        : candidateId 
        ? `candidate-${candidateId}-${timestamp}`
        : `recording-${timestamp}`;
      
      const fileName = questionIndex !== undefined 
        ? `${baseFileName}-q${questionIndex}.webm`
        : `${baseFileName}.webm`;

      // Simulate upload progress (since Azure doesn't provide real-time progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Upload to Azure
      let azureUrl: string;
      if (interviewId) {
        azureUrl = await azureStorageService.uploadRecording(blob, fileName, interviewId);
      } else {
        // For general recordings, use the uploadFile method
        azureUrl = await azureStorageService.uploadFile(
          new File([blob], fileName, { type: blob.type }),
          fileName,
          'interview-videos'
        );
      }

      clearInterval(progressInterval);
      setUploadProgress(100);

      toast({
        title: "Upload Successful",
        description: "Your recording has been saved to Azure Storage.",
      });

      // Save metadata to database if requested
      if (saveToDatabase && candidateId) {
        try {
          const response = await fetch('/api/candidate/recordings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              interviewId,
              questionId,
              questionIndex,
              azureUrl,
              duration: recordingDuration,
              fileSize: blob.size,
              recordingType: 'video',
            }),
          });

          if (!response.ok) {
            console.warn('Failed to save recording metadata to database');
          }
        } catch (dbError) {
          console.warn('Database save error:', dbError);
          // Don't show error to user as the main upload succeeded
        }
      }

      if (onUploadComplete) {
        onUploadComplete(azureUrl);
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload recording. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handlePreviewPlay = () => {
    if (videoPreviewRef.current) {
      if (isPreviewPlaying) {
        videoPreviewRef.current.pause();
      } else {
        videoPreviewRef.current.play();
      }
      setIsPreviewPlaying(!isPreviewPlaying);
    }
  };

  const handleDownload = () => {
    if (mediaBlobUrl) {
      const a = document.createElement('a');
      a.href = mediaBlobUrl;
      a.download = `recording-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  if (hasPermissions === false) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div className="text-center">
              <h3 className="text-lg font-semibold">Camera & Microphone Access Required</h3>
              <p className="text-sm text-gray-600 mt-2">
                Please allow camera and microphone permissions to record your interview.
              </p>
            </div>
            <Button onClick={checkPermissions} variant="outline">
              Check Permissions Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Video className="h-5 w-5" />
          <span>Video Recording</span>
          {status === 'recording' && (
            <Badge variant="destructive" className="animate-pulse">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
              REC
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Live Preview */}
        {previewStream && status === 'recording' && (
          <div className="relative">
            <video
              ref={videoPreviewRef}
              autoPlay
              muted
              playsInline
              className="w-full rounded-lg bg-black"
              style={{ maxHeight: '300px' }}
            />
            <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-sm font-medium">
              {formatDuration(recordingDuration)}
            </div>
          </div>
        )}

        {/* Recording Preview */}
        {mediaBlobUrl && showPreview && (
          <div className="relative">
            <video
              ref={videoPreviewRef}
              src={mediaBlobUrl}
              className="w-full rounded-lg bg-black"
              style={{ maxHeight: '300px' }}
              onPlay={() => setIsPreviewPlaying(true)}
              onPause={() => setIsPreviewPlaying(false)}
              onEnded={() => setIsPreviewPlaying(false)}
              controls
            />
          </div>
        )}

        {/* Recording Progress */}
        {status === 'recording' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Recording Progress</span>
              <span>{formatDuration(recordingDuration)} / {formatDuration(maxDuration)}</span>
            </div>
            <Progress value={getProgressPercentage()} className="w-full" />
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uploading to Azure...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap gap-2">
          {status === 'idle' && (
            <Button 
              onClick={startRecording}
              disabled={!hasPermissions}
              className="flex items-center space-x-2"
            >
              <Video className="h-4 w-4" />
              <span>Start Recording</span>
            </Button>
          )}

          {status === 'recording' && (
            <>
              <Button 
                onClick={pauseRecording}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <Pause className="h-4 w-4" />
                <span>Pause</span>
              </Button>
              <Button 
                onClick={stopRecording}
                variant="destructive"
                className="flex items-center space-x-2"
              >
                <Square className="h-4 w-4" />
                <span>Stop</span>
              </Button>
            </>
          )}

          {status === 'paused' && (
            <>
              <Button 
                onClick={resumeRecording}
                className="flex items-center space-x-2"
              >
                <Play className="h-4 w-4" />
                <span>Resume</span>
              </Button>
              <Button 
                onClick={stopRecording}
                variant="destructive"
                className="flex items-center space-x-2"
              >
                <Square className="h-4 w-4" />
                <span>Stop</span>
              </Button>
            </>
          )}

          {mediaBlobUrl && (
            <>
              {!autoUpload && (
                <Button 
                  onClick={() => {
                    // Get the actual blob from the mediaBlobUrl
                    fetch(mediaBlobUrl)
                      .then(response => response.blob())
                      .then(blob => handleUpload(blob))
                      .catch(error => {
                        console.error('Error getting blob:', error);
                        toast({
                          title: "Upload Error",
                          description: "Failed to prepare recording for upload.",
                          variant: "destructive",
                        });
                      });
                  }}
                  disabled={isUploading}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  <span>{isUploading ? 'Uploading...' : 'Upload to Azure'}</span>
                </Button>
              )}
              
              <Button 
                onClick={handleDownload}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Download</span>
              </Button>
              
              <Button 
                onClick={clearBlobUrl}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <AlertCircle className="h-4 w-4" />
                <span>Clear</span>
              </Button>
            </>
          )}
        </div>

        {/* Status Information */}
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4" />
            <span>Max Duration: {formatDuration(maxDuration)}</span>
          </div>
          {status !== 'idle' && (
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${
                status === 'recording' ? 'bg-red-500 animate-pulse' :
                status === 'paused' ? 'bg-yellow-500' :
                'bg-green-500'
              }`}></div>
              <span className="capitalize">{status}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoRecorder;