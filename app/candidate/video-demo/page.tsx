"use client";

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import VideoRecorder from '@/components/candidate/video-recorder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Badge } from '@/components/ui/shared/badge';
import { Button } from '@/components/ui/shared/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shared/tabs';
import { Video, Settings, Upload, Download } from 'lucide-react';
import { useToast } from '@/shared/hooks/use-toast';

export default function VideoRecorderDemo() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [recordings, setRecordings] = useState<Array<{
    id: string;
    url: string;
    azureUrl?: string;
    timestamp: Date;
    duration?: number;
  }>>([]);

  const handleRecordingComplete = (url: string, blob: Blob) => {
    const newRecording = {
      id: Date.now().toString(),
      url,
      timestamp: new Date(),
      duration: blob.size // This is size, not duration, but for demo purposes
    };
    
    setRecordings(prev => [...prev, newRecording]);
    
    toast({
      title: "Recording Saved",
      description: "Your recording has been saved locally.",
    });
  };

  const handleUploadComplete = (azureUrl: string) => {
    toast({
      title: "Upload Complete",
      description: "Recording uploaded to Azure Storage successfully!",
    });
    
    // Update the latest recording with Azure URL
    setRecordings(prev => 
      prev.map((recording, index) => 
        index === prev.length - 1 
          ? { ...recording, azureUrl }
          : recording
      )
    );
  };

  const candidateId = session?.user?.id || 'demo-candidate';

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Video Recording Demo</h1>
        <p className="text-gray-600">
          Test the video recording functionality with Azure Storage integration
        </p>
      </div>

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList>
          <TabsTrigger value="basic">Basic Recording</TabsTrigger>
          <TabsTrigger value="interview">Interview Mode</TabsTrigger>
          <TabsTrigger value="auto-upload">Auto Upload</TabsTrigger>
          <TabsTrigger value="recordings">My Recordings</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Video className="h-5 w-5" />
                <span>Basic Video Recording</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Record a video with audio. You can manually upload to Azure Storage after recording.
              </p>
              <VideoRecorder
                candidateId={candidateId}
                onRecordingComplete={handleRecordingComplete}
                onUploadComplete={handleUploadComplete}
                maxDuration={120} // 2 minutes
                showPreview={true}
                autoUpload={false}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Video className="h-5 w-5" />
                <span>Interview Recording Mode</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Record interview responses with question indexing for organized storage.
              </p>
              <VideoRecorder
                interviewId="demo-interview-123"
                candidateId={candidateId}
                questionIndex={1}
                onRecordingComplete={handleRecordingComplete}
                onUploadComplete={handleUploadComplete}
                maxDuration={300} // 5 minutes
                showPreview={true}
                autoUpload={false}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auto-upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>Auto Upload to Azure</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Automatically upload recordings to Azure Storage when recording stops.
              </p>
              <VideoRecorder
                candidateId={candidateId}
                onRecordingComplete={handleRecordingComplete}
                onUploadComplete={handleUploadComplete}
                maxDuration={180} // 3 minutes
                showPreview={true}
                autoUpload={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recordings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Download className="h-5 w-5" />
                <span>Recorded Videos ({recordings.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recordings.length === 0 ? (
                <div className="text-center py-8">
                  <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No recordings yet. Start recording to see them here!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recordings.map((recording, index) => (
                    <Card key={recording.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <video
                              src={recording.url}
                              className="w-24 h-16 rounded object-cover bg-black"
                              muted
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-white hover:text-white hover:bg-black/20"
                                onClick={() => {
                                  const video = document.createElement('video');
                                  video.src = recording.url;
                                  video.controls = true;
                                  video.style.maxWidth = '100%';
                                  video.style.maxHeight = '400px';
                                  
                                  const dialog = document.createElement('dialog');
                                  dialog.className = 'p-4 rounded-lg shadow-lg max-w-2xl';
                                  dialog.appendChild(video);
                                  
                                  const closeBtn = document.createElement('button');
                                  closeBtn.textContent = 'Close';
                                  closeBtn.className = 'mt-2 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300';
                                  closeBtn.onclick = () => {
                                    dialog.close();
                                    document.body.removeChild(dialog);
                                  };
                                  dialog.appendChild(closeBtn);
                                  
                                  document.body.appendChild(dialog);
                                  dialog.showModal();
                                }}
                              >
                                <Video className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium">Recording #{index + 1}</h4>
                            <p className="text-sm text-gray-600">
                              {recording.timestamp.toLocaleString()}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="outline">
                                {(recording.duration! / 1024 / 1024).toFixed(2)} MB
                              </Badge>
                              {recording.azureUrl ? (
                                <Badge variant="default" className="bg-green-100 text-green-800">
                                  Uploaded to Azure
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  Local Only
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const a = document.createElement('a');
                              a.href = recording.url;
                              a.download = `recording-${index + 1}.webm`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {recording.azureUrl && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                navigator.clipboard.writeText(recording.azureUrl!);
                                toast({
                                  title: "Copied!",
                                  description: "Azure URL copied to clipboard.",
                                });
                              }}
                            >
                              Copy Azure URL
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Configuration Info</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Recording Settings</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Format: WebM (VP9 + Opus)</li>
                <li>• Video Bitrate: 2.5 Mbps</li>
                <li>• Audio Bitrate: 128 kbps</li>
                <li>• Camera & Microphone required</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Azure Storage</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Container: interview-videos</li>
                <li>• Organized by interview/candidate ID</li>
                <li>• Automatic metadata tagging</li>
                <li>• Secure blob storage</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}