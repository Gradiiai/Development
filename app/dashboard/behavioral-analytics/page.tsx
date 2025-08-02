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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Users, MessageSquare, Clock, TrendingUp, Award, Brain, Filter, Download, Eye, EyeOff, Star, Target } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BehavioralAnalytics {
  id: string;
  interviewId: string;
  candidateName: string;
  candidateEmail: string;
  jobPosition: string;
  totalQuestions: number;
  answeredQuestions: number;
  averageResponseLength: number;
  totalTimeSpent: number;
  completedAt: string;
  behavioralScores: {
    communication: number;
    leadership: number;
    problemSolving: number;
    teamwork: number;
    adaptability: number;
    overall: number;
  };
  questionWiseResults: {
    questionId: string;
    question: string;
    answer: string;
    responseTime: number;
    wordCount: number;
    score: number;
    category: string;
  }[];
  aiFeedback: {
    overallPerformance: string;
    strengths: string[];
    improvements: string[];
    communicationAssessment: string;
    leadershipPotential: string;
    questionWiseFeedback: {
      questionId: string;
      feedback: string;
      recommendation: string;
    }[];
  };
}

interface DashboardStats {
  totalInterviews: number;
  averageOverallScore: number;
  averageResponseLength: number;
  completionRate: number;
  strongCommunicators: number;
  leadershipPotential: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];
const SCORE_BANDS = [
  { name: 'Excellent', min: 90, max: 100, color: '#22c55e' },
  { name: 'Good', min: 75, max: 89, color: '#3b82f6' },
  { name: 'Average', min: 60, max: 74, color: '#f59e0b' },
  { name: 'Below Average', min: 40, max: 59, color: '#f97316' },
  { name: 'Poor', min: 0, max: 39, color: '#ef4444' }
];

const BEHAVIORAL_CATEGORIES = [
  'Communication',
  'Leadership',
  'Problem Solving',
  'Teamwork',
  'Adaptability'
];

