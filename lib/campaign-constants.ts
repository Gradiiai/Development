import { Currency } from '@/shared/types/job-campaign';

// Currency options with INR as default
export const CURRENCIES: Currency[] = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
];

// Default currency
export const DEFAULT_CURRENCY = 'INR';

// Job portal options (cleaned up list)
export const JOB_PORTALS = [
  {
    id: 'indeed',
    name: 'Indeed',
    description: 'World\'s #1 job site with millions of job listings',
    logo: '/logos/indeed.png',
    isEnabled: true,
    requiresApiKey: true,
    apiKeyConfigured: false,
    supportedFeatures: ['auto-post', 'sync-applications', 'analytics'],
    syncStatus: 'not-configured' as const
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Jobs',
    description: 'Professional network with quality candidates',
    logo: '/logos/linkedin.png',
    isEnabled: true,
    requiresApiKey: true,
    apiKeyConfigured: false,
    supportedFeatures: ['auto-post', 'sync-applications', 'candidate-search'],
    syncStatus: 'not-configured' as const
  },
  {
    id: 'ziprecruiter',
    name: 'ZipRecruiter',
    description: 'AI-powered job distribution to 100+ job sites',
    logo: '/logos/ziprecruiter.png',
    isEnabled: true,
    requiresApiKey: true,
    apiKeyConfigured: false,
    supportedFeatures: ['auto-post', 'candidate-matching'],
    syncStatus: 'not-configured' as const
  },
  {
    id: 'glassdoor',
    name: 'Glassdoor',
    description: 'Employer branding and salary insights',
    logo: '/logos/glassdoor.png',
    isEnabled: true,
    requiresApiKey: true,
    apiKeyConfigured: false,
    supportedFeatures: ['auto-post', 'employer-branding'],
    syncStatus: 'not-configured' as const
  },
  {
    id: 'manual',
    name: 'Manual Posting',
    description: 'Copy job description and post manually to any platform',
    logo: '/icons/manual-post.svg',
    isEnabled: true,
    requiresApiKey: false,
    apiKeyConfigured: true,
    supportedFeatures: ['copy-jd', 'manual-tracking'],
    syncStatus: 'ready' as const
  }
];

// Question types for interview setup
export const QUESTION_TYPES = [
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'coding', label: 'Coding' },
  { value: 'mcq', label: 'Multiple Choice' },
  { value: 'combo', label: 'Mixed (2-3 types)' }
];

// Difficulty levels
export const DIFFICULTY_LEVELS = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' }
];

// Experience levels
export const EXPERIENCE_LEVELS = [
  { value: 'entry', label: 'Entry Level (0-2 years)' },
  { value: 'mid', label: 'Mid Level (2-5 years)' },
  { value: 'senior', label: 'Senior Level (5-8 years)' },
  { value: 'lead', label: 'Lead Level (8+ years)' },
  { value: 'executive', label: 'Executive Level' }
];

// Employee types
export const EMPLOYEE_TYPES = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'internship', label: 'Internship' }
];