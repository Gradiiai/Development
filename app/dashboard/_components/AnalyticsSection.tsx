"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/shared/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/shared/tabs";
import { useSession } from "next-auth/react";
import { db } from "@/lib/database/connection";
import { Interview, CodingInterview } from "@/lib/database/schema";
import { desc, eq, and, gte, lte } from "drizzle-orm";
import moment from "moment";
import { Loader2, TrendingUp, BarChart3, PieChart as PieChartIcon, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Cell, BarChart, Bar, Pie } from 'recharts';
import { motion } from "framer-motion";

// Define types for our analytics data
type InterviewDayData = {
  date: string;
  "Behavioral Interviews": number;
  "Coding Interviews": number;
};

type StatusData = {
  status: string;
  value: number;
};

type TypeData = {
  type: string;
  value: number;
};

type RateData = {
  type: string;
  value: number;
};

type CodingInterviewData = {
  id: number;
  codingQuestions: string;
  interviewId: string;
  interviewTopic: string;
  difficultyLevel: string;
  problemDescription: string;
  timeLimit: number;
  programmingLanguage: string;
  createdBy: string;
  createdAt: Date;
  candidateName: string | null;
  candidateEmail: string | null;
  interviewDate: string | null;
  interviewTime: string | null;
  interviewStatus: string | null;
  interviewLink: string | null;
  linkExpiryTime: Date | null;
};

type AnalyticsDataType = {
  interviewsByDay: InterviewDayData[];
  interviewsByStatus: StatusData[];
  interviewsByType: TypeData[];
  completionRateByType: RateData[];
};

