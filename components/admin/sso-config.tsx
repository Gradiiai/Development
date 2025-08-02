"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/shared/card";
import { Button } from "@/components/ui/shared/button";
import { Input } from "@/components/ui/shared/input";
import { Label } from "@/components/ui/shared/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/shared/switch";
import { Badge } from "@/components/ui/shared/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/shared/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  Plus, 
  Trash2, 
  Save, 
  Copy, 
  ExternalLink, 
  CheckCircle, 
  AlertTriangle,
  Info,
  Globe,
  Key,
  Settings
} from "lucide-react";
import { toast } from "sonner";

interface SSOProvider {
  id: string;
  provider: 'google' | 'microsoft' | 'github' | 'saml';
  enabled: boolean;
  config: {
    clientId?: string;
    clientSecret?: string;
    tenantId?: string;
    entityId?: string;
    ssoUrl?: string;
    certificate?: string;
    attributeMapping?: {
      email: string;
      firstName: string;
      lastName: string;
      groups?: string;
    };
  };
  metadata?: {
    lastTested?: string;
    status: 'active' | 'inactive' | 'error';
    errorMessage?: string;
  };
}

interface Company {
  id: string;
  name: string;
  domain: string;
  ssoEnabled: boolean;
  providers: SSOProvider[];
}

interface SSOConfigProps {
  companyId: string;
  onConfigUpdate?: (config: Company) => void;
}

