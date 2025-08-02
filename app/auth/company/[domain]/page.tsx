'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Building2, ArrowLeft, Shield, Globe, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/shared/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Badge } from '@/components/ui/shared/badge';
import { toast } from 'sonner';
import SSOProviders from '@/components/auth/sso-providers';

interface Company {
  id: string;
  name: string;
  domain: string;
}

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

interface CompanySSO {
  hasSSO: boolean;
  company?: Company;
  providers?: SSOProvider[];
  message: string;
}

export default function CompanyLoginPage() {
  const params = useParams();
  const router = useRouter();
  const domain = params.domain as string;
  
  const [companyData, setCompanyData] = useState<CompanySSO | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanySSO = async () => {
      try {
        const response = await fetch('/api/auth/domain-detection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: `user@${domain}` })
        });
        
        const data = await response.json();
        setCompanyData(data);
        
        if (!data.hasSSO) {
          toast.error('No SSO configuration found for this domain');
        }
      } catch (error) {
        console.error('Error fetching company SSO:', error);
        toast.error('Failed to load company information');
      } finally {
        setLoading(false);
      }
    };

    if (domain) {
      fetchCompanySSO();
    }
  }, [domain]);

  const handleSSOLogin = (provider: SSOProvider) => {
    // Add analytics or logging here if needed
    window.location.href = provider.loginUrl;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading company information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.push('/auth/signin')}
          className="mb-6 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Sign In
        </Button>

        <Card className="shadow-xl border border-gray-100">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              {companyData?.company?.name || domain}
            </CardTitle>
            <p className="text-gray-600 mt-2">
              {companyData?.hasSSO 
                ? 'Sign in with your company account'
                : 'SSO not configured for this domain'
              }
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            {companyData?.hasSSO && companyData.providers ? (
              <>
                <SSOProviders
                  providers={companyData.providers}
                  companyName={companyData.company?.name || domain}
                  companyDomain={companyData.company?.domain || domain}
                  onProviderClick={handleSSOLogin}
                />

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-center space-x-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-600">
                      Secure enterprise authentication
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Building2 className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-600 mb-4">
                  {companyData?.message || 'No SSO configuration found for this domain'}
                </p>
                <Button
                  onClick={() => router.push('/auth/signin')}
                  variant="outline"
                  className="w-full"
                >
                  Use Standard Sign In
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Need help? Contact your IT administrator or{' '}
            <a href="/landing/contact" className="text-blue-600 hover:text-blue-700 font-medium">
              support team
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}