'use client';

import React, { useState } from 'react';
import { Navigation } from '@/components/ui/shared/Navigation';
import { Footer } from '@/components/ui/shared/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { Badge } from '@/components/ui/shared/badge';
import { Button } from '@/components/ui/shared/button';

import { 
  Code, 
  Key, 
  Zap, 
  Shield, 
  Copy, 
  Check,
  ExternalLink,
  Clock,
  AlertTriangle,
  CheckCircle,
  Globe,
  Database,
  Settings,
  Users,
  FileText,
  Play,
  Briefcase,
  UserCheck,
  BarChart3,
  MessageSquare,
  Terminal,
  BookOpen
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface APIEndpoint {
  method: string;
  endpoint: string;
  description: string;
  parameters?: {
    name: string;
    type: string;
    required: boolean;
    description: string;
  }[];
  response: string;
}

interface CodeExample {
  language: string;
  title: string;
  code: string;
}

const APIDocsPage = () => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const router = useRouter();

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // V2 API endpoints based on actual implementation
  const apiSections = {
    // Job Management (V2)
    jobs: [
      {
        method: 'GET',
        endpoint: '/api/v2/jobs',
        description: 'List all jobs with filtering, pagination, and sorting',
        parameters: [
          { name: 'page', type: 'integer', required: false, description: 'Page number (default: 1)' },
          { name: 'limit', type: 'integer', required: false, description: 'Items per page (default: 20, max: 100)' },
          { name: 'search', type: 'string', required: false, description: 'Search by job title or campaign name' },
          { name: 'status', type: 'string', required: false, description: 'Filter by status (active, draft, closed)' },
          { name: 'employment_type', type: 'string', required: false, description: 'Filter by employment type (Full-time, Part-time, Contract, Internship)' },
          { name: 'experience_level', type: 'string', required: false, description: 'Filter by experience level' },
          { name: 'sort_by', type: 'string', required: false, description: 'Sort field (campaignName, jobTitle, createdAt, updatedAt, status)' },
          { name: 'sort_order', type: 'string', required: false, description: 'Sort order (asc, desc)' }
        ],
        response: '{ "success": true, "data": [...], "meta": { "page": 1, "limit": 20, "total": 45, "total_pages": 3, "has_next": true, "has_prev": false }, "timestamp": "2024-01-15T10:30:00Z", "version": "2.0" }'
      },
      {
        method: 'POST',
        endpoint: '/api/v2/jobs',
        description: 'Create a new job',
        parameters: [
          { name: 'campaignName', type: 'string', required: true, description: 'Campaign name (max 255 chars)' },
          { name: 'jobTitle', type: 'string', required: true, description: 'Job title (max 255 chars)' },
          { name: 'department', type: 'string', required: true, description: 'Department (max 255 chars)' },
          { name: 'location', type: 'string', required: true, description: 'Job location (max 255 chars)' },
          { name: 'employeeType', type: 'string', required: true, description: 'Employment type (Full-time, Part-time, Contract, Internship)' },
          { name: 'experienceLevel', type: 'string', required: true, description: 'Required experience level' },
          { name: 'numberOfOpenings', type: 'integer', required: true, description: 'Number of openings (min: 1)' },
          { name: 'jobDescription', type: 'string', required: true, description: 'Job description' },
          { name: 'jobRequirements', type: 'string', required: false, description: 'Job requirements' },
          { name: 'jobBenefits', type: 'string', required: false, description: 'Job benefits' },
          { name: 'jobDuties', type: 'string', required: false, description: 'Job duties' },
          { name: 'salaryMin', type: 'number', required: false, description: 'Minimum salary' },
          { name: 'salaryMax', type: 'number', required: false, description: 'Maximum salary' },
          { name: 'salaryNegotiable', type: 'boolean', required: false, description: 'Whether salary is negotiable (default: false)' },
          { name: 'currency', type: 'string', required: false, description: 'Salary currency (default: INR)' }
        ],
        response: '{ "success": true, "data": { "id": "job_123", "campaignName": "Senior Developer", "status": "draft" }, "message": "Job created successfully", "timestamp": "2024-01-15T10:30:00Z", "version": "2.0" }'
      },
      {
        method: 'GET',
        endpoint: '/api/v2/jobs/{id}',
        description: 'Get a specific job by ID',
        parameters: [
          { name: 'id', type: 'string', required: true, description: 'Job ID (UUID)' }
        ],
        response: '{ "success": true, "data": { "id": "job_123", "campaignName": "Senior Developer", "jobTitle": "Senior Software Engineer", ... }, "timestamp": "2024-01-15T10:30:00Z", "version": "2.0" }'
      },
      {
        method: 'PUT',
        endpoint: '/api/v2/jobs/{id}',
        description: 'Update an existing job',
        parameters: [
          { name: 'id', type: 'string', required: true, description: 'Job ID (UUID)' },
          { name: 'campaignName', type: 'string', required: false, description: 'Updated campaign name' },
          { name: 'jobTitle', type: 'string', required: false, description: 'Updated job title' },
          { name: 'status', type: 'string', required: false, description: 'Updated job status' },
          { name: 'jobDescription', type: 'string', required: false, description: 'Updated job description' }
        ],
        response: '{ "success": true, "data": { "id": "job_123", "updatedAt": "2024-01-15T11:30:00Z" }, "message": "Job updated successfully", "timestamp": "2024-01-15T11:30:00Z", "version": "2.0" }'
      },
      {
        method: 'DELETE',
        endpoint: '/api/v2/jobs/{id}',
        description: 'Delete a job',
        parameters: [
          { name: 'id', type: 'string', required: true, description: 'Job ID (UUID)' }
        ],
        response: '{ "success": true, "message": "Job deleted successfully", "timestamp": "2024-01-15T12:00:00Z", "version": "2.0" }'
      }
    ],

    // Interview Management (V2)
    interviews: [
      {
        method: 'GET',
        endpoint: '/api/v2/interviews',
        description: 'List all interviews with filtering, pagination, and sorting',
        parameters: [
          { name: 'page', type: 'integer', required: false, description: 'Page number (default: 1)' },
          { name: 'limit', type: 'integer', required: false, description: 'Items per page (default: 20, max: 100)' },
          { name: 'campaign_id', type: 'string', required: false, description: 'Filter by campaign ID (UUID)' },
          { name: 'candidate_id', type: 'string', required: false, description: 'Filter by candidate ID (UUID)' },
          { name: 'status', type: 'string', required: false, description: 'Filter by status (scheduled, in_progress, completed, cancelled, no_show)' },
          { name: 'interview_type', type: 'string', required: false, description: 'Filter by type (coding, behavioral, technical, hr)' },
          { name: 'candidate_name', type: 'string', required: false, description: 'Search by candidate name' },
          { name: 'sort_by', type: 'string', required: false, description: 'Sort field (scheduledAt, createdAt, candidateName, status)' },
          { name: 'sort_order', type: 'string', required: false, description: 'Sort order (asc, desc)' }
        ],
        response: '{ "success": true, "data": [...], "meta": { "page": 1, "limit": 20, "total": 25, "total_pages": 2, "has_next": true, "has_prev": false }, "timestamp": "2024-01-15T10:30:00Z", "version": "2.0" }'
      },
      {
        method: 'POST',
        endpoint: '/api/v2/interviews',
        description: 'Create a new interview',
        parameters: [
          { name: 'candidateId', type: 'string', required: true, description: 'Candidate ID (UUID)' },
          { name: 'campaignId', type: 'string', required: true, description: 'Campaign ID (UUID)' },
          { name: 'interviewType', type: 'string', required: true, description: 'Interview type (coding, behavioral, mcq, combo)' },
          { name: 'scheduledAt', type: 'string', required: true, description: 'Interview schedule (ISO 8601 datetime)' },
          { name: 'duration', type: 'integer', required: false, description: 'Duration in minutes (default: 60)' },
          { name: 'interviewerId', type: 'string', required: false, description: 'Interviewer user ID (UUID)' },
          { name: 'notes', type: 'string', required: false, description: 'Additional notes or instructions' },
          { name: 'meetingLink', type: 'string', required: false, description: 'Video call or meeting link' }
        ],
        response: '{ "success": true, "data": { "id": "interview_456", "status": "scheduled", "scheduledAt": "2024-01-15T14:00:00Z" }, "message": "Interview created successfully", "timestamp": "2024-01-15T10:30:00Z", "version": "2.0" }'
      },
      {
        method: 'GET',
        endpoint: '/api/v2/interviews/{id}',
        description: 'Get interview details',
        parameters: [
          { name: 'id', type: 'string', required: true, description: 'Interview ID (UUID)' }
        ],
        response: '{ "success": true, "data": { "id": "interview_456", "candidate": {...}, "campaign": {...}, "status": "completed", "scheduledAt": "2024-01-15T14:00:00Z", "duration": 60, "interviewer": {...} }, "timestamp": "2024-01-15T10:30:00Z", "version": "2.0" }'
      },
      {
        method: 'PUT',
        endpoint: '/api/v2/interviews/{id}',
        description: 'Update an existing interview',
        parameters: [
          { name: 'id', type: 'string', required: true, description: 'Interview ID (UUID)' },
          { name: 'status', type: 'string', required: false, description: 'Updated interview status' },
          { name: 'scheduledAt', type: 'string', required: false, description: 'Updated schedule (ISO 8601)' },
          { name: 'notes', type: 'string', required: false, description: 'Updated notes' },
          { name: 'meetingLink', type: 'string', required: false, description: 'Updated meeting link' }
        ],
        response: '{ "success": true, "data": { "id": "interview_456", "updatedAt": "2024-01-15T11:30:00Z" }, "message": "Interview updated successfully", "timestamp": "2024-01-15T11:30:00Z", "version": "2.0" }'
      },
      {
        method: 'GET',
        endpoint: '/api/v2/interviews/{id}/results',
        description: 'Get interview results and evaluation',
        parameters: [
          { name: 'id', type: 'string', required: true, description: 'Interview ID (UUID)' }
        ],
        response: '{ "success": true, "data": { "interviewId": "interview_456", "score": 85, "feedback": "Strong technical skills...", "recommendations": [...], "evaluationDetails": {...} }, "timestamp": "2024-01-15T10:30:00Z", "version": "2.0" }'
      }
    ],

    // Candidate Management (V2)
    candidates: [
      {
        method: 'GET',
        endpoint: '/api/v2/candidates',
        description: 'List all candidates with filtering, pagination, and sorting',
        parameters: [
          { name: 'page', type: 'integer', required: false, description: 'Page number (default: 1)' },
          { name: 'limit', type: 'integer', required: false, description: 'Items per page (default: 20, max: 100)' },
          { name: 'campaign_id', type: 'string', required: false, description: 'Filter by campaign ID (UUID)' },
          { name: 'search', type: 'string', required: false, description: 'Search by name, email, or phone' },
          { name: 'status', type: 'string', required: false, description: 'Filter by status (active, inactive, hired, rejected)' },
          { name: 'source', type: 'string', required: false, description: 'Filter by candidate source' },
          { name: 'experience_level', type: 'string', required: false, description: 'Filter by experience level' },
          { name: 'sort_by', type: 'string', required: false, description: 'Sort field (name, email, createdAt, updatedAt, status)' },
          { name: 'sort_order', type: 'string', required: false, description: 'Sort order (asc, desc)' }
        ],
        response: '{ "success": true, "data": [...], "meta": { "page": 1, "limit": 20, "total": 250, "total_pages": 13, "has_next": true, "has_prev": false }, "timestamp": "2024-01-15T10:30:00Z", "version": "2.0" }'
      },
      {
        method: 'POST',
        endpoint: '/api/v2/candidates',
        description: 'Create a new candidate profile',
        parameters: [
          { name: 'name', type: 'string', required: true, description: 'Full name (max 255 chars)' },
          { name: 'email', type: 'string', required: true, description: 'Email address (must be valid email)' },
          { name: 'phone', type: 'string', required: false, description: 'Phone number (max 20 chars)' },
          { name: 'campaignId', type: 'string', required: true, description: 'Associated campaign ID (UUID)' },
          { name: 'resumeUrl', type: 'string', required: false, description: 'Resume file URL' },
          { name: 'linkedinUrl', type: 'string', required: false, description: 'LinkedIn profile URL' },
          { name: 'portfolioUrl', type: 'string', required: false, description: 'Portfolio website URL' },
          { name: 'experience', type: 'string', required: false, description: 'Years of experience' },
          { name: 'skills', type: 'string', required: false, description: 'Comma-separated skills' },
          { name: 'location', type: 'string', required: false, description: 'Current location' },
          { name: 'source', type: 'string', required: false, description: 'Candidate source (referral, job_board, social_media, etc.)' }
        ],
        response: '{ "success": true, "data": { "id": "candidate_456", "name": "John Doe", "email": "john@example.com", "status": "active" }, "message": "Candidate created successfully", "timestamp": "2024-01-15T10:30:00Z", "version": "2.0" }'
      },
      {
        method: 'GET',
        endpoint: '/api/v2/candidates/{id}',
        description: 'Get a specific candidate by ID',
        parameters: [
          { name: 'id', type: 'string', required: true, description: 'Candidate ID (UUID)' }
        ],
        response: '{ "success": true, "data": { "id": "candidate_456", "name": "John Doe", "email": "john@example.com", "campaign": {...}, "interviews": [...] }, "timestamp": "2024-01-15T10:30:00Z", "version": "2.0" }'
      },
      {
        method: 'PUT',
        endpoint: '/api/v2/candidates/{id}',
        description: 'Update an existing candidate',
        parameters: [
          { name: 'id', type: 'string', required: true, description: 'Candidate ID (UUID)' },
          { name: 'name', type: 'string', required: false, description: 'Updated full name' },
          { name: 'email', type: 'string', required: false, description: 'Updated email address' },
          { name: 'phone', type: 'string', required: false, description: 'Updated phone number' },
          { name: 'status', type: 'string', required: false, description: 'Updated candidate status' }
        ],
        response: '{ "success": true, "data": { "id": "candidate_456", "updatedAt": "2024-01-15T11:30:00Z" }, "message": "Candidate updated successfully", "timestamp": "2024-01-15T11:30:00Z", "version": "2.0" }'
      }
    ],

    // Application Management (V2)
    applications: [
      {
        method: 'GET',
        endpoint: '/api/v2/applications',
        description: 'List all applications with filtering, pagination, and sorting',
        parameters: [
          { name: 'page', type: 'integer', required: false, description: 'Page number (default: 1)' },
          { name: 'limit', type: 'integer', required: false, description: 'Items per page (default: 20, max: 100)' },
          { name: 'candidate_id', type: 'string', required: false, description: 'Filter by candidate ID (UUID)' },
          { name: 'job_id', type: 'string', required: false, description: 'Filter by job ID (UUID)' },
          { name: 'status', type: 'string', required: false, description: 'Filter by status (pending, reviewed, accepted, rejected)' },
          { name: 'sort_by', type: 'string', required: false, description: 'Sort field (appliedAt, status, candidateName)' },
          { name: 'sort_order', type: 'string', required: false, description: 'Sort order (asc, desc)' }
        ],
        response: '{ "success": true, "data": [...], "meta": { "page": 1, "limit": 20, "total": 150, "total_pages": 8, "has_next": true, "has_prev": false }, "timestamp": "2024-01-15T10:30:00Z", "version": "2.0" }'
      },
      {
        method: 'POST',
        endpoint: '/api/v2/applications',
        description: 'Create a new application',
        parameters: [
          { name: 'candidateId', type: 'string', required: true, description: 'Candidate ID (UUID)' },
          { name: 'jobId', type: 'string', required: true, description: 'Job ID (UUID)' },
          { name: 'coverLetter', type: 'string', required: false, description: 'Cover letter content' },
          { name: 'resumeUrl', type: 'string', required: false, description: 'Resume file URL' },
          { name: 'expectedSalary', type: 'number', required: false, description: 'Expected salary' },
          { name: 'availableFrom', type: 'string', required: false, description: 'Available start date (ISO 8601)' }
        ],
        response: '{ "success": true, "data": { "id": "app_123", "status": "pending", "appliedAt": "2024-01-15T10:30:00Z" }, "message": "Application created successfully", "timestamp": "2024-01-15T10:30:00Z", "version": "2.0" }'
      },
      {
        method: 'GET',
        endpoint: '/api/v2/applications/{id}',
        description: 'Get a specific application by ID',
        parameters: [
          { name: 'id', type: 'string', required: true, description: 'Application ID (UUID)' }
        ],
        response: '{ "success": true, "data": { "id": "app_123", "candidate": {...}, "job": {...}, "status": "pending", "appliedAt": "2024-01-15T10:30:00Z" }, "timestamp": "2024-01-15T10:30:00Z", "version": "2.0" }'
      },
      {
        method: 'PUT',
        endpoint: '/api/v2/applications/{id}',
        description: 'Update an existing application',
        parameters: [
          { name: 'id', type: 'string', required: true, description: 'Application ID (UUID)' },
          { name: 'status', type: 'string', required: false, description: 'Updated application status' },
          { name: 'notes', type: 'string', required: false, description: 'Internal notes' },
          { name: 'reviewedBy', type: 'string', required: false, description: 'Reviewer user ID' }
        ],
        response: '{ "success": true, "data": { "id": "app_123", "updatedAt": "2024-01-15T11:30:00Z" }, "message": "Application updated successfully", "timestamp": "2024-01-15T11:30:00Z", "version": "2.0" }'
      }
    ],

    // Evaluation Management (V2)
    evaluations: [
      {
        method: 'GET',
        endpoint: '/api/v2/evaluations',
        description: 'List all evaluations with filtering, pagination, and sorting',
        parameters: [
          { name: 'page', type: 'integer', required: false, description: 'Page number (default: 1)' },
          { name: 'limit', type: 'integer', required: false, description: 'Items per page (default: 20, max: 100)' },
          { name: 'interview_id', type: 'string', required: false, description: 'Filter by interview ID (UUID)' },
          { name: 'evaluator_id', type: 'string', required: false, description: 'Filter by evaluator ID (UUID)' },
          { name: 'status', type: 'string', required: false, description: 'Filter by status (pending, completed, reviewed)' },
          { name: 'sort_by', type: 'string', required: false, description: 'Sort field (createdAt, updatedAt, score)' },
          { name: 'sort_order', type: 'string', required: false, description: 'Sort order (asc, desc)' }
        ],
        response: '{ "success": true, "data": [...], "meta": { "page": 1, "limit": 20, "total": 85, "total_pages": 5, "has_next": true, "has_prev": false }, "timestamp": "2024-01-15T10:30:00Z", "version": "2.0" }'
      },
      {
        method: 'POST',
        endpoint: '/api/v2/evaluations',
        description: 'Create a new evaluation',
        parameters: [
          { name: 'interviewId', type: 'string', required: true, description: 'Interview ID (UUID)' },
          { name: 'evaluatorId', type: 'string', required: true, description: 'Evaluator user ID (UUID)' },
          { name: 'criteria', type: 'array', required: true, description: 'Evaluation criteria with scores' },
          { name: 'overallScore', type: 'number', required: true, description: 'Overall score (0-100)' },
          { name: 'feedback', type: 'string', required: false, description: 'Detailed feedback' },
          { name: 'recommendation', type: 'string', required: false, description: 'Hiring recommendation (hire, no_hire, maybe)' }
        ],
        response: '{ "success": true, "data": { "id": "eval_123", "status": "completed", "createdAt": "2024-01-15T10:30:00Z" }, "message": "Evaluation created successfully", "timestamp": "2024-01-15T10:30:00Z", "version": "2.0" }'
      },
      {
        method: 'GET',
        endpoint: '/api/v2/evaluations/{id}',
        description: 'Get a specific evaluation by ID',
        parameters: [
          { name: 'id', type: 'string', required: true, description: 'Evaluation ID (UUID)' }
        ],
        response: '{ "success": true, "data": { "id": "eval_123", "interview": {...}, "evaluator": {...}, "criteria": [...], "overallScore": 85, "feedback": "...", "recommendation": "hire" }, "timestamp": "2024-01-15T10:30:00Z", "version": "2.0" }'
      },
      {
        method: 'PUT',
        endpoint: '/api/v2/evaluations/{id}',
        description: 'Update an existing evaluation',
        parameters: [
          { name: 'id', type: 'string', required: true, description: 'Evaluation ID (UUID)' },
          { name: 'criteria', type: 'array', required: false, description: 'Updated evaluation criteria' },
          { name: 'overallScore', type: 'number', required: false, description: 'Updated overall score' },
          { name: 'feedback', type: 'string', required: false, description: 'Updated feedback' },
          { name: 'recommendation', type: 'string', required: false, description: 'Updated recommendation' }
        ],
        response: '{ "success": true, "data": { "id": "eval_123", "updatedAt": "2024-01-15T11:30:00Z" }, "message": "Evaluation updated successfully", "timestamp": "2024-01-15T11:30:00Z", "version": "2.0" }'
      }
    ],

    // Analytics (V2)
    analytics: [
      {
        method: 'GET',
        endpoint: '/api/v2/analytics/candidates',
        description: 'Get candidate analytics and insights',
        parameters: [
          { name: 'page', type: 'integer', required: false, description: 'Page number (default: 1)' },
          { name: 'limit', type: 'integer', required: false, description: 'Items per page (default: 20, max: 100)' },
          { name: 'date_from', type: 'string', required: false, description: 'Start date filter (ISO 8601)' },
          { name: 'date_to', type: 'string', required: false, description: 'End date filter (ISO 8601)' },
          { name: 'job_id', type: 'string', required: false, description: 'Filter by job ID (UUID)' },
          { name: 'metrics', type: 'array', required: false, description: 'Specific metrics to include' }
        ],
        response: '{ "success": true, "data": { "total_candidates": 150, "active_candidates": 120, "hired_candidates": 25, "average_score": 78.5, "trends": [...], "demographics": {...} }, "timestamp": "2024-01-15T10:30:00Z", "version": "2.0" }'
      },
      {
        method: 'GET',
        endpoint: '/api/v2/analytics/interviews',
        description: 'Get interview analytics and performance metrics',
        parameters: [
          { name: 'page', type: 'integer', required: false, description: 'Page number (default: 1)' },
          { name: 'limit', type: 'integer', required: false, description: 'Items per page (default: 20, max: 100)' },
          { name: 'date_from', type: 'string', required: false, description: 'Start date filter (ISO 8601)' },
          { name: 'date_to', type: 'string', required: false, description: 'End date filter (ISO 8601)' },
          { name: 'interview_type', type: 'string', required: false, description: 'Filter by interview type' },
          { name: 'status', type: 'string', required: false, description: 'Filter by interview status' }
        ],
        response: '{ "success": true, "data": { "total_interviews": 300, "completed_interviews": 250, "average_duration": 45, "success_rate": 0.83, "performance_metrics": {...}, "trends": [...] }, "timestamp": "2024-01-15T10:30:00Z", "version": "2.0" }'
      },
      {
        method: 'GET',
        endpoint: '/api/v2/analytics/jobs',
        description: 'Get job posting analytics and hiring metrics',
        parameters: [
          { name: 'page', type: 'integer', required: false, description: 'Page number (default: 1)' },
          { name: 'limit', type: 'integer', required: false, description: 'Items per page (default: 20, max: 100)' },
          { name: 'date_from', type: 'string', required: false, description: 'Start date filter (ISO 8601)' },
          { name: 'date_to', type: 'string', required: false, description: 'End date filter (ISO 8601)' },
          { name: 'department', type: 'string', required: false, description: 'Filter by department' },
          { name: 'status', type: 'string', required: false, description: 'Filter by job status' }
        ],
        response: '{ "success": true, "data": { "total_jobs": 50, "active_jobs": 35, "filled_positions": 15, "average_time_to_hire": 21, "application_metrics": {...}, "hiring_funnel": [...] }, "timestamp": "2024-01-15T10:30:00Z", "version": "2.0" }'
      }
    ]
  };

  const postmanExamples = {
    setup: `// 1. Get your API token from Super Admin
// Visit: https://gradii.ai/admin/api-keys
// Create a new token with appropriate permissions

// 2. Set up Postman Environment
// Create new environment with:
{
  "base_url": "https://gradii.ai/api",
  "api_token": "iai_live_your_token_here"
}`,
    
    authentication: `// Add to Headers in Postman:
Authorization: Bearer {{api_token}}
Content-Type: application/json

// For all requests, include these headers`,
    
    examples: [
      {
        title: "Create Job Campaign",
        method: "POST",
        url: "{{base_url}}/v2/jobs",
        body: `{
  "title": "Senior Full Stack Developer",
  "position": "Full Stack Developer",
  "description": "We are looking for an experienced full stack developer...",
  "requirements": [
    "5+ years of experience",
    "React/Node.js expertise",
    "Database design skills"
  ],
  "skills": ["React", "Node.js", "PostgreSQL", "TypeScript"],
  "experience_level": "senior",
  "location": "Remote",
  "salary_range": {
    "min": 120000,
    "max": 180000,
    "currency": "USD"
  }
}`
      },
      {
        title: "Create Candidate",
        method: "POST",
        url: "{{base_url}}/candidates",
        body: `{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+1-555-0123",
  "skills": ["JavaScript", "React", "Node.js"],
  "experience_years": 5,
  "location": "San Francisco, CA",
  "linkedin_url": "https://linkedin.com/in/johndoe"
}`
      },
      {
        title: "Schedule Interview",
        method: "POST",
        url: "{{base_url}}/interviews",
        body: `{
  "candidate_id": "candidate_123",
  "campaign_id": "campaign_456",
  "type": "coding",
  "scheduled_at": "2024-02-15T14:00:00Z",
  "template_id": "template_789",
  "settings": {
    "time_limit": 60,
    "programming_languages": ["javascript", "python"],
    "difficulty": "medium"
  }
}`
      },
      {
        title: "Generate AI Questions",
        method: "POST",
        url: "{{base_url}}/interview-questions",
        body: `{
  "position": "Senior Frontend Developer",
  "experience_level": "senior",
  "skills": ["React", "TypeScript", "GraphQL"],
  "question_count": 10,
  "difficulty": "medium"
}`
      },
      {
        title: "Get Interview Results",
        method: "GET",
        url: "{{base_url}}/interviews/interview_123/results",
        body: null
      },
      {
        title: "Get Analytics",
        method: "GET",
        url: "{{base_url}}/coding-analytics?date_range=last_30_days",
        body: null
      }
    ]
  };

  const renderEndpoint = (endpoint: APIEndpoint) => (
    <Card key={`${endpoint.method}-${endpoint.endpoint}`} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Badge 
              variant={endpoint.method === 'GET' ? 'default' : 
                      endpoint.method === 'POST' ? 'destructive' : 
                      endpoint.method === 'PUT' ? 'secondary' : 'outline'}
              className="font-mono"
            >
              {endpoint.method}
            </Badge>
            <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
              {endpoint.endpoint}
            </code>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">{endpoint.description}</p>
      </CardHeader>
      <CardContent>
        {endpoint.parameters && endpoint.parameters.length > 0 && (
          <div className="mb-4">
            <h4 className="font-semibold mb-2 text-sm">Parameters:</h4>
            <div className="space-y-2">
              {endpoint.parameters.map((param, index) => (
                <div key={index} className="flex items-start space-x-3 text-sm">
                  <code className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-mono">
                    {param.name}
                  </code>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500">{param.type}</span>
                      {param.required && (
                        <Badge variant="outline" className="text-xs">required</Badge>
                      )}
                    </div>
                    <p className="text-gray-600 text-xs mt-1">{param.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div>
          <h4 className="font-semibold mb-2 text-sm">Response:</h4>
          <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
            <code>{endpoint.response}</code>
          </pre>
        </div>
      </CardContent>
    </Card>
  );

  const renderPostmanExample = (example: any, index: number) => (
    <Card key={index} className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{example.title}</CardTitle>
          <Badge variant="outline" className="font-mono">{example.method}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2 text-sm">URL:</h4>
            <code className="bg-gray-100 p-2 rounded block text-sm">{example.url}</code>
          </div>
          {example.body && (
            <div>
              <h4 className="font-semibold mb-2 text-sm">Request Body:</h4>
              <div className="relative">
                <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                  <code>{example.body}</code>
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(example.body, `postman-${index}`)}
                >
                  {copiedCode === `postman-${index}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow">
              <Code className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-5xl font-bold text-blue-600">
              gradii.ai API
            </h1>
          </div>
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 max-w-4xl mx-auto">
            <p className="text-xl text-gray-800 mb-4">
              Comprehensive REST API for interview management, candidate tracking, AI-powered analytics, and more.
              Build powerful integrations with our production-ready endpoints.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mt-6">
              <Button 
                onClick={() => router.push('/landing/demo')}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg"
              >
                <Play className="h-5 w-5 mr-2" />
                Try Demo Interview
              </Button>
              <Button 
                onClick={() => router.push('/admin/api-keys')}
                variant="outline"
                className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-3 rounded-xl font-semibold transition-all transform hover:scale-105"
              >
                <Key className="h-5 w-5 mr-2" />
                Get API Key
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Card className="border-2 border-blue-200 hover:border-blue-400 transition-all transform hover:scale-105 cursor-pointer bg-blue-50">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Database className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-bold text-xl text-blue-800">50+ Endpoints</h3>
              <p className="text-sm text-blue-600 font-medium">Comprehensive API coverage</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-green-200 hover:border-green-400 transition-all transform hover:scale-105 cursor-pointer bg-green-50">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-bold text-xl text-green-800">AI-Powered</h3>
              <p className="text-sm text-green-600 font-medium">Smart analytics & insights</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-yellow-200 hover:border-yellow-400 transition-all transform hover:scale-105 cursor-pointer bg-yellow-50">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-yellow-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-bold text-xl text-yellow-800">Secure</h3>
              <p className="text-sm text-yellow-600 font-medium">Token-based authentication</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-red-200 hover:border-red-400 transition-all transform hover:scale-105 cursor-pointer bg-red-50">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-bold text-xl text-red-800">Real-time</h3>
              <p className="text-sm text-red-600 font-medium">Live updates & webhooks</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-3 mb-6">
            {[
              { id: 'overview', label: 'Overview', icon: BookOpen, color: 'blue' },
              { id: 'jobs', label: 'Jobs (V2)', icon: Briefcase, color: 'green' },
              { id: 'interviews', label: 'Interviews (V2)', icon: Users, color: 'yellow' },
              { id: 'candidates', label: 'Candidates (V2)', icon: Users, color: 'red' },
              { id: 'applications', label: 'Applications (V2)', icon: FileText, color: 'blue' },
              { id: 'evaluations', label: 'Evaluations (V2)', icon: CheckCircle, color: 'green' },
              { id: 'analytics', label: 'Analytics (V2)', icon: BarChart3, color: 'yellow' },
              { id: 'postman', label: 'Postman', icon: ExternalLink, color: 'red' }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const colorClasses: Record<string, string> = {
                blue: isActive 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200' 
                  : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300',
                green: isActive 
                  ? 'bg-green-600 text-white border-green-600 shadow-lg shadow-green-200' 
                  : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:border-green-300',
                yellow: isActive 
                  ? 'bg-yellow-600 text-white border-yellow-600 shadow-lg shadow-yellow-200' 
                  : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 hover:border-yellow-300',
                red: isActive 
                  ? 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-200' 
                  : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:border-red-300'
              };
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 border-2 ${
                    colorClasses[tab.color] || colorClasses.blue
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="w-full">

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="mt-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="border-2 border-blue-200 hover:border-blue-400 transition-all bg-blue-50">
                  <CardHeader className="bg-blue-100 rounded-t-lg">
                    <CardTitle className="flex items-center space-x-2 text-blue-800">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <Key className="h-4 w-4 text-white" />
                      </div>
                      <span>Authentication</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <p className="text-sm text-blue-700 mb-4 font-medium">
                      All API requests require authentication using Bearer tokens. Get your API token from the Super Admin panel.
                    </p>
                    <div className="bg-blue-100 p-4 rounded-lg border border-blue-200">
                      <code className="text-sm text-blue-800 font-mono">
                        Authorization: Bearer gradii_live_your_token_here
                      </code>
                    </div>
                    <div className="mt-4">
                      <Button 
                        className="bg-blue-600 hover:bg-blue-700 text-white border-0"
                        size="sm"
                        onClick={() => router.push('/admin/api-keys')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Get API Token
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-green-200 hover:border-green-400 transition-all bg-green-50">
                  <CardHeader className="bg-green-100 rounded-t-lg">
                    <CardTitle className="flex items-center space-x-2 text-green-800">
                      <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                        <Globe className="h-4 w-4 text-white" />
                      </div>
                      <span>Base URL</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <p className="text-sm text-green-700 mb-4 font-medium">
                      All API endpoints are relative to the base URL:
                    </p>
                    <div className="bg-green-100 p-4 rounded-lg border border-green-200">
                      <code className="text-sm text-green-800 font-mono">
                        https://gradii.ai/api
                      </code>
                    </div>
                    <p className="text-xs text-green-600 mt-2 font-medium">
                      Production-ready gradii.ai API endpoint
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-yellow-200 hover:border-yellow-400 transition-all bg-yellow-50">
                  <CardHeader className="bg-yellow-100 rounded-t-lg">
                    <CardTitle className="flex items-center space-x-2 text-yellow-800">
                      <div className="w-8 h-8 bg-yellow-600 rounded-lg flex items-center justify-center">
                        <AlertTriangle className="h-4 w-4 text-white" />
                      </div>
                      <span>Rate Limits</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center p-2 bg-yellow-100 rounded border border-yellow-200">
                        <span className="text-yellow-700 font-medium">Standard requests:</span>
                        <Badge className="bg-yellow-600 text-white font-mono">1000/hour</Badge>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-yellow-100 rounded border border-yellow-200">
                        <span className="text-yellow-700 font-medium">AI operations:</span>
                        <Badge className="bg-yellow-600 text-white font-mono">100/hour</Badge>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-yellow-100 rounded border border-yellow-200">
                        <span className="text-yellow-700 font-medium">File uploads:</span>
                        <Badge className="bg-yellow-600 text-white font-mono">50/hour</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-red-200 hover:border-red-400 transition-all bg-red-50">
                  <CardHeader className="bg-red-100 rounded-t-lg">
                    <CardTitle className="flex items-center space-x-2 text-red-800">
                      <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-white" />
                      </div>
                      <span>Response Format</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <p className="text-sm text-red-700 mb-4 font-medium">
                      All responses are in JSON format with consistent structure:
                    </p>
                    <pre className="bg-red-100 p-4 rounded-lg text-xs border border-red-200">
                      <code className="text-red-800">{`{
  "success": true,
  "data": {...},
  "message": "Operation completed",
  "timestamp": "2024-01-15T10:30:00Z"
}`}</code>
                    </pre>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Jobs Tab */}
          {activeTab === 'jobs' && (
            <div className="mt-8">
              <div className="mb-8 p-6 bg-green-50 border-2 border-green-200 rounded-xl">
                <h2 className="text-3xl font-bold mb-3 flex items-center text-green-800">
                  <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center mr-3">
                    <Briefcase className="h-6 w-6 text-white" />
                  </div>
                  Jobs API (V2)
                </h2>
                <p className="text-green-700 font-medium text-lg">
                  Manage jobs, positions, and recruitment workflows. Create, update, and track job postings with comprehensive filtering, pagination, and sorting.
                </p>
              </div>
              {apiSections.jobs.map(renderEndpoint)}
            </div>
          )}

          {/* Interviews Tab */}
          {activeTab === 'interviews' && (
            <div className="mt-8">
              <div className="mb-8 p-6 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                <h2 className="text-3xl font-bold mb-3 flex items-center text-yellow-800">
                  <div className="w-10 h-10 bg-yellow-600 rounded-xl flex items-center justify-center mr-3">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  Interview Management API
                </h2>
                <p className="text-yellow-700 font-medium text-lg">
                  Complete interview lifecycle management including scheduling, conducting, and analyzing interviews across all types.
                </p>
              </div>
              {apiSections.interviews.map(renderEndpoint)}
            </div>
          )}

          {/* Candidates Tab */}
          {activeTab === 'candidates' && (
            <div className="mt-8">
              <div className="mb-8 p-6 bg-red-50 border-2 border-red-200 rounded-xl">
                <h2 className="text-3xl font-bold mb-3 flex items-center text-red-800">
                  <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center mr-3">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  Candidate Management API
                </h2>
                <p className="text-red-700 font-medium text-lg">
                  Comprehensive candidate management including profiles, applications, interview history, and performance tracking.
                </p>
              </div>
              {apiSections.candidates.map(renderEndpoint)}
            </div>
          )}

          {/* Applications Tab */}
          {activeTab === 'applications' && (
            <div className="mt-8">
              <div className="mb-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl">
                <h2 className="text-3xl font-bold mb-3 flex items-center text-blue-800">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mr-3">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  Application Management API (V2)
                </h2>
                <p className="text-blue-700 font-medium text-lg">
                  Comprehensive application management including creation, tracking, status updates, and candidate application history.
                </p>
              </div>
              {apiSections.applications.map(renderEndpoint)}
            </div>
          )}

          {/* Evaluations Tab */}
          {activeTab === 'evaluations' && (
            <div className="mt-8">
              <div className="mb-8 p-6 bg-green-50 border-2 border-green-200 rounded-xl">
                <h2 className="text-3xl font-bold mb-3 flex items-center text-green-800">
                  <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center mr-3">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  Evaluation Management API (V2)
                </h2>
                <p className="text-green-700 font-medium text-lg">
                  Interview evaluation system with scoring, feedback, recommendations, and comprehensive evaluation tracking.
                </p>
              </div>
              {apiSections.evaluations.map(renderEndpoint)}
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="mt-8">
              <div className="mb-8 p-6 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                <h2 className="text-3xl font-bold mb-3 flex items-center text-yellow-800">
                  <div className="w-10 h-10 bg-yellow-600 rounded-xl flex items-center justify-center mr-3">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  Analytics & Insights API (V2)
                </h2>
                <p className="text-yellow-700 font-medium text-lg">
                  Comprehensive analytics for candidates, interviews, and jobs with performance metrics, trends, and insights.
                </p>
              </div>
              {apiSections.analytics.map(renderEndpoint)}
            </div>
          )}

          {/* Postman Tab */}
          {activeTab === 'postman' && (
            <div className="mt-8">
              <div className="mb-8 p-6 bg-red-50 border-2 border-red-200 rounded-xl">
                <h2 className="text-3xl font-bold mb-3 flex items-center text-red-800">
                  <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center mr-3">
                    <ExternalLink className="h-6 w-6 text-white" />
                  </div>
                  Postman Testing Guide
                </h2>
                <p className="text-red-700 font-medium text-lg">
                  Complete guide to test our APIs using Postman with real examples and authentication setup.
                </p>
              </div>

            {/* Setup Instructions */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Key className="h-5 w-5" />
                  <span>1. Getting Your API Token</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Super Admin Access Required</h4>
                    <p className="text-blue-800 text-sm mb-3">
                      Only Super Admins can generate API tokens. Contact your system administrator if you need access.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => router.push('/admin/api-keys')}
                      className="border-blue-300 text-blue-700 hover:bg-blue-100"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Go to Admin API Keys
                    </Button>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Steps to get your token:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                      <li>Navigate to Admin → API Keys in your dashboard</li>
                      <li>Click "Generate New Token"</li>
                      <li>Set appropriate permissions (read, write, admin)</li>
                      <li>Copy the generated token (starts with 'iai_live_')</li>
                      <li>Store it securely - it won't be shown again</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Environment Setup */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>2. Postman Environment Setup</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Create a new environment in Postman with these variables:
                  </p>
                  <div className="relative">
                    <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
                      <code>{postmanExamples.setup}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(postmanExamples.setup, 'setup')}
                    >
                      {copiedCode === 'setup' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Authentication */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>3. Authentication Headers</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Add these headers to all your requests:
                  </p>
                  <div className="relative">
                    <pre className="bg-gray-50 p-4 rounded text-sm">
                      <code>{postmanExamples.authentication}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(postmanExamples.authentication, 'auth')}
                    >
                      {copiedCode === 'auth' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Example Requests */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Play className="h-5 w-5 mr-2" />
                4. Example API Requests
              </h3>
              <p className="text-gray-600 mb-6">
                Copy these examples directly into Postman to test the API endpoints:
              </p>
            </div>
            
            {postmanExamples.examples.map(renderPostmanExample)}

            {/* Testing Tips */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5" />
                  <span>Testing Tips</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <div>
                      <strong>Start with GET requests:</strong> Test authentication and basic connectivity first
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <div>
                      <strong>Use environment variables:</strong> Set up {'{{'}base_url{'}}'}  and {'{{'}api_token{'}}'}  for easy switching
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <div>
                      <strong>Check response status:</strong> 200/201 for success, 401 for auth issues, 400 for bad requests
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <div>
                      <strong>Save responses:</strong> Use Postman's test scripts to save IDs for subsequent requests
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <div>
                      <strong>Rate limiting:</strong> Add delays between requests if you hit rate limits
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default APIDocsPage;