export function SSOConfig({ companyId, onConfigUpdate }: SSOConfigProps) {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadCompanyConfig();
  }, [companyId]);

  const loadCompanyConfig = async () => {
    try {
      const response = await fetch(`/api/admin/companies/${companyId}/sso`);
      if (response.ok) {
        const data = await response.json();
        setCompany(data);
      }
    } catch (error) {
      console.error('Error loading SSO config:', error);
      toast.error('Failed to load SSO configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!company) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/companies/${companyId}/sso`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(company)
      });
      
      if (response.ok) {
        toast.success('SSO configuration saved successfully');
        onConfigUpdate?.(company);
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving SSO config:', error);
      toast.error('Failed to save SSO configuration');
    } finally {
      setSaving(false);
    }
  };

  const testProvider = async (providerId: string) => {
    setTestingProvider(providerId);
    try {
      const response = await fetch(`/api/admin/companies/${companyId}/sso/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId })
      });
      
      const result = await response.json();
      if (result.success) {
        toast.success('SSO provider test successful');
      } else {
        toast.error(`SSO test failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error testing SSO provider:', error);
      toast.error('Failed to test SSO provider');
    } finally {
      setTestingProvider(null);
    }
  };

  const addProvider = (type: SSOProvider['provider']) => {
    if (!company) return;
    
    const newProvider: SSOProvider = {
      id: `${type}-${Date.now()}`,
      provider: type,
      enabled: false,
      config: {},
      metadata: {
        status: 'inactive'
      }
    };
    
    setCompany({
      ...company,
      providers: [...company.providers, newProvider]
    });
  };

  const removeProvider = (providerId: string) => {
    if (!company) return;
    
    setCompany({
      ...company,
      providers: company.providers.filter(p => p.id !== providerId)
    });
  };

  const updateProvider = (providerId: string, updates: Partial<SSOProvider>) => {
    if (!company) return;
    
    setCompany({
      ...company,
      providers: company.providers.map(p => 
        p.id === providerId ? { ...p, ...updates } : p
      )
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        );
      case 'microsoft':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#F25022" d="M1 1h10v10H1z"/>
            <path fill="#00A4EF" d="M13 1h10v10H13z"/>
            <path fill="#7FBA00" d="M1 13h10v10H1z"/>
            <path fill="#FFB900" d="M13 13h10v10H13z"/>
          </svg>
        );
      case 'github':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        );
      case 'saml':
        return <Shield className="w-5 h-5 text-blue-600" />;
      default:
        return <Globe className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!company) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load company SSO configuration.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">SSO Configuration</h2>
          <p className="text-gray-600">{company.name} ({company.domain})</p>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            checked={company.ssoEnabled}
            onCheckedChange={(enabled) => setCompany({ ...company, ssoEnabled: enabled })}
          />
          <Label>SSO Enabled</Label>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">SSO Status</span>
                </div>
                <p className="text-2xl font-bold mt-2">
                  {company.ssoEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Providers</span>
                </div>
                <p className="text-2xl font-bold mt-2">
                  {company.providers.length}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-purple-600" />
                  <span className="font-medium">Active</span>
                </div>
                <p className="text-2xl font-bold mt-2">
                  {company.providers.filter(p => p.enabled).length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button onClick={() => addProvider('google')} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Google
                </Button>
                <Button onClick={() => addProvider('microsoft')} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Microsoft
                </Button>
                <Button onClick={() => addProvider('github')} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add GitHub
                </Button>
                <Button onClick={() => addProvider('saml')} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add SAML
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* SSO URLs */}
          <Card>
            <CardHeader>
              <CardTitle>SSO URLs</CardTitle>
              <CardDescription>
                Use these URLs to configure your identity provider
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Company SSO Login URL</Label>
                <div className="flex items-center space-x-2">
                  <Input 
                    value={`${window.location.origin}/auth/company/${company.domain}`}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => copyToClipboard(`${window.location.origin}/auth/company/${company.domain}`)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>SAML ACS URL</Label>
                <div className="flex items-center space-x-2">
                  <Input 
                    value={`${window.location.origin}/api/auth/sso/saml/acs/${company.id}`}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => copyToClipboard(`${window.location.origin}/api/auth/sso/saml/acs/${company.id}`)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="providers" className="space-y-4">
          {company.providers.map((provider) => (
            <Card key={provider.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getProviderIcon(provider.provider)}
                    <div>
                      <CardTitle className="capitalize">{provider.provider} SSO</CardTitle>
                      <CardDescription>
                        {provider.provider === 'saml' ? 'SAML 2.0 Identity Provider' : 
                         `${provider.provider.charAt(0).toUpperCase() + provider.provider.slice(1)} OAuth 2.0`}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(provider.metadata?.status || 'inactive')}>
                      {provider.metadata?.status || 'inactive'}
                    </Badge>
                    <Switch
                      checked={provider.enabled}
                      onCheckedChange={(enabled) => updateProvider(provider.id, { enabled })}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testProvider(provider.id)}
                      disabled={testingProvider === provider.id}
                    >
                      {testingProvider === provider.id ? 'Testing...' : 'Test'}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeProvider(provider.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {provider.provider === 'saml' ? (
                  // SAML Configuration
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Entity ID</Label>
                      <Input
                        value={provider.config.entityId || ''}
                        onChange={(e) => updateProvider(provider.id, {
                          config: { ...provider.config, entityId: e.target.value }
                        })}
                        placeholder="https://idp.example.com/metadata"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>SSO URL</Label>
                      <Input
                        value={provider.config.ssoUrl || ''}
                        onChange={(e) => updateProvider(provider.id, {
                          config: { ...provider.config, ssoUrl: e.target.value }
                        })}
                        placeholder="https://idp.example.com/sso"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>X.509 Certificate</Label>
                      <Textarea
                        value={provider.config.certificate || ''}
                        onChange={(e) => updateProvider(provider.id, {
                          config: { ...provider.config, certificate: e.target.value }
                        })}
                        placeholder="-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"
                        rows={4}
                      />
                    </div>
                  </div>
                ) : (
                  // OAuth Configuration
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Client ID</Label>
                      <Input
                        value={provider.config.clientId || ''}
                        onChange={(e) => updateProvider(provider.id, {
                          config: { ...provider.config, clientId: e.target.value }
                        })}
                        placeholder="Enter client ID"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Client Secret</Label>
                      <Input
                        type="password"
                        value={provider.config.clientSecret || ''}
                        onChange={(e) => updateProvider(provider.id, {
                          config: { ...provider.config, clientSecret: e.target.value }
                        })}
                        placeholder="Enter client secret"
                      />
                    </div>
                    {provider.provider === 'microsoft' && (
                      <div className="space-y-2">
                        <Label>Tenant ID</Label>
                        <Input
                          value={provider.config.tenantId || ''}
                          onChange={(e) => updateProvider(provider.id, {
                            config: { ...provider.config, tenantId: e.target.value }
                          })}
                          placeholder="Enter tenant ID"
                        />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          
          {company.providers.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No SSO Providers Configured
                </h3>
                <p className="text-gray-600 mb-4">
                  Add your first SSO provider to enable single sign-on for your organization.
                </p>
                <div className="flex justify-center space-x-2">
                  <Button onClick={() => addProvider('google')} variant="outline">
                    Add Google
                  </Button>
                  <Button onClick={() => addProvider('microsoft')} variant="outline">
                    Add Microsoft
                  </Button>
                  <Button onClick={() => addProvider('saml')} variant="outline">
                    Add SAML
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Force SSO Login</Label>
                  <p className="text-sm text-gray-600">
                    Require all users to use SSO instead of password login
                  </p>
                </div>
                <Switch />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-provision Users</Label>
                  <p className="text-sm text-gray-600">
                    Automatically create user accounts on first SSO login
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Just-in-time Provisioning</Label>
                  <p className="text-sm text-gray-600">
                    Update user attributes on each SSO login
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={loadCompanyConfig}>
          Reset
        </Button>
        <Button onClick={saveConfig} disabled={saving}>
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Configuration
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default SSOConfig;