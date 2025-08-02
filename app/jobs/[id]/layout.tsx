import { Metadata } from 'next';
import { notFound } from 'next/navigation';

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

async function getJobDetails(id: string): Promise<JobDetails | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/public/jobs/${id}`, {
      cache: 'no-store' // Ensure fresh data for SEO
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching job details:', error);
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const job = await getJobDetails(id);
  
  if (!job) {
    return {
      title: 'Job Not Found | Gradii.ai',
      description: 'The job you are looking for could not be found.',
    };
  }

  const formatSalary = (min?: number, max?: number, currency: string = 'INR') => {
    if (!min && !max) return '';
    
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

  const salaryText = formatSalary(job.salaryMin, job.salaryMax, job.currency);
  const workMode = job.isRemote ? 'Remote' : job.isHybrid ? 'Hybrid' : 'On-site';
  
  const title = `${job.jobTitle} at ${job.companyName} | ${job.location} | Gradii.ai`;
  const description = `Apply for ${job.jobTitle} position at ${job.companyName} in ${job.location}. ${workMode} ${job.employeeType} role${salaryText ? ` with salary ${salaryText}` : ''}. ${job.numberOfOpenings} opening${job.numberOfOpenings > 1 ? 's' : ''} available. Join top talent on Gradii.ai.`;

  return {
    title,
    description,
    keywords: [
      job.jobTitle,
      job.companyName,
      job.department,
      job.location,
      job.experienceLevel,
      job.employeeType,
      workMode,
      'jobs',
      'careers',
      'hiring',
      'employment',
      'Gradii.ai'
    ].join(', '),
    authors: [{ name: 'Gradii.ai' }],
    creator: 'Gradii.ai',
    publisher: 'Gradii.ai',
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: `https://gradii.ai/jobs/${job.id}`,
      title,
      description,
      siteName: 'Gradii.ai',
      images: [
        {
          url: job.companyLogo || '/og-job-default.jpg',
          width: 1200,
          height: 630,
          alt: `${job.jobTitle} at ${job.companyName}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [job.companyLogo || '/og-job-default.jpg'],
      creator: '@GradiiAI',
    },
    alternates: {
      canonical: `https://gradii.ai/jobs/${job.id}`,
    },
    other: {
      'job:company': job.companyName,
      'job:title': job.jobTitle,
      'job:location': job.location,
      'job:type': job.employeeType,
      'job:experience': job.experienceLevel,
      'job:department': job.department,
    },
  };
}

export default function JobDetailsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}