'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Button } from '@/components/ui/shared/button';
import { Badge } from '@/components/ui/shared/badge';
import { Input } from '@/components/ui/shared/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/shared/skeleton';
import { toast } from 'sonner';
import { 
  MapPin, 
  Calendar, 
  DollarSign, 
  Building2, 
  Clock, 
  Search,
  Filter,
  Briefcase,
  Users,
  CheckCircle,
  ExternalLink
} from 'lucide-react';

interface JobCampaign {
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
}

export default function JobsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [jobs, setJobs] = useState<JobCampaign[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<JobCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [experienceFilter, setExperienceFilter] = useState('');
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user) {
      router.push('/candidate/signin');
      return;
    }

    fetchJobs();
  }, [session, status, router]);

  useEffect(() => {
    filterJobs();
  }, [jobs, searchTerm, locationFilter, experienceFilter, employmentTypeFilter]);

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/candidates/jobs');
      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }
      const data = await response.json();
      setJobs(data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const filterJobs = () => {
    let filtered = jobs;

    if (searchTerm) {
      filtered = filtered.filter(job => 
        job.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.jobDescription.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (locationFilter && locationFilter !== 'all') {
      filtered = filtered.filter(job => 
        job.location.toLowerCase().includes(locationFilter.toLowerCase()) ||
        (locationFilter === 'remote' && job.isRemote) ||
        (locationFilter === 'hybrid' && job.isHybrid)
      );
    }

    if (experienceFilter && experienceFilter !== 'all') {
      filtered = filtered.filter(job => job.experienceLevel === experienceFilter);
    }

    if (employmentTypeFilter && employmentTypeFilter !== 'all') {
      filtered = filtered.filter(job => job.employeeType === employmentTypeFilter);
    }

    setFilteredJobs(filtered);
  };

  const handleApply = async (jobId: string) => {
    if (!session?.user) {
      toast.error('Please sign in to apply');
      return;
    }

    setApplying(jobId);
    try {
      const response = await fetch('/api/candidates/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId: jobId,
          notes: '',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to apply');
      }

      toast.success('Application submitted successfully!');
      
      // Update the job to show it's been applied to
      setJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, hasApplied: true } : job
      ));
    } catch (error: any) {
      console.error('Error applying to job:', error);
      toast.error(error.message || 'Failed to submit application');
    } finally {
      setApplying(null);
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
      month: 'short',
      day: 'numeric'
    });
  };

  const getWorkTypeDisplay = (job: JobCampaign) => {
    if (job.isRemote) return 'Remote';
    if (job.isHybrid) return 'Hybrid';
    return 'On-site';
  };

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Available Jobs</h1>
            <p className="text-muted-foreground">
              Discover and apply to exciting opportunities
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search jobs, companies, or keywords..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="remote">Remote</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
                <SelectItem value="bangalore">Bangalore</SelectItem>
                <SelectItem value="mumbai">Mumbai</SelectItem>
                <SelectItem value="delhi">Delhi</SelectItem>
                <SelectItem value="pune">Pune</SelectItem>
                <SelectItem value="hyderabad">Hyderabad</SelectItem>
              </SelectContent>
            </Select>

            <Select value={experienceFilter} onValueChange={setExperienceFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Experience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="entry">Entry Level</SelectItem>
                <SelectItem value="mid">Mid Level</SelectItem>
                <SelectItem value="senior">Senior Level</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="principal">Principal</SelectItem>
              </SelectContent>
            </Select>

            <Select value={employmentTypeFilter} onValueChange={setEmploymentTypeFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Job Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="full-time">Full Time</SelectItem>
                <SelectItem value="part-time">Part Time</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="internship">Internship</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {/* Jobs Grid */}
        {filteredJobs.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Briefcase className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search criteria or filters
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setLocationFilter('');
                setExperienceFilter('');
                setEmploymentTypeFilter('');
              }}
            >
              Clear Filters
            </Button>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredJobs.map((job) => (
              <Card key={job.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2 mb-1">
                        {job.jobTitle}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        {job.companyName}
                      </CardDescription>
                    </div>
                    {job.companyLogo && (
                      <img 
                        src={job.companyLogo} 
                        alt={job.companyName}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {job.location} • {getWorkTypeDisplay(job)}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      {formatSalary(job.salaryMin, job.salaryMax, job.currency)}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {job.numberOfOpenings} opening{job.numberOfOpenings !== 1 ? 's' : ''}
                    </div>

                    {job.applicationDeadline && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        Apply by {formatDate(job.applicationDeadline)}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{job.experienceLevel}</Badge>
                    <Badge variant="outline">{job.employeeType}</Badge>
                    <Badge variant="outline">{job.department}</Badge>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {job.jobDescription}
                  </p>

                  <div className="flex gap-2 pt-2">
                    {job.hasApplied ? (
                      <Button disabled className="flex-1">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Applied
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => handleApply(job.id)}
                        disabled={applying === job.id}
                        className="flex-1"
                      >
                        {applying === job.id ? 'Applying...' : 'Apply Now'}
                      </Button>
                    )}
                    
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => router.push(`/candidate/jobs/${job.id}`)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}