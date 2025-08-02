'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Head from 'next/head';
import { generateJobStructuredData } from '@/lib/job-structured-data';
import { motion } from 'framer-motion';
import { Navigation } from '@/components/ui/shared/Navigation';
import { Footer } from '@/components/ui/shared/Footer';
import { Button } from '@/components/ui/shared/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Badge } from '@/components/ui/shared/badge';
import { Separator } from '@/components/ui/shared/separator';
import { Skeleton } from '@/components/ui/shared/skeleton';
import { 
  MapPin, 
  Building, 
  Clock, 
  DollarSign, 
  Users, 
  ExternalLink,
  Briefcase,
  Calendar,
  Globe,
  Home,
  ArrowLeft,
  Share2,
  Bookmark,
  CheckCircle,
  Star,
  Award,
  Target,
  TrendingUp,
  Mail,
  Phone
} from 'lucide-react';

interface JobDetails {
  id: string;
  campaignName: string;
  jobTitle: string;
  department: string;
  location: string;
  experienceLevel: string;
  employeeType: string;
  salaryMin?: number;
  salaryMax?: number;
  currency: string;
  numberOfOpenings: number;
  jobDescription: string;
  jobDuties?: string;
  jobRequirements: string;
  jobBenefits?: string;
  requiredSkills: string;
  applicationDeadline?: string;
  isRemote: boolean;
  isHybrid: boolean;
  companyName: string;
  companyLogo?: string;
  companyWebsite?: string;
  companyIndustry?: string;
  companySize?: string;
  companyDescription?: string;
  createdAt: string;
  minExperience?: number;
  maxExperience?: number;
}

