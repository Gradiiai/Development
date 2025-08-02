'use client';

import { motion } from 'framer-motion';
import { Shield, AlertTriangle, Lock, Key, Eye, EyeOff, Activity, UserCheck, Ban, Clock, Globe, Smartphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Button } from '@/components/ui/shared/button';
import { Badge } from '@/components/ui/shared/badge';
import { Switch } from '@/components/ui/shared/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/shared/table';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

interface SecurityClientProps {
  session: any;
  securityStats: Array<{
    title: string;
    value: string;
    icon: string;
    gradient: string;
    bgGradient: string;
  }>;
  securitySettings: Array<{
    title: string;
    description: string;
    enabled: boolean;
    critical: boolean;
  }>;
  securityLogs: Array<{
    id: number;
    type: string;
    user: string;
    ip: string;
    location: string;
    device: string;
    timestamp: string;
    severity: string;
  }>;
  activeThreats: any[];
}

const iconMap = {
  Activity,
  AlertTriangle,
  Ban,
  Shield,
};

export default function SecurityClient({ 
  session, 
  securityStats, 
  securitySettings, 
  securityLogs, 
  activeThreats 
}: SecurityClientProps) {
  
  const getSeverityBadge = (severity: string) => {
    const colors = {
      'info': 'bg-blue-100 text-blue-700',
      'warning': 'bg-yellow-100 text-yellow-700',
      'critical': 'bg-red-100 text-red-700',
      'high': 'bg-red-100 text-red-700',
      'medium': 'bg-yellow-100 text-yellow-700',
      'low': 'bg-green-100 text-green-700',
    };
    return <Badge className={colors[severity as keyof typeof colors]}>{severity.toUpperCase()}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      'active': 'bg-red-100 text-red-700',
      'investigating': 'bg-yellow-100 text-yellow-700',
      'blocked': 'bg-green-100 text-green-700',
      'resolved': 'bg-gray-100 text-gray-700',
    };
    return <Badge className={colors[status as keyof typeof colors]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 p-8 text-white"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/90 via-pink-600/90 to-purple-600/90"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Security Center</h1>
              <p className="text-red-100 text-lg">Monitor and manage platform security</p>
            </div>
          </div>
          <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Security Scan
          </Button>
        </div>
      </motion.div>

      {/* Security Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {securityStats.map((stat, index) => {
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

      {/* Active Threats Alert */}
      {activeThreats.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-800">Active Security Threats Detected</AlertTitle>
            <AlertDescription className="text-red-700">
              {activeThreats.length} active threat{activeThreats.length > 1 ? 's' : ''} detected. Immediate attention required.
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Security Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
      >
        <Card className="bg-white/90 backdrop-blur-sm border-gray-200/60 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                  <Lock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900">Security Settings</CardTitle>
                  <p className="text-gray-600 text-sm mt-1">Configure platform security policies</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {securitySettings.map((setting, index) => (
                <div key={index} className="flex items-center justify-between p-4 border border-gray-200/60 rounded-xl hover:bg-gray-50/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-gray-900">{setting.title}</h3>
                      {setting.critical && (
                        <Badge className="bg-red-100 text-red-700 text-xs">Critical</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{setting.description}</p>
                  </div>
                  <Switch checked={setting.enabled} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Security Logs */}
        <Card className="bg-white/90 backdrop-blur-sm border-gray-200/60 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900">Security Logs</CardTitle>
                  <p className="text-gray-600 text-sm mt-1">Recent security events and activities</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-1" />
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {securityLogs.map((log) => (
                <div key={log.id} className="flex items-start space-x-3 p-3 border border-gray-200/60 rounded-xl hover:bg-gray-50/50 transition-colors">
                  <div className="p-2 bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100 rounded-lg">
                    <Activity className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 truncate">{log.type}</p>
                      {getSeverityBadge(log.severity)}
                    </div>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                      <span className="flex items-center">
                        <Globe className="h-3 w-3 mr-1" />
                        {log.ip}
                      </span>
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {log.timestamp}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Active Threats Table */}
      {activeThreats.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <Card className="bg-white/90 backdrop-blur-sm border-gray-200/60 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">Active Threats</CardTitle>
                    <p className="text-gray-600 text-sm mt-1">Security threats requiring immediate attention</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Threat Type</TableHead>
                    <TableHead>Source IP</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Detected</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeThreats.map((threat) => (
                    <TableRow key={threat.id}>
                      <TableCell className="font-medium">{threat.type}</TableCell>
                      <TableCell>{threat.sourceIp}</TableCell>
                      <TableCell>{getSeverityBadge(threat.severity)}</TableCell>
                      <TableCell>{getStatusBadge(threat.status)}</TableCell>
                      <TableCell>{threat.detectedAt}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button size="sm" variant="outline">
                            <Ban className="h-3 w-3 mr-1" />
                            Block
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}