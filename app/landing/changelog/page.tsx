'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Badge } from '@/components/ui/shared/badge';
import { Calendar, GitBranch, Zap, Users, Code, Shield, Globe, BarChart3 } from 'lucide-react';

import { Navigation } from '@/components/ui/shared/Navigation';
import { Footer } from '@/components/ui/shared/Footer';

const ChangelogPage = () => {
  const versions = [
    {
      version: 'v6 (Public Beta)',
      date: '2024-12-01',
      changes: [
        'Public beta release with enhanced AI-powered analytics dashboard',
        'Multi-language interview support (English, Spanish, French, German)',
        'Real-time access token generator for super admins',
        'Advanced API rate limiting and monitoring',
        'Enhanced security with IP whitelisting',
        'Improved mobile responsiveness',
        'Beta testing program launched'
      ]
    },
    {
      version: 'v5.0',
      date: '2024-09-15',
      changes: [
        'Production-ready webhook system',
        'Advanced reporting and analytics suite',
        'AI model optimization for faster processing',
        'Enterprise-grade security features',
        'Bulk candidate import functionality',
        'Custom branding options for companies'
      ]
    },
    {
      version: 'v1.5',
      date: '2024-06-20',
      changes: [
        'Enhanced interview templates',
        'Automated scheduling system',
        'Video recording improvements',
        'Performance optimizations',
        'Bug fixes and stability improvements'
      ]
    },
    {
      version: 'v1.4',
      date: '2024-05-10',
      changes: [
        'Coding interview module',
        'MCQ (Multiple Choice Questions) support',
        'Behavioral interview analytics',
        'Interview feedback system',
        'API documentation improvements'
      ]
    },
    {
      version: 'v1.3',
      date: '2024-04-01',
      changes: [
        'Combo interview functionality',
        'Question bank management',
        'Skill-based templates',
        'Interview scoring parameters',
        'Enhanced user permissions'
      ]
    },
    {
      version: 'v1.2',
      date: '2024-02-15',
      changes: [
        'AI-powered question generation',
        'Candidate profile management',
        'Interview analytics dashboard',
        'Email notification system',
        'API token management'
      ]
    },
    {
      version: 'v1.0',
      date: '2023-12-01',
      changes: [
        'Initial production release',
        'Core interview functionality',
        'Basic candidate management',
        'User authentication system',
        'Admin dashboard',
        'RESTful API foundation'
      ]
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-grow container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Changelog</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                
                {versions.map((ver, index) => (
                  <div key={index} className="relative flex items-start space-x-6 pb-8">
                    {/* Timeline dot */}
                    <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-4 border-white shadow-lg bg-blue-500">
                      <GitBranch className="w-5 h-5 text-white" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {ver.version}
                          {ver.version.includes('Beta') && (
                            <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-800">
                              Public Beta
                            </Badge>
                          )}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-500 mb-4 flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {ver.date}
                      </p>
                      
                      <Card>
                        <CardContent className="pt-6">
                          <ul className="list-disc pl-5 space-y-1">
                            {ver.changes.map((change, idx) => (
                              <li key={idx}>{change}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default ChangelogPage;