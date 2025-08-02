"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/shared/card";
import { Button } from "@/components/ui/shared/button";
import { Input } from "@/components/ui/shared/input";
import { Badge } from "@/components/ui/shared/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Search, 
  Building2, 
  ArrowRight, 
  Mail, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Globe,
  Shield,
  Info
} from "lucide-react";
import { toast } from "sonner";

interface CompanySSO {
  hasSSO: boolean;
  company?: {
    id: string;
    name: string;
    domain: string;
  };
  providers?: Array<{
    provider: string;
    loginUrl: string;
    enabled: boolean;
  }>;
  message: string;
}

interface CompanyDirectory {
  companies: Array<{
    id: string;
    name: string;
    domain: string;
    providersCount: number;
    lastActive: string;
  }>;
}

export default function SSODiscovery() {
  const [email, setEmail] = useState("");
  const [searchResults, setSearchResults] = useState<CompanySSO | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [companyDirectory, setCompanyDirectory] = useState<CompanyDirectory | null>(null);
  const [showDirectory, setShowDirectory] = useState(false);
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const router = useRouter();

  const handleEmailSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch('/api/auth/domain-detection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Error searching for SSO:', error);
      toast.error('Failed to search for SSO configuration');
    } finally {
      setIsSearching(false);
    }
  };

  const loadCompanyDirectory = async () => {
    setLoadingDirectory(true);
    try {
      const response = await fetch('/api/auth/domain-detection');
      const data = await response.json();
      setCompanyDirectory(data);
      setShowDirectory(true);
    } catch (error) {
      console.error('Error loading company directory:', error);
      toast.error('Failed to load company directory');
    } finally {
      setLoadingDirectory(false);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        );
      case 'microsoft':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#F25022" d="M1 1h10v10H1z"/>
            <path fill="#00A4EF" d="M13 1h10v10H13z"/>
            <path fill="#7FBA00" d="M1 13h10v10H1z"/>
            <path fill="#FFB900" d="M13 13h10v10H13z"/>
          </svg>
        );
      case 'github':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        );
      case 'saml':
        return <Shield className="w-4 h-4 text-blue-600" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <Search className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Find Your Company's SSO
          </h1>
          <p className="text-gray-600 max-w-md mx-auto">
            Enter your work email to discover if your company has Single Sign-On configured
          </p>
        </div>

        {/* Search Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Search by Email</CardTitle>
            <CardDescription>
              We'll check if your company domain has SSO configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmailSearch} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="email"
                  placeholder="Enter your work email (e.g., john@company.com)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12"
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-12" 
                disabled={isSearching}
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Find SSO Configuration
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Search Results */}
        {searchResults && (
          <Card>
            <CardContent className="pt-6">
              {searchResults.hasSSO ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">SSO Found!</span>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {searchResults.company?.name}
                        </h3>
                        <Badge variant="outline" className="mt-1">
                          {searchResults.company?.domain}
                        </Badge>
                      </div>
                      <Building2 className="w-8 h-8 text-green-600" />
                    </div>
                    
                    {searchResults.providers && searchResults.providers.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600 mb-2">
                          Available SSO providers:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {searchResults.providers.map((provider) => (
                            <div 
                              key={provider.provider}
                              className="flex items-center space-x-1 bg-white border border-gray-200 rounded-md px-2 py-1"
                            >
                              {getProviderIcon(provider.provider)}
                              <span className="text-xs font-medium">
                                {provider.provider.charAt(0).toUpperCase() + provider.provider.slice(1)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex flex-col sm:flex-row gap-2 mt-4">
                      <Button
                        onClick={() => router.push(`/auth/company/${searchResults.company?.domain}`)}
                        className="flex-1"
                      >
                        <Building2 className="w-4 h-4 mr-2" />
                        Sign in with SSO
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => router.push('/auth/signin')}
                        className="flex-1"
                      >
                        Standard Sign In
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <XCircle className="w-5 h-5" />
                    <span className="font-medium">No SSO Configuration Found</span>
                  </div>
                  
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Your company domain doesn't have SSO configured yet. You can:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Contact your IT administrator to set up SSO</li>
                        <li>Use standard email/password login</li>
                        <li>Create a new account if you're new</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={() => router.push('/auth/signin')}
                      className="flex-1"
                    >
                      Sign In
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push('/auth/signup')}
                      className="flex-1"
                    >
                      Create Account
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Company Directory */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Browse Companies with SSO</CardTitle>
            <CardDescription>
              See all organizations that have configured SSO
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showDirectory ? (
              <Button
                onClick={loadCompanyDirectory}
                variant="outline"
                className="w-full"
                disabled={loadingDirectory}
              >
                {loadingDirectory ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Building2 className="w-4 h-4 mr-2" />
                    View Company Directory
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                {companyDirectory?.companies.map((company) => (
                  <div
                    key={company.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/auth/company/${company.domain}`)}
                  >
                    <div className="flex items-center space-x-3">
                      <Building2 className="w-5 h-5 text-gray-400" />
                      <div>
                        <h4 className="font-medium text-gray-900">{company.name}</h4>
                        <p className="text-sm text-gray-500">{company.domain}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">
                        {company.providersCount} provider{company.providersCount !== 1 ? 's' : ''}
                      </Badge>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))}
                
                {companyDirectory?.companies.length === 0 && (
                  <p className="text-center text-gray-500 py-4">
                    No companies with SSO found.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Need help? Contact your IT administrator or{' '}
            <a href="/support" className="text-blue-600 hover:text-blue-700 underline">
              get support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}