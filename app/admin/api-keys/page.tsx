'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Button } from '@/components/ui/shared/button';
import { Input } from '@/components/ui/shared/input';
import { Label } from '@/components/ui/shared/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/shared/badge';
import { Switch } from '@/components/ui/shared/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shared/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/shared/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/shared/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/shared/dropdown-menu';
import { 
  Copy, 
  Eye, 
  EyeOff, 
  Key, 
  Plus, 
  Trash2, 
  Edit, 
  AlertTriangle, 
  MoreHorizontal,
  RefreshCw,
  Power,
  PowerOff,
  Search,
  Filter,
  Calendar,
  Globe,
  Shield,
  Activity,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

interface ApiToken {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  isActive: boolean;
  lastUsedAt?: string;
  lastUsedIp?: string;
  expiresAt?: string;
  revokedAt?: string;
  revokedBy?: string;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
  rateLimit?: number;
  ipWhitelist: string[];
  companyId: string;
  createdBy: string;
}

interface CreateTokenData {
  name: string;
  description: string;
  permissions: string[];
  expiresAt?: string;
  ipWhitelist: string[];
  companyId?: string;
}

interface Company {
  id: string;
  name: string;
}

const PERMISSION_CATEGORIES = {
  'Jobs & Campaigns': [
    { id: 'jobs:read', label: 'Read Jobs', description: 'View job campaigns and postings' },
    { id: 'jobs:write', label: 'Write Jobs', description: 'Create and update job campaigns' },
  ],
  'Candidates': [
    { id: 'candidates:read', label: 'Read Candidates', description: 'View candidate information' },
    { id: 'candidates:write', label: 'Write Candidates', description: 'Create and update candidates' },
  ],
  'Interviews': [
    { id: 'interviews:read', label: 'Read Interviews', description: 'View interview data and results' },
    { id: 'interviews:write', label: 'Write Interviews', description: 'Create and schedule interviews' },
  ],
  'Applications': [
    { id: 'applications:read', label: 'Read Applications', description: 'View job applications' },
    { id: 'applications:write', label: 'Write Applications', description: 'Manage job applications' },
  ],
  'Analytics & Reports': [
    { id: 'analytics:read', label: 'Read Analytics', description: 'Access interview and hiring analytics' },
    { id: 'evaluations:read', label: 'Read Evaluations', description: 'View interview evaluations' },
  ],
};

const ALL_PERMISSIONS = Object.values(PERMISSION_CATEGORIES).flat();

export default function ApiKeysPage() {
  const { data: session } = useSession();
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [visibleTokens, setVisibleTokens] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const [selectedToken, setSelectedToken] = useState<ApiToken | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  const [createData, setCreateData] = useState<CreateTokenData>({
    name: '',
    description: '',
    permissions: [],
    expiresAt: '',
    ipWhitelist: [],
    companyId: ''
  });

  useEffect(() => {
    if (session?.user) {
      if (['super-admin', 'company'].includes(session.user.role)) {
        fetchTokens();
      }
      if (session.user.role === 'super-admin') {
        fetchCompanies();
      }
    }
  }, [session]);

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/admin/companies?limit=1000');
      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies || []);
      } else {
        toast.error('Failed to fetch companies');
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('Error fetching companies');
    }
  };

  const fetchTokens = async () => {
    try {
      const response = await fetch('/api/admin/tokens');
      if (response.ok) {
        const data = await response.json();
        setTokens(data.tokens || []);
      } else {
        toast.error('Failed to fetch API tokens');
      }
    } catch (error) {
      console.error('Error fetching tokens:', error);
      toast.error('Error fetching API tokens');
    } finally {
      setLoading(false);
    }
  };

  const createToken = async () => {
    if (!createData.name.trim()) {
      toast.error('Token name is required');
      return;
    }

    if (createData.permissions.length === 0) {
      toast.error('At least one permission is required');
      return;
    }

    if (session?.user?.role === 'super-admin' && !createData.companyId) {
      toast.error('Company selection is required for super-admin');
      return;
    }

    setCreating(true);
    try {
      const payload = {
        ...createData,
        expiresAt: createData.expiresAt || undefined,
        ipWhitelist: createData.ipWhitelist.filter(ip => ip.trim()),
        companyId: session?.user?.role === 'super-admin' ? createData.companyId : undefined
      };

      const response = await fetch('/api/admin/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        setNewToken(data.token.token);
        setTokens(prev => [data.token, ...prev]);
        setCreateData({
          name: '',
          description: '',
          permissions: [],
          expiresAt: '',
          ipWhitelist: [],
          companyId: ''
        });
        setShowCreateForm(false);
        toast.success('API token created successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create token');
      }
    } catch (error) {
      console.error('Error creating token:', error);
      toast.error('Error creating API token');
    } finally {
      setCreating(false);
    }
  };

  const handleTokenAction = async (tokenId: string, action: 'regenerate' | 'activate' | 'deactivate' | 'revoke') => {
    if (action === 'revoke' && !confirm('Are you sure you want to revoke this token? This action cannot be undone.')) {
      return;
    }

    if (action === 'regenerate' && !confirm('Are you sure you want to regenerate this token? The old token will stop working immediately.')) {
      return;
    }

    try {
      let response;
      
      if (action === 'revoke') {
        response = await fetch('/api/admin/tokens', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokenId })
        });
      } else {
        response = await fetch('/api/admin/tokens', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokenId, action })
        });
      }

      if (response.ok) {
        const data = await response.json();
        
        if (action === 'regenerate' && data.token?.token) {
          setNewToken(data.token.token);
        }
        
        setTokens(prev => prev.map(token => 
          token.id === tokenId ? { ...token, ...data.token } : token
        ));
        
        toast.success(data.message);
      } else {
        const error = await response.json();
        toast.error(error.error || `Failed to ${action} token`);
      }
    } catch (error) {
      console.error(`Error ${action} token:`, error);
      toast.error(`Error ${action} token`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const toggleTokenVisibility = (tokenId: string) => {
    setVisibleTokens(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tokenId)) {
        newSet.delete(tokenId);
      } else {
        newSet.add(tokenId);
      }
      return newSet;
    });
  };

  const addIpAddress = () => {
    setCreateData(prev => ({
      ...prev,
      ipWhitelist: [...prev.ipWhitelist, '']
    }));
  };

  const updateIpAddress = (index: number, value: string) => {
    setCreateData(prev => ({
      ...prev,
      ipWhitelist: prev.ipWhitelist.map((ip, i) => i === index ? value : ip)
    }));
  };

  const removeIpAddress = (index: number) => {
    setCreateData(prev => ({
      ...prev,
      ipWhitelist: prev.ipWhitelist.filter((_, i) => i !== index)
    }));
  };

  const toggleAllPermissions = (category: string, checked: boolean) => {
    const categoryPermissions = PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES].map(p => p.id);
    setCreateData(prev => ({
      ...prev,
      permissions: checked
        ? [...new Set([...prev.permissions, ...categoryPermissions])]
        : prev.permissions.filter(p => !categoryPermissions.includes(p))
    }));
  };

  const getTokenStatus = (token: ApiToken) => {
    if (!token.isActive || token.revokedAt) return 'revoked';
    if (token.expiresAt && new Date(token.expiresAt) < new Date()) return 'expired';
    return 'active';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
      case 'expired':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Expired</Badge>;
      case 'revoked':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Revoked</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const filteredTokens = tokens.filter(token => {
    const matchesSearch = token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         token.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (statusFilter === 'all') return true;
    
    const status = getTokenStatus(token);
    if (statusFilter === 'active') return status === 'active';
    if (statusFilter === 'inactive') return status === 'revoked';
    if (statusFilter === 'expired') return status === 'expired';
    
    return true;
  });

  // Access control
  if (!session?.user) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  if (!['super-admin', 'company'].includes(session.user.role)) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              Only super-administrators and company administrators can manage API tokens.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading API tokens...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Keys Management</h1>
          <p className="text-muted-foreground mt-2">
            Generate and manage API keys for accessing platform APIs
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create API Key
        </Button>
      </div>

      {newToken && (
        <Alert className="border-green-200 bg-green-50">
          <Key className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Your new API token has been generated:</p>
              <div className="flex items-center gap-2 p-2 bg-white rounded border font-mono text-sm">
                <code className="flex-1">{newToken}</code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(newToken)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-sm text-amber-600">
                <AlertTriangle className="h-3 w-3 inline mr-1" />
                Make sure to copy this token now. You won't be able to see it again!
              </p>
              <Button size="sm" onClick={() => setNewToken(null)}>Dismiss</Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="tokens" className="space-y-6">
        <TabsList>
          <TabsTrigger value="tokens">API Tokens</TabsTrigger>
          <TabsTrigger value="documentation">Documentation</TabsTrigger>
        </TabsList>

        <TabsContent value="tokens" className="space-y-6">
          {showCreateForm && (
            <Card>
              <CardHeader>
                <CardTitle>Create New API Token</CardTitle>
                <CardDescription>
                  Generate a new API token with specific permissions and access controls
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Token Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Production API Access"
                      value={createData.name}
                      onChange={(e) => setCreateData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiresAt">Expiration Date (Optional)</Label>
                    <Input
                      id="expiresAt"
                      type="datetime-local"
                      value={createData.expiresAt}
                      onChange={(e) => setCreateData(prev => ({ ...prev, expiresAt: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what this token will be used for..."
                    value={createData.description}
                    onChange={(e) => setCreateData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                {session?.user?.role === 'super-admin' && (
                  <div className="space-y-2">
                    <Label htmlFor="company">Company *</Label>
                    <Select
                      value={createData.companyId}
                      onValueChange={(value) => setCreateData(prev => ({ ...prev, companyId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a company" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-4">
                  <Label>Permissions *</Label>
                  {Object.entries(PERMISSION_CATEGORIES).map(([category, permissions]) => {
                    const allSelected = permissions.every(p => createData.permissions.includes(p.id));
                    const someSelected = permissions.some(p => createData.permissions.includes(p.id));
                    
                    return (
                      <div key={category} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{category}</h4>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={allSelected}
                              onCheckedChange={(checked) => toggleAllPermissions(category, checked)}
                            />
                            <span className="text-xs text-muted-foreground">
                              {allSelected ? 'Deselect All' : 'Select All'}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4">
                          {permissions.map((permission) => (
                            <div key={permission.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                              <Switch
                                checked={createData.permissions.includes(permission.id)}
                                onCheckedChange={(checked) => {
                                  setCreateData(prev => ({
                                    ...prev,
                                    permissions: checked
                                      ? [...prev.permissions, permission.id]
                                      : prev.permissions.filter(p => p !== permission.id)
                                  }));
                                }}
                              />
                              <div className="space-y-1">
                                <div className="font-medium text-sm">{permission.label}</div>
                                <div className="text-xs text-muted-foreground">{permission.description}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-3">
                  <Label>IP Whitelist (Optional)</Label>
                  <p className="text-sm text-muted-foreground">
                    Restrict token usage to specific IP addresses. Leave empty to allow all IPs.
                  </p>
                  {createData.ipWhitelist.map((ip, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        placeholder="192.168.1.1 or 2001:db8::1"
                        value={ip}
                        onChange={(e) => updateIpAddress(index, e.target.value)}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeIpAddress(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={addIpAddress}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add IP Address
                  </Button>
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <Button onClick={createToken} disabled={creating}>
                    {creating ? 'Creating...' : 'Create Token'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>API Tokens</CardTitle>
              <CardDescription>
                Manage your API tokens and their permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tokens..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                  <SelectTrigger className="w-40">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filteredTokens.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Key className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {tokens.length === 0 ? 'No API tokens yet' : 'No tokens match your search'}
                  </h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {tokens.length === 0 
                      ? 'Create your first API token to start using the platform API'
                      : 'Try adjusting your search or filter criteria'
                    }
                  </p>
                  {tokens.length === 0 && (
                    <Button onClick={() => setShowCreateForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create API Token
                    </Button>
                  )}
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Permissions</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Last Used</TableHead>
                        <TableHead>Usage</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTokens.map((token) => {
                        const status = getTokenStatus(token);
                        const isVisible = visibleTokens.has(token.id);
                        
                        return (
                          <TableRow key={token.id}>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">{token.name}</div>
                                {token.description && (
                                  <div className="text-sm text-muted-foreground">{token.description}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(status)}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {token.permissions.slice(0, 2).map((permission) => (
                                  <Badge key={permission} variant="outline" className="text-xs">
                                    {permission.split(':')[0]}
                                  </Badge>
                                ))}
                                {token.permissions.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{token.permissions.length - 2}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {new Date(token.createdAt).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {token.lastUsedAt 
                                  ? new Date(token.lastUsedAt).toLocaleDateString()
                                  : 'Never'
                                }
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{token.usageCount || 0}</div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedToken(token);
                                    setShowDetailsModal(true);
                                  }}
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="outline">
                                      <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => handleTokenAction(token.id, 'regenerate')}
                                      disabled={status !== 'active'}
                                    >
                                      <RefreshCw className="h-3 w-3 mr-2" />
                                      Regenerate
                                    </DropdownMenuItem>
                                    {status === 'active' ? (
                                      <DropdownMenuItem
                                        onClick={() => handleTokenAction(token.id, 'deactivate')}
                                      >
                                        <PowerOff className="h-3 w-3 mr-2" />
                                        Deactivate
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem
                                        onClick={() => handleTokenAction(token.id, 'activate')}
                                        disabled={status === 'expired'}
                                      >
                                        <Power className="h-3 w-3 mr-2" />
                                        Activate
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                      onClick={() => handleTokenAction(token.id, 'revoke')}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="h-3 w-3 mr-2" />
                                      Revoke
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentation">
          <Card>
            <CardHeader>
              <CardTitle>API Documentation</CardTitle>
              <CardDescription>
                Learn how to use your API tokens to access platform APIs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Authentication
                </h3>
                <p className="text-sm text-muted-foreground">
                  Include your API token in the Authorization header of your requests:
                </p>
                <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                  <div>curl -H "Authorization: Bearer YOUR_API_TOKEN" \</div>
                  <div className="ml-4">https://your-domain.com/api/v1/interviews</div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Available Endpoints
                </h3>
                <div className="space-y-3">
                  <div className="border rounded-lg p-4">
                    <div className="font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Interviews
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 space-y-1">
                      <div>GET /api/v1/interviews - List interviews</div>
                      <div>POST /api/v1/interviews - Create interview</div>
                      <div>GET /api/v1/interviews/:id - Get interview details</div>
                      <div>POST /api/v1/demo - Create demo interview</div>
                    </div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Candidates
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 space-y-1">
                      <div>GET /api/v1/candidates - List candidates</div>
                      <div>POST /api/v1/candidates - Create candidate</div>
                      <div>GET /api/v1/candidates/:id - Get candidate details</div>
                    </div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="font-medium flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Jobs & Applications
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 space-y-1">
                      <div>GET /api/v1/jobs - List job campaigns</div>
                      <div>POST /api/v1/jobs - Create job campaign</div>
                      <div>GET /api/v1/applications - List applications</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Rate Limits
                </h3>
                <p className="text-sm text-muted-foreground">
                  API requests are rate limited to ensure fair usage:
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>1000 requests per hour for read operations</li>
                  <li>500 requests per hour for write operations</li>
                  <li>100 requests per hour for demo endpoints</li>
                  <li>Custom rate limits can be configured per token</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Error Handling</h3>
                <p className="text-sm text-muted-foreground">
                  The API returns standard HTTP status codes and JSON error responses:
                </p>
                <div className="bg-muted p-4 rounded-lg font-mono text-sm space-y-2">
                  <div>// 401 Unauthorized</div>
                  <div>{`{"error": "Invalid token", "code": "INVALID_TOKEN"}`}</div>
                  <div></div>
                  <div>// 403 Forbidden</div>
                  <div>{`{"error": "Insufficient permissions", "code": "FORBIDDEN"}`}</div>
                  <div></div>
                  <div>// 429 Too Many Requests</div>
                  <div>{`{"error": "Rate limit exceeded", "code": "RATE_LIMIT_EXCEEDED"}`}</div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Security Best Practices</h3>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Store API tokens securely and never expose them in client-side code</li>
                  <li>Use IP whitelisting to restrict token usage to specific locations</li>
                  <li>Set appropriate expiration dates for tokens</li>
                  <li>Regularly rotate tokens and revoke unused ones</li>
                  <li>Monitor token usage and investigate unusual activity</li>
                  <li>Use the minimum required permissions for each token</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Token Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>API Token Details</DialogTitle>
            <DialogDescription>
              Comprehensive information about the selected API token
            </DialogDescription>
          </DialogHeader>
          {selectedToken && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <div className="text-sm">{selectedToken.name}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div>{getStatusBadge(getTokenStatus(selectedToken))}</div>
                </div>
              </div>

              {selectedToken.description && (
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <div className="text-sm text-muted-foreground">{selectedToken.description}</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Total Requests</Label>
                  <div className="text-sm">{selectedToken.usageCount || 0}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Rate Limit</Label>
                  <div className="text-sm">{selectedToken.rateLimit || 'Default'} req/hour</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Created</Label>
                  <div className="text-sm">{new Date(selectedToken.createdAt).toLocaleString()}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Last Used</Label>
                  <div className="text-sm">
                    {selectedToken.lastUsedAt 
                      ? new Date(selectedToken.lastUsedAt).toLocaleString()
                      : 'Never'
                    }
                  </div>
                </div>
              </div>

              {selectedToken.lastUsedIp && (
                <div>
                  <Label className="text-sm font-medium">Last Used IP</Label>
                  <div className="text-sm font-mono">{selectedToken.lastUsedIp}</div>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">Permissions</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedToken.permissions.map((permission) => (
                    <Badge key={permission} variant="outline" className="text-xs">
                      {permission}
                    </Badge>
                  ))}
                </div>
              </div>

              {selectedToken.expiresAt && (
                <div>
                  <Label className="text-sm font-medium">Expires</Label>
                  <div className="text-sm">{new Date(selectedToken.expiresAt).toLocaleString()}</div>
                </div>
              )}

              {selectedToken.ipWhitelist && selectedToken.ipWhitelist.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">IP Whitelist</Label>
                  <div className="space-y-1">
                    {selectedToken.ipWhitelist.map((ip, index) => (
                      <div key={index} className="text-sm font-mono bg-muted px-2 py-1 rounded">
                        {ip}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {session?.user?.role === 'super-admin' && (
                <div>
                  <Label className="text-sm font-medium">Company ID</Label>
                  <div className="text-sm font-mono">{selectedToken.companyId}</div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}