const JobDetailsPage = () => {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  
  const [job, setJob] = useState<JobDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobDetails = async () => {
      try {
        const response = await fetch(`/api/public/jobs/${jobId}`);
        if (!response.ok) {
          throw new Error('Job not found');
        }
        const data = await response.json();
        setJob(data);
      } catch (error) {
        console.error('Error fetching job details:', error);
        setError('Failed to load job details');
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      fetchJobDetails();
    }
  }, [jobId]);

  const formatSalary = (min?: number, max?: number, currency: string = 'INR') => {
    if (!min && !max) return 'Salary not disclosed';
    
    const formatAmount = (amount: number) => {
      if (amount >= 10000000) return `${(amount / 10000000).toFixed(1)}Cr`;
      if (amount >= 100000) return `${(amount / 100000).toFixed(1)}L`;
      if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
      return amount.toString();
    };

    if (min && max) {
      return `${currency} ${formatAmount(min)} - ${formatAmount(max)}`;
    }
    return `${currency} ${formatAmount(min || max || 0)}+`;
  };

  const getWorkModeIcon = (isRemote: boolean, isHybrid: boolean) => {
    if (isRemote) return <Home className="h-5 w-5" />;
    if (isHybrid) return <Globe className="h-5 w-5" />;
    return <Building className="h-5 w-5" />;
  };

  const getWorkModeText = (isRemote: boolean, isHybrid: boolean) => {
    if (isRemote) return 'Remote';
    if (isHybrid) return 'Hybrid';
    return 'On-site';
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths}mo ago`;
  };

  const parseSkills = (skillsString: string) => {
    try {
      return JSON.parse(skillsString);
    } catch {
      return skillsString.split(',').map(skill => skill.trim()).filter(Boolean);
    }
  };

  const handleApply = () => {
    // Redirect to candidate application flow
    router.push(`/candidate/signin?redirect=/candidate/jobs/${jobId}`);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${job?.jobTitle} at ${job?.companyName}`,
          text: `Check out this job opportunity: ${job?.jobTitle} at ${job?.companyName}`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback to copying URL
      navigator.clipboard.writeText(window.location.href);
      // You could show a toast notification here
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Navigation />
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-8 w-32 mb-6" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-6 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              </div>
              <div>
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-12 w-full" />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Navigation />
        <div className="container mx-auto px-6 py-16">
          <div className="text-center">
            <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Job Not Found</h1>
            <p className="text-gray-600 mb-6">The job you're looking for doesn't exist or has been removed.</p>
            <Link href="/jobs">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Jobs
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generateJobStructuredData(job)),
          }}
        />
      </Head>
      
      <Navigation />
      
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <Link href="/jobs">
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Jobs
              </Button>
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Job Header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Card className="border-0 shadow-xl">
                  <CardHeader className="pb-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
                          {job.jobTitle}
                        </CardTitle>
                        <CardDescription className="text-xl text-gray-700 font-semibold mb-4">
                          {job.companyName}
                        </CardDescription>
                        
                        <div className="flex flex-wrap gap-3 mb-4">
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 px-3 py-1">
                            {job.department}
                          </Badge>
                          <Badge variant="outline" className="border-gray-300 px-3 py-1">
                            {job.experienceLevel}
                          </Badge>
                          <Badge className="bg-green-100 text-green-800 border-green-200 px-3 py-1">
                            {job.employeeType}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{job.location}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getWorkModeIcon(job.isRemote, job.isHybrid)}
                            <span>{getWorkModeText(job.isRemote, job.isHybrid)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            <span>{formatSalary(job.salaryMin, job.salaryMax, job.currency)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>{job.numberOfOpenings} opening{job.numberOfOpenings > 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>Posted {getTimeAgo(job.createdAt)}</span>
                          </div>
                          {job.applicationDeadline && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>Apply by {new Date(job.applicationDeadline).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {job.companyLogo && (
                        <div className="ml-6">
                          <img 
                            src={job.companyLogo} 
                            alt={job.companyName}
                            className="h-20 w-20 rounded-xl object-cover border shadow-md"
                          />
                        </div>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              </motion.div>

              {/* Job Description */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      Job Description
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="prose prose-gray max-w-none"
                      dangerouslySetInnerHTML={{ __html: job.jobDescription }}
                    />
                  </CardContent>
                </Card>
              </motion.div>

              {/* Job Duties */}
              {job.jobDuties && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Key Responsibilities
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div 
                        className="prose prose-gray max-w-none"
                        dangerouslySetInnerHTML={{ __html: job.jobDuties }}
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Requirements */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Requirements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="prose prose-gray max-w-none"
                      dangerouslySetInnerHTML={{ __html: job.jobRequirements }}
                    />
                  </CardContent>
                </Card>
              </motion.div>

              {/* Skills */}
              {job.requiredSkills && job.requiredSkills !== '[]' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="h-5 w-5" />
                        Required Skills
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {parseSkills(job.requiredSkills).map((skill: string, index: number) => (
                          <Badge key={index} variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Benefits */}
              {job.jobBenefits && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                >
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5" />
                        Benefits & Perks
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div 
                        className="prose prose-gray max-w-none"
                        dangerouslySetInnerHTML={{ __html: job.jobBenefits }}
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Apply Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Card className="border-0 shadow-xl sticky top-6">
                  <CardHeader>
                    <CardTitle className="text-center">Ready to Apply?</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button 
                      onClick={handleApply}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-xl"
                      size="lg"
                    >
                      Apply Now
                    </Button>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={handleShare}
                        className="flex-1 border-gray-300"
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                      <Button variant="outline" className="flex-1 border-gray-300">
                        <Bookmark className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                    </div>

                    <Separator />

                    <div className="text-center text-sm text-gray-600">
                      <p>Join thousands of candidates who found their dream job through our platform</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Company Info */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      About {job.companyName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {job.companyDescription && (
                      <p className="text-sm text-gray-700">{job.companyDescription}</p>
                    )}
                    
                    <div className="space-y-2 text-sm">
                      {job.companyIndustry && (
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-600">Industry:</span>
                          <span className="font-medium">{job.companyIndustry}</span>
                        </div>
                      )}
                      
                      {job.companySize && (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-600">Company Size:</span>
                          <span className="font-medium">{job.companySize}</span>
                        </div>
                      )}
                    </div>

                    {job.companyWebsite && (
                      <div className="pt-2">
                        <a 
                          href={job.companyWebsite} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Visit Company Website
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Job Stats */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg">Job Highlights</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Experience Required:</span>
                      <span className="font-medium">
                        {job.minExperience || 0} - {job.maxExperience || 'Any'} years
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Job Type:</span>
                      <span className="font-medium">{job.employeeType}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Work Mode:</span>
                      <span className="font-medium">{getWorkModeText(job.isRemote, job.isHybrid)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Openings:</span>
                      <span className="font-medium">{job.numberOfOpenings}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default JobDetailsPage;