import React from 'react';
import { CheckCircle, Clock, AlertCircle, Zap, FileText } from 'lucide-react';
import type { ReviewJob } from '../types/api';
import ProgressBar from './ui/ProgressBar';
import Badge from './ui/Badge';
import LoadingSpinner from './ui/LoadingSpinner';

interface JobProgressProps {
  job: ReviewJob;
  showDetails?: boolean;
}

const JobProgress: React.FC<JobProgressProps> = ({ job, showDetails = true }) => {
  const getStatusIcon = () => {
    switch (job.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'processing':
        return <LoadingSpinner size="sm" />;
      case 'queued':
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusMessage = () => {
    switch (job.status) {
      case 'queued':
        return 'Waiting in queue...';
      case 'processing':
        return `Analyzing files (${job.processed_files}/${job.total_files})`;
      case 'completed':
        return 'Analysis completed successfully';
      case 'failed':
        return job.error_message || 'Analysis failed';
      default:
        return 'Unknown status';
    }
  };

  const getProgressVariant = () => {
    switch (job.status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'danger';
      case 'processing':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Code Analysis Progress
            </h3>
            <p className="text-sm text-gray-600">{getStatusMessage()}</p>
          </div>
        </div>
        <Badge variant={job.status}>{job.status}</Badge>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <ProgressBar
          value={job.progress}
          variant={getProgressVariant()}
          label={`${job.progress}% complete`}
        />
      </div>

      {/* File Processing Info */}
      {job.total_files > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
          <div className="flex items-center space-x-1">
            <FileText className="h-4 w-4" />
            <span>Files: {job.processed_files} / {job.total_files}</span>
          </div>
          {job.status === 'processing' && (
            <div className="flex items-center space-x-1">
              <Zap className="h-4 w-4" />
              <span>AI agents analyzing...</span>
            </div>
          )}
        </div>
      )}

      {/* Detailed Information */}
      {showDetails && (
        <div className="border-t pt-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Job ID:</span>
              <span className="ml-2 text-gray-600 font-mono">{job.id}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Created:</span>
              <span className="ml-2 text-gray-600">{formatTime(job.created_at)}</span>
            </div>
            {job.started_at && (
              <div>
                <span className="font-medium text-gray-700">Started:</span>
                <span className="ml-2 text-gray-600">{formatTime(job.started_at)}</span>
              </div>
            )}
            {job.completed_at && (
              <div>
                <span className="font-medium text-gray-700">Completed:</span>
                <span className="ml-2 text-gray-600">{formatTime(job.completed_at)}</span>
              </div>
            )}
          </div>

          {/* Timing Metrics */}
          {job.metrics && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {job.metrics.queueTime > 0 && (
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Queue Time:</span>
                  <span className="text-gray-600">{job.metrics.queueTimeFormatted}</span>
                </div>
              )}
              {job.metrics.processingTime > 0 && (
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Processing Time:</span>
                  <span className="text-gray-600">{job.metrics.processingTimeFormatted}</span>
                </div>
              )}
              {job.metrics.totalTime > 0 && (
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Total Time:</span>
                  <span className="text-gray-600">{formatDuration(job.metrics.totalTime)}</span>
                </div>
              )}
            </div>
          )}

          {/* Repository Info */}
          {job.repositories && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Repository:</span>
              <span className="ml-2 text-gray-600">{job.repositories.repo_name}</span>
            </div>
          )}

          {/* Error Message */}
          {job.status === 'failed' && job.error_message && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">
                <strong>Error:</strong> {job.error_message}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JobProgress;