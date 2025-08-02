'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Button } from '@/components/ui/shared/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/shared/input';
import { Badge } from '@/components/ui/shared/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shared/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/shared/dialog';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart, Area } from 'recharts';
import { Brain, Code, MessageSquare, Layers, Users, TrendingUp, Clock, Award, Filter, Eye, Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface UnifiedAnalytics {
  mcq: MCQAnalytics[];
  coding: CodingAnalytics[];
  behavioral: BehavioralAnalytics[];
  combo: ComboAnalytics[];
}

interface MCQAnalytics {
  id: string;
  candidateName: string;
  jobRole: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  timeSpent: number;
  difficulty: string;
  sectionWiseAccuracy: { section: string; accuracy: number }[];
  aiInsights: string;
  completedAt: string;
}

interface CodingAnalytics {
  id: string;
  candidateName: string;
  jobRole: string;
  language: string;
  totalProblems: number;
  solvedProblems: number;
  totalScore: number;
  timeSpent: number;
  difficulty: string;
  aiInsights: string;
  completedAt: string;
}

interface BehavioralAnalytics {
  id: string;
  candidateName: string;
  jobRole: string;
  totalQuestions: number;
  answeredQuestions: number;
  averageResponseLength: number;
  timeSpent: number;
  communicationScore: number;
  leadershipScore: number;
  problemSolvingScore: number;
  teamworkScore: number;
  overallScore: number;
  aiInsights: string;
  completedAt: string;
}

interface ComboAnalytics {
  id: string;
  candidateName: string;
  jobRole: string;
  totalQuestions: number;
  answeredQuestions: number;
  overallScore: number;
  timeSpent: number;
  behavioralScore: number;
  mcqScore: number;
  codingScore: number;
  aiInsights: string;
  completedAt: string;
}

interface DashboardStats {
  totalInterviews: number;
  averageScore: number;
  completionRate: number;
  totalCandidates: number;
  topPerformers: Array<{ name: string; score: number; type: string }>;
  interviewTypeDistribution: Array<{ type: string; count: number; percentage: number }>;
  performanceTrends: Array<{ date: string; mcq: number; coding: number; behavioral: number; combo: number }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function UnifiedAnalyticsPage() {
  const { data: session } = useSession();
  const [analytics, setAnalytics] = useState<UnifiedAnalytics>({
    mcq: [],
    coding: [],
    behavioral: [],
    combo: []
  });
  const [stats, setStats] = useState<DashboardStats>({
    totalInterviews: 0,
    averageScore: 0,
    completionRate: 0,
    totalCandidates: 0,
    topPerformers: [],
    interviewTypeDistribution: [],
    performanceTrends: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [filters, setFilters] = useState({
    candidate: '',
    jobRole: '',
    dateRange: '',
    scoreRange: 'all',
    interviewType: 'all'
  });
  const [selectedInsight, setSelectedInsight] = useState<string>('');

  useEffect(() => {
    if (session?.user?.companyId) {
      fetchAllAnalytics();
    }
  }, [session]);

  const fetchAllAnalytics = async () => {
    if (!session?.user?.companyId) {
      toast.error('Company ID not found. Please log in again.');
      return;
    }

    setLoading(true);
    try {
      const companyId = session.user.companyId;
      const [mcqRes, codingRes, behavioralRes, comboRes] = await Promise.all([
        fetch(`/api/analytics/interviews/mcq?companyId=${companyId}`),
        fetch(`/api/analytics/interviews/coding?companyId=${companyId}`),
        fetch(`/api/analytics/interviews/behavioral?companyId=${companyId}`),
        fetch(`/api/analytics/interviews/combo?companyId=${companyId}`)
      ]);

      const [mcqData, codingData, behavioralData, comboData] = await Promise.all([
        mcqRes.json(),
        codingRes.json(),
        behavioralRes.json(),
        comboRes.json()
      ]);

      const unifiedData = {
        mcq: mcqData.analytics || [],
        coding: codingData.analytics || [],
        behavioral: behavioralData.analytics || [],
        combo: comboData.analytics || []
      };

      setAnalytics(unifiedData);
      await calculateDashboardStats(unifiedData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  const calculateDashboardStats = async (data: UnifiedAnalytics) => {
    const totalInterviews = data.mcq.length + data.coding.length + data.behavioral.length + data.combo.length;
    const allCandidates = new Set([
      ...data.mcq.map(item => item.candidateName),
      ...data.coding.map(item => item.candidateName),
      ...data.behavioral.map(item => item.candidateName),
      ...data.combo.map(item => item.candidateName)
    ]);

    const allScores = [
      ...data.mcq.map(item => item.accuracy),
      ...data.coding.map(item => (item.totalScore / (item.totalProblems * 100)) * 100),
      ...data.behavioral.map(item => item.overallScore),
      ...data.combo.map(item => item.overallScore)
    ];

    const averageScore = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;
    const completionRate = totalInterviews > 0 ? 100 : 0;

    const topPerformers = [
      ...data.mcq.map(item => ({ name: item.candidateName, score: item.accuracy, type: 'MCQ' })),
      ...data.coding.map(item => ({ name: item.candidateName, score: (item.totalScore / (item.totalProblems * 100)) * 100, type: 'Coding' })),
      ...data.behavioral.map(item => ({ name: item.candidateName, score: item.overallScore, type: 'Behavioral' })),
      ...data.combo.map(item => ({ name: item.candidateName, score: item.overallScore, type: 'Combo' }))
    ].sort((a, b) => b.score - a.score).slice(0, 5);

    const interviewTypeDistribution = [
      { type: 'MCQ', count: data.mcq.length, percentage: (data.mcq.length / totalInterviews) * 100 },
      { type: 'Coding', count: data.coding.length, percentage: (data.coding.length / totalInterviews) * 100 },
      { type: 'Behavioral', count: data.behavioral.length, percentage: (data.behavioral.length / totalInterviews) * 100 },
      { type: 'Combo', count: data.combo.length, percentage: (data.combo.length / totalInterviews) * 100 }
    ].filter(item => item.count > 0);

    // Fetch performance trends from API
    let performanceTrends = [];
    try {
      const trendsResponse = await fetch(`/api/analytics/performance-trends?companyId=${session?.user?.companyId}`);
      if (trendsResponse.ok) {
        performanceTrends = await trendsResponse.json();
      }
    } catch (error) {
      console.error('Error fetching performance trends:', error);
      // Fallback to empty array if API fails
      performanceTrends = [];
    }

    setStats({
      totalInterviews,
      averageScore,
      completionRate,
      totalCandidates: allCandidates.size,
      topPerformers,
      interviewTypeDistribution,
      performanceTrends
    });
  };

  const getFilteredData = () => {
    const filterData = (data: any[], type: string) => {
      return data.filter(item => {
        if (filters.candidate && !item.candidateName.toLowerCase().includes(filters.candidate.toLowerCase())) return false;
        if (filters.jobRole && !item.jobRole.toLowerCase().includes(filters.jobRole.toLowerCase())) return false;
        if (filters.interviewType !== 'all' && filters.interviewType !== type) return false;
        
        if (filters.scoreRange && filters.scoreRange !== 'all') {
          let score = 0;
          switch (type) {
            case 'mcq': score = item.accuracy; break;
            case 'coding': score = (item.totalScore / (item.totalProblems * 100)) * 100; break;
            case 'behavioral': case 'combo': score = item.overallScore; break;
          }
          
          const [min, max] = filters.scoreRange.split('-').map(Number);
          if (score < min || score > max) return false;
        }
        
        return true;
      });
    };

    return {
      mcq: filterData(analytics.mcq, 'mcq'),
      coding: filterData(analytics.coding, 'coding'),
      behavioral: filterData(analytics.behavioral, 'behavioral'),
      combo: filterData(analytics.combo, 'combo')
    };
  };

  const exportData = () => {
    const filteredData = getFilteredData();
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Type,Candidate,Job Role,Score,Time Spent,Completed At\n" +
      [
        ...filteredData.mcq.map(item => `MCQ,${item.candidateName},${item.jobRole},${item.accuracy}%,${item.timeSpent}min,${item.completedAt}`),
        ...filteredData.coding.map(item => `Coding,${item.candidateName},${item.jobRole},${((item.totalScore / (item.totalProblems * 100)) * 100).toFixed(1)}%,${item.timeSpent}min,${item.completedAt}`),
        ...filteredData.behavioral.map(item => `Behavioral,${item.candidateName},${item.jobRole},${item.overallScore}%,${item.timeSpent}min,${item.completedAt}`),
        ...filteredData.combo.map(item => `Combo,${item.candidateName},${item.jobRole},${item.overallScore}%,${item.timeSpent}min,${item.completedAt}`)
      ].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "unified_analytics.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Analytics data exported successfully!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const filteredData = getFilteredData();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Unified Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">Comprehensive insights across all interview types</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchAllAnalytics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportData} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Input
              placeholder="Search candidate..."
              value={filters.candidate}
              onChange={(e) => setFilters(prev => ({ ...prev, candidate: e.target.value }))}
            />
            <Input
              placeholder="Job role..."
              value={filters.jobRole}
              onChange={(e) => setFilters(prev => ({ ...prev, jobRole: e.target.value }))}
            />
            <Select value={filters.interviewType} onValueChange={(value) => setFilters(prev => ({ ...prev, interviewType: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Interview Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="mcq">MCQ</SelectItem>
                <SelectItem value="coding">Coding</SelectItem>
                <SelectItem value="behavioral">Behavioral</SelectItem>
                <SelectItem value="combo">Combo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.scoreRange} onValueChange={(value) => setFilters(prev => ({ ...prev, scoreRange: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Score Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Scores</SelectItem>
                <SelectItem value="0-25">0-25%</SelectItem>
                <SelectItem value="26-50">26-50%</SelectItem>
                <SelectItem value="51-75">51-75%</SelectItem>
                <SelectItem value="76-100">76-100%</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => setFilters({ candidate: '', jobRole: '', dateRange: '', scoreRange: 'all', interviewType: 'all' })}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Interviews</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalInterviews}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Score</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageScore.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Candidates</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCandidates}</p>
              </div>
              <Award className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completionRate.toFixed(1)}%</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="mcq">MCQ Analytics</TabsTrigger>
          <TabsTrigger value="coding">Coding Analytics</TabsTrigger>
          <TabsTrigger value="behavioral">Behavioral Analytics</TabsTrigger>
          <TabsTrigger value="combo">Combo Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Interview Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Interview Type Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.interviewTypeDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ type, percentage }) => `${type}: ${percentage.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {stats.interviewTypeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Performance Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.performanceTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="mcq" stroke="#8884d8" name="MCQ" />
                    <Line type="monotone" dataKey="coding" stroke="#82ca9d" name="Coding" />
                    <Line type="monotone" dataKey="behavioral" stroke="#ffc658" name="Behavioral" />
                    <Line type="monotone" dataKey="combo" stroke="#ff7300" name="Combo" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Performers */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.topPerformers.map((performer, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{performer.name}</p>
                        <Badge variant="outline">{performer.type}</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">{performer.score.toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MCQ Analytics Tab */}
        <TabsContent value="mcq" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  MCQ Performance Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={filteredData.mcq.map(item => ({ name: item.candidateName.split(' ')[0], accuracy: item.accuracy }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="accuracy" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>MCQ Interview Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {filteredData.mcq.map((interview) => (
                    <div key={interview.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{interview.candidateName}</h4>
                          <p className="text-sm text-gray-600">{interview.jobRole}</p>
                        </div>
                        <Badge variant={interview.accuracy >= 70 ? 'default' : 'destructive'}>
                          {interview.accuracy.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Questions:</span> {interview.totalQuestions}
                        </div>
                        <div>
                          <span className="text-gray-600">Time:</span> {interview.timeSpent}min
                        </div>
                      </div>
                      {interview.aiInsights && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="mt-2">
                              <Eye className="h-4 w-4 mr-2" />
                              View AI Insights
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>AI Insights for {interview.candidateName}</DialogTitle>
                              <DialogDescription>MCQ Interview Analysis</DialogDescription>
                            </DialogHeader>
                            <div className="mt-4">
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{interview.aiInsights}</p>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Coding Analytics Tab */}
        <TabsContent value="coding" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Coding Performance by Language
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={Object.entries(
                    filteredData.coding.reduce((acc, item) => {
                      acc[item.language] = (acc[item.language] || 0) + ((item.totalScore / (item.totalProblems * 100)) * 100);
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([language, score]) => ({ language, score }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="language" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="score" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Coding Interview Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {filteredData.coding.map((interview) => {
                    const scorePercentage = (interview.totalScore / (interview.totalProblems * 100)) * 100;
                    return (
                      <div key={interview.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium">{interview.candidateName}</h4>
                            <p className="text-sm text-gray-600">{interview.jobRole} • {interview.language}</p>
                          </div>
                          <Badge variant={scorePercentage >= 70 ? 'default' : 'destructive'}>
                            {scorePercentage.toFixed(1)}%
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Solved:</span> {interview.solvedProblems}/{interview.totalProblems}
                          </div>
                          <div>
                            <span className="text-gray-600">Time:</span> {interview.timeSpent}min
                          </div>
                        </div>
                        {interview.aiInsights && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="mt-2">
                                <Eye className="h-4 w-4 mr-2" />
                                View AI Insights
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>AI Insights for {interview.candidateName}</DialogTitle>
                                <DialogDescription>Coding Interview Analysis</DialogDescription>
                              </DialogHeader>
                              <div className="mt-4">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{interview.aiInsights}</p>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Behavioral Analytics Tab */}
        <TabsContent value="behavioral" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Behavioral Skills Radar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={[
                    { skill: 'Communication', score: filteredData.behavioral.reduce((acc, item) => acc + item.communicationScore, 0) / filteredData.behavioral.length || 0 },
                    { skill: 'Leadership', score: filteredData.behavioral.reduce((acc, item) => acc + item.leadershipScore, 0) / filteredData.behavioral.length || 0 },
                    { skill: 'Problem Solving', score: filteredData.behavioral.reduce((acc, item) => acc + item.problemSolvingScore, 0) / filteredData.behavioral.length || 0 },
                    { skill: 'Teamwork', score: filteredData.behavioral.reduce((acc, item) => acc + item.teamworkScore, 0) / filteredData.behavioral.length || 0 }
                  ]}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="skill" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar name="Average Score" dataKey="score" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Behavioral Interview Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {filteredData.behavioral.map((interview) => (
                    <div key={interview.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{interview.candidateName}</h4>
                          <p className="text-sm text-gray-600">{interview.jobRole}</p>
                        </div>
                        <Badge variant={interview.overallScore >= 70 ? 'default' : 'destructive'}>
                          {interview.overallScore.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Answered:</span> {interview.answeredQuestions}/{interview.totalQuestions}
                        </div>
                        <div>
                          <span className="text-gray-600">Time:</span> {interview.timeSpent}min
                        </div>
                      </div>
                      {interview.aiInsights && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="mt-2">
                              <Eye className="h-4 w-4 mr-2" />
                              View AI Insights
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>AI Insights for {interview.candidateName}</DialogTitle>
                              <DialogDescription>Behavioral Interview Analysis</DialogDescription>
                            </DialogHeader>
                            <div className="mt-4">
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{interview.aiInsights}</p>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Combo Analytics Tab */}
        <TabsContent value="combo" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Combo Interview Section Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={filteredData.combo.map(item => ({
                    name: item.candidateName.split(' ')[0],
                    behavioral: item.behavioralScore,
                    mcq: item.mcqScore,
                    coding: item.codingScore,
                    overall: item.overallScore
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="behavioral" stackId="a" fill="#8884d8" name="Behavioral" />
                    <Bar dataKey="mcq" stackId="a" fill="#82ca9d" name="MCQ" />
                    <Bar dataKey="coding" stackId="a" fill="#ffc658" name="Coding" />
                    <Line type="monotone" dataKey="overall" stroke="#ff7300" name="Overall" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Combo Interview Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {filteredData.combo.map((interview) => (
                    <div key={interview.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{interview.candidateName}</h4>
                          <p className="text-sm text-gray-600">{interview.jobRole}</p>
                        </div>
                        <Badge variant={interview.overallScore >= 70 ? 'default' : 'destructive'}>
                          {interview.overallScore.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                        <div className="text-center p-2 bg-blue-50 rounded">
                          <div className="font-medium">Behavioral</div>
                          <div>{interview.behavioralScore.toFixed(1)}%</div>
                        </div>
                        <div className="text-center p-2 bg-green-50 rounded">
                          <div className="font-medium">MCQ</div>
                          <div>{interview.mcqScore.toFixed(1)}%</div>
                        </div>
                        <div className="text-center p-2 bg-yellow-50 rounded">
                          <div className="font-medium">Coding</div>
                          <div>{interview.codingScore.toFixed(1)}%</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Answered:</span> {interview.answeredQuestions}/{interview.totalQuestions}
                        </div>
                        <div>
                          <span className="text-gray-600">Time:</span> {interview.timeSpent}min
                        </div>
                      </div>
                      {interview.aiInsights && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="mt-2">
                              <Eye className="h-4 w-4 mr-2" />
                              View AI Insights
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>AI Insights for {interview.candidateName}</DialogTitle>
                              <DialogDescription>Combo Interview Analysis</DialogDescription>
                            </DialogHeader>
                            <div className="mt-4">
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{interview.aiInsights}</p>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}