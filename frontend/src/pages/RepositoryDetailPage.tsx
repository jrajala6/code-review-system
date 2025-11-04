import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Github, ExternalLink, Plus, Clock } from 'lucide-react';
import { useRepository } from '../hooks/useApi';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const RepositoryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    return <div>Invalid repository ID</div>;
  }

  const { data: repositoryResponse, isLoading, error } = useRepository(id);
  const repository = repositoryResponse?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !repository) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Repository Not Found</h2>
        <p className="text-gray-600 mb-4">
          {error?.message || 'Could not load repository details'}
        </p>
        <button onClick={() => navigate('/repositories')} className="btn-primary">
          Back to Repositories
        </button>
      </div>
    );
  }

  const sortedJobs = repository.review_jobs?.sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/repositories')}
            className="btn-secondary flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {repository.repo_owner}/{repository.repo_name}
            </h1>
            <p className="text-gray-600">Repository Details</p>
          </div>
        </div>
        <Badge variant={repository.status}>{repository.status}</Badge>
      </div>

      {/* Repository Information */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Repository Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Repository URL
              </label>
              <div className="flex items-center space-x-2">
                <Github className="h-4 w-4 text-gray-400" />
                <a
                  href={repository.repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 flex items-center space-x-1"
                >
                  <span>{repository.repo_url}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Branch
              </label>
              <p className="text-gray-900">{repository.branch}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <Badge variant={repository.status}>{repository.status}</Badge>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Owner
              </label>
              <p className="text-gray-900">{repository.repo_owner}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Created
              </label>
              <p className="text-gray-900">
                {new Date(repository.created_at).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Updated
              </label>
              <p className="text-gray-900">
                {new Date(repository.updated_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Analysis History */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Analysis History</h2>
          <Link to="/" className="btn-primary flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>New Analysis</span>
          </Link>
        </div>

        {sortedJobs.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Analysis Found</h3>
            <p className="text-gray-600 mb-4">
              No code analysis has been performed for this repository yet.
            </p>
            <Link to="/" className="btn-primary">
              Start Analysis
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedJobs.map((job) => (
              <div key={job.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Badge variant={job.status}>{job.status}</Badge>
                    <div>
                      <p className="font-medium text-gray-900">
                        Analysis #{job.id.slice(-8)}
                      </p>
                      <p className="text-sm text-gray-600">
                        Created: {new Date(job.created_at).toLocaleString()}
                      </p>
                      {job.started_at && (
                        <p className="text-sm text-gray-600">
                          Started: {new Date(job.started_at).toLocaleString()}
                        </p>
                      )}
                      {job.completed_at && (
                        <p className="text-sm text-gray-600">
                          Completed: {new Date(job.completed_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* Progress Info */}
                    {job.total_files > 0 && (
                      <div className="text-right text-sm text-gray-600">
                        <p>Files: {job.processed_files}/{job.total_files}</p>
                        <p>Progress: {job.progress}%</p>
                      </div>
                    )}

                    {/* View Details Button */}
                    <Link
                      to={`/jobs/${job.id}`}
                      className="btn-primary"
                    >
                      View Details
                    </Link>
                  </div>
                </div>

                {/* Error Message */}
                {job.status === 'failed' && job.error_message && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm text-red-600">
                      <strong>Error:</strong> {job.error_message}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RepositoryDetailPage;