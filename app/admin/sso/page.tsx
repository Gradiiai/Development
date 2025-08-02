'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Shield, Plus, Edit, Trash2, Eye, EyeOff, Globe, Key, Settings, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Button } from '@/components/ui/shared/button';
import { Input } from '@/components/ui/shared/input';
import { Label } from '@/components/ui/shared/label';
import { Switch } from '@/components/ui/shared/switch';
import { Badge } from '@/components/ui/shared/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shared/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/shared/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/shared/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';

interface SSOConfiguration {
  id: string;
  companyId: string;
  companyName: string;
  provider: 'google' | 'microsoft' | 'github' | 'saml';
  clientId?: string;
  clientSecret?: string;
  scopes?: string[];
  redirectUri?: string;
  metadataUrl?: string;
  entityId?: string;
  ssoUrl?: string;
  certificate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Company {
  id: string;
  name: string;
}

export default function SSOManagementPage() {
  const { data: session } = useSession();
  const [configurations, setConfigurations] = useState<SSOConfiguration[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SSOConfiguration | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState('oauth');

  const [formData, setFormData] = useState({
    companyId: '',
    provider: 'google' as const,
    clientId: '',
    clientSecret: '',
    scopes: ['openid', 'email', 'profile'],
    redirectUri: '',
    metadataUrl: '',
    entityId: '',
    ssoUrl: '',
    certificate: '',
    isActive: true,
  });

  useEffect(() => {
    if (session?.user?.role === 'super-admin') {
      fetchConfigurations();
      fetchCompanies();
    }
  }, [session]);

  const fetchConfigurations = async () => {
    try {
      const [oauthResponse, samlResponse] = await Promise.all([
        fetch('/api/auth/sso/oauth'),
        fetch('/api/auth/sso/saml')
      ]);
      
      const [oauthData, samlData] = await Promise.all([
        oauthResponse.json(),
        samlResponse.json()
      ]);
      
      const allConfigs = [...(oauthData.configurations || []), ...(samlData.configurations || [])];
      setConfigurations(allConfigs);
    } catch (error) {
      console.error('Error fetching SSO configurations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/admin/companies');
      const data = await response.json();
      setCompanies(data.companies || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const endpoint = activeTab === 'oauth' ? '/api/auth/sso/oauth' : '/api/auth/sso/saml';
      const method = editingConfig ? 'PUT' : 'POST';
      
      const payload = editingConfig 
        ? { id: editingConfig.id, ...formData }
        : formData;
      
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (response.ok) {
        await fetchConfigurations();
        setIsDialogOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error('Error saving SSO configuration:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this SSO configuration?')) return;
    
    try {
      const config = configurations.find(c => c.id === id);
      const endpoint = config?.provider === 'saml' ? '/api/auth/sso/saml' : '/api/auth/sso/oauth';
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      
      if (response.ok) {
        await fetchConfigurations();
      }
    } catch (error) {
      console.error('Error deleting SSO configuration:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      companyId: '',
      provider: 'google',
      clientId: '',
      clientSecret: '',
      scopes: ['openid', 'email', 'profile'],
      redirectUri: '',
      metadataUrl: '',
      entityId: '',
      ssoUrl: '',
      certificate: '',
      isActive: true,
    });
    setEditingConfig(null);
  };

  const openEditDialog = (config: SSOConfiguration) => {
    setEditingConfig(config);
    setFormData({
      companyId: config.companyId,
      provider: config.provider as any,
      clientId: config.clientId || '',
      clientSecret: config.clientSecret || '',
      scopes: config.scopes || ['openid', 'email', 'profile'],
      redirectUri: config.redirectUri || '',
      metadataUrl: config.metadataUrl || '',
      entityId: config.entityId || '',
      ssoUrl: config.ssoUrl || '',
      certificate: config.certificate || '',
      isActive: config.isActive,
    });
    setActiveTab(config.provider === 'saml' ? 'saml' : 'oauth');
    setIsDialogOpen(true);
  };

  const toggleSecretVisibility = (configId: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [configId]: !prev[configId]
    }));
  };

  if (session?.user?.role !== 'super-admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Access denied. Super admin privileges required.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            SSO Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure Single Sign-On for enterprise clients
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add SSO Configuration
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingConfig ? 'Edit' : 'Add'} SSO Configuration
              </DialogTitle>
              <DialogDescription>
                Configure Single Sign-On for a company
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="oauth">OAuth 2.0</TabsTrigger>
                  <TabsTrigger value="saml">SAML</TabsTrigger>
                </TabsList>
                
                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="companyId">Company</Label>
                    <Select
                      value={formData.companyId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, companyId: value }))}
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
                  
                  <TabsContent value="oauth" className="space-y-4">
                    <div>
                      <Label htmlFor="provider">OAuth Provider</Label>
                      <Select
                        value={formData.provider}
                        onValueChange={(value: any) => setFormData(prev => ({ ...prev, provider: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="google">Google</SelectItem>
                          <SelectItem value="microsoft">Microsoft</SelectItem>
                          <SelectItem value="github">GitHub</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="clientId">Client ID</Label>
                      <Input
                        id="clientId"
                        value={formData.clientId}
                        onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="clientSecret">Client Secret</Label>
                      <Input
                        id="clientSecret"
                        type="password"
                        value={formData.clientSecret}
                        onChange={(e) => setFormData(prev => ({ ...prev, clientSecret: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="redirectUri">Redirect URI</Label>
                      <Input
                        id="redirectUri"
                        value={formData.redirectUri}
                        onChange={(e) => setFormData(prev => ({ ...prev, redirectUri: e.target.value }))}
                        placeholder="https://yourdomain.com/api/auth/sso/oauth/callback"
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="saml" className="space-y-4">
                    <div>
                      <Label htmlFor="entityId">Entity ID</Label>
                      <Input
                        id="entityId"
                        value={formData.entityId}
                        onChange={(e) => setFormData(prev => ({ ...prev, entityId: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="ssoUrl">SSO URL</Label>
                      <Input
                        id="ssoUrl"
                        value={formData.ssoUrl}
                        onChange={(e) => setFormData(prev => ({ ...prev, ssoUrl: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="metadataUrl">Metadata URL</Label>
                      <Input
                        id="metadataUrl"
                        value={formData.metadataUrl}
                        onChange={(e) => setFormData(prev => ({ ...prev, metadataUrl: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="certificate">X.509 Certificate</Label>
                      <Textarea
                        id="certificate"
                        value={formData.certificate}
                        onChange={(e) => setFormData(prev => ({ ...prev, certificate: e.target.value }))}
                        placeholder="-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"
                        rows={4}
                      />
                    </div>
                  </TabsContent>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                    />
                    <Label htmlFor="isActive">Active</Label>
                  </div>
                </div>
              </Tabs>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingConfig ? 'Update' : 'Create'} Configuration
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle>SSO Configurations</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading configurations...</div>
          ) : configurations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No SSO configurations found. Create your first configuration to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Client ID / Entity ID</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configurations.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">
                      {config.companyName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {config.provider}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {config.isActive ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {showSecrets[config.id] 
                            ? (config.clientId || config.entityId || 'N/A')
                            : '••••••••••••••••'
                          }
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSecretVisibility(config.id)}
                        >
                          {showSecrets[config.id] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(config.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(config)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(config.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}