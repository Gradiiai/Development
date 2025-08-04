import { useState, useEffect, useCallback } from 'react';
import { JobCampaignDraft, JobCampaignState } from '@/lib/services/jobCampaignService';

interface UseJobCampaignServerReturn {
  // State
  state: JobCampaignState | null;
  draft: JobCampaignDraft | null;
  currentCampaignId: string | null;
  loading: boolean;
  error: string | null;

  // Actions
  saveDraft: (draft: JobCampaignDraft) => Promise<void>;
  loadDraft: () => Promise<void>;
  clearDraft: () => Promise<void>;
  setCurrentCampaignId: (campaignId: string) => Promise<void>;
  getCurrentCampaignId: () => Promise<void>;
  updateJobDetails: (jobDetails: JobCampaignDraft['jobDetails']) => Promise<void>;
  updateScoringParameters: (scoringParameters: JobCampaignDraft['scoringParameters']) => Promise<void>;
  updateCurrentStep: (step: number) => Promise<void>;
  loadState: () => Promise<void>;
}

export function useJobCampaignServer(): UseJobCampaignServerReturn {
  const [state, setState] = useState<JobCampaignState | null>(null);
  const [draft, setDraft] = useState<JobCampaignDraft | null>(null);
  const [currentCampaignId, setCurrentCampaignIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleError = (error: any, defaultMessage: string) => {
    console.error(error);
    setError(error?.message || defaultMessage);
  };

  const apiCall = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  };

  const saveDraft = useCallback(async (draftData: JobCampaignDraft) => {
    try {
      setLoading(true);
      setError(null);

      await apiCall('/api/job-campaign/draft', {
        method: 'POST',
        body: JSON.stringify({ draft: draftData }),
      });

      setDraft(draftData);
    } catch (error) {
      handleError(error, 'Failed to save draft');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDraft = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await apiCall('/api/job-campaign/draft');
      setDraft(result.data);
    } catch (error) {
      handleError(error, 'Failed to load draft');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearDraft = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      await apiCall('/api/job-campaign/draft', {
        method: 'DELETE',
      });

      setDraft(null);
    } catch (error) {
      handleError(error, 'Failed to clear draft');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const setCurrentCampaignId = useCallback(async (campaignId: string) => {
    try {
      setLoading(true);
      setError(null);

      await apiCall('/api/job-campaign/current', {
        method: 'POST',
        body: JSON.stringify({ campaignId }),
      });

      setCurrentCampaignIdState(campaignId);
    } catch (error) {
      handleError(error, 'Failed to set current campaign ID');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getCurrentCampaignId = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await apiCall('/api/job-campaign/current');
      setCurrentCampaignIdState(result.data.campaignId);
    } catch (error) {
      handleError(error, 'Failed to get current campaign ID');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateJobDetails = useCallback(async (jobDetails: JobCampaignDraft['jobDetails']) => {
    try {
      setLoading(true);
      setError(null);

      await apiCall('/api/job-campaign/state', {
        method: 'PATCH',
        body: JSON.stringify({ type: 'jobDetails', data: jobDetails }),
      });

      // Update local state
      if (state) {
        setState({ ...state, jobDetails });
      }
      if (draft) {
        setDraft({ ...draft, jobDetails });
      }
    } catch (error) {
      handleError(error, 'Failed to update job details');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [state, draft]);

  const updateScoringParameters = useCallback(async (scoringParameters: JobCampaignDraft['scoringParameters']) => {
    try {
      setLoading(true);
      setError(null);

      await apiCall('/api/job-campaign/state', {
        method: 'PATCH',
        body: JSON.stringify({ type: 'scoringParameters', data: scoringParameters }),
      });

      // Update local state
      if (state) {
        setState({ ...state, scoringParameters });
      }
      if (draft) {
        setDraft({ ...draft, scoringParameters });
      }
    } catch (error) {
      handleError(error, 'Failed to update scoring parameters');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [state, draft]);

  const updateCurrentStep = useCallback(async (step: number) => {
    try {
      setLoading(true);
      setError(null);

      await apiCall('/api/job-campaign/state', {
        method: 'PATCH',
        body: JSON.stringify({ type: 'currentStep', data: step }),
      });

      // Update local state
      if (state) {
        setState({ ...state, currentStep: step });
      }
      if (draft) {
        setDraft({ ...draft, currentStep: step });
      }
    } catch (error) {
      handleError(error, 'Failed to update current step');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [state, draft]);

  const loadState = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await apiCall('/api/job-campaign/state');
      setState(result.data);
      setCurrentCampaignIdState(result.data.campaignId);
    } catch (error) {
      handleError(error, 'Failed to load campaign state');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load state on mount
  useEffect(() => {
    loadState();
  }, [loadState]);

  return {
    // State
    state,
    draft,
    currentCampaignId,
    loading,
    error,

    // Actions
    saveDraft,
    loadDraft,
    clearDraft,
    setCurrentCampaignId,
    getCurrentCampaignId,
    updateJobDetails,
    updateScoringParameters,
    updateCurrentStep,
    loadState,
  };
}