export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiContext {
  user: {
    id: string;
    email: string;
    role: string;
    companyId: string;
  };
}

export type InterviewType = 'behavioral' | 'coding' | 'mcq' | 'combo';
export type InterviewStatus = 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type CandidateStatus = 'applied' | 'screening' | 'interview' | 'hired' | 'rejected';
export type UserRole = 'super-admin' | 'company' | 'candidate';
