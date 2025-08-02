"use client";

import { useState } from "react";
import { Button } from "@/components/ui/shared/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/shared/card";
import { Badge } from "@/components/ui/shared/badge";
import { Globe, ExternalLink, Shield, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface SSOProvider {
  provider: string;
  loginUrl: string;
  enabled: boolean;
  metadata?: {
    entityId?: string;
    ssoUrl?: string;
    certificate?: string;
  };
}

interface SSOProvidersProps {
  providers: SSOProvider[];
  companyName: string;
  companyDomain: string;
  onProviderClick: (provider: SSOProvider) => void;
}

export function SSOProviders({ providers, companyName, companyDomain, onProviderClick }: SSOProvidersProps) {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleProviderClick = async (provider: SSOProvider) => {
    if (!provider.enabled) {
      toast.error(`${getProviderName(provider.provider)} SSO is not enabled for your company`);
      return;
    }

    setLoadingProvider(provider.provider);
    try {
      onProviderClick(provider);
    } catch (error) {
      toast.error('Failed to initiate SSO login');
      setLoadingProvider(null);
    }
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

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'google': return 'Google Workspace';
      case 'microsoft': return 'Microsoft 365';
      case 'github': return 'GitHub';
      case 'saml': return 'SAML SSO';
      default: return provider.charAt(0).toUpperCase() + provider.slice(1);
    }
  };

  const getProviderDescription = (provider: string) => {
    switch (provider) {
      case 'google': return 'Sign in with your Google Workspace account';
      case 'microsoft': return 'Sign in with your Microsoft 365 account';
      case 'github': return 'Sign in with your GitHub account';
      case 'saml': return 'Sign in with your company\'s SAML identity provider';
      default: return `Sign in with ${getProviderName(provider)}`;
    }
  };

  if (providers.length === 0) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">No SSO Providers</CardTitle>
          <CardDescription>
            No SSO providers are configured for {companyName}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 text-center">
            Contact your IT administrator to set up SSO for your organization.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Sign in to {companyName}
        </h2>
        <p className="text-gray-600">
          Choose your preferred sign-in method
        </p>
        <Badge variant="outline" className="mt-2">
          {companyDomain}
        </Badge>
      </div>

      <div className="grid gap-3">
        {providers.map((provider) => (
          <Card 
            key={provider.provider} 
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
              provider.enabled 
                ? 'hover:border-blue-300 border-gray-200' 
                : 'opacity-60 cursor-not-allowed border-gray-100'
            }`}
            onClick={() => handleProviderClick(provider)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {getProviderIcon(provider.provider)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {getProviderName(provider.provider)}
                      </h3>
                      {provider.enabled && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {getProviderDescription(provider.provider)}
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {loadingProvider === provider.provider ? (
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center mt-6">
        <p className="text-xs text-gray-500">
          Having trouble? Contact your IT administrator or{' '}
          <a href="/auth/signin" className="text-blue-600 hover:text-blue-700 underline">
            use standard login
          </a>
        </p>
      </div>
    </div>
  );
}

export default SSOProviders;