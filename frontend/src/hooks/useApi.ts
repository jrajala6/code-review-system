import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiUtils } from '../services/api';
import { queryKeys } from '../lib/queryClient';
import type {
  ReviewJob,
  CreateRepositoryRequest,
  RepositoryFilters,
  JobFilters,
  ReviewResultFilters,
} from '../types/api';

// Repository hooks
export const useRepositories = (filters: RepositoryFilters = {}) => {
  return useQuery({
    queryKey: queryKeys.repositories.list(filters),
    queryFn: () => api.repositories.getAll(filters),
  });
};

export const useRepository = (id: string) => {
  return useQuery({
    queryKey: queryKeys.repositories.detail(id),
    queryFn: () => api.repositories.getById(id),
    enabled: !!id,
  });
};

export const useCreateRepository = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRepositoryRequest) => api.repositories.create(data),
    onSuccess: () => {
      // Invalidate and refetch repositories list
      queryClient.invalidateQueries({ queryKey: queryKeys.repositories.all });
    },
  });
};

export const useDeleteRepository = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.repositories.delete(id),
    onSuccess: (_, id) => {
      // Remove from cache and refetch list
      queryClient.removeQueries({ queryKey: queryKeys.repositories.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.repositories.all });
    },
  });
};

// Job hooks
export const useJobs = (filters: JobFilters = {}) => {
  return useQuery({
    queryKey: queryKeys.jobs.list(filters),
    queryFn: () => api.jobs.getAll(filters),
  });
};

export const useJob = (id: string) => {
  return useQuery({
    queryKey: queryKeys.jobs.detail(id),
    queryFn: () => api.jobs.getById(id),
    enabled: !!id,
  });
};

export const useJobStats = (id: string) => {
  return useQuery({
    queryKey: queryKeys.jobs.stats(id),
    queryFn: () => api.jobs.getStats(id),
    enabled: !!id,
  });
};

export const useJobReviews = (id: string, filters: ReviewResultFilters = {}) => {
  return useQuery({
    queryKey: queryKeys.jobs.reviews(id, filters),
    queryFn: () => api.jobs.getReviews(id, filters),
    enabled: !!id,
  });
};

export const useDeleteJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.jobs.delete(id),
    onSuccess: (_, id) => {
      // Remove from cache and refetch lists
      queryClient.removeQueries({ queryKey: queryKeys.jobs.detail(id) });
      queryClient.removeQueries({ queryKey: queryKeys.jobs.stats(id) });
      queryClient.removeQueries({ queryKey: queryKeys.jobs.reviews(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.repositories.all });
    },
  });
};

// Queue hooks
export const useQueueStats = () => {
  return useQuery({
    queryKey: queryKeys.queue.stats,
    queryFn: () => api.queue.getStats(),
    refetchInterval: 5000, // Refetch every 5 seconds
  });
};

// Health check hook
export const useHealthCheck = () => {
  return useQuery({
    queryKey: queryKeys.health.check,
    queryFn: () => api.health.check(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

// Complex operations
export const useStartReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ repoUrl, branch }: { repoUrl: string; branch?: string }) =>
      apiUtils.startReview(repoUrl, branch),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.repositories.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.queue.stats });
    },
  });
};

// Real-time job polling hook
export const useJobPolling = (
  jobId: string,
  options?: {
    enabled?: boolean;
    onComplete?: (job: ReviewJob) => void;
    intervalMs?: number;
  }
) => {
  const { enabled = true, intervalMs = 2000 } = options || {};

  return useQuery({
    queryKey: ['job-polling', jobId],
    queryFn: async () => {
      const response = await api.jobs.getById(jobId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to get job status');
      }
      return response.data;
    },
    enabled: enabled && !!jobId,
    refetchInterval: intervalMs,
  });
};

// Comprehensive job results hook
export const useJobResults = (jobId: string) => {
  return useQuery({
    queryKey: ['job-results', jobId],
    queryFn: () => apiUtils.getJobResults(jobId),
    enabled: !!jobId,
  });
};