const AnalyticsSection = () => {
  const { data: session, status } = useSession();
  const isLoaded = status !== "loading";
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsDataType>({
    interviewsByDay: [],
    interviewsByStatus: [],
    interviewsByType: [],
    completionRateByType: [],
  });
  const [timeRange, setTimeRange] = useState("week");

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!isLoaded || !session?.user?.id) return;

      try {
        setIsLoading(true);

        // Calculate date range based on selected time range
        const now = moment();
        let startDate;
        
        switch (timeRange) {
          case "week":
            startDate = moment().subtract(7, "days");
            break;
          case "month":
            startDate = moment().subtract(30, "days");
            break;
          case "quarter":
            startDate = moment().subtract(90, "days");
            break;
          default:
            startDate = moment().subtract(7, "days");
        }

        // Fetch regular interviews
        const interviews = await db
          .select()
          .from(Interview)
          .where(
            and(
              eq(Interview.createdBy, session?.user?.id ?? ''),
              gte(Interview.createdAt, startDate.toDate())
            )
          )
          .orderBy(desc(Interview.createdAt));

        // Fetch coding interviews
        const codingInterviews = await db
          .select()
          .from(CodingInterview)
          .where(
            and(
              eq(CodingInterview.createdBy, session?.user?.id ?? ''),
              gte(CodingInterview.createdAt, startDate.toDate())
            )
          )
          .orderBy(desc(CodingInterview.createdAt));

        // Process data for charts
        const interviewsByDay = processInterviewsByDay(interviews, codingInterviews);
        const interviewsByStatus = processInterviewsByStatus(interviews, codingInterviews);
        const interviewsByType = processInterviewsByType(interviews, codingInterviews);
        const completionRateByType = processCompletionRate(interviews, codingInterviews);

        setAnalyticsData({
          interviewsByDay,
          interviewsByStatus,
          interviewsByType,
          completionRateByType,
        });
      } catch (error) {
        console.error("Error fetching analytics data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [session, isLoaded, timeRange]);

  // Process interviews by day
  const processInterviewsByDay = (interviews: any[], codingInterviews: any[]): InterviewDayData[] => {
    const dateMap = new Map<string, { date: string; regular: number; coding: number }>();
    const days: string[] = [];

    // Get last 7/30/90 days based on timeRange
    const daysCount = timeRange === "week" ? 7 : timeRange === "month" ? 30 : 90;
    for (let i = 0; i < daysCount; i++) {
      const date = moment().subtract(i, "days").format("YYYY-MM-DD");
      dateMap.set(date, { date, regular: 0, coding: 0 });
      days.unshift(date);
    }

    // Count regular interviews by day
    interviews.forEach(interview => {
      const date = moment(interview.createdAt).format("YYYY-MM-DD");
      if (dateMap.has(date)) {
        const data = dateMap.get(date);
        if (data) {
          data.regular += 1;
          dateMap.set(date, data);
        }
      }
    });

    // Count coding interviews by day
    codingInterviews.forEach(interview => {
      const date = moment(interview.createdAt).format("YYYY-MM-DD");
      if (dateMap.has(date)) {
        const data = dateMap.get(date);
        if (data) {
          data.coding += 1;
          dateMap.set(date, data);
        }
      }
    });

    // Format dates for display
    return days.map(day => {
      const data = dateMap.get(day);
      return {
        date: moment(day).format("MMM DD"),
        "Behavioral Interviews": data?.regular || 0,
        "Coding Interviews": data?.coding || 0,
      };
    });
  };

  // Process interviews by status
  const processInterviewsByStatus = (interviews: any[], codingInterviews: any[]): StatusData[] => {
    const statusCounts: Record<string, number> = {
      scheduled: 0,
      completed: 0,
      "no-show": 0,
      draft: 0,
    };

    // Count regular interviews by status
    interviews.forEach(interview => {
      const status = interview.interviewStatus?.toLowerCase() || "draft";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    // Count coding interviews by status
    codingInterviews.forEach(interview => {
      const status = interview.interviewStatus?.toLowerCase() || "draft";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return [
      { status: "Scheduled", value: statusCounts.scheduled },
      { status: "Completed", value: statusCounts.completed },
      { status: "No-show", value: statusCounts["no-show"] },
      { status: "Draft", value: statusCounts.draft },
    ];
  };

  // Process interviews by type
  const processInterviewsByType = (interviews: any[], codingInterviews: any[]): TypeData[] => {
    const behavioralCount = interviews.filter(interview => 
      interview.interviewType === 'behavioral' || !interview.interviewType
    ).length;
    const mcqCount = interviews.filter(interview => 
      interview.interviewType === 'mcq'
    ).length;
    const comboCount = interviews.filter(interview => 
      interview.interviewType === 'combo'
    ).length;
    
    return [
      { type: "Behavioral", value: behavioralCount },
      { type: "MCQ", value: mcqCount },
      { type: "Combo", value: comboCount },
      { type: "Coding", value: codingInterviews.length },
    ];
  };

  // Process completion rate by interview type
  const processCompletionRate = (interviews: any[], codingInterviews: any[]): RateData[] => {
    const behavioralInterviews = interviews.filter(interview => 
      interview.interviewType === 'behavioral' || !interview.interviewType
    );
    const mcqInterviews = interviews.filter(interview => 
      interview.interviewType === 'mcq'
    );
    const comboInterviews = interviews.filter(interview => 
      interview.interviewType === 'combo'
    );
    
    const completedBehavioral = behavioralInterviews.filter(
      interview => interview.interviewStatus?.toLowerCase() === "completed"
    ).length;
    const completedMcq = mcqInterviews.filter(
      interview => interview.interviewStatus?.toLowerCase() === "completed"
    ).length;
    const completedCombo = comboInterviews.filter(
      interview => interview.interviewStatus?.toLowerCase() === "completed"
    ).length;
    const completedCoding = codingInterviews.filter(
      interview => interview.interviewStatus?.toLowerCase() === "completed"
    ).length;

    const behavioralRate = behavioralInterviews.length > 0 
      ? Math.round((completedBehavioral / behavioralInterviews.length) * 100) 
      : 0;
    const mcqRate = mcqInterviews.length > 0 
      ? Math.round((completedMcq / mcqInterviews.length) * 100) 
      : 0;
    const comboRate = comboInterviews.length > 0 
      ? Math.round((completedCombo / comboInterviews.length) * 100) 
      : 0;
    const codingRate = codingInterviews.length > 0 
      ? Math.round((completedCoding / codingInterviews.length) * 100) 
      : 0;

    return [
      { type: "Behavioral", value: behavioralRate },
      { type: "MCQ", value: mcqRate },
      { type: "Combo", value: comboRate },
      { type: "Coding", value: codingRate },
    ];
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </motion.div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <motion.div 
        variants={itemVariants}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="p-3 bg-gradient-to-br from-teal-50 to-blue-50 rounded-2xl"
          >
            <BarChart3 className="w-8 h-8 text-teal-600" />
          </motion.div>
          <div>
            <h2 className="text-3xl font-bold gradient-text-teal">Interview Analytics</h2>
            <p className="text-gray-600">Track your interview performance and insights</p>
          </div>
        </div>
        <Tabs 
          defaultValue="week" 
          value={timeRange} 
          onValueChange={setTimeRange}
          className="w-auto"
        >
          <TabsList className="glass-card border border-white/30 p-1">
            <TabsTrigger 
              value="week" 
              className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 data-[state=active]:shadow-sm rounded-lg transition-all duration-300"
            >
              Week
            </TabsTrigger>
            <TabsTrigger 
              value="month" 
              className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 data-[state=active]:shadow-sm rounded-lg transition-all duration-300"
            >
              Month
            </TabsTrigger>
            <TabsTrigger 
              value="quarter" 
              className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 data-[state=active]:shadow-sm rounded-lg transition-all duration-300"
            >
              Quarter
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {isLoading ? (
        <motion.div 
          variants={itemVariants}
          className="flex justify-center items-center py-24"
        >
          <Loader2 className="w-12 h-12 animate-spin text-teal-600" />
        </motion.div>
      ) : (
        <div className="space-y-8">
          <motion.div variants={itemVariants}>
            <Card className="glass-card border border-white/30 rounded-3xl shadow-glow-subtle overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-teal-50/50 to-blue-50/50 border-b border-white/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-50 rounded-xl flex-shrink-0">
                    <Activity className="w-5 h-5 text-teal-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-xl font-bold gradient-text-teal truncate">Interview Activity</CardTitle>
                    <p className="text-sm text-gray-600 truncate">Daily interview trends over time</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analyticsData.interviewsByDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#64748b"
                        fontSize={12}
                      />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Behavioral Interviews" 
                        stroke="#0d9488" 
                        strokeWidth={3}
                        dot={{ fill: '#0d9488', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#0d9488', strokeWidth: 2 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Coding Interviews" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div variants={itemVariants}>
              <Card className="glass-card border border-white/30 rounded-3xl shadow-glow-subtle overflow-hidden group hover:shadow-glow-hover transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-emerald-50/50 to-teal-50/50 border-b border-white/30">
                  <div className="flex items-center gap-3">
                    <motion.div 
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className="p-2 bg-emerald-50 rounded-xl group-hover:shadow-lg transition-all duration-300 flex-shrink-0"
                    >
                      <PieChartIcon className="w-5 h-5 text-emerald-600" />
                    </motion.div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent truncate">Status Distribution</CardTitle>
                      <p className="text-sm text-gray-600 truncate">Interview completion status</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analyticsData.interviewsByStatus}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          nameKey="status"
                        >
                          {analyticsData.interviewsByStatus.map((entry, index) => {
                            const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];
                            return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                          })}
                        </Pie>
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-center mt-4">
                    <div className="text-3xl font-bold gradient-text-teal">
                      {analyticsData.interviewsByStatus.reduce((acc, curr) => acc + curr.value, 0)}
                    </div>
                    <div className="text-sm text-gray-600 font-medium">Total Interviews</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="glass-card border border-white/30 rounded-3xl shadow-glow-subtle overflow-hidden group hover:shadow-glow-hover transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-purple-50/50 to-indigo-50/50 border-b border-white/30">
                  <div className="flex items-center gap-3">
                    <motion.div 
                      whileHover={{ scale: 1.1, rotate: -5 }}
                      className="p-2 bg-purple-50 rounded-xl group-hover:shadow-lg transition-all duration-300 flex-shrink-0"
                    >
                      <PieChartIcon className="w-5 h-5 text-purple-600" />
                    </motion.div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent truncate">Interview Types</CardTitle>
                      <p className="text-sm text-gray-600 truncate">Behavioral vs Coding</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analyticsData.interviewsByType}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          nameKey="type"
                        >
                          {analyticsData.interviewsByType.map((entry, index) => {
                            const colors = ['#8b5cf6', '#06b6d4', '#f59e0b', '#10b981'];
                            return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                          })}
                        </Pie>
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-center mt-4">
                    <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                      {analyticsData.interviewsByType.reduce((acc, curr) => acc + curr.value, 0)}
                    </div>
                    <div className="text-sm text-gray-600 font-medium">Total Sessions</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="glass-card border border-white/30 rounded-3xl shadow-glow-subtle overflow-hidden group hover:shadow-glow-hover transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-amber-50/50 to-orange-50/50 border-b border-white/30">
                  <div className="flex items-center gap-3">
                    <motion.div 
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className="p-2 bg-amber-50 rounded-xl group-hover:shadow-lg transition-all duration-300 flex-shrink-0"
                    >
                      <TrendingUp className="w-5 h-5 text-amber-600" />
                    </motion.div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent truncate">Completion Rate</CardTitle>
                      <p className="text-sm text-gray-600 truncate">Success percentage by type</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData.completionRateByType}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#fef3c7" />
                        <XAxis 
                          dataKey="type" 
                          stroke="#92400e"
                          fontSize={12}
                        />
                        <YAxis stroke="#92400e" fontSize={12} />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid #fbbf24',
                            borderRadius: '8px'
                          }}
                          formatter={(value) => [`${value}%`, 'Completion Rate']}
                        />
                        <Bar 
                          dataKey="value" 
                          fill="#f59e0b"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-center mt-4">
                    <div className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                      {Math.round(analyticsData.completionRateByType.reduce((acc, curr) => acc + curr.value, 0) / analyticsData.completionRateByType.length) || 0}%
                    </div>
                    <div className="text-sm text-gray-600 font-medium">Average Rate</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AnalyticsSection;