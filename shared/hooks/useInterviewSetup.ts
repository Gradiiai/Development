import { useState, useEffect, useCallback } from 'react';
import { getInterviewSetupsByCampaign, createInterviewSetup } from '@/lib/database/queries/campaigns';

interface InterviewRound {
  id: string;
  name: string;
  type: 'mcq' | 'coding' | 'video' | 'live';
  timeLimit: {
    hours: number;
    minutes: number;
  };
  questionBank?: string;
  numberOfQuestions?: number;
  chooseRandom?: boolean;
  difficulty?: 'easy' | 'medium' | 'hard';
  instructions?: string;
  isEnabled: boolean;
}

interface InterviewSetup {
  id: string;
  campaignId: string;
  template?: string;
  rounds: string; // JSON string of InterviewRound[]
  totalDuration: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface InterviewSetupInput {
  campaignId: string;
  template?: string;
  rounds: InterviewRound[];
  totalDuration: number;
}

export interface UseInterviewSetupReturn {
  interviewSetup: InterviewSetup | null;
  loading: boolean;
  error: string | null;
  fetchInterviewSetup: (campaignId?: string) => Promise<void>;
  saveInterviewSetup: (data: any) => Promise<{ success: boolean; error?: string }>;
}

export function useInterviewSetup(): UseInterviewSetupReturn {
  const [interviewSetup, setInterviewSetup] = useState<InterviewSetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInterviewSetup = useCallback(async (campaignId?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('fetchInterviewSetup called with campaignId:', campaignId);
      
      // Don't fetch if no campaignId is provided
      if (!campaignId) {
        console.log('No campaignId provided, setting loading to false');
        setLoading(false);
        return;
      }
      
      const result = await getInterviewSetupsByCampaign(campaignId);
      
      if (result.success) {
        if (result.data && result.data.length > 0) {
          // Convert interview setups to the expected format
          const rounds = result.data.map(setup => ({
            id: setup.id,
            name: setup.roundName,
            type: setup.interviewType as 'mcq' | 'coding' | 'video' | 'live',
            timeLimit: {
              hours: Math.floor(setup.timeLimit / 60),
              minutes: setup.timeLimit % 60
            },
            questionBank: setup.questionBankId,
            numberOfQuestions: setup.numberOfQuestions,
            chooseRandom: setup.randomizeQuestions,
            difficulty: setup.difficultyLevel,
            instructions: setup.instructions,
            isEnabled: setup.isActive
          }));
          
          const setup: InterviewSetup = {
             id: result.data[0].id,
             campaignId: result.data[0].campaignId,
             rounds: JSON.stringify(rounds),
             totalDuration: result.data.reduce((total, s) => total + s.timeLimit, 0),
             isActive: true,
             createdAt: result.data[0].createdAt?.toISOString() || new Date().toISOString(),
             updatedAt: new Date().toISOString()
           };
          setInterviewSetup(setup);
        } else {
          // No interview setup found - this is normal for new campaigns
          setInterviewSetup(null);
        }
      } else {
        setError(result.error || 'Failed to fetch interview setup');
      }
    } catch (err) {
      setError('Failed to fetch interview setup');
      console.error('Error fetching interview setup:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveInterviewSetup = useCallback(async (data: any) => {
    try {
      setError(null);
      
      // Validate campaignId
      if (!data.campaignId) {
        const error = 'Campaign ID is required';
        setError(error);
        return { success: false, error };
      }
      
      // Log campaignId for debugging
      console.log('Attempting to save interview setup for campaignId:', data.campaignId);
      
      // Create individual interview setup records for each round
      const results = [];
      
      for (let i = 0; i < data.rounds.length; i++) {
        const round = data.rounds[i];
        // Convert timeLimit object to total minutes
        const timeLimitInMinutes = typeof round.timeLimit === 'object' 
          ? (round.timeLimit.hours * 60) + round.timeLimit.minutes
          : round.timeLimit;
        
        const setupData = {
          campaignId: data.campaignId,
          roundNumber: i + 1,
          roundName: round.name,
          interviewType: round.type,
          timeLimit: timeLimitInMinutes,
          questionBankId: round.questionBankId || undefined, // Use questionBankId (UUID)
          numberOfQuestions: round.numberOfQuestions || 10,
          randomizeQuestions: round.chooseRandom || true,
          difficultyLevel: round.difficulty || 'medium',
          instructions: round.instructions || '',
          passingScore: round.passingScore || 70
        };
        
        const result = await createInterviewSetup(setupData);
        results.push(result);
      }
      
      const allSuccessful = results.every(result => result.success);
      
      if (allSuccessful) {
        // Save auto-scheduling configuration to job campaign if provided
        if (data.autoScheduleConfig) {
          try {
            const { updateJobCampaign } = await import('@/lib/database/queries/campaigns');
            const updateResult = await updateJobCampaign(data.campaignId, {
              autoScheduleConfig: data.autoScheduleConfig
            });
            
            if (!updateResult.success) {
              console.error('Failed to save auto-scheduling config:', updateResult.error);
              // Don't fail the entire operation, just log the error
            }
          } catch (autoScheduleError) {
            console.error('Error saving auto-scheduling config:', autoScheduleError);
            // Don't fail the entire operation, just log the error
          }
        }
        
        setInterviewSetup({
          id: Date.now().toString(),
          campaignId: data.campaignId,
          rounds: JSON.stringify(data.rounds),
          totalDuration: data.rounds.reduce((total: number, round: any) => total + (round.timeLimit || 0), 0),
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        return { success: true };
      } else {
        const failedResults = results.filter(r => !r.success);
        const errors = failedResults.map(r => r.error).join(', ');
        
        // Check if any error is related to campaign not existing
        const hasCampaignError = failedResults.some(r => 
          r.error && r.error.includes('Campaign with ID') && r.error.includes('does not exist')
        );
        
        if (hasCampaignError) {
          const campaignError = 'The selected campaign does not exist. Please refresh the page and try again, or create a new campaign first.';
          setError(campaignError);
          return { success: false, error: campaignError };
        }
        
        setError(errors || 'Failed to save interview setup');
        return { success: false, error: errors };
      }
    } catch (err) {
      setError('Failed to save interview setup');
      console.error('Error saving interview setup:', err);
      return { success: false, error: 'Failed to save interview setup' };
    }
  }, []);

  // Note: fetchInterviewSetup should be called manually with a campaignId
  // No automatic fetching on mount to avoid UUID errors

  return {
    interviewSetup,
    loading,
    error,
    fetchInterviewSetup,
    saveInterviewSetup
  };
}

interface QuestionBank {
  questionTypes: any;
  id: string;
  name: string;
  category: string;
  questionCount: number;
  difficulty: string;
  description: string;
}

interface InterviewTemplate {
  id: string;
  name: string;
  description: string;
  rounds: {
    id: string;
    name: string;
    type: 'behavioral' | 'coding' | 'technical' | 'system-design' | 'combo';
    timeLimit: {
      hours: number;
      minutes: number;
    };
    numberOfQuestions?: number;
    randomizeQuestions?: boolean;
    difficultyLevel?: string;
    passingScore?: number;
    instructions?: string;
    questionBank?: string;
  }[];
}

export function useQuestionBanks() {
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuestionBanks = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/content/questions/categories');
        const result = await response.json();

        if (result.success) {
          setQuestionBanks(result.data || []);
        } else {
          setError(result.error || 'Failed to fetch question banks');
        }
      } catch (err) {
        setError('Failed to fetch question banks');
        console.error('Error fetching question banks:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestionBanks();
  }, []);

  return {
    questionBanks,
    loading,
    error
  };
}

interface QuestionSet {
  id: string;
  name: string;
  type: string;
  count: number;
  difficulties: {
    easy: number;
    medium: number;
    hard: number;
  };
  description: string;
}

export function useQuestionSets(bankId: string | null) {
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bankId) {
      setQuestionSets([]);
      return;
    }

    const fetchQuestionSets = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/content/questions/sets/${bankId}`);
        const result = await response.json();

        if (result.success) {
          setQuestionSets(result.data || []);
        } else {
          setError(result.error || 'Failed to fetch question sets');
        }
      } catch (err) {
        setError('Failed to fetch question sets');
        console.error('Error fetching question sets:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestionSets();
  }, [bankId]);

  return {
    questionSets,
    loading,
    error
  };
}

export function useInterviewTemplates() {
  const [interviewTemplates, setInterviewTemplates] = useState<InterviewTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInterviewTemplates = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/interviews/templates');
        const result = await response.json();

        if (result.success) {
          setInterviewTemplates(result.data || []);
        } else {
          setError(result.error || 'Failed to fetch interview templates');
        }
      } catch (err) {
        setError('Failed to fetch interview templates');
        console.error('Error fetching interview templates:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInterviewTemplates();
  }, []);

  return {
    interviewTemplates,
    loading,
    error
  };
}