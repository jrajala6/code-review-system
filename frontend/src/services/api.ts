import type {
  ApiResponse,
  PaginatedResponse,
  Repository,
  CreateRepositoryRequest,
  UpdateRepositoryRequest,
  ReviewJob,
  UpdateJobRequest,
  ReviewFinding,
  JobStats,
  QueueStats,
  RepositoryFilters,
  JobFilters,
  ReviewResultFilters,
} from '../types/api';

// Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiError extends Error {
  status: number;
  response?: unknown;
  
  constructor(
    message: string,
    status: number,
    response?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.response = response;
  }
}

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.error || `HTTP ${response.status}`,
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Network error', 0, error);
  }
}

// Query string builder
function buildQueryString(params: Record<string, any>): string {
  const queryParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(v => queryParams.append(key, v.toString()));
      } else {
        queryParams.append(key, value.toString());
      }
    }
  });

  const queryString = queryParams.toString();
  return queryString ? `?${queryString}` : '';
}

// Repository API
export const repositoryApi = {
  // Create a new repository for analysis
  async create(data: CreateRepositoryRequest): Promise<ApiResponse<Repository>> {
    return apiRequest('/api/repositories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get all repositories (paginated)
  async getAll(filters: RepositoryFilters = {}): Promise<PaginatedResponse<Repository>> {
    const queryString = buildQueryString(filters);
    return apiRequest(`/api/repositories${queryString}`);
  },

  // Get a specific repository with its jobs
  async getById(id: string): Promise<ApiResponse<Repository>> {
    return apiRequest(`/api/repositories/${id}`);
  },

  // Update repository status
  async update(id: string, data: UpdateRepositoryRequest): Promise<ApiResponse<Repository>> {
    return apiRequest(`/api/repositories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Delete repository
  async delete(id: string): Promise<ApiResponse<void>> {
    return apiRequest(`/api/repositories/${id}`, {
      method: 'DELETE',
    });
  },
};

// Job API
export const jobApi = {
  // Get all jobs (paginated)
  async getAll(filters: JobFilters = {}): Promise<PaginatedResponse<ReviewJob>> {
    const queryString = buildQueryString(filters);
    return apiRequest(`/api/jobs${queryString}`);
  },

  // Get job details with metrics
  async getById(id: string): Promise<ApiResponse<ReviewJob>> {
    return apiRequest(`/api/jobs/${id}`);
  },

  // Get job statistics
  async getStats(id: string): Promise<ApiResponse<JobStats>> {
    return apiRequest(`/api/jobs/${id}/stats`);
  },

  // Get review results for a job (paginated)
  async getReviews(id: string, filters: ReviewResultFilters = {}): Promise<PaginatedResponse<ReviewFinding>> {
    const queryString = buildQueryString(filters);
    return apiRequest(`/api/jobs/${id}/reviews${queryString}`);
  },

  // Update job (mainly for worker use, but available)
  async update(id: string, data: UpdateJobRequest): Promise<ApiResponse<ReviewJob>> {
    return apiRequest(`/api/jobs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Delete job
  async delete(id: string): Promise<ApiResponse<void>> {
    return apiRequest(`/api/jobs/${id}`, {
      method: 'DELETE',
    });
  },
};

// Queue API
export const queueApi = {
  // Get queue statistics
  async getStats(): Promise<ApiResponse<QueueStats>> {
    return apiRequest('/api/queue/stats');
  },
};

// Health API
export const healthApi = {
  // Check server health
  async check(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return apiRequest('/health');
  },
};

// Combined API object
export const api = {
  repositories: repositoryApi,
  jobs: jobApi,
  queue: queueApi,
  health: healthApi,
};

export default api;

// Utility functions for common patterns
export const apiUtils = {
  // Start a code review for a repository
  async startReview(repoUrl: string, branch?: string): Promise<{ repository: Repository; job: ReviewJob }> {
    const repoResponse = await repositoryApi.create({ repo_url: repoUrl, branch });

    if (!repoResponse.success || !repoResponse.data) {
      throw new Error(repoResponse.error || 'Failed to create repository');
    }

    // The backend returns { repository: {...}, job: {...} } but types say it's just Repository
    // Type assertion needed due to backend response structure
    const responseData = repoResponse.data as unknown as { repository: Repository; job: ReviewJob };
    const { repository, job } = responseData;

    if (!repository || !job) {
      throw new Error('Invalid response from server: missing repository or job');
    }

    return { repository, job };
  },

  // Poll job status until completion
  async pollJobStatus(
    jobId: string,
    onProgress?: (job: ReviewJob) => void,
    intervalMs: number = 2000
  ): Promise<ReviewJob> {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const response = await jobApi.getById(jobId);

          if (!response.success || !response.data) {
            reject(new Error(response.error || 'Failed to get job status'));
            return;
          }

          const job = response.data;

          if (onProgress) {
            onProgress(job);
          }

          if (job.status === 'completed') {
            resolve(job);
          } else if (job.status === 'failed') {
            reject(new Error(job.error_message || 'Job failed'));
          } else {
            // Continue polling
            setTimeout(poll, intervalMs);
          }
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  },

  // Get comprehensive job results
  async getJobResults(jobId: string): Promise<{
    job: ReviewJob;
    stats: JobStats;
    findings: ReviewFinding[];
  }> {
    const [jobResponse, statsResponse, findingsResponse] = await Promise.all([
      jobApi.getById(jobId),
      jobApi.getStats(jobId),
      jobApi.getReviews(jobId, { limit: 1000 }), // Get all findings
    ]);

    if (!jobResponse.success || !jobResponse.data) {
      throw new Error(jobResponse.error || 'Failed to get job details');
    }

    if (!statsResponse.success || !statsResponse.data) {
      throw new Error(statsResponse.error || 'Failed to get job statistics');
    }

    if (!findingsResponse.success) {
      throw new Error('Failed to get job findings');
    }

    return {
      job: jobResponse.data,
      stats: statsResponse.data,
      findings: findingsResponse.data,
    };
  },
};