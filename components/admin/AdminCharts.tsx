'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { getPlanConfig } from '@/lib/plan-config';

interface AdminChartsProps {
  monthlyGrowth: Array<{ month: string; companies: number; users: number; interviews: number }>;
  subscriptionStats: Array<{ plan: string | null; count: number }>;
}

// Plan-specific colors will be used instead of generic colors

export function AdminCharts({ monthlyGrowth, subscriptionStats }: AdminChartsProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Format subscription data for pie chart
  const subscriptionData = subscriptionStats?.map(stat => ({
    name: stat.plan || 'Free',
    value: stat.count || 0,
    color: getPlanConfig(stat.plan || 'free').hexColor
  })) || [];

  // Use actual monthly growth data
  const validMonthlyGrowth = monthlyGrowth || [];

  if (!isClient) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className={`${i === 1 ? "col-span-1 lg:col-span-2" : ""} bg-white/80 backdrop-blur-sm border-white/20`}>
            <CardHeader>
              <CardTitle className="text-gray-900">Loading...</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
      {/* Monthly Growth Chart */}
      <Card className="col-span-1 lg:col-span-2 bg-white/80 backdrop-blur-sm border-white/20">
        <CardHeader>
          <CardTitle className="text-gray-900">Monthly Growth Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={validMonthlyGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="month" 
                tick={{ fill: '#6b7280' }} 
              />
              <YAxis 
                tick={{ fill: '#6b7280' }} 
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="companies" 
                stroke="#3b82f6" 
                strokeWidth={3}
                name="Companies"
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
              />
              <Line 
                type="monotone" 
                dataKey="users" 
                stroke="#10b981" 
                strokeWidth={3}
                name="Users"
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
              />
              <Line 
                type="monotone" 
                dataKey="interviews" 
                stroke="#f59e0b" 
                strokeWidth={3}
                name="Interviews"
                dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#f59e0b', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Interview Activity */}
      <Card className="bg-white/80 backdrop-blur-sm border-white/20">
        <CardHeader>
          <CardTitle className="text-gray-900">Interview Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={validMonthlyGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="month" 
                tick={{ fill: '#6b7280' }} 
              />
              <YAxis 
                tick={{ fill: '#6b7280' }} 
              />
              <Tooltip 
                 contentStyle={{
                   backgroundColor: 'rgba(255, 255, 255, 0.95)',
                   border: '1px solid #e5e7eb',
                   borderRadius: '8px',
                   boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                 }}
               />
              <Bar 
                dataKey="interviews" 
                fill="#8b5cf6" 
                radius={[4, 4, 0, 0]}
                className="hover:opacity-80 transition-opacity"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Subscription Distribution */}
      <Card className="bg-white/80 backdrop-blur-sm border-white/20">
        <CardHeader>
          <CardTitle className="text-gray-900">Subscription Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={subscriptionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                stroke="#ffffff"
                strokeWidth={2}
              >
                {subscriptionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                 contentStyle={{
                   backgroundColor: 'rgba(255, 255, 255, 0.95)',
                   border: '1px solid #e5e7eb',
                   borderRadius: '8px',
                   boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                 }}
               />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}