export default function BehavioralAnalyticsPage() {
  const { data: session } = useSession();
  const [analytics, setAnalytics] = useState<BehavioralAnalytics[]>([]);
  const [filteredAnalytics, setFilteredAnalytics] = useState<BehavioralAnalytics[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalInterviews: 0,
    averageOverallScore: 0,
    averageResponseLength: 0,
    completionRate: 0,
    strongCommunicators: 0,
    leadershipPotential: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<string>('all');
  const [selectedJobRole, setSelectedJobRole] = useState<string>('all');
  const [selectedScoreBand, setSelectedScoreBand] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAIFeedback, setShowAIFeedback] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<BehavioralAnalytics | null>(null);

  useEffect(() => {
    if (session?.user?.companyId) {
      fetchBehavioralAnalytics();
    }
  }, [session]);

  useEffect(() => {
    applyFilters();
  }, [analytics, selectedCandidate, selectedJobRole, selectedScoreBand, selectedCategory, searchQuery]);

  const fetchBehavioralAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/behavioral-analytics?companyId=${session?.user?.companyId}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
        calculateDashboardStats(data);
      }
    } catch (error) {
      console.error('Error fetching behavioral analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDashboardStats = (data: BehavioralAnalytics[]) => {
    const totalInterviews = data.length;
    const averageOverallScore = data.reduce((sum, item) => sum + item.behavioralScores.overall, 0) / totalInterviews || 0;
    const averageResponseLength = data.reduce((sum, item) => sum + item.averageResponseLength, 0) / totalInterviews || 0;
    const completionRate = (data.filter(item => item.answeredQuestions === item.totalQuestions).length / totalInterviews) * 100 || 0;
    const strongCommunicators = data.filter(item => item.behavioralScores.communication >= 80).length;
    const leadershipPotential = data.filter(item => item.behavioralScores.leadership >= 75).length;

    setDashboardStats({
      totalInterviews,
      averageOverallScore: Math.round(averageOverallScore),
      averageResponseLength: Math.round(averageResponseLength),
      completionRate: Math.round(completionRate),
      strongCommunicators,
      leadershipPotential
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
        filtered = filtered.filter(item => item.behavioralScores.overall >= band.min && item.behavioralScores.overall <= band.max);
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
      count: filteredAnalytics.filter(item => item.behavioralScores.overall >= band.min && item.behavioralScores.overall <= band.max).length,
      color: band.color
    }));
  };

  const getBehavioralSkillsData = () => {
    const skillsData = filteredAnalytics.reduce((acc, item) => {
      acc.communication += item.behavioralScores.communication;
      acc.leadership += item.behavioralScores.leadership;
      acc.problemSolving += item.behavioralScores.problemSolving;
      acc.teamwork += item.behavioralScores.teamwork;
      acc.adaptability += item.behavioralScores.adaptability;
      return acc;
    }, {
      communication: 0,
      leadership: 0,
      problemSolving: 0,
      teamwork: 0,
      adaptability: 0
    });

    const count = filteredAnalytics.length || 1;
    return [
      {
        skill: 'Communication',
        average: Math.round(skillsData.communication / count),
        fullMark: 100
      },
      {
        skill: 'Leadership',
        average: Math.round(skillsData.leadership / count),
        fullMark: 100
      },
      {
        skill: 'Problem Solving',
        average: Math.round(skillsData.problemSolving / count),
        fullMark: 100
      },
      {
        skill: 'Teamwork',
        average: Math.round(skillsData.teamwork / count),
        fullMark: 100
      },
      {
        skill: 'Adaptability',
        average: Math.round(skillsData.adaptability / count),
        fullMark: 100
      }
    ];
  };

  const getPerformanceData = () => {
    return filteredAnalytics.map(item => ({
      name: item.candidateName,
      overall: item.behavioralScores.overall,
      communication: item.behavioralScores.communication,
      leadership: item.behavioralScores.leadership,
      problemSolving: item.behavioralScores.problemSolving,
      teamwork: item.behavioralScores.teamwork,
      adaptability: item.behavioralScores.adaptability,
      responseLength: item.averageResponseLength
    }));
  };

  const getResponseLengthData = () => {
    const ranges = [
      { name: '0-50 words', min: 0, max: 50 },
      { name: '51-100 words', min: 51, max: 100 },
      { name: '101-200 words', min: 101, max: 200 },
      { name: '201+ words', min: 201, max: Infinity }
    ];

    return ranges.map(range => ({
      name: range.name,
      count: filteredAnalytics.filter(item => 
        item.averageResponseLength >= range.min && item.averageResponseLength <= range.max
      ).length
    }));
  };

  const exportData = () => {
    const csvContent = [
      ['Candidate Name', 'Email', 'Job Position', 'Overall Score', 'Communication', 'Leadership', 'Problem Solving', 'Teamwork', 'Adaptability', 'Avg Response Length', 'Completed At'].join(','),
      ...filteredAnalytics.map(item => [
        item.candidateName,
        item.candidateEmail,
        item.jobPosition,
        item.behavioralScores.overall,
        item.behavioralScores.communication,
        item.behavioralScores.leadership,
        item.behavioralScores.problemSolving,
        item.behavioralScores.teamwork,
        item.behavioralScores.adaptability,
        item.averageResponseLength,
        new Date(item.completedAt).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'behavioral-analytics.csv';
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
          <p className="text-gray-600">Loading behavioral analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Behavioral Interview Analytics</h1>
          <p className="text-gray-600 mt-2">Comprehensive analysis of behavioral interview performance</p>
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
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Score</p>
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
                <p className="text-sm font-medium text-gray-600">Avg Response Length</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardStats.averageResponseLength}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-orange-600" />
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
                <p className="text-sm font-medium text-gray-600">Strong Communicators</p>
                <p className="text-2xl font-bold text-green-600">{dashboardStats.strongCommunicators}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Leadership Potential</p>
                <p className="text-2xl font-bold text-blue-600">{dashboardStats.leadershipPotential}</p>
              </div>
              <Award className="h-8 w-8 text-blue-600" />
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
              <label className="text-sm font-medium text-gray-700 mb-2 block">Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {BEHAVIORAL_CATEGORIES.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={() => {
                  setSelectedCandidate('all');
                  setSelectedJobRole('all');
                  setSelectedScoreBand('all');
                  setSelectedCategory('all');
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
          <TabsTrigger value="skills">Skills Analysis</TabsTrigger>
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

            {/* Response Length Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Response Length Distribution</CardTitle>
                <CardDescription>Average response length by candidates</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getResponseLengthData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="skills" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Behavioral Skills Radar */}
            <Card>
              <CardHeader>
                <CardTitle>Behavioral Skills Overview</CardTitle>
                <CardDescription>Average scores across behavioral competencies</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={getBehavioralSkillsData()}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="skill" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar
                      name="Average Score"
                      dataKey="average"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Skills Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Skills Comparison</CardTitle>
                <CardDescription>Detailed breakdown of behavioral competencies</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={getBehavioralSkillsData()} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="skill" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="average" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
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
                        <div className="text-2xl font-bold text-blue-600">{interview.behavioralScores.overall}%</div>
                        <div className="text-sm text-gray-500">
                          {interview.answeredQuestions}/{interview.totalQuestions} answered
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Avg Response:</span>
                        <div className="font-medium">{interview.averageResponseLength} words</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Time:</span>
                        <div className="font-medium">{Math.round(interview.totalTimeSpent / 60)}m</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Communication:</span>
                        <div className="font-medium">{interview.behavioralScores.communication}%</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Leadership:</span>
                        <div className="font-medium">{interview.behavioralScores.leadership}%</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">Behavioral Competencies:</h4>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="text-center">
                          <div className="text-sm text-gray-600">Communication</div>
                          <div className="text-lg font-bold text-blue-600">{interview.behavioralScores.communication}%</div>
                          <Progress value={interview.behavioralScores.communication} className="h-2" />
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600">Leadership</div>
                          <div className="text-lg font-bold text-green-600">{interview.behavioralScores.leadership}%</div>
                          <Progress value={interview.behavioralScores.leadership} className="h-2" />
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600">Problem Solving</div>
                          <div className="text-lg font-bold text-orange-600">{interview.behavioralScores.problemSolving}%</div>
                          <Progress value={interview.behavioralScores.problemSolving} className="h-2" />
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600">Teamwork</div>
                          <div className="text-lg font-bold text-purple-600">{interview.behavioralScores.teamwork}%</div>
                          <Progress value={interview.behavioralScores.teamwork} className="h-2" />
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600">Adaptability</div>
                          <div className="text-lg font-bold text-pink-600">{interview.behavioralScores.adaptability}%</div>
                          <Progress value={interview.behavioralScores.adaptability} className="h-2" />
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
              <CardDescription>Comprehensive behavioral analysis and recommendations</CardDescription>
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
                        variant={interview.behavioralScores.overall >= 80 ? "default" : interview.behavioralScores.overall >= 60 ? "secondary" : "destructive"}
                      >
                        {interview.behavioralScores.overall}% Overall
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
                          <h4 className="font-medium text-gray-900 mb-2">Communication Assessment</h4>
                          <p className="text-sm text-gray-700">{interview.aiFeedback.communicationAssessment}</p>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Leadership Potential</h4>
                          <p className="text-sm text-gray-700">{interview.aiFeedback.leadershipPotential}</p>
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
                    <h3 className="font-semibold text-lg mb-2">Communication Assessment</h3>
                    <p className="text-gray-700">{selectedInterview.aiFeedback.communicationAssessment}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Leadership Potential</h3>
                    <p className="text-gray-700">{selectedInterview.aiFeedback.leadershipPotential}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-lg mb-3">Question-wise Feedback</h3>
                  <div className="space-y-3">
                    {selectedInterview.aiFeedback.questionWiseFeedback.map((feedback, idx) => (
                      <div key={idx} className="border rounded-lg p-3">
                        <h4 className="font-medium mb-2">Question {idx + 1}</h4>
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