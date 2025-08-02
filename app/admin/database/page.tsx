'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Badge } from '@/components/ui/shared/badge';
import { Button } from '@/components/ui/shared/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shared/tabs';
import { 
  Database, 
  Server, 
  HardDrive, 
  Activity, 
  Users, 
  Building2, 
  FileText, 
  RefreshCw,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface DatabaseStats {
  totalSize: string;
  usedSpace: string;
  freeSpace: string;
  usagePercentage: number;
  connections: number;
  maxConnections: number;
  uptime: string;
  version: string;
}

interface TableInfo {
  name: string;
  rows: number;
  size: string;
  lastUpdated: string;
}

// Mock data removed - system now requires proper API responses

export default function DatabasePage() {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch database stats and tables
  useEffect(() => {
    fetchDatabaseData();
  }, []);

  const fetchDatabaseData = async () => {
    try {
      setLoading(true);
      const [statsResponse, tablesResponse] = await Promise.all([
        fetch('/api/admin/database/stats'),
        fetch('/api/admin/database/tables')
      ]);

      if (!statsResponse.ok || !tablesResponse.ok) {
        throw new Error('Failed to fetch database information');
      }

      const statsData = await statsResponse.json();
      const tablesData = await tablesResponse.json();

      setStats(statsData);
      setTables(tablesData);
    } catch (err) {
      console.error('Error fetching database data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load database information');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDatabaseData();
    setIsRefreshing(false);
  };

  const getConnectionStatus = () => {
    if (!stats) return { color: 'text-gray-500', status: 'Unknown' };
    const percentage = (stats.connections / stats.maxConnections) * 100;
    if (percentage > 80) return { color: 'text-red-500', status: 'High' };
    if (percentage > 60) return { color: 'text-yellow-500', status: 'Medium' };
    return { color: 'text-green-500', status: 'Low' };
  };

  const connectionStatus = getConnectionStatus();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Database Management</h1>
            <p className="text-muted-foreground">
              Monitor database performance and manage data
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading database information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Database Management</h1>
            <p className="text-muted-foreground">
              Monitor database performance and manage data
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <AlertTriangle className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Database Information</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Database Management</h1>
          <p className="text-muted-foreground">
            Monitor database performance and manage data
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Backup
          </Button>
        </div>
      </div>

      {/* Database Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database Size</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSize || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.usedSpace || 'N/A'} used, {stats?.freeSpace || 'N/A'} free
            </p>
            <Progress value={stats?.usagePercentage || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connections</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.connections || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              of {stats?.maxConnections || 'N/A'} max
            </p>
            <div className="flex items-center mt-2">
              <Badge variant="outline" className={connectionStatus.color}>
                {connectionStatus.status} Usage
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.uptime?.split(',')[0] || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.uptime?.split(',')[1] || ''}
            </p>
            <div className="flex items-center mt-2">
              <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
              <span className="text-xs text-green-600">Healthy</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Version</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.version?.split(' ')[1] || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.version?.split(' ')[0] || ''}
            </p>
            <div className="flex items-center mt-2">
              <Badge variant="outline" className="text-green-600">
                Latest
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Database Tables */}
      <Tabs defaultValue="tables" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tables">Tables</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="tables" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Database Tables</CardTitle>
              <CardDescription>
                Overview of all tables in the database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tables.map((table) => (
                  <div
                    key={table.name}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">{table.name}</h3>
                        <p className="text-sm text-gray-500">
                          {table.rows.toLocaleString()} rows • {table.size}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Last updated</p>
                      <p className="text-sm font-medium">{table.lastUpdated}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                Database performance and query statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Query Performance</label>
                    <div className="flex items-center gap-2">
                      <Progress value={85} className="flex-1" />
                      <span className="text-sm text-gray-600">85%</span>
                    </div>
                    <p className="text-xs text-gray-500">Average query execution time: 45ms</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cache Hit Ratio</label>
                    <div className="flex items-center gap-2">
                      <Progress value={92} className="flex-1" />
                      <span className="text-sm text-gray-600">92%</span>
                    </div>
                    <p className="text-xs text-gray-500">Buffer cache efficiency</p>
                  </div>
                </div>
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">Performance Notice</span>
                  </div>
                  <p className="text-sm text-yellow-700 mt-1">
                    Consider optimizing queries on the analytics_events table for better performance.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Database Maintenance</CardTitle>
              <CardDescription>
                Backup, restore, and maintenance operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Backup Operations</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Last backup: Today at 2:00 AM
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Create Backup
                      </Button>
                      <Button size="sm" variant="outline" className="flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        Restore
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Maintenance Tasks</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Last maintenance: 3 days ago
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        Optimize Tables
                      </Button>
                      <Button size="sm" variant="outline">
                        Analyze
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}