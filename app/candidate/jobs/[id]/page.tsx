'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Button } from '@/components/ui/shared/button';
import { Badge } from '@/components/ui/shared/badge';
import { Separator } from '@/components/ui/shared/separator';
import { Skeleton } from '@/components/ui/shared/skeleton';
import { toast } from 'sonner';
import { 
  MapPin, 
  Calendar, 
  DollarSign, 
  Building2, 
  Clock, 
  Users,
  CheckCircle,
  ArrowLeft,
  ExternalLink,
  Briefcase,
  GraduationCap,
  Award,
  Globe
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
  jobRequirements: string;
  jobBenefits?: string;
  requiredSkills: string;
  applicationDeadline?: string;
  isRemote: boolean;
  isHybrid: boolean;
  companyName: string;
  companyLogo?: string;
  companyWebsite?: string;
  createdAt: string;
  hasApplied?: boolean;
  minExperience?: number;
  maxExperience?: number;
}

export default function JobDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;
  
  const [job, setJob] = useState<JobDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user) {
      router.push('/candidate/signin');
      return;
    }

    if (jobId) {
      fetchJobDetails();
    }
  }, [session, status, router, jobId]);

  const fetchJobDetails = async () => {
    try {
      const response = await fetch(`/api/candidates/jobs/${jobId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch job details');
      }
      const data = await response.json();
      setJob(data);
    } catch (error) {
      console.error('Error fetching job details:', error);
      toast.error('Failed to load job details');
      router.push('/candidate/jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!session?.user || !job) {
      toast.error('Please sign in to apply');
      return;
    }

    setApplying(true);
    try {
      const response = await fetch('/api/candidates/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId: job.id,
          notes: '',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to apply');
      }

      toast.success('Application submitted successfully!');
      setJob(prev => prev ? { ...prev, hasApplied: true } : null);
    } catch (error: any) {
      console.error('Error applying to job:', error);
      toast.error(error.message || 'Failed to submit application');
    } finally {
      setApplying(false);
    }
  };

  const formatSalary = (min?: number, max?: number, currency = 'INR') => {
    if (!min && !max) return 'Salary not disclosed';
    if (min && max) return `${currency} ${min.toLocaleString()} - ${max.toLocaleString()}`;
    if (min) return `${currency} ${min.toLocaleString()}+`;
    return `Up to ${currency} ${max?.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getWorkTypeDisplay = (job: JobDetails) => {
    if (job.isRemote) return 'Remote';
    if (job.isHybrid) return 'Hybrid';
    return 'On-site';
  };

  const parseSkills = (skillsString: string) => {
    try {
      const parsed = JSON.parse(skillsString);
      return Array.isArray(parsed) ? parsed : [skillsString];
    } catch {
      return skillsString.split(',').map(s => s.trim()).filter(Boolean);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-32 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Job Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The job you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => router.push('/candidate/jobs')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Jobs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => router.push('/candidate/jobs')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Jobs
        </Button>

        {/* Job Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{job.jobTitle}</CardTitle>
                <CardDescription className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5" />
                  {job.companyName}
                  {job.companyWebsite && (
                    <a 
                      href={job.companyWebsite} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-2 text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </CardDescription>
              </div>
              {job.companyLogo && (
                <img 
                  src={job.companyLogo} 
                  alt={job.companyName}
                  className="h-16 w-16 rounded-lg object-cover"
                />
              )}
            </div>

            <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {job.location} • {getWorkTypeDisplay(job)}
              </div>
              
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                {formatSalary(job.salaryMin, job.salaryMax, job.currency)}
              </div>

              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {job.numberOfOpenings} opening{job.numberOfOpenings !== 1 ? 's' : ''}
              </div>

              {job.applicationDeadline && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Apply by {formatDate(job.applicationDeadline)}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <Badge variant="secondary">{job.experienceLevel}</Badge>
              <Badge variant="outline">{job.employeeType}</Badge>
              <Badge variant="outline">{job.department}</Badge>
              {job.minExperience !== undefined && job.maxExperience !== undefined && (
                <Badge variant="outline">
                  {job.minExperience}-{job.maxExperience} years
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent>
            <div className="flex gap-4">
              {job.hasApplied ? (
                <Button disabled className="min-w-32">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Applied
                </Button>
              ) : (
                <Button 
                  onClick={handleApply}
                  disabled={applying}
                  className="min-w-32"
                >
                  {applying ? 'Applying...' : 'Apply Now'}
                </Button>
              )}
              
              <Button variant="outline">
                Save Job
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Job Details */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            {/* Job Description */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Job Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{job.jobDescription}</p>
                </div>
              </CardContent>
            </Card>

            {/* Requirements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Requirements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{job.jobRequirements}</p>
                </div>
              </CardContent>
            </Card>

            {/* Benefits */}
            {job.jobBenefits && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Benefits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{job.jobBenefits}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Required Skills */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Required Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {parseSkills(job.requiredSkills).map((skill, index) => (
                    <Badge key={index} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Job Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Job Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Department</span>
                    <span className="text-sm font-medium">{job.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Experience Level</span>
                    <span className="text-sm font-medium">{job.experienceLevel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Employment Type</span>
                    <span className="text-sm font-medium">{job.employeeType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Work Type</span>
                    <span className="text-sm font-medium">{getWorkTypeDisplay(job)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Posted</span>
                    <span className="text-sm font-medium">{formatDate(job.createdAt)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Company Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About {job.companyName}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  {job.companyLogo && (
                    <img 
                      src={job.companyLogo} 
                      alt={job.companyName}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  )}
                  <div>
                    <h4 className="font-medium">{job.companyName}</h4>
                    {job.companyWebsite && (
                      <a 
                        href={job.companyWebsite} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <Globe className="h-3 w-3" />
                        Visit Website
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}