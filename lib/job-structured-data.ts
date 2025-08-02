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

// Generate structured data for SEO
export function generateJobStructuredData(job: JobDetails) {
  const formatSalary = (min?: number, max?: number, currency: string = 'INR') => {
    if (!min && !max) return null;
    
    return {
      '@type': 'MonetaryAmount',
      currency: currency === 'INR' ? 'INR' : currency,
      value: {
        '@type': 'QuantitativeValue',
        minValue: min,
        maxValue: max,
        unitText: 'YEAR'
      }
    };
  };

  const workMode = job.isRemote ? 'TELECOMMUTE' : 'FULL_TIME';
  const employmentType = job.employeeType.toUpperCase().replace(' ', '_');

  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.jobTitle,
    description: job.jobDescription.replace(/<[^>]*>/g, ''), // Strip HTML
    identifier: {
      '@type': 'PropertyValue',
      name: job.companyName,
      value: job.id
    },
    datePosted: job.createdAt,
    ...(job.applicationDeadline && { validThrough: job.applicationDeadline }),
    employmentType: [employmentType],
    hiringOrganization: {
      '@type': 'Organization',
      name: job.companyName,
      sameAs: job.companyWebsite,
      ...(job.companyLogo && { logo: job.companyLogo })
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.location,
        addressCountry: 'IN'
      }
    },
    ...(formatSalary(job.salaryMin, job.salaryMax, job.currency) && {
      baseSalary: formatSalary(job.salaryMin, job.salaryMax, job.currency)
    }),
    workHours: job.employeeType,
    ...(job.isRemote && { jobLocationType: 'TELECOMMUTE' }),
    applicantLocationRequirements: {
      '@type': 'Country',
      name: 'India'
    },
    jobBenefits: job.jobBenefits?.replace(/<[^>]*>/g, ''),
    qualifications: job.jobRequirements.replace(/<[^>]*>/g, ''),
    responsibilities: job.jobDuties?.replace(/<[^>]*>/g, ''),
    skills: job.requiredSkills !== '[]' ? JSON.parse(job.requiredSkills) : [],
    experienceRequirements: {
      '@type': 'OccupationalExperienceRequirements',
      monthsOfExperience: (job.minExperience || 0) * 12
    },
    educationRequirements: {
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: job.experienceLevel
    },
    industry: job.companyIndustry,
    occupationalCategory: job.department,
    totalJobOpenings: job.numberOfOpenings,
    url: `https://gradii.ai/jobs/${job.id}`,
    applicationContact: {
      '@type': 'ContactPoint',
      contactType: 'HR',
      url: `https://gradii.ai/candidate/signin?redirect=/candidate/jobs/${job.id}`
    }
  };
}