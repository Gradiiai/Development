export interface JobDetailsForm {
  campaignName: string;
  jobTitle: string;
  department: string;
  location: string;
  experienceLevel: string;
  experienceMin: number;
  experienceMax: number;
  employeeType: string;
  salaryMin: number;
  salaryMax: number;
  salaryNegotiable: boolean;
  currency: string;
  numberOfOpenings: number;
  jobDescription: string;
  jobDuties: string;
  jobRequirements: string;
  jobBenefits: string;
  requirements: string[];
  benefits: string[];
  skills: string[];
  requiredSkills?: string; // JSON string of required skills with weights
  competencies?: string; // JSON string of competencies with weights
  minExperience?: number; // Minimum years of experience
  maxExperience?: number; // Maximum years of experience
  jobDescriptionTemplateId?: string;
  skillTemplateId?: string;

  campaignType: 'permanent' | 'specific';
  applicationDeadline?: string; // Optional for permanent campaigns
  targetHireDate?: string; // Optional for permanent campaigns
  isRemote: boolean;
  isHybrid: boolean;
}

export interface JobCampaign {
  id: string;
  campaignName: string;
  jobTitle: string;
  department: string;
  location: string;
  employmentType: string;
  experienceLevel: string;
  status: 'draft' | 'active' | 'paused' | 'closed';
  campaignType?: 'permanent' | 'specific';
  createdAt: string;
  candidatesCount?: number;
  interviewsCount?: number;
  jobType?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryNegotiable?: boolean;
  currency?: string;
  skills?: string;
  requirements?: string;
  benefits?: string;
  jobDuties?: string;
  requiredSkills?: string; // JSON string of required skills with weights
  competencies?: string; // JSON string of competencies with weights
  minExperience?: number; // Minimum years of experience
  maxExperience?: number; // Maximum years of experience
  applicationDeadline?: Date;
  targetHireDate?: Date;
  isRemote?: boolean;
  numberOfOpenings: number;
}

export interface InterviewRound {
  id: string;
  name: string;
  type: 'behavioral' | 'coding' | 'mcq' | 'combo';
  timeLimit: {
    hours: number;
    minutes: number;
  };
  questionBank: string;
  bankId?: string;
  numberOfQuestions: number;
  chooseRandom: boolean;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  instructions: string;
  isEnabled: boolean;
  sections?: {
    behavioral?: number;
    coding?: number;
    mcq?: number;
  };
}

export interface ScoringParameters {
  selectedTemplate: string;
  rounds: InterviewRound[];
  numberOfRounds: number;
}

// JobPortalSync interface removed - functionality deprecated

export interface JobDescriptionTemplate {
  id: string;
  companyId: string;
  createdBy: string;
  templateName: string;
  jobCategory: string;
  templateContent: string;
  placeholders?: string[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  description?: string;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

// Campaign Analytics Interface
export interface CampaignAnalytics {
  id: string;
  campaignId: string;
  totalApplications: number;
  firstRoundInterviews: number;
  firstRoundShortlisted: number;
  secondRoundInterviews: number;
  secondRoundShortlisted: number;
  thirdRoundInterviews: number;
  thirdRoundShortlisted: number;
  finalHires: number;
  averageScore: number;
  conversionRate: number;
  timeToHire: number;
  createdAt: Date;
  updatedAt: Date;
}

// Interview Round Results Interface
export interface InterviewRoundResult {
  id: string;
  campaignInterviewId: string;
  candidateId: string;
  roundNumber: number;
  roundName: string;
  score: number;
  maxScore: number;
  passed: boolean;
  feedback?: string;
  interviewerNotes?: string;
  timeSpent?: number;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Application Status History Interface
export interface ApplicationStatusHistory {
  id: string;
  candidateId: string;
  campaignId: string;
  previousStatus?: string;
  newStatus: string;
  reason?: string;
  changedBy?: string;
  createdAt: Date;
  metadata?: any;
}

// Enhanced Job Campaign Interface
export interface JobCampaignWithAnalytics extends JobCampaign {
  analytics?: CampaignAnalytics;
  totalApplicants: number;
  activeApplicants: number;
  jobRequirements?: string;
  jobBenefits?: string;
  jobDescriptionTemplateId?: string;
  skillTemplateId?: string;
  applicationDeadline?: Date;
  targetHireDate?: Date;
  isRemote: boolean;
  isHybrid: boolean;
}

export interface InterviewSetup {
  campaignId: string;
  template?: string;
  rounds: InterviewRound[];
  totalDuration: number;
}

export interface JobCampaignState {
  currentStep: number;
  campaignId: string | null;
  jobDetails: JobDetailsForm;
  scoringParameters: ScoringParameters;
  interviewSetup: InterviewSetup | null;
  loading: boolean;
  error: string | null;
}

export type JobCampaignAction =
  | { type: 'SET_CURRENT_STEP'; payload: number }
  | { type: 'SET_CAMPAIGN_ID'; payload: string }
  | { type: 'UPDATE_JOB_DETAILS'; payload: Partial<JobDetailsForm> }
  | { type: 'RESET_JOB_DETAILS' }
  | { type: 'UPDATE_SCORING_PARAMETERS'; payload: Partial<ScoringParameters> }
  | { type: 'UPDATE_ROUND'; payload: { roundId: string; field: keyof InterviewRound; value: any } }
  | { type: 'ADD_ROUND'; payload?: { type?: 'behavioral' | 'mcq' | 'coding' | 'combo' } }
  | { type: 'REMOVE_ROUND'; payload: string }
  | { type: 'SET_NUMBER_OF_ROUNDS'; payload: number }
  | { type: 'TOGGLE_ROUND_ENABLED'; payload: string }
  | { type: 'UPDATE_INTERVIEW_SETUP'; payload: InterviewSetup }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_CAMPAIGN' }
  | { type: 'LOAD_FROM_STORAGE'; payload: Partial<JobCampaignState> };