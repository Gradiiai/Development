'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Button } from '@/components/ui/shared/button';
import { CheckCircle, ArrowLeft, ExternalLink } from 'lucide-react';

export default function ApplicationSuccessPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card className="text-center">
          <CardHeader className="pb-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-800">Application Submitted Successfully!</CardTitle>
            <CardDescription className="text-lg">
              Thank you for your interest in joining our team.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">What happens next?</h3>
              <ul className="text-sm text-green-700 space-y-1 text-left">
                <li>• Our team will review your application within 2-3 business days</li>
                <li>• If you're a good fit, we'll reach out to schedule an interview</li>
                <li>• You'll receive updates via email about your application status</li>
                <li>• Check your spam folder to ensure you don't miss our communications</li>
              </ul>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                variant="outline" 
                onClick={() => router.push('/jobs')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Browse More Jobs
              </Button>
              <Button 
                onClick={() => router.push('/')}
                className="flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Back to Home
              </Button>
            </div>
            
            <p className="text-sm text-gray-600">
              Application ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}