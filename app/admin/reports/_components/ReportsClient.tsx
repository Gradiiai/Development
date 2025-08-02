'use client';

import { motion } from 'framer-motion';
import { FileText, Download, Calendar, BarChart3, Users, Building2, Search, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Button } from '@/components/ui/shared/button';
import { Badge } from '@/components/ui/shared/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/shared/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ReportsClientProps {
  session: any;
  stats: {
    totalCompanies: number;
    totalUsers: number;
    totalInterviews: number;
    availableReports: number;
  };
  reportCategories: Array<{
    title: string;
    description: string;
    icon: string;
    gradient: string;
    bgGradient: string;
    reports: Array<{
      name: string;
      lastGenerated: string;
      size: string;
    }>;
  }>;
  recentReports: Array<{
    name: string;
    type: string;
    generatedBy: string;
    date: string;
    size: string;
    status: string;
    downloads: number;
  }>;
}

const iconMap = {
  FileText,
  BarChart3,
  Download,
  Calendar,
  Building2,
  Users,
};

export default function ReportsClient({ session, stats, reportCategories, recentReports }: ReportsClientProps) {
  
  const quickStats = [
    {
      title: 'Total Companies',
      value: stats.totalCompanies.toString(),
      icon: 'FileText',
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50',
    },
    {
      title: 'Total Users',
      value: stats.totalUsers.toString(),
      icon: 'BarChart3',
      gradient: 'from-emerald-500 to-teal-500',
      bgGradient: 'from-emerald-50 to-teal-50',
    },
    {
      title: 'Total Interviews',
      value: stats.totalInterviews.toString(),
      icon: 'Download',
      gradient: 'from-purple-500 to-indigo-500',
      bgGradient: 'from-purple-50 to-indigo-50',
    },
    {
      title: 'Available Reports',
      value: stats.availableReports.toString(),
      icon: 'Calendar',
      gradient: 'from-orange-500 to-red-500',
      bgGradient: 'from-orange-50 to-red-50',
    },
  ];

  const getStatusBadge = (status: string) => {
    if (status === 'Ready') {
      return <Badge className="bg-green-100 text-green-700">Ready</Badge>;
    } else if (status === 'Processing') {
      return <Badge className="bg-yellow-100 text-yellow-700">Processing</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-700">Failed</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      'Comprehensive': 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white',
      'User Analytics': 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white',
      'Company Analytics': 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white',
      'Interview Analytics': 'bg-gradient-to-r from-orange-500 to-red-500 text-white',
      'Financial': 'bg-gradient-to-r from-pink-500 to-rose-500 text-white',
    };
    return <Badge className={colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-700'}>{type}</Badge>;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 p-8 text-white"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-orange-600/90 via-red-600/90 to-pink-600/90"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Reports & Analytics</h1>
              <p className="text-orange-100 text-lg">Generate and manage comprehensive platform reports</p>
            </div>
          </div>
          <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm">
            <Download className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {quickStats.map((stat, index) => {
          const Icon = iconMap[stat.icon as keyof typeof iconMap];
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className={`group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br ${stat.bgGradient} hover:scale-105 cursor-pointer`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-xl bg-gradient-to-r ${stat.gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Report Categories */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
      >
        {reportCategories.map((category, index) => {
          const Icon = iconMap[category.icon as keyof typeof iconMap];
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`bg-gradient-to-br ${category.bgGradient} rounded-2xl p-6 border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300`}
            >
              <div className="flex items-center space-x-4 mb-6">
                <div className={`p-3 rounded-xl bg-gradient-to-r ${category.gradient} shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{category.title}</h3>
                  <p className="text-gray-600 text-sm">{category.description}</p>
                </div>
              </div>
              <div className="space-y-3">
                {category.reports.map((report, reportIndex) => (
                  <div key={reportIndex} className="flex items-center justify-between p-3 bg-white/50 rounded-xl backdrop-blur-sm hover:bg-white/70 transition-colors">
                    <div>
                      <div className="font-medium text-gray-900">{report.name}</div>
                      <div className="text-sm text-gray-600">Last: {report.lastGenerated} • {report.size}</div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button className={`w-full mt-4 bg-gradient-to-r ${category.gradient} hover:opacity-90 text-white`}>
                Generate New Report
              </Button>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6"
      >
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search reports..."
              className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200"
            />
          </div>
          <div className="flex gap-2">
            <Select>
              <SelectTrigger className="w-40 rounded-xl">
                <SelectValue placeholder="Report Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="company">Company Analytics</SelectItem>
                <SelectItem value="candidate">Candidate Analytics</SelectItem>
                <SelectItem value="interview">Interview Analytics</SelectItem>
                <SelectItem value="financial">Financial</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-32 rounded-xl">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl">
              Export All
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Recent Reports Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 overflow-hidden"
      >
        <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-orange-50 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900">Recent Reports</h2>
          <p className="text-gray-600 mt-1">Latest generated reports and their status</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Generated By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Downloads</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentReports.map((report, index) => (
                <TableRow key={index} className="hover:bg-orange-50/50 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center text-white">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{report.name}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getTypeBadge(report.type)}
                  </TableCell>
                  <TableCell>
                    <span className="text-gray-600">{report.generatedBy}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(report.date).toLocaleDateString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-gray-600">{report.size}</span>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(report.status)}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-gray-900">{report.downloads}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-orange-50">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0 hover:bg-orange-50"
                        disabled={report.status !== 'Ready'}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </motion.div>
    </div>
  );
}