import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Github,
  FileText,
  AlertTriangle,
  CheckCircle,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { useJobPolling, useJobStats, useJobReviews } from '../hooks/useApi';
import type { Severity, Category } from '../types/api';
import JobProgress from '../components/JobProgress';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedSeverity, setSelectedSeverity] = useState<Severity | ''>('');
  const [selectedCategory, setSelectedCategory] = useState<Category | ''>('');

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // Real-time job polling
  const {
    data: job,
    isLoading: jobLoading,
    error: jobError
  } = useJobPolling(id || '', {
    enabled: !!id,
    onComplete: (completedJob) => {
      console.log('Job completed:', completedJob.id);
    }
  });

  // Job statistics
  const {
    data: statsResponse,
    refetch: refetchStats
  } = useJobStats(id || '');

  // Review results with filtering
  const {
    data: reviewsResponse,
    isLoading: reviewsLoading,
    refetch: refetchReviews
  } = useJobReviews(id || '', {
    severity: selectedSeverity || undefined,
    category: selectedCategory || undefined,
    limit: 100
  });

  // Auto-refetch stats and reviews when job is processing or completed
  useEffect(() => {
    if (!job) return;

    const status = job.status;
    const shouldRefetch = status === 'processing' || status === 'completed';

    if (shouldRefetch) {
      // Refetch stats and reviews immediately when job starts processing or completes
      refetchStats();
      refetchReviews();

      // Set up polling if job is still processing
      if (status === 'processing') {
        const interval = setInterval(() => {
          refetchStats();
          refetchReviews();
        }, 3000); // Poll every 3 seconds while processing

        return () => clearInterval(interval);
      }
    }
  }, [job?.status, job?.progress, refetchStats, refetchReviews]);

  // NOW we can do conditional returns
  if (!id) {
    return <div>Invalid job ID</div>;
  }

  if (jobLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (jobError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">
          {jobError instanceof Error ? jobError.message : 'Could not load job details'}
        </p>
        <button onClick={() => navigate('/')} className="btn-primary">
          Return Home
        </button>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const stats = statsResponse?.data;
  const reviews = reviewsResponse?.data || [];

  const handleRefresh = () => {
    refetchStats();
    refetchReviews();
  };

  const severityOptions: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
  const categoryOptions: Category[] = ['bug', 'security', 'performance', 'style'];

  const getSeverityCount = (severity: Severity) => {
    // Backend returns 'bySeverity', frontend type expects 'issues_by_severity'
    // Support both for backward compatibility
    if (!stats) return 0;
    return (stats as any).bySeverity?.[severity] || 0;
  };

  const getCategoryCount = (category: Category) => {
    // Backend returns 'byCategory', frontend type expects 'issues_by_category'
    // Support both for backward compatibility
    if (!stats) return 0;
    return (stats as any).byCategory?.[category] || 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="btn-secondary flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analysis Results</h1>
            {job.repositories && (
              <p className="text-gray-600">
                {job.repositories.repo_name}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={handleRefresh} className="btn-secondary flex items-center space-x-2">
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          {job.status === 'completed' && (
            <button className="btn-primary flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Export Report</span>
            </button>
          )}
        </div>
      </div>

      {/* Repository Info */}
      {job.repositories && (
        <div className="card">
          <div className="flex items-center space-x-3">
            <Github className="h-5 w-5 text-gray-400" />
            <div>
              <h3 className="font-medium text-gray-900">{job.repositories.repo_name}</h3>
              <a
                href={job.repositories.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                {job.repositories.repo_url}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Job Progress */}
      <JobProgress job={job} />

      {/* Statistics Dashboard */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card text-center">
            <div className="text-3xl font-bold text-gray-900 mb-2">{stats.overall_score || 'N/A'}</div>
            <div className="text-sm text-gray-600">Overall Score</div>
            <div className="mt-2">
              <Badge variant={stats.overall_score >= 80 ? 'success' : stats.overall_score >= 60 ? 'warning' : 'danger'}>
                {stats.overall_score >= 80 ? 'Good' : stats.overall_score >= 60 ? 'Fair' : 'Needs Work'}
              </Badge>
            </div>
          </div>

          <div className="card text-center">
            <div className="text-3xl font-bold text-gray-900 mb-2">{stats.total_issues || (stats as any).total || 0}</div>
            <div className="text-sm text-gray-600">Total Issues</div>
            <div className="mt-2 flex justify-center space-x-1">
              {getSeverityCount('critical') > 0 && (
                <Badge variant="critical">{getSeverityCount('critical')}</Badge>
              )}
              {getSeverityCount('high') > 0 && (
                <Badge variant="high">{getSeverityCount('high')}</Badge>
              )}
            </div>
          </div>

          <div className="card text-center">
            <div className="text-3xl font-bold text-gray-900 mb-2">{stats.files_analyzed || 'N/A'}</div>
            <div className="text-sm text-gray-600">Files Analyzed</div>
            {stats.processing_time && (
              <div className="mt-2 text-xs text-gray-500">
                in {Math.round(stats.processing_time / 1000)}s
              </div>
            )}
          </div>


        </div>
      )}

      {/* Issue Breakdown */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* By Severity */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Issues by Severity</h3>
            <div className="space-y-3">
              {severityOptions.map((severity) => (
                <div key={severity} className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Badge variant={severity}>{severity}</Badge>
                  </div>
                  <span className="font-medium">{getSeverityCount(severity)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* By Category */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Issues by Category</h3>
            <div className="space-y-3">
              {categoryOptions.map((category) => (
                <div key={category} className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Badge variant={category}>{category}</Badge>
                  </div>
                  <span className="font-medium">{getCategoryCount(category)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Issues List */}
      {job.status === 'completed' && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Detailed Findings ({reviews.length})</span>
            </h3>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value as Severity | '')}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="">All Severities</option>
                {severityOptions.map((severity) => (
                  <option key={severity} value={severity}>
                    {severity.charAt(0).toUpperCase() + severity.slice(1)}
                  </option>
                ))}
              </select>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as Category | '')}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="">All Categories</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>

            </div>
          </div>

          {reviewsLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Issues Found</h4>
              <p className="text-gray-600">
                {selectedSeverity || selectedCategory
                  ? 'No issues match your current filters'
                  : 'Great! No issues were detected in your code.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((finding) => (
                <div key={finding.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start space-x-3">
                      <Badge variant={finding.severity}>{finding.severity}</Badge>
                      <Badge variant={finding.category}>{finding.category}</Badge>
                    </div>
                  </div>

                  <h4 className="font-medium text-gray-900 mb-2">{finding.title}</h4>
                  <p className="text-gray-600 mb-3">{finding.description}</p>

                  <div className="text-sm text-gray-500 mb-2">
                    <code className="bg-gray-100 px-2 py-1 rounded">
                      {finding.file_path}
                      {finding.line_number && `:${finding.line_number}`}
                    </code>
                  </div>

                  {finding.code_snippet && (
                    <div className="bg-gray-50 border rounded p-3 mb-3">
                      <pre className="text-sm overflow-x-auto">
                        <code>{finding.code_snippet}</code>
                      </pre>
                    </div>
                  )}

                  {finding.suggestion && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <p className="text-sm text-blue-700">
                        <strong>Suggestion:</strong> {finding.suggestion}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JobDetailPage;