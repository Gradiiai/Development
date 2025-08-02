'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/shared/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Input } from '@/components/ui/shared/input';
import { Label } from '@/components/ui/shared/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/shared/badge';
import {
  Play,
  User,
  Mail,
  Briefcase,
  Clock,
  Settings,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Copy,
  Calendar,
  Timer,
  Target,
  Zap,
  Code,
  MessageSquare,
  HelpCircle,
  Shuffle,
  Terminal,
  RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface DemoFormData {
  candidateName: string;
  candidateEmail: string;
  position: string;
  interviewType: 'behavioral' | 'coding' | 'mcq' | 'combo';
  duration: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface MockAPIResponse {
  success: boolean;
  data?: any;
  error?: string;
  statusCode: number;
}

export default function DemoInterviewPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<DemoFormData>({
    candidateName: '',
    candidateEmail: '',
    position: '',
    interviewType: 'behavioral',
    duration: 30,
    difficulty: 'medium'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [demoInterview, setDemoInterview] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiLogs, setApiLogs] = useState<string[]>([]);
  const [showApiLogs, setShowApiLogs] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Mock API simulation with proper logging
  const mockAPICall = async (endpoint: string, method: string, data?: any): Promise<MockAPIResponse> => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${method} https://gradii.ai/api${endpoint}`;
    
    setApiLogs(prev => [...prev, logEntry]);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
    
    // Simulate different response scenarios
    const scenarios = ['success', 'success', 'success', 'validation_error'];
    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    
    if (scenario === 'validation_error' && Math.random() < 0.1) {
      const errorResponse = {
        success: false,
        error: 'Validation failed: Email format is invalid',
        statusCode: 400
      };
      setApiLogs(prev => [...prev, `[${new Date().toISOString()}] Response: ${errorResponse.statusCode} - ${errorResponse.error}`]);
      return errorResponse;
    }
    
    const successResponse = {
      success: true,
      data: {
        id: `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...data,
        status: 'demo_created',
        createdAt: new Date().toISOString(),
        interviewLink: `https://gradii.ai/candidate/interview/demo_${Date.now()}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        apiEndpoint: `https://gradii.ai/api${endpoint}`,
        demoQuestions: generateSampleQuestions(data.interviewType, data.difficulty)
      },
      statusCode: 201
    };
    
    setApiLogs(prev => [...prev, `[${new Date().toISOString()}] Response: ${successResponse.statusCode} - Interview created successfully`]);
    return successResponse;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setApiLogs([]);
    setShowApiLogs(true);

    try {
      // Simulate the actual API call to /api/v1/demo-interview
      const response = await mockAPICall('/v1/demo-interview', 'POST', formData);
      
      if (response.success) {
        setDemoInterview(response.data);
      } else {
        setError(response.error || 'Failed to create demo interview');
      }
    } catch (err) {
      setError('Network error: Failed to connect to gradii.ai API');
      setApiLogs(prev => [...prev, `[${new Date().toISOString()}] Error: Network connection failed`]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSampleQuestions = (type: string, difficulty: string) => {
    const questions = {
      behavioral: {
        easy: ['Tell me about yourself', 'Why are you interested in this position?', 'What motivates you?'],
        medium: ['Describe a challenging project you worked on', 'How do you handle conflicts?', 'Tell me about a time you showed leadership'],
        hard: ['Tell me about a time you failed', 'How do you make difficult decisions?', 'Describe a situation where you had to influence without authority']
      },
      coding: {
        easy: ['Reverse a string', 'Find maximum in array', 'Check if number is prime'],
        medium: ['Binary search implementation', 'Two sum problem', 'Merge sorted arrays'],
        hard: ['LRU Cache design', 'Serialize binary tree', 'Design a rate limiter']
      },
      mcq: {
        easy: ['What is REST API?', 'Basic programming concepts', 'HTTP status codes'],
        medium: ['Database normalization', 'OOP principles', 'Design patterns'],
        hard: ['System design concepts', 'Advanced algorithms', 'Distributed systems']
      },
      combo: {
        easy: ['Mix of easy behavioral and technical questions'],
        medium: ['Combination of medium-level questions across all types'],
        hard: ['Advanced questions mixing behavioral, coding, and system design']
      }
    };
    
    return questions[type as keyof typeof questions]?.[difficulty as keyof typeof questions.behavioral] || [];
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(type);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const resetDemo = () => {
    setDemoInterview(null);
    setApiLogs([]);
    setShowApiLogs(false);
    setError(null);
    setFormData({
      candidateName: '',
      candidateEmail: '',
      position: '',
      interviewType: 'behavioral',
      duration: 30,
      difficulty: 'medium'
    });
  };

  const getInterviewTypeIcon = (type: string) => {
    switch (type) {
      case 'behavioral': return <MessageSquare className="h-5 w-5" />;
      case 'coding': return <Code className="h-5 w-5" />;
      case 'mcq': return <HelpCircle className="h-5 w-5" />;
      case 'combo': return <Shuffle className="h-5 w-5" />;
      default: return <Play className="h-5 w-5" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hard': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  if (demoInterview) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                              <Link href="/landing/api-docs" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to API Documentation
              </Link>
              <div className="text-center">
                <div className="mx-auto mb-4 p-4 bg-green-100 rounded-full w-fit border-2 border-green-200">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  🎉 Demo Interview Created Successfully!
                </h1>
                <p className="text-gray-600">Your demo interview is ready to test on gradii.ai</p>
              </div>
            </div>

            {/* Alert */}
            <Alert className="mb-8 border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                This is a demo interview for testing purposes. No data is saved and the session expires in 24 hours.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Interview Details */}
              <Card className="border-2 border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center text-blue-800">
                    <Briefcase className="h-5 w-5 mr-2" />
                    Interview Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-blue-600 mr-2" />
                        <span className="text-gray-600">Candidate:</span>
                      </div>
                      <span className="font-medium text-gray-800">{demoInterview.candidateName}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200">
                      <div className="flex items-center">
                        <Target className="h-4 w-4 text-blue-600 mr-2" />
                        <span className="text-gray-600">Position:</span>
                      </div>
                      <span className="font-medium text-gray-800">{demoInterview.position}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200">
                      <div className="flex items-center">
                        {getInterviewTypeIcon(demoInterview.interviewType)}
                        <span className="text-gray-600 ml-2">Type:</span>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                        {demoInterview.interviewType}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200">
                      <div className="flex items-center">
                        <Timer className="h-4 w-4 text-blue-600 mr-2" />
                        <span className="text-gray-600">Duration:</span>
                      </div>
                      <span className="font-medium text-gray-800">{demoInterview.duration} minutes</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200">
                      <div className="flex items-center">
                        <Zap className="h-4 w-4 text-blue-600 mr-2" />
                        <span className="text-gray-600">Difficulty:</span>
                      </div>
                      <Badge className={getDifficultyColor(demoInterview.difficulty)}>
                        {demoInterview.difficulty}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sample Questions */}
              <Card className="border-2 border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="flex items-center text-green-800">
                    <HelpCircle className="h-5 w-5 mr-2" />
                    Sample Questions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {demoInterview.demoQuestions.map((question: string, index: number) => (
                      <div key={index} className="p-3 bg-white rounded-lg border border-green-200">
                        <div className="flex items-start">
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-green-100 text-green-800 text-xs font-medium rounded-full mr-3 mt-0.5">
                            {index + 1}
                          </span>
                          <p className="text-sm text-gray-700 flex-1">{question}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* API Information */}
              <Card className="border-2 border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="flex items-center text-red-800">
                    <Settings className="h-5 w-5 mr-2" />
                    API Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-white rounded-lg border border-red-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Endpoint:</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(demoInterview.apiEndpoint, 'endpoint')}
                        className="h-6 px-2"
                      >
                        {copiedText === 'endpoint' ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                    <code className="text-xs text-red-700 break-all">{demoInterview.apiEndpoint}</code>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-red-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Interview Link:</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(demoInterview.interviewLink, 'link')}
                        className="h-6 px-2"
                      >
                        {copiedText === 'link' ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                    <code className="text-xs text-red-700 break-all">{demoInterview.interviewLink}</code>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-red-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Interview ID:</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(demoInterview.id, 'id')}
                        className="h-6 px-2"
                      >
                        {copiedText === 'id' ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                    <code className="text-xs text-red-700">{demoInterview.id}</code>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-red-200">
                    <span className="text-sm font-medium text-gray-600">Expires:</span>
                    <p className="text-xs text-red-700 mt-1">
                      {new Date(demoInterview.expiresAt).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* API Logs */}
            {showApiLogs && apiLogs.length > 0 && (
              <Card className="mt-6 border-2 border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="flex items-center text-yellow-800">
                    <Terminal className="h-5 w-5 mr-2" />
                    API Request Logs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-900 rounded-lg p-4 max-h-48 overflow-y-auto">
                    {apiLogs.map((log, index) => (
                      <div key={index} className="text-green-400 text-xs font-mono mb-1">
                        {log}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="mt-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  className="bg-green-600 hover:bg-green-700 text-white border-2 border-green-600"
                  onClick={() => window.open(demoInterview.interviewLink, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Interview (Candidate View)
                </Button>
                <Button 
                  variant="outline" 
                  className="border-2 border-yellow-600 text-yellow-700 hover:bg-yellow-50"
                  onClick={() => setShowApiLogs(!showApiLogs)}
                >
                  <Terminal className="h-4 w-4 mr-2" />
                  {showApiLogs ? 'Hide' : 'Show'} API Logs
                </Button>
                <Button 
                  variant="outline" 
                  className="border-2 border-red-600 text-red-700 hover:bg-red-50"
                  onClick={resetDemo}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Create New Demo
                </Button>
              </div>
            </div>
            
            <Card className="mt-6">
              <CardContent className="pt-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Ready to integrate?</h4>
                  <p className="text-blue-700 text-sm mb-3">
                    Use our API to create real interviews programmatically. Get your API key and start building!
                  </p>
                  <Link href="/admin/api-keys">
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                      Get API Key
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
                            <Link href="/landing/api-docs" className="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition-colors">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to API Documentation
            </Link>
          </div>
          
          <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-indigo-100 rounded-full w-fit">
                <Play className="h-8 w-8 text-indigo-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-800">
                Try Interactive Demo
              </CardTitle>
              <p className="text-gray-600 mt-2">
                Create a demo interview to experience our platform firsthand
              </p>
              <div className="mt-4">
                <Button 
                  onClick={() => router.push('/landing/api-docs')}
                  variant="outline"
                  className="border-2 border-blue-600 text-blue-700 hover:bg-blue-50"
                >
                  <Code className="h-4 w-4 mr-2" />
                  View API Documentation
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              {error && (
                <Alert className="mb-6">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="candidateName">Candidate Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="candidateName"
                        value={formData.candidateName}
                        onChange={(e) => setFormData(prev => ({ ...prev, candidateName: e.target.value }))}
                        placeholder="John Doe"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="candidateEmail">Candidate Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="candidateEmail"
                        type="email"
                        value={formData.candidateEmail}
                        onChange={(e) => setFormData(prev => ({ ...prev, candidateEmail: e.target.value }))}
                        placeholder="john@example.com"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="position">Position</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                      placeholder="Software Engineer"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="interviewType">Interview Type</Label>
                    <Select
                      value={formData.interviewType}
                      onValueChange={(value: any) => setFormData(prev => ({ ...prev, interviewType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="behavioral">Behavioral</SelectItem>
                        <SelectItem value="coding">Coding</SelectItem>
                        <SelectItem value="mcq">MCQ</SelectItem>
                        <SelectItem value="combo">Combo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="duration"
                        type="number"
                        min="15"
                        max="120"
                        value={formData.duration}
                        onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select
                      value={formData.difficulty}
                      onValueChange={(value: any) => setFormData(prev => ({ ...prev, difficulty: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Settings className="h-4 w-4 mr-2 animate-spin" />
                      Creating Demo Interview...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Create Demo Interview
                    </>
                  )}
                </Button>
              </form>
              
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">Demo Features:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Experience the full interview flow</li>
                  <li>• Test different question types and difficulties</li>
                  <li>• See how candidates interact with the platform</li>
                  <li>• No data is saved - perfect for testing</li>
                  <li>• Demo expires in 24 hours</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}