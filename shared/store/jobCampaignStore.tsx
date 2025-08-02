'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import {
  JobDetailsForm,
  InterviewRound,
  ScoringParameters,
  InterviewSetup,
  JobCampaignState,
  JobCampaignAction
} from '@/shared/types/job-campaign';

// Re-export types for backward compatibility
export type {
  JobDetailsForm,
  InterviewRound,
  ScoringParameters,
  InterviewSetup,
  JobCampaignState,
  JobCampaignAction
};

const initialJobDetails: JobDetailsForm = {
  campaignName: '',
  jobTitle: '',
  department: '',
  location: '',
  experienceLevel: '',
  experienceMin: 0,
  experienceMax: 5,
  employeeType: '',
  salaryMin: 0,
  salaryMax: 0,
  salaryNegotiable: false,
  currency: 'INR',
  numberOfOpenings: 1,
  jobDescription: '',
  jobDuties: '',
  jobRequirements: '',
  jobBenefits: '',
  requirements: [],
  benefits: [],
  skills: [],
  applicationDeadline: '',
  targetHireDate: '',
  isRemote: false,
  isHybrid: false,
};

const initialScoringParameters: ScoringParameters = {
  selectedTemplate: '',
  rounds: [
    {
      id: '1',
      name: 'Round 1',
      type: 'mcq',
      timeLimit: { hours: 0, minutes: 30 },
      questionBank: 'javascript-fundamentals',
      numberOfQuestions: 10,
      chooseRandom: true,
      difficulty: 'medium',
      instructions: '',
      isEnabled: true,
    },
    {
      id: '2',
      name: 'Round 2',
      type: 'coding',
      timeLimit: { hours: 1, minutes: 0 },
      questionBank: 'algorithms-data-structures',
      numberOfQuestions: 5,
      chooseRandom: true,
      difficulty: 'medium',
      instructions: '',
      isEnabled: true,
    },
  ],
  numberOfRounds: 2,
};

const initialState: JobCampaignState = {
  currentStep: 1,
  campaignId: null,
  jobDetails: initialJobDetails,
  scoringParameters: initialScoringParameters,
  interviewSetup: null,
  loading: false,
  error: null,
};

function jobCampaignReducer(state: JobCampaignState, action: JobCampaignAction): JobCampaignState {
  switch (action.type) {
    case 'SET_CURRENT_STEP':
      return { ...state, currentStep: action.payload };
    
    case 'SET_CAMPAIGN_ID':
      return { ...state, campaignId: action.payload };
    
    case 'UPDATE_JOB_DETAILS':
      return {
        ...state,
        jobDetails: { ...state.jobDetails, ...action.payload },
        error: null,
      };
    
    case 'RESET_JOB_DETAILS':
      return { ...state, jobDetails: initialJobDetails };
    
    // Job Portal Sync actions removed - functionality deprecated
    
    case 'UPDATE_SCORING_PARAMETERS':
      return {
        ...state,
        scoringParameters: { ...state.scoringParameters, ...action.payload }
      };
    
    case 'UPDATE_ROUND':
      return {
        ...state,
        scoringParameters: {
          ...state.scoringParameters,
          rounds: state.scoringParameters.rounds.map(round =>
            round.id === action.payload.roundId
              ? { ...round, [action.payload.field]: action.payload.value }
              : round
          )
        }
      };
    
    case 'ADD_ROUND':
      const newRound: InterviewRound = {
        id: `round-${Date.now()}`,
        name: `Round ${state.scoringParameters.rounds.length + 1}`,
        type: 'behavioral',
        timeLimit: { hours: 1, minutes: 0 },
        questionBank: '',
        numberOfQuestions: 5,
        chooseRandom: true,
        difficulty: 'medium',
        instructions: '',
        isEnabled: true,
      };
      
      return {
        ...state,
        scoringParameters: {
          ...state.scoringParameters,
          rounds: [...state.scoringParameters.rounds, newRound],
          numberOfRounds: state.scoringParameters.rounds.length + 1,
        }
      };
    
    case 'REMOVE_ROUND':
      return {
        ...state,
        scoringParameters: {
          ...state.scoringParameters,
          rounds: state.scoringParameters.rounds.filter(round => round.id !== action.payload),
          numberOfRounds: state.scoringParameters.rounds.length - 1,
        }
      };
    
    case 'SET_NUMBER_OF_ROUNDS':
      return {
        ...state,
        scoringParameters: {
          ...state.scoringParameters,
          numberOfRounds: action.payload,
        }
      };
    
    case 'TOGGLE_ROUND_ENABLED':
      return {
        ...state,
        scoringParameters: {
          ...state.scoringParameters,
          rounds: state.scoringParameters.rounds.map(round =>
            round.id === action.payload
              ? { ...round, isEnabled: !round.isEnabled }
              : round
          )
        }
      };
    
    case 'UPDATE_INTERVIEW_SETUP':
      return { ...state, interviewSetup: action.payload };
    
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false,
      };
    
    case 'RESET_CAMPAIGN':
      return initialState;
    
    case 'LOAD_FROM_STORAGE':
      return { ...state, ...action.payload };
    
    default:
      return state;
  }
}

