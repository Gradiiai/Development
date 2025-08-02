'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shared/tabs';
import { Badge } from '@/components/ui/shared/badge';
import { Button } from '@/components/ui/shared/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/shared/input';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter } from 'recharts';
import { Users, Clock, Target, TrendingUp, Award, Brain, Filter, Download, Eye, EyeOff } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MCQAnalytics {
  id: string;
  interviewId: string;
  candidateName: string;
  candidateEmail: string;
  jobPosition: string;
  totalQuestions: number;
  correctAnswers: number;
  totalScore: number;
  averageTimePerQuestion: number;
  totalTimeSpent: number;
  completedAt: string;
  difficulty: string;
  sectionWiseAccuracy: {
    technical: number;
    behavioral: number;
    logical: number;
  };
  questionWiseResults: {
    questionId: string;
    question: string;
    selectedAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    timeSpent: number;
    confidence: number;
    difficulty: string;
    category: string;
  }[];
  aiFeedback: {
    overallPerformance: string;
    strengths: string[];
    improvements: string[];
    questionWiseFeedback: {
      questionId: string;
      feedback: string;
      recommendation: string;
    }[];
  };
}

interface DashboardStats {
  totalInterviews: number;
  averageScore: number;
  averageTimePerQuestion: number;
  completionRate: number;
  topPerformers: number;
  needsImprovement: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];
const SCORE_BANDS = [
  { name: 'Excellent', min: 90, max: 100, color: '#22c55e' },
  { name: 'Good', min: 75, max: 89, color: '#3b82f6' },
  { name: 'Average', min: 60, max: 74, color: '#f59e0b' },
  { name: 'Below Average', min: 40, max: 59, color: '#f97316' },
  { name: 'Poor', min: 0, max: 39, color: '#ef4444' }
];

export default function MCQAnalyticsPage() {
  const { data: session } = useSession();
  const [analytics, setAnalytics] = useState<MCQAnalytics[]>([]);
  const [filteredAnalytics, setFilteredAnalytics] = useState<MCQAnalytics[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalInterviews: 0,
    averageScore: 0,
    averageTimePerQuestion: 0,
    completionRate: 0,
    topPerformers: 0,
    needsImprovement: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<string>('all');
  const [selectedJobRole, setSelectedJobRole] = useState<string>('all');
  const [selectedScoreBand, setSelectedScoreBand] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAIFeedback, setShowAIFeedback] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<MCQAnalytics | null>(null);

  useEffect(() => {
    if (session?.user?.companyId) {
      fetchMCQAnalytics();
    }
  }, [session]);

  useEffect(() => {
    applyFilters();
  }, [analytics, selectedCandidate, selectedJobRole, selectedScoreBand, searchQuery]);

  const fetchMCQAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mcq-analytics');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
        calculateDashboardStats(data);
      }
    } catch (error) {
      console.error('Error fetching MCQ analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDashboardStats = (data: MCQAnalytics[]) => {
    const totalInterviews = data.length;
    const averageScore = data.reduce((sum, item) => sum + item.totalScore, 0) / totalInterviews || 0;
    const averageTimePerQuestion = data.reduce((sum, item) => sum + item.averageTimePerQuestion, 0) / totalInterviews || 0;
    const completionRate = (data.filter(item => item.totalQuestions > 0).length / totalInterviews) * 100 || 0;
    const topPerformers = data.filter(item => item.totalScore >= 80).length;
    const needsImprovement = data.filter(item => item.totalScore < 60).length;

    setDashboardStats({
      totalInterviews,
      averageScore: Math.round(averageScore),
      averageTimePerQuestion: Math.round(averageTimePerQuestion),
      completionRate: Math.round(completionRate),
      topPerformers,
      needsImprovement
    });
  };

  const applyFilters = () => {
    let filtered = analytics;

    if (selectedCandidate !== 'all') {
      filtered = filtered.filter(item => item.candidateEmail === selectedCandidate);
    }

    if (selectedJobRole !== 'all') {
      filtered = filtered.filter(item => item.jobPosition === selectedJobRole);
    }

    if (selectedScoreBand !== 'all') {
      const band = SCORE_BANDS.find(b => b.name === selectedScoreBand);
      if (band) {
        filtered = filtered.filter(item => item.totalScore >= band.min && item.totalScore <= band.max);
      }
    }

    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.candidateEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.jobPosition.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredAnalytics(filtered);
  };

  const getScoreBandData = () => {
    return SCORE_BANDS.map(band => ({
      name: band.name,
      count: filteredAnalytics.filter(item => item.totalScore >= band.min && item.totalScore <= band.max).length,
      color: band.color
    }));
  };

  const getPerformanceData = () => {
    return filteredAnalytics.map(item => ({
      name: item.candidateName,
      score: item.totalScore,
      timePerQuestion: item.averageTimePerQuestion,
      jobRole: item.jobPosition
    }));
  };

  const getSectionWiseData = () => {
    const sections = ['technical', 'behavioral', 'logical'];
    return sections.map(section => ({
      section: section.charAt(0).toUpperCase() + section.slice(1),
      accuracy: Math.round(
        filteredAnalytics.reduce((sum, item) => 
          sum + (item.sectionWiseAccuracy[section as keyof typeof item.sectionWiseAccuracy] || 0), 0
        ) / filteredAnalytics.length || 0
      )
    }));
  };

  const exportData = () => {
    const csvContent = [
      ['Candidate Name', 'Email', 'Job Position', 'Score', 'Accuracy %', 'Avg Time/Question', 'Completed At'].join(','),
      ...filteredAnalytics.map(item => [
        item.candidateName,
        item.candidateEmail,
        item.jobPosition,
        item.totalScore,
        Math.round((item.correctAnswers / item.totalQuestions) * 100),
        item.averageTimePerQuestion,
        new Date(item.completedAt).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mcq-analytics.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const uniqueCandidates = [...new Set(analytics.map(item => item.candidateEmail))];
  const uniqueJobRoles = [...new Set(analytics.map(item => item.jobPosition))];

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading MCQ analytics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">MCQ Interview Analytics</h1>
          <p className="text-muted-foreground">Comprehensive analysis of MCQ interview performance</p>
        </div>
        <div className="flex items-center gap-4">
          <Button onClick={exportData} variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </Button>
          <Button onClick={fetchMCQAnalytics} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Input
              placeholder="Search candidates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select value={selectedCandidate} onValueChange={setSelectedCandidate}>
              <SelectTrigger>
                <SelectValue placeholder="Select candidate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Candidates</SelectItem>
                {uniqueCandidates.map(email => (
                  <SelectItem key={email} value={email}>{email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedJobRole} onValueChange={setSelectedJobRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select job role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Job Roles</SelectItem>
                {uniqueJobRoles.map(role => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedScoreBand} onValueChange={setSelectedScoreBand}>
              <SelectTrigger>
                <SelectValue placeholder="Select score band" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Score Bands</SelectItem>
                {SCORE_BANDS.map(band => (
                  <SelectItem key={band.name} value={band.name}>{band.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={() => {
                setSelectedCandidate('all');
                setSelectedJobRole('all');
                setSelectedScoreBand('all');
                setSearchQuery('');
              }}
              variant="outline"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interviews</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.totalInterviews}</div>
            <p className="text-xs text-muted-foreground">
              {filteredAnalytics.length} filtered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.averageScore}%</div>
            <p className="text-xs text-muted-foreground">
              Across all interviews
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Time/Question</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.averageTimePerQuestion}s</div>
            <p className="text-xs text-muted-foreground">
              Per question
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Interview completion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performers</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.topPerformers}</div>
            <p className="text-xs text-muted-foreground">
              Score ≥ 80%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Need Improvement</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.needsImprovement}</div>
            <p className="text-xs text-muted-foreground">
              Score &lt; 60%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance Analysis</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Results</TabsTrigger>
          <TabsTrigger value="feedback">AI Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Score Distribution</CardTitle>
                <CardDescription>Distribution of candidates across score bands</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getScoreBandData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, count }) => `${name}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {getScoreBandData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Section-wise Accuracy</CardTitle>
                <CardDescription>Average accuracy across different question categories</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getSectionWiseData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="section" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="accuracy" fill={COLORS[1]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance vs Time Analysis</CardTitle>
              <CardDescription>Correlation between scores and time spent per question</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart data={getPerformanceData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timePerQuestion" name="Time per Question (s)" />
                  <YAxis dataKey="score" name="Score (%)" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter dataKey="score" fill={COLORS[0]} />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Interview Results</CardTitle>
              <CardDescription>Individual interview performance breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredAnalytics.map(interview => (
                  <Card key={interview.id} className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">{interview.candidateName}</h3>
                        <p className="text-sm text-muted-foreground">{interview.candidateEmail}</p>
                        <p className="text-sm text-muted-foreground">{interview.jobPosition}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{interview.totalScore}%</div>
                        <div className="text-sm text-muted-foreground">
                          {interview.correctAnswers}/{interview.totalQuestions} correct
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Avg Time/Q:</span>
                        <span className="ml-2 font-medium">{interview.averageTimePerQuestion}s</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Time:</span>
                        <span className="ml-2 font-medium">{Math.round(interview.totalTimeSpent / 60)}m</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Completed:</span>
                        <span className="ml-2 font-medium">{new Date(interview.completedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Button 
                      onClick={() => setSelectedInterview(interview)}
                      variant="outline" 
                      size="sm" 
                      className="mt-4"
                    >
                      View Details
                    </Button>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4">
          <Alert>
            <Eye className="h-4 w-4" />
            <AlertDescription>
              AI feedback is only visible to company administrators and interviewers. Candidates cannot access this information.
            </AlertDescription>
          </Alert>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI-Generated Feedback
                <Button
                  onClick={() => setShowAIFeedback(!showAIFeedback)}
                  variant="ghost"
                  size="sm"
                >
                  {showAIFeedback ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </CardTitle>
              <CardDescription>Comprehensive AI analysis of candidate performance</CardDescription>
            </CardHeader>
            {showAIFeedback && (
              <CardContent>
                <div className="space-y-4">
                  {filteredAnalytics.map(interview => (
                    <Card key={interview.id} className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold">{interview.candidateName}</h3>
                          <p className="text-sm text-muted-foreground">{interview.jobPosition}</p>
                        </div>
                        <Badge variant={interview.totalScore >= 80 ? 'default' : interview.totalScore >= 60 ? 'secondary' : 'destructive'}>
                          {interview.totalScore}% Score
                        </Badge>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium text-sm mb-2">Overall Performance</h4>
                          <p className="text-sm text-muted-foreground">{interview.aiFeedback.overallPerformance}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-sm mb-2 text-green-600">Strengths</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {interview.aiFeedback.strengths.map((strength, index) => (
                                <li key={index}>• {strength}</li>
                              ))}
                            </ul>
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-sm mb-2 text-orange-600">Areas for Improvement</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {interview.aiFeedback.improvements.map((improvement, index) => (
                                <li key={index}>• {improvement}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detailed Interview Modal */}
      {selectedInterview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedInterview.candidateName} - Detailed Results</CardTitle>
                  <CardDescription>{selectedInterview.jobPosition}</CardDescription>
                </div>
                <Button onClick={() => setSelectedInterview(null)} variant="outline">
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{selectedInterview.totalScore}%</div>
                    <div className="text-sm text-muted-foreground">Overall Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{selectedInterview.correctAnswers}/{selectedInterview.totalQuestions}</div>
                    <div className="text-sm text-muted-foreground">Correct Answers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{selectedInterview.averageTimePerQuestion}s</div>
                    <div className="text-sm text-muted-foreground">Avg Time/Question</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{Math.round(selectedInterview.totalTimeSpent / 60)}m</div>
                    <div className="text-sm text-muted-foreground">Total Time</div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-4">Question-wise Results</h3>
                  <div className="space-y-3">
                    {selectedInterview.questionWiseResults.map((result, index) => (
                      <Card key={result.questionId} className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium">Q{index + 1}: {result.question}</h4>
                            <div className="mt-2 space-y-1">
                              <p className="text-sm">
                                <span className="text-muted-foreground">Selected:</span>
                                <span className={`ml-2 ${result.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                  {result.selectedAnswer}
                                </span>
                              </p>
                              {!result.isCorrect && (
                                <p className="text-sm">
                                  <span className="text-muted-foreground">Correct:</span>
                                  <span className="ml-2 text-green-600">{result.correctAnswer}</span>
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <Badge variant={result.isCorrect ? 'default' : 'destructive'}>
                              {result.isCorrect ? 'Correct' : 'Incorrect'}
                            </Badge>
                            <div className="text-sm text-muted-foreground mt-1">
                              {result.timeSpent}s • {result.category}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}