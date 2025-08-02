interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    timestamp: string;
  };
}

class ApiClient {
  private baseUrl = '/api';

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const result = await response.json();
    
    if (!result.success && response.status >= 400) {
      throw new Error(result.error?.message || 'API request failed');
    }

    return result;
  }

  // ===== AUTHENTICATION =====
  async signin(email: string, password: string) {
    return this.request('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  async signup(userData: any) {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async verifyOtp(email: string, otp: string, purpose: string) {
    return this.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp, purpose })
    });
  }

  // ===== USERS =====
  async getUserProfile() {
    return this.request('/users/profile');
  }

  async updateUserProfile(data: any) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async getUserCompany() {
    return this.request('/users/company');
  }

  async getUserSubscription() {
    return this.request('/users/subscription');
  }

  // ===== INTERVIEWS =====
  async getBehavioralInterviews(params?: { page?: number; limit?: number }) {
    const searchParams = new URLSearchParams(params as any);
    return this.request(`/interviews/behavioral?${searchParams}`);
  }

  async createBehavioralInterview(data: any) {
    return this.request('/interviews/behavioral', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getCodingInterviews(params?: { page?: number; limit?: number }) {
    const searchParams = new URLSearchParams(params as any);
    return this.request(`/interviews/coding?${searchParams}`);
  }

  async createCodingInterview(data: any) {
    return this.request('/interviews/coding', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getMcqInterviews(params?: { page?: number; limit?: number }) {
    const searchParams = new URLSearchParams(params as any);
    return this.request(`/interviews/mcq?${searchParams}`);
  }

  async createMcqInterview(data: any) {
    return this.request('/interviews/mcq', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getComboInterviews(params?: { page?: number; limit?: number }) {
    const searchParams = new URLSearchParams(params as any);
    return this.request(`/interviews/combo?${searchParams}`);
  }

  async createComboInterview(data: any) {
    return this.request('/interviews/combo', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getInterview(id: string) {
    return this.request(`/interviews/${id}`);
  }

  async startInterview(id: string) {
    return this.request(`/interviews/${id}/start`, {
      method: 'POST'
    });
  }

  async submitInterview(id: string, answers: any) {
    return this.request(`/interviews/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers })
    });
  }

  async getInterviewResults(id: string) {
    return this.request(`/interviews/${id}/results`);
  }

  // ===== CANDIDATES =====
  async getCandidateProfiles(params?: { 
    page?: number; 
    limit?: number; 
    search?: string;
    status?: string;
  }) {
    const searchParams = new URLSearchParams(params as any);
    return this.request(`/candidates/profiles?${searchParams}`);
  }

  async createCandidate(data: any) {
    return this.request('/candidates/profiles', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getCandidate(id: string) {
    return this.request(`/candidates/${id}`);
  }

  async updateCandidate(id: string, data: any) {
    return this.request(`/candidates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteCandidate(id: string) {
    return this.request(`/candidates/${id}`, {
      method: 'DELETE'
    });
  }

  async getCandidateApplications(params?: { page?: number; limit?: number }) {
    const searchParams = new URLSearchParams(params as any);
    return this.request(`/candidates/applications?${searchParams}`);
  }

  async uploadResume(formData: FormData) {
    return fetch(`${this.baseUrl}/candidates/resumes/upload`, {
      method: 'POST',
      body: formData
    }).then(res => res.json());
  }

  async importCandidates(formData: FormData) {
    return fetch(`${this.baseUrl}/candidates/import`, {
      method: 'POST',
      body: formData
    }).then(res => res.json());
  }

  // ===== CAMPAIGNS =====
  async getJobCampaigns(params?: { page?: number; limit?: number }) {
    const searchParams = new URLSearchParams(params as any);
    return this.request(`/campaigns/jobs?${searchParams}`);
  }

  async createJobCampaign(data: any) {
    return this.request('/campaigns/jobs', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getJobCampaign(id: string) {
    return this.request(`/campaigns/jobs/${id}`);
  }

  async updateJobCampaign(id: string, data: any) {
    return this.request(`/campaigns/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async getCampaignCandidates(id: string) {
    return this.request(`/campaigns/jobs/${id}/candidates`);
  }

  async getCampaignAnalytics(id: string) {
    return this.request(`/campaigns/${id}/analytics`);
  }

  // ===== CONTENT =====
  async getQuestionBank(params?: { page?: number; limit?: number }) {
    const searchParams = new URLSearchParams(params as any);
    return this.request(`/content/questions?${searchParams}`);
  }

  async createQuestion(data: any) {
    return this.request('/content/questions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getSkillTemplates(params?: { page?: number; limit?: number }) {
    const searchParams = new URLSearchParams(params as any);
    return this.request(`/content/skill-templates?${searchParams}`);
  }

  async createSkillTemplate(data: any) {
    return this.request('/content/skill-templates', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getJobTemplates(params?: { page?: number; limit?: number }) {
    const searchParams = new URLSearchParams(params as any);
    return this.request(`/content/job-templates?${searchParams}`);
  }

  async createJobTemplate(data: any) {
    return this.request('/content/job-templates', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // ===== ANALYTICS =====
  async getDashboardAnalytics() {
    return this.request('/analytics/dashboard');
  }

  async getBehavioralAnalytics(params?: { page?: number; limit?: number }) {
    const searchParams = new URLSearchParams(params as any);
    return this.request(`/analytics/interviews/behavioral?${searchParams}`);
  }

  async getCodingAnalytics(params?: { page?: number; limit?: number }) {
    const searchParams = new URLSearchParams(params as any);
    return this.request(`/analytics/interviews/coding?${searchParams}`);
  }

  async getMcqAnalytics(params?: { page?: number; limit?: number }) {
    const searchParams = new URLSearchParams(params as any);
    return this.request(`/analytics/interviews/mcq?${searchParams}`);
  }

  async getComboAnalytics(params?: { page?: number; limit?: number }) {
    const searchParams = new URLSearchParams(params as any);
    return this.request(`/analytics/interviews/combo?${searchParams}`);
  }

  // ===== BILLING =====
  async getSubscriptionPlans() {
    return this.request('/billing/plans');
  }

  async createCheckoutSession(data: any) {
    return this.request('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async createPortalSession() {
    return this.request('/billing/portal', {
      method: 'POST'
    });
  }

  // ===== INTEGRATIONS =====
  async getWebhooks() {
    return this.request('/integrations/webhooks');
  }

  async createWebhook(data: any) {
    return this.request('/integrations/webhooks', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async sendInterviewEmail(data: any) {
    return this.request('/integrations/email/interview', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // ===== AI SERVICES =====
  async generateFeedback(data: any) {
    return this.request('/ai/generate-feedback', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // ===== CODING =====
  async compileCode(data: any) {
    return this.request('/coding/compile', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient; 