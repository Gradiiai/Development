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
import { Code, Clock, Target, TrendingUp, Award, Brain, Filter, Download, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CodingAnalytics {
  id: string;
  interviewId: string;
  candidateName: string;
  candidateEmail: string;
  jobPosition: string;
  totalProblems: number;
  solvedProblems: number;
  totalScore: number;
  averageTimePerProblem: number;
  totalTimeSpent: number;
  completedAt: string;
  difficulty: string;
  languageUsed: string;
  problemWiseResults: {
    problemId: string;
    problemTitle: string;
    solution: string;
    testCasesPassed: number;
    totalTestCases: number;
    timeSpent: number;
    difficulty: string;
    language: string;
    isOptimal: boolean;
  }[];
  aiFeedback: {
    overallPerformance: string;
    strengths: string[];
    improvements: string[];
    codeQuality: string;
    algorithmicThinking: string;
    problemWiseFeedback: {
      problemId: string;
      feedback: string;
      recommendation: string;
    }[];
  };
}

interface DashboardStats {
  totalInterviews: number;
  averageScore: number;
  averageTimePerProblem: number;
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

export default function CodingAnalyticsPage() {
  const { data: session } = useSession();
  const [analytics, setAnalytics] = useState<CodingAnalytics[]>([]);
  const [filteredAnalytics, setFilteredAnalytics] = useState<CodingAnalytics[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalInterviews: 0,
    averageScore: 0,
    averageTimePerProblem: 0,
    completionRate: 0,
    topPerformers: 0,
    needsImprovement: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<string>('all');
  const [selectedJobRole, setSelectedJobRole] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedScoreBand, setSelectedScoreBand] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAIFeedback, setShowAIFeedback] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<CodingAnalytics | null>(null);

  useEffect(() => {
    if (session?.user?.companyId) {
      fetchCodingAnalytics();
    }
  }, [session]);

  useEffect(() => {
    applyFilters();
  }, [analytics, selectedCandidate, selectedJobRole, selectedLanguage, selectedScoreBand, searchQuery]);

  const fetchCodingAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/coding-analytics?companyId=${session?.user?.companyId}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
        calculateDashboardStats(data);
      }
    } catch (error) {
      console.error('Error fetching coding analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDashboardStats = (data: CodingAnalytics[]) => {
    const totalInterviews = data.length;
    const averageScore = data.reduce((sum, item) => sum + item.totalScore, 0) / totalInterviews || 0;
    const averageTimePerProblem = data.reduce((sum, item) => sum + item.averageTimePerProblem, 0) / totalInterviews || 0;
    const completionRate = (data.filter(item => item.totalProblems > 0).length / totalInterviews) * 100 || 0;
    const topPerformers = data.filter(item => item.totalScore >= 80).length;
    const needsImprovement = data.filter(item => item.totalScore < 60).length;

    setDashboardStats({
      totalInterviews,
      averageScore: Math.round(averageScore),
      averageTimePerProblem: Math.round(averageTimePerProblem),
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

    if (selectedLanguage !== 'all') {
      filtered = filtered.filter(item => item.languageUsed === selectedLanguage);
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
      timePerProblem: item.averageTimePerProblem,
      solvedProblems: item.solvedProblems,
      totalProblems: item.totalProblems
    }));
  };

  const getLanguageData = () => {
    const languageStats = filteredAnalytics.reduce((acc, item) => {
      const lang = item.languageUsed;
      if (!acc[lang]) {
        acc[lang] = { count: 0, totalScore: 0 };
      }
      acc[lang].count++;
      acc[lang].totalScore += item.totalScore;
      return acc;
    }, {} as Record<string, { count: number; totalScore: number }>);

    return Object.entries(languageStats).map(([language, stats]) => ({
      language,
      count: stats.count,
      averageScore: Math.round(stats.totalScore / stats.count)
    }));
  };

  const exportData = () => {
    const csvContent = [
      ['Candidate Name', 'Email', 'Job Position', 'Score', 'Solved/Total', 'Language', 'Avg Time/Problem', 'Completed At'].join(','),
      ...filteredAnalytics.map(item => [
        item.candidateName,
        item.candidateEmail,
        item.jobPosition,
        item.totalScore,
        `${item.solvedProblems}/${item.totalProblems}`,
        item.languageUsed,
        `${item.averageTimePerProblem}s`,
        new Date(item.completedAt).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'coding-analytics.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const uniqueCandidates = [...new Set(analytics.map(item => item.candidateEmail))];
  const uniqueJobRoles = [...new Set(analytics.map(item => item.jobPosition))];
  const uniqueLanguages = [...new Set(analytics.map(item => item.languageUsed))];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading coding analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Coding Interview Analytics</h1>
          <p className="text-gray-600 mt-2">Comprehensive analysis of coding interview performance</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportData} variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Interviews</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardStats.totalInterviews}</p>
              </div>
              <Code className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Score</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardStats.averageScore}%</p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Time/Problem</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardStats.averageTimePerProblem}s</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardStats.completionRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Top Performers</p>
                <p className="text-2xl font-bold text-green-600">{dashboardStats.topPerformers}</p>
              </div>
              <Award className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Need Improvement</p>
                <p className="text-2xl font-bold text-red-600">{dashboardStats.needsImprovement}</p>
              </div>
              <Brain className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Search</label>
              <Input
                placeholder="Search candidates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Candidate</label>
              <Select value={selectedCandidate} onValueChange={setSelectedCandidate}>
                <SelectTrigger>
                  <SelectValue placeholder="All Candidates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Candidates</SelectItem>
                  {uniqueCandidates.map(candidate => (
                    <SelectItem key={candidate} value={candidate}>{candidate}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Job Role</label>
              <Select value={selectedJobRole} onValueChange={setSelectedJobRole}>
                <SelectTrigger>
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {uniqueJobRoles.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Language</label>
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger>
                  <SelectValue placeholder="All Languages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  {uniqueLanguages.map(language => (
                    <SelectItem key={language} value={language}>{language}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Score Band</label>
              <Select value={selectedScoreBand} onValueChange={setSelectedScoreBand}>
                <SelectTrigger>
                  <SelectValue placeholder="All Scores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Scores</SelectItem>
                  {SCORE_BANDS.map(band => (
                    <SelectItem key={band.name} value={band.name}>{band.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={() => {
                  setSelectedCandidate('all');
                  setSelectedJobRole('all');
                  setSelectedLanguage('all');
                  setSelectedScoreBand('all');
                  setSearchQuery('');
                }}
                variant="outline"
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts and Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance Analysis</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Results</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score Distribution */}
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

            {/* Language Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Programming Languages</CardTitle>
                <CardDescription>Usage and performance by programming language</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getLanguageData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="language" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" name="Count" />
                    <Bar dataKey="averageScore" fill="#82ca9d" name="Avg Score" />
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
              <CardDescription>Relationship between score and time spent per problem</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart data={getPerformanceData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timePerProblem" name="Time per Problem (s)" />
                  <YAxis dataKey="score" name="Score (%)" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter name="Candidates" data={getPerformanceData()} fill="#8884d8" />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Interview Results</CardTitle>
              <CardDescription>Individual candidate performance breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredAnalytics.map((interview) => (
                  <div key={interview.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{interview.candidateName}</h3>
                        <p className="text-gray-600">{interview.candidateEmail}</p>
                        <p className="text-sm text-gray-500">{interview.jobPosition}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">{interview.totalScore}%</div>
                        <div className="text-sm text-gray-500">
                          {interview.solvedProblems}/{interview.totalProblems} solved
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Language:</span>
                        <div className="font-medium">{interview.languageUsed}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Avg Time/Problem:</span>
                        <div className="font-medium">{interview.averageTimePerProblem}s</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Time:</span>
                        <div className="font-medium">{Math.round(interview.totalTimeSpent / 60)}m</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Completed:</span>
                        <div className="font-medium">{new Date(interview.completedAt).toLocaleDateString()}</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">Problem-wise Results:</h4>
                      <div className="grid gap-2">
                        {interview.problemWiseResults.map((problem, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex items-center gap-2">
                              {problem.isOptimal ? 
                                <CheckCircle className="h-4 w-4 text-green-600" /> : 
                                <XCircle className="h-4 w-4 text-red-600" />
                              }
                              <span className="font-medium">{problem.problemTitle}</span>
                              <Badge variant="outline">{problem.difficulty}</Badge>
                            </div>
                            <div className="text-sm text-gray-600">
                              {problem.testCasesPassed}/{problem.totalTestCases} test cases
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button 
                      onClick={() => {
                        setSelectedInterview(interview);
                        setShowAIFeedback(true);
                      }}
                      variant="outline" 
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View AI Feedback
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI-Powered Insights</CardTitle>
              <CardDescription>Comprehensive analysis and recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {filteredAnalytics.slice(0, 5).map((interview) => (
                  <div key={interview.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{interview.candidateName}</h3>
                        <p className="text-gray-600">{interview.jobPosition}</p>
                      </div>
                      <Badge 
                        variant={interview.totalScore >= 80 ? "default" : interview.totalScore >= 60 ? "secondary" : "destructive"}
                      >
                        {interview.totalScore}% Score
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Overall Performance</h4>
                        <p className="text-gray-700">{interview.aiFeedback.overallPerformance}</p>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium text-green-700 mb-2">Strengths</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                            {interview.aiFeedback.strengths.map((strength, idx) => (
                              <li key={idx}>{strength}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-orange-700 mb-2">Areas for Improvement</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                            {interview.aiFeedback.improvements.map((improvement, idx) => (
                              <li key={idx}>{improvement}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Code Quality Assessment</h4>
                          <p className="text-sm text-gray-700">{interview.aiFeedback.codeQuality}</p>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Algorithmic Thinking</h4>
                          <p className="text-sm text-gray-700">{interview.aiFeedback.algorithmicThinking}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* AI Feedback Modal */}
      {showAIFeedback && selectedInterview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold">{selectedInterview.candidateName} - AI Feedback</h2>
                  <p className="text-gray-600">{selectedInterview.jobPosition}</p>
                </div>
                <Button 
                  onClick={() => setShowAIFeedback(false)}
                  variant="outline"
                  size="sm"
                >
                  <EyeOff className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Overall Performance</h3>
                  <p className="text-gray-700">{selectedInterview.aiFeedback.overallPerformance}</p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-lg text-green-700 mb-2">Strengths</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {selectedInterview.aiFeedback.strengths.map((strength, idx) => (
                        <li key={idx}>{strength}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-lg text-orange-700 mb-2">Areas for Improvement</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {selectedInterview.aiFeedback.improvements.map((improvement, idx) => (
                        <li key={idx}>{improvement}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Code Quality Assessment</h3>
                    <p className="text-gray-700">{selectedInterview.aiFeedback.codeQuality}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Algorithmic Thinking</h3>
                    <p className="text-gray-700">{selectedInterview.aiFeedback.algorithmicThinking}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-lg mb-3">Problem-wise Feedback</h3>
                  <div className="space-y-3">
                    {selectedInterview.aiFeedback.problemWiseFeedback.map((feedback, idx) => (
                      <div key={idx} className="border rounded-lg p-3">
                        <h4 className="font-medium mb-2">Problem {idx + 1}</h4>
                        <p className="text-sm text-gray-700 mb-2">{feedback.feedback}</p>
                        <p className="text-sm text-blue-700 font-medium">Recommendation: {feedback.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}