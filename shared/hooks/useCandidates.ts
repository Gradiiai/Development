import { useState, useEffect } from 'react';
import { getCandidatesByCampaign, updateCandidate } from '@/lib/database/queries/campaigns';

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  experience?: string;
  currentCompany?: string;
  currentRole?: string;
  skills?: string; // JSON string
  source: string;
  status: 'applied' | 'screening' | 'interview' | 'hired' | 'rejected';
  overallScore: number;
  notes?: string;
  appliedAt: string;
  updatedAt: string;
  campaignId: string;
}

interface CandidateFilters {
  status?: string;
  source?: string;
  minScore?: number;
  maxScore?: number;
  search?: string;
}

interface UseCandidatesReturn {
  candidates: Candidate[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateCandidateStatus: (candidateId: string, status: Candidate['status']) => Promise<boolean>;
  updateCandidateScore: (candidateId: string, score: number) => Promise<boolean>;
}

export function useCandidates(
  campaignId: string,
  filters?: CandidateFilters
): UseCandidatesReturn {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await getCandidatesByCampaign(campaignId, filters);
      
      if (result.success) {
        // Transform database data to match component interface
        const transformedCandidates = (result.data || []).map((candidate: any) => {
          let skills = [];
          try {
            skills = candidate.skills ? JSON.parse(candidate.skills) : [];
          } catch (error) {
            console.warn('Failed to parse skills JSON for candidate:', candidate.id, error);
            skills = [];
          }
          
          return {
            ...candidate,
            skills,
            appliedAt: candidate.appliedAt.toISOString(),
            updatedAt: candidate.updatedAt.toISOString(),
          };
        });
        setCandidates(transformedCandidates);
      } else {
        setError(result.error || 'Failed to fetch candidates');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error fetching candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateCandidateStatus = async (
    candidateId: string,
    status: Candidate['status']
  ): Promise<boolean> => {
    try {
      const result = await updateCandidate(candidateId, { status });
      
      if (result.success) {
        // Update local state optimistically
        setCandidates(prev => 
          prev.map(candidate => 
            candidate.id === candidateId 
              ? { ...candidate, status }
              : candidate
          )
        );
        return true;
      } else {
        setError(result.error || 'Failed to update candidate status');
        return false;
      }
    } catch (err) {
      setError('Failed to update candidate status');
      console.error('Error updating candidate status:', err);
      return false;
    }
  };

  const updateCandidateScore = async (
    candidateId: string,
    score: number
  ): Promise<boolean> => {
    try {
      const result = await updateCandidate(candidateId, { overallScore: score });
      
      if (result.success) {
        // Update local state optimistically
        setCandidates(prev => 
          prev.map(candidate => 
            candidate.id === candidateId 
              ? { ...candidate, overallScore: score }
              : candidate
          )
        );
        return true;
      } else {
        setError(result.error || 'Failed to update candidate score');
        return false;
      }
    } catch (err) {
      setError('Failed to update candidate score');
      console.error('Error updating candidate score:', err);
      return false;
    }
  };

  useEffect(() => {
    if (campaignId) {
      fetchCandidates();
    }
  }, [campaignId, filters]);

  return {
    candidates,
    loading,
    error,
    refetch: fetchCandidates,
    updateCandidateStatus,
    updateCandidateScore,
  };
}