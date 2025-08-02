import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Jobs | Find Your Dream Career | Gradii.ai',
  description: 'Discover thousands of job opportunities from top companies across India. Search and apply for jobs in technology, finance, healthcare, marketing, and more. Find remote, hybrid, and on-site positions that match your skills and experience.',
  keywords: [
    'jobs',
    'careers',
    'employment',
    'hiring',
    'job search',
    'remote jobs',
    'hybrid jobs',
    'full time jobs',
    'part time jobs',
    'internships',
    'technology jobs',
    'software engineer jobs',
    'data scientist jobs',
    'product manager jobs',
    'marketing jobs',
    'sales jobs',
    'finance jobs',
    'healthcare jobs',
    'India jobs',
    'Bangalore jobs',
    'Mumbai jobs',
    'Delhi jobs',
    'Hyderabad jobs',
    'Chennai jobs',
    'Pune jobs',
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
    url: 'https://gradii.ai/jobs',
    title: 'Jobs | Find Your Dream Career | Gradii.ai',
    description: 'Discover thousands of job opportunities from top companies across India. Search and apply for jobs that match your skills and experience.',
    siteName: 'Gradii.ai',
    images: [
      {
        url: '/og-jobs.jpg',
        width: 1200,
        height: 630,
        alt: 'Find Jobs on Gradii.ai',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jobs | Find Your Dream Career | Gradii.ai',
    description: 'Discover thousands of job opportunities from top companies across India. Search and apply for jobs that match your skills and experience.',
    images: ['/og-jobs.jpg'],
    creator: '@GradiiAI',
  },
  alternates: {
    canonical: 'https://gradii.ai/jobs',
  },
  other: {
    'application-name': 'Gradii.ai Jobs',
    'apple-mobile-web-app-title': 'Gradii.ai Jobs',
    'theme-color': '#3B82F6',
  },
};

export default function JobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}