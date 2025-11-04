// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// Repository Types
export type RepositoryStatus = 'pending' | 'cloning' | 'analyzing' | 'completed' | 'failed';

export interface Repository {
  id: string;
  repo_url: string;
  repo_name: string;
  repo_owner: string;
  branch: string;
  status: RepositoryStatus;
  created_at: string;
  updated_at: string;
  review_jobs?: ReviewJob[];
}

export interface CreateRepositoryRequest {
  repo_url: string;
  branch?: string;
}

export interface UpdateRepositoryRequest {
  status: RepositoryStatus;
}

// Job Types
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface ReviewJob {
  id: string;
  repo_id: string;
  status: JobStatus;
  progress: number;
  total_files: number;
  processed_files: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  repositories?: {
    id: string;
    repo_url: string;
    repo_name: string;
  };
  metrics?: {
    queueTime: number;
    queueTimeFormatted: string;
    processingTime: number;
    processingTimeFormatted: string;
    totalTime: number;
  };
}

export interface UpdateJobRequest {
  status?: JobStatus;
  progress?: number;
  total_files?: number;
  processed_files?: number;
  error_message?: string;
}

// Review Results Types
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type Category = 'bug' | 'security' | 'performance' | 'style';
export type Agent = 'BugDetectionAgent' | 'SecurityAgent' | 'PerformanceAgent' | 'StyleAgent';

export interface ReviewFinding {
  id: string;
  job_id: string;
  repo_id: string;
  file_path: string;
  line_number?: number;
  severity: Severity;
  category: Category;
  agent_id?: string;
  agents?: {
    name: string;
    description?: string;
  };
  title: string;
  description: string;
  suggestion?: string;
  code_snippet?: string;
  created_at: string;
}

export interface JobStats {
  id: string;
  total_issues: number;
  overall_score: number;
  issues_by_severity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  issues_by_category: {
    bug: number;
    security: number;
    performance: number;
    style: number;
  };
  issues_by_agent: {
    BugDetectionAgent: number;
    SecurityAgent: number;
    PerformanceAgent: number;
    StyleAgent: number;
  };
  files_analyzed: number;
  processing_time?: number;
}

// Queue Types
export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  total: number;
}

// Filter Types
export interface ReviewFilters {
  severity?: Severity[];
  category?: Category[];
  agent?: Agent[];
  file_path?: string;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface RepositoryFilters extends PaginationParams {
  status?: RepositoryStatus;
}

export interface JobFilters extends PaginationParams {
  status?: JobStatus;
  repo_id?: string;
}

export interface ReviewResultFilters extends PaginationParams {
  severity?: Severity;
  category?: Category;
  agent?: Agent;
}