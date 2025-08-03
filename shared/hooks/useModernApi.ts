import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

// Modern interview hooks
export function useBehavioralInterviews(params?: { page?: number; limit?: number }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const result = await apiClient.getBehavioralInterviews(params);
        setData(result.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params?.page, params?.limit]);

  return { data, loading, error };
}

export function useCodingInterviews(params?: { page?: number; limit?: number }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const result = await apiClient.getCodingInterviews(params);
        setData(result.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params?.page, params?.limit]);

  return { data, loading, error };
}

export function useCandidateProfiles(params?: { 
  page?: number; 
  limit?: number; 
  search?: string;
  status?: string;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const result = await apiClient.getCandidateProfiles(params);
        setData(result.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params?.page, params?.limit, params?.search, params?.status]);

  return { data, loading, error };
}

export function useJobCampaigns(params?: { page?: number; limit?: number }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const result = await apiClient.getJobCampaigns(params);
        setData(result.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params?.page, params?.limit]);

  return { data, loading, error };
}

export function useQuestionBank(params?: { page?: number; limit?: number }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch('/api/content/questions/banks');
        const result = await response.json();
        setData(result.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params?.page, params?.limit]);

  return { data, loading, error };
}

export function useDashboardAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const result = await apiClient.getDashboardAnalytics();
        setData(result.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return { data, loading, error };
}
