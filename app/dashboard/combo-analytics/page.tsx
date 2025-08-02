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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart, Area, AreaChart } from 'recharts';
import { Layers, Code, Users, MessageSquare, Clock, TrendingUp, Award, Brain, Filter, Download, Eye, EyeOff, Star, Target, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ComboAnalytics {
  id: string;
  interviewId: string;
  candidateName: string;
  candidateEmail: string;
  jobPosition: string;
  overallMetrics: {
    totalQuestions: number;
    answeredQuestions: number;
    overallScore: number;
    totalTimeSpent: number;
  };
  sectionBreakdown: {
    behavioral: {
      score: number;
      questionsAnswered: number;
      totalQuestions: number;
      timeSpent: number;
      communicationScore: number;
      leadershipScore: number;
      problemSolvingScore: number;
      teamworkScore: number;
      adaptabilityScore: number;
    };
    mcq: {
      score: number;
      correctAnswers: number;
      totalQuestions: number;
      timeSpent: number;
      accuracy: number;
      sectionWiseAccuracy: Record<string, number>;
    };
    coding: {
      score: number;
      problemsSolved: number;
      totalProblems: number;
      timeSpent: number;
      averageTimePerProblem: number;
      languageUsed: string;
      testCasesPassed: number;
      totalTestCases: number;
    };
  };
  completedAt: string;
  aiFeedback: {
    overallPerformance: string;
    strengths: string[];
    improvements: string[];
    sectionWiseAnalysis: {
      behavioral: string;
      mcq: string;
      coding: string;
    };
    recommendations: string[];
    finalAssessment: string;
  };
}

interface DashboardStats {
  totalInterviews: number;
  averageOverallScore: number;
  averageBehavioralScore: number;
  averageMcqScore: number;
  averageCodingScore: number;
  completionRate: number;
  topPerformers: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];
const SCORE_BANDS = [
  { name: 'Excellent', min: 90, max: 100, color: '#22c55e' },
  { name: 'Good', min: 75, max: 89, color: '#3b82f6' },
  { name: 'Average', min: 60, max: 74, color: '#f59e0b' },
  { name: 'Below Average', min: 40, max: 59, color: '#f97316' },
  { name: 'Poor', min: 0, max: 39, color: '#ef4444' }
];

export default function ComboAnalyticsPage() {
  const { data: session } = useSession();
  const [analytics, setAnalytics] = useState<ComboAnalytics[]>([]);
  const [filteredAnalytics, setFilteredAnalytics] = useState<ComboAnalytics[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalInterviews: 0,
    averageOverallScore: 0,
    averageBehavioralScore: 0,
    averageMcqScore: 0,
    averageCodingScore: 0,
    completionRate: 0,
    topPerformers: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<string>('all');
  const [selectedJobRole, setSelectedJobRole] = useState<string>('all');
  const [selectedScoreBand, setSelectedScoreBand] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAIFeedback, setShowAIFeedback] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<ComboAnalytics | null>(null);

  useEffect(() => {
    if (session?.user?.companyId) {
      fetchComboAnalytics();
    }
  }, [session]);

  useEffect(() => {
    applyFilters();
  }, [analytics, selectedCandidate, selectedJobRole, selectedScoreBand, selectedSection, searchQuery]);

  const fetchComboAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/combo-analytics?companyId=${session?.user?.companyId}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
        calculateDashboardStats(data);
      }
    } catch (error) {
      console.error('Error fetching combo analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDashboardStats = (data: ComboAnalytics[]) => {
    const totalInterviews = data.length;
    const averageOverallScore = data.reduce((sum, item) => sum + item.overallMetrics.overallScore, 0) / totalInterviews || 0;
    const averageBehavioralScore = data.reduce((sum, item) => sum + item.sectionBreakdown.behavioral.score, 0) / totalInterviews || 0;
    const averageMcqScore = data.reduce((sum, item) => sum + item.sectionBreakdown.mcq.score, 0) / totalInterviews || 0;
    const averageCodingScore = data.reduce((sum, item) => sum + item.sectionBreakdown.coding.score, 0) / totalInterviews || 0;
    const completionRate = (data.filter(item => item.overallMetrics.answeredQuestions === item.overallMetrics.totalQuestions).length / totalInterviews) * 100 || 0;
    const topPerformers = data.filter(item => item.overallMetrics.overallScore >= 85).length;

    setDashboardStats({
      totalInterviews,
      averageOverallScore: Math.round(averageOverallScore),
      averageBehavioralScore: Math.round(averageBehavioralScore),
      averageMcqScore: Math.round(averageMcqScore),
      averageCodingScore: Math.round(averageCodingScore),
      completionRate: Math.round(completionRate),
      topPerformers
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
        filtered = filtered.filter(item => item.overallMetrics.overallScore >= band.min && item.overallMetrics.overallScore <= band.max);
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
      count: filteredAnalytics.filter(item => item.overallMetrics.overallScore >= band.min && item.overallMetrics.overallScore <= band.max).length,
      color: band.color
    }));
  };

  const getSectionComparisonData = () => {
    return filteredAnalytics.map(item => ({
      name: item.candidateName,
      behavioral: item.sectionBreakdown.behavioral.score,
      mcq: item.sectionBreakdown.mcq.score,
      coding: item.sectionBreakdown.coding.score,
      overall: item.overallMetrics.overallScore
    }));
  };

  const getAverageSectionScores = () => {
    const count = filteredAnalytics.length || 1;
    return [
      {
        section: 'Behavioral',
        score: Math.round(filteredAnalytics.reduce((sum, item) => sum + item.sectionBreakdown.behavioral.score, 0) / count),
        icon: Users,
        color: '#3b82f6'
      },
      {
        section: 'MCQ',
        score: Math.round(filteredAnalytics.reduce((sum, item) => sum + item.sectionBreakdown.mcq.score, 0) / count),
        icon: Brain,
        color: '#10b981'
      },
      {
        section: 'Coding',
        score: Math.round(filteredAnalytics.reduce((sum, item) => sum + item.sectionBreakdown.coding.score, 0) / count),
        icon: Code,
        color: '#f59e0b'
      }
    ];
  };

  const getPerformanceDistribution = () => {
    const ranges = [
      { name: '90-100%', min: 90, max: 100 },
      { name: '80-89%', min: 80, max: 89 },
      { name: '70-79%', min: 70, max: 79 },
      { name: '60-69%', min: 60, max: 69 },
      { name: 'Below 60%', min: 0, max: 59 }
    ];

    return ranges.map(range => ({
      name: range.name,
      behavioral: filteredAnalytics.filter(item => 
        item.sectionBreakdown.behavioral.score >= range.min && item.sectionBreakdown.behavioral.score <= range.max
      ).length,
      mcq: filteredAnalytics.filter(item => 
        item.sectionBreakdown.mcq.score >= range.min && item.sectionBreakdown.mcq.score <= range.max
      ).length,
      coding: filteredAnalytics.filter(item => 
        item.sectionBreakdown.coding.score >= range.min && item.sectionBreakdown.coding.score <= range.max
      ).length
    }));
  };

  const exportData = () => {
    const csvContent = [
      ['Candidate Name', 'Email', 'Job Position', 'Overall Score', 'Behavioral Score', 'MCQ Score', 'Coding Score', 'Completion Rate', 'Total Time', 'Completed At'].join(','),
      ...filteredAnalytics.map(item => [
        item.candidateName,
        item.candidateEmail,
        item.jobPosition,
        item.overallMetrics.overallScore,
        item.sectionBreakdown.behavioral.score,
        item.sectionBreakdown.mcq.score,
        item.sectionBreakdown.coding.score,
        `${Math.round((item.overallMetrics.answeredQuestions / item.overallMetrics.totalQuestions) * 100)}%`,
        `${Math.round(item.overallMetrics.totalTimeSpent / 60)}m`,
        new Date(item.completedAt).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'combo-analytics.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const uniqueCandidates = [...new Set(analytics.map(item => item.candidateEmail))];
  const uniqueJobRoles = [...new Set(analytics.map(item => item.jobPosition))];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading combo analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Combo Interview Analytics</h1>
          <p className="text-gray-600 mt-2">Comprehensive analysis of multi-section interview performance</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportData} variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Interviews</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardStats.totalInterviews}</p>
              </div>
              <Layers className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Score</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardStats.averageOverallScore}%</p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Behavioral</p>
                <p className="text-2xl font-bold text-blue-600">{dashboardStats.averageBehavioralScore}%</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">MCQ</p>
                <p className="text-2xl font-bold text-green-600">{dashboardStats.averageMcqScore}%</p>
              </div>
              <Brain className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Coding</p>
                <p className="text-2xl font-bold text-orange-600">{dashboardStats.averageCodingScore}%</p>
              </div>
              <Code className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-purple-600">{dashboardStats.completionRate}%</p>
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
      </div>

      {/* Section Averages */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {getAverageSectionScores().map((section) => {
          const IconComponent = section.icon;
          return (
            <Card key={section.section}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{section.section} Section</h3>
                  <IconComponent className="h-6 w-6" style={{ color: section.color }} />
                </div>
                <div className="text-3xl font-bold mb-2" style={{ color: section.color }}>
                  {section.score}%
                </div>
                <Progress value={section.score} className="h-2" />
              </CardContent>
            </Card>
          );
        })}
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

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Section Focus</label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger>
                  <SelectValue placeholder="All Sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  <SelectItem value="behavioral">Behavioral</SelectItem>
                  <SelectItem value="mcq">MCQ</SelectItem>
                  <SelectItem value="coding">Coding</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={() => {
                  setSelectedCandidate('all');
                  setSelectedJobRole('all');
                  setSelectedScoreBand('all');
                  setSelectedSection('all');
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
          <TabsTrigger value="section-analysis">Section Analysis</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Results</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Overall Score Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Overall Score Distribution</CardTitle>
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

            {/* Section Performance Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Section Performance Comparison</CardTitle>
                <CardDescription>Average scores across different sections</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getAverageSectionScores()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="section" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="score" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="section-analysis" className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            {/* Performance Distribution by Section */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Distribution by Section</CardTitle>
                <CardDescription>Score distribution across behavioral, MCQ, and coding sections</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={getPerformanceDistribution()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="behavioral" stackId="a" fill="#3b82f6" name="Behavioral" />
                    <Bar dataKey="mcq" stackId="a" fill="#10b981" name="MCQ" />
                    <Bar dataKey="coding" stackId="a" fill="#f59e0b" name="Coding" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Individual Section Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Individual Candidate Section Comparison</CardTitle>
                <CardDescription>Detailed breakdown of each candidate's performance across sections</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={getSectionComparisonData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="behavioral" fill="#3b82f6" name="Behavioral" />
                    <Bar dataKey="mcq" fill="#10b981" name="MCQ" />
                    <Bar dataKey="coding" fill="#f59e0b" name="Coding" />
                    <Line type="monotone" dataKey="overall" stroke="#ef4444" strokeWidth={3} name="Overall" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Interview Results</CardTitle>
              <CardDescription>Individual candidate performance breakdown across all sections</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {filteredAnalytics.map((interview) => (
                  <div key={interview.id} className="border rounded-lg p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-xl">{interview.candidateName}</h3>
                        <p className="text-gray-600">{interview.candidateEmail}</p>
                        <p className="text-sm text-gray-500">{interview.jobPosition}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-blue-600">{interview.overallMetrics.overallScore}%</div>
                        <div className="text-sm text-gray-500">
                          {interview.overallMetrics.answeredQuestions}/{interview.overallMetrics.totalQuestions} completed
                        </div>
                        <div className="text-sm text-gray-500">
                          {Math.round(interview.overallMetrics.totalTimeSpent / 60)}m total
                        </div>
                      </div>
                    </div>
                    
                    {/* Section Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Behavioral Section */}
                      <div className="border rounded-lg p-4 bg-blue-50">
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="h-5 w-5 text-blue-600" />
                          <h4 className="font-semibold text-blue-900">Behavioral</h4>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Score:</span>
                            <span className="font-bold text-blue-600">{interview.sectionBreakdown.behavioral.score}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Questions:</span>
                            <span className="text-sm">{interview.sectionBreakdown.behavioral.questionsAnswered}/{interview.sectionBreakdown.behavioral.totalQuestions}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Time:</span>
                            <span className="text-sm">{Math.round(interview.sectionBreakdown.behavioral.timeSpent / 60)}m</span>
                          </div>
                          <div className="mt-3 space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>Communication:</span>
                              <span>{interview.sectionBreakdown.behavioral.communicationScore}%</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>Leadership:</span>
                              <span>{interview.sectionBreakdown.behavioral.leadershipScore}%</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>Problem Solving:</span>
                              <span>{interview.sectionBreakdown.behavioral.problemSolvingScore}%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* MCQ Section */}
                      <div className="border rounded-lg p-4 bg-green-50">
                        <div className="flex items-center gap-2 mb-3">
                          <Brain className="h-5 w-5 text-green-600" />
                          <h4 className="font-semibold text-green-900">MCQ</h4>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Score:</span>
                            <span className="font-bold text-green-600">{interview.sectionBreakdown.mcq.score}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Correct:</span>
                            <span className="text-sm">{interview.sectionBreakdown.mcq.correctAnswers}/{interview.sectionBreakdown.mcq.totalQuestions}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Accuracy:</span>
                            <span className="text-sm">{interview.sectionBreakdown.mcq.accuracy}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Time:</span>
                            <span className="text-sm">{Math.round(interview.sectionBreakdown.mcq.timeSpent / 60)}m</span>
                          </div>
                        </div>
                      </div>

                      {/* Coding Section */}
                      <div className="border rounded-lg p-4 bg-orange-50">
                        <div className="flex items-center gap-2 mb-3">
                          <Code className="h-5 w-5 text-orange-600" />
                          <h4 className="font-semibold text-orange-900">Coding</h4>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Score:</span>
                            <span className="font-bold text-orange-600">{interview.sectionBreakdown.coding.score}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Solved:</span>
                            <span className="text-sm">{interview.sectionBreakdown.coding.problemsSolved}/{interview.sectionBreakdown.coding.totalProblems}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Language:</span>
                            <span className="text-sm">{interview.sectionBreakdown.coding.languageUsed}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Test Cases:</span>
                            <span className="text-sm">{interview.sectionBreakdown.coding.testCasesPassed}/{interview.sectionBreakdown.coding.totalTestCases}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Avg Time:</span>
                            <span className="text-sm">{interview.sectionBreakdown.coding.averageTimePerProblem}s</span>
                          </div>
                        </div>
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
              <CardDescription>Comprehensive analysis across all interview sections</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {filteredAnalytics.slice(0, 3).map((interview) => (
                  <div key={interview.id} className="border rounded-lg p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-xl">{interview.candidateName}</h3>
                        <p className="text-gray-600">{interview.jobPosition}</p>
                      </div>
                      <Badge 
                        variant={interview.overallMetrics.overallScore >= 85 ? "default" : interview.overallMetrics.overallScore >= 70 ? "secondary" : "destructive"}
                      >
                        {interview.overallMetrics.overallScore}% Overall
                      </Badge>
                    </div>
                    
                    <div className="space-y-4">
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
                      
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Section-wise Analysis</h4>
                        <div className="grid md:grid-cols-3 gap-4 text-sm">
                          <div className="p-3 bg-blue-50 rounded">
                            <h5 className="font-medium text-blue-900 mb-1">Behavioral</h5>
                            <p className="text-gray-700">{interview.aiFeedback.sectionWiseAnalysis.behavioral}</p>
                          </div>
                          <div className="p-3 bg-green-50 rounded">
                            <h5 className="font-medium text-green-900 mb-1">MCQ</h5>
                            <p className="text-gray-700">{interview.aiFeedback.sectionWiseAnalysis.mcq}</p>
                          </div>
                          <div className="p-3 bg-orange-50 rounded">
                            <h5 className="font-medium text-orange-900 mb-1">Coding</h5>
                            <p className="text-gray-700">{interview.aiFeedback.sectionWiseAnalysis.coding}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Final Assessment</h4>
                        <p className="text-gray-700 font-medium">{interview.aiFeedback.finalAssessment}</p>
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
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold">{selectedInterview.candidateName} - Comprehensive AI Feedback</h2>
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
                
                <div>
                  <h3 className="font-semibold text-lg mb-3">Section-wise Analysis</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="border rounded-lg p-4 bg-blue-50">
                      <h4 className="font-medium text-blue-900 mb-2">Behavioral Section</h4>
                      <p className="text-sm text-gray-700">{selectedInterview.aiFeedback.sectionWiseAnalysis.behavioral}</p>
                    </div>
                    <div className="border rounded-lg p-4 bg-green-50">
                      <h4 className="font-medium text-green-900 mb-2">MCQ Section</h4>
                      <p className="text-sm text-gray-700">{selectedInterview.aiFeedback.sectionWiseAnalysis.mcq}</p>
                    </div>
                    <div className="border rounded-lg p-4 bg-orange-50">
                      <h4 className="font-medium text-orange-900 mb-2">Coding Section</h4>
                      <p className="text-sm text-gray-700">{selectedInterview.aiFeedback.sectionWiseAnalysis.coding}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-lg mb-2">Recommendations</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    {selectedInterview.aiFeedback.recommendations.map((recommendation, idx) => (
                      <li key={idx}>{recommendation}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-lg mb-2">Final Assessment</h3>
                  <p className="text-gray-700 font-medium text-lg">{selectedInterview.aiFeedback.finalAssessment}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}