interface JobCampaignContextType {
  state: JobCampaignState;
  dispatch: React.Dispatch<JobCampaignAction>;
  // Job Details Actions
  updateJobDetails: (details: Partial<JobDetailsForm>) => void;
  resetJobDetails: () => void;
  // Campaign Management
  setCampaignId: (id: string) => void;
  setCurrentStep: (step: number) => void;
  // Scoring Parameters Actions
  updateScoringParameters: (params: Partial<ScoringParameters>) => void;
  addRound: () => void;
  removeRound: (roundId: string) => void;
  updateRound: (roundId: string, field: keyof InterviewRound, value: any) => void;
  toggleRoundEnabled: (roundId: string) => void;
  setNumberOfRounds: (count: number) => void;
  // Job Portal Actions - REMOVED (functionality deprecated)
  // Interview Setup Actions
  updateInterviewSetup: (setup: InterviewSetup) => void;
  // State Management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  // Storage and Reset
  resetCampaign: () => void;
  saveToStorage: () => void;
  loadFromStorage: () => void;
  // Computed Properties
  isFormValid: boolean;
  totalInterviewDuration: number;
}

const JobCampaignContext = createContext<JobCampaignContextType | undefined>(undefined);

export function JobCampaignProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(jobCampaignReducer, initialState);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('job-campaign-storage');
      if (stored) {
        try {
          const parsedData = JSON.parse(stored);
          dispatch({ type: 'LOAD_FROM_STORAGE', payload: parsedData });
        } catch (error) {
          console.error('Error loading job campaign data from storage:', error);
          dispatch({ type: 'SET_ERROR', payload: 'Failed to load saved data' });
        }
      }
    }
  }, []);

  // Save to localStorage whenever state changes (debounced)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const timeoutId = setTimeout(() => {
        try {
          const dataToStore = {
            campaignId: state.campaignId,
            jobDetails: state.jobDetails,
            scoringParameters: state.scoringParameters,
            currentStep: state.currentStep,
          };
          localStorage.setItem('job-campaign-storage', JSON.stringify(dataToStore));
          
          // Also maintain backward compatibility with existing localStorage usage
          if (state.campaignId) {
            localStorage.setItem('currentJobCampaignId', state.campaignId);
          }
        } catch (error) {
          console.error('Failed to save state to localStorage:', error);
          dispatch({ type: 'SET_ERROR', payload: 'Failed to save data' });
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [state]);

  // Action creators
  const setCurrentStep = (step: number) => {
    dispatch({ type: 'SET_CURRENT_STEP', payload: step });
  };

  const setCampaignId = (id: string) => {
    dispatch({ type: 'SET_CAMPAIGN_ID', payload: id });
  };

  const updateJobDetails = (details: Partial<JobDetailsForm>) => {
    dispatch({ type: 'UPDATE_JOB_DETAILS', payload: details });
  };

  const resetJobDetails = () => {
    dispatch({ type: 'RESET_JOB_DETAILS' });
  };

  // Job Portal Sync functions removed - functionality deprecated

  const updateScoringParameters = (params: Partial<ScoringParameters>) => {
    dispatch({ type: 'UPDATE_SCORING_PARAMETERS', payload: params });
  };

  const updateRound = (roundId: string, field: keyof InterviewRound, value: any) => {
    dispatch({ type: 'UPDATE_ROUND', payload: { roundId, field, value } });
  };

  const addRound = () => {
    dispatch({ type: 'ADD_ROUND' });
  };

  const removeRound = (roundId: string) => {
    dispatch({ type: 'REMOVE_ROUND', payload: roundId });
  };

  const setNumberOfRounds = (count: number) => {
    dispatch({ type: 'SET_NUMBER_OF_ROUNDS', payload: count });
  };

  const toggleRoundEnabled = (roundId: string) => {
    dispatch({ type: 'TOGGLE_ROUND_ENABLED', payload: roundId });
  };

  const updateInterviewSetup = (setup: InterviewSetup) => {
    dispatch({ type: 'UPDATE_INTERVIEW_SETUP', payload: setup });
  };

  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const setError = (error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  const resetCampaign = () => {
    dispatch({ type: 'RESET_CAMPAIGN' });
  };

  const saveToStorage = () => {
    if (typeof window !== 'undefined') {
      try {
        const dataToStore = {
          campaignId: state.campaignId,
          jobDetails: state.jobDetails,
          scoringParameters: state.scoringParameters,
          currentStep: state.currentStep,
        };
        localStorage.setItem('job-campaign-storage', JSON.stringify(dataToStore));
      } catch (error) {
        console.error('Failed to save state to localStorage:', error);
        setError('Failed to save data');
      }
    }
  };

  const loadFromStorage = () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('job-campaign-storage');
      if (stored) {
        try {
          const parsedData = JSON.parse(stored);
          dispatch({ type: 'LOAD_FROM_STORAGE', payload: parsedData });
        } catch (error) {
          console.error('Failed to load state from localStorage:', error);
          setError('Failed to load saved data');
        }
      }
    }
  };

  // Computed properties
  const isFormValid = (
    state.jobDetails.campaignName.trim() !== '' &&
    state.jobDetails.jobTitle.trim() !== '' &&
    state.jobDetails.department.trim() !== '' &&
    state.jobDetails.location.trim() !== '' &&
    state.jobDetails.employeeType.trim() !== '' &&
    state.jobDetails.numberOfOpenings > 0 &&
    state.jobDetails.jobDescription.trim() !== ''
  );

  const totalInterviewDuration = state.scoringParameters.rounds.reduce(
    (total, round) => {
      if (round.isEnabled) {
        return total + (round.timeLimit.hours * 60) + round.timeLimit.minutes;
      }
      return total;
    },
    0
  );

  const contextValue: JobCampaignContextType = {
    state,
    dispatch,
    // Job Details Actions
    updateJobDetails,
    resetJobDetails,
    // Campaign Management
    setCampaignId,
    setCurrentStep,
    // Scoring Parameters Actions
    updateScoringParameters,
    addRound,
    removeRound,
    updateRound,
    toggleRoundEnabled,
    setNumberOfRounds,
    // Job Portal Actions - REMOVED (functionality deprecated)
    // Interview Setup Actions
    updateInterviewSetup,
    // State Management
    setLoading,
    setError,
    // Storage and Reset
    resetCampaign,
    saveToStorage,
    loadFromStorage,
    // Computed Properties
    isFormValid,
    totalInterviewDuration,
  };

  return (
    <JobCampaignContext.Provider value={contextValue}>
      {children}
    </JobCampaignContext.Provider>
  );
}

export function useJobCampaignStore() {
  const context = useContext(JobCampaignContext);
  if (context === undefined) {
    throw new Error('useJobCampaignStore must be used within a JobCampaignProvider');
  }
  return context;
}