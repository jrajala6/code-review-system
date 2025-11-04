import React from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  Zap,
  CheckCircle,
  AlertCircle,
  BarChart3,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import { useQueueStats, useJobs } from '../hooks/useApi';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const QueuePage: React.FC = () => {
  const { data: queueStatsResponse, isLoading: queueLoading, refetch: refetchQueue } = useQueueStats();
  const { data: jobsResponse, isLoading: jobsLoading, refetch: refetchJobs } = useJobs({ limit: 20 });

  const queueStats = queueStatsResponse?.data;
  const recentJobs = jobsResponse?.data || [];

  const handleRefresh = () => {
    refetchQueue();
    refetchJobs();
  };

  const getQueueHealthStatus = () => {
    if (!queueStats) return 'unknown';

    const { waiting, failed, total } = queueStats;
    const failureRate = total > 0 ? failed / total : 0;

    if (failureRate > 0.1) return 'unhealthy'; // > 10% failure rate
    if (waiting > 10) return 'busy'; // Many waiting jobs
    return 'healthy';
  };

  const healthStatus = getQueueHealthStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Queue Status</h1>
          <p className="text-gray-600 mt-1">
            Monitor analysis queue and job processing
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="btn-secondary flex items-center space-x-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Queue Statistics */}
      {queueLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : queueStats ? (
        <>
          {/* Health Status */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {healthStatus === 'healthy' && <CheckCircle className="h-6 w-6 text-green-600" />}
                {healthStatus === 'busy' && <Clock className="h-6 w-6 text-yellow-600" />}
                {healthStatus === 'unhealthy' && <AlertCircle className="h-6 w-6 text-red-600" />}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Queue Health</h2>
                  <p className="text-sm text-gray-600">
                    {healthStatus === 'healthy' && 'All systems operational'}
                    {healthStatus === 'busy' && 'High queue volume'}
                    {healthStatus === 'unhealthy' && 'Experiencing issues'}
                  </p>
                </div>
              </div>
              <Badge variant={
                healthStatus === 'healthy' ? 'success' :
                healthStatus === 'busy' ? 'warning' : 'danger'
              }>
                {healthStatus.toUpperCase()}
              </Badge>
            </div>
          </div>

          {/* Queue Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card text-center">
              <Clock className="h-8 w-8 text-gray-600 mx-auto mb-3" />
              <div className="text-3xl font-bold text-gray-900 mb-1">{queueStats.waiting}</div>
              <div className="text-sm text-gray-600">Waiting</div>
            </div>

            <div className="card text-center">
              <Zap className="h-8 w-8 text-blue-600 mx-auto mb-3" />
              <div className="text-3xl font-bold text-blue-600 mb-1">{queueStats.active}</div>
              <div className="text-sm text-gray-600">Processing</div>
            </div>

            <div className="card text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-3" />
              <div className="text-3xl font-bold text-green-600 mb-1">{queueStats.completed}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>

            <div className="card text-center">
              <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-3" />
              <div className="text-3xl font-bold text-red-600 mb-1">{queueStats.failed}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
          </div>

          {/* Queue Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Queue Overview</span>
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Jobs:</span>
                  <span className="font-medium">{queueStats.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Success Rate:</span>
                  <span className="font-medium">
                    {queueStats.total > 0
                      ? Math.round((queueStats.completed / queueStats.total) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Delayed Jobs:</span>
                  <span className="font-medium">{queueStats.delayed}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Performance</span>
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Queue Utilization:</span>
                  <span className="font-medium">
                    {queueStats.active > 0 ? 'High' : queueStats.waiting > 0 ? 'Medium' : 'Low'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Backlog:</span>
                  <span className="font-medium">{queueStats.waiting + queueStats.delayed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <Badge variant={queueStats.active > 0 ? 'info' : 'success'}>
                    {queueStats.active > 0 ? 'Active' : 'Idle'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="card text-center">
          <p className="text-red-600">Failed to load queue statistics</p>
        </div>
      )}

      {/* Recent Jobs */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Jobs</h3>

        {jobsLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : recentJobs.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Recent Jobs</h4>
            <p className="text-gray-600">No analysis jobs have been submitted recently.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-4">
                  <Badge variant={job.status}>{job.status}</Badge>
                  <div>
                    <p className="font-medium text-gray-900">
                      {job.repositories?.repo_name || 'Unknown Repository'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Created: {new Date(job.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {/* Progress Info */}
                  {job.total_files > 0 && (
                    <div className="text-right text-sm text-gray-600">
                      <p>{job.processed_files}/{job.total_files} files</p>
                      <p>{job.progress}% complete</p>
                    </div>
                  )}

                  {/* View Button */}
                  <Link
                    to={`/jobs/${job.id}`}
                    className="btn-secondary text-sm"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="card bg-blue-50 border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Understanding Queue Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Job States:</h4>
            <ul className="space-y-1 text-blue-700">
              <li><strong>Waiting:</strong> Jobs queued for processing</li>
              <li><strong>Processing:</strong> Currently being analyzed</li>
              <li><strong>Completed:</strong> Successfully finished</li>
              <li><strong>Failed:</strong> Encountered an error</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Health Indicators:</h4>
            <ul className="space-y-1 text-blue-700">
              <li><strong>Healthy:</strong> Normal operation</li>
              <li><strong>Busy:</strong> High volume, longer wait times</li>
              <li><strong>Unhealthy:</strong> High failure rate</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QueuePage;