import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Github, Plus, Search, Trash2, ExternalLink } from 'lucide-react';
import { useRepositories, useDeleteRepository } from '../hooks/useApi';
import type { RepositoryStatus } from '../types/api';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const RepositoriesPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<RepositoryStatus | ''>('');
  const [search, setSearch] = useState('');

  const { data: repositoriesResponse, isLoading, error, refetch } = useRepositories({
    status: statusFilter || undefined,
    limit: 50
  });

  const deleteRepository = useDeleteRepository();

  const repositories = repositoriesResponse?.data || [];

  // Filter by search term
  const filteredRepositories = repositories.filter(repo =>
    repo.repo_name.toLowerCase().includes(search.toLowerCase()) ||
    repo.repo_owner.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the analysis for ${name}?`)) {
      try {
        await deleteRepository.mutateAsync(id);
      } catch (error) {
        console.error('Failed to delete repository:', error);
      }
    }
  };

  const statusOptions: { value: RepositoryStatus | ''; label: string }[] = [
    { value: '', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'cloning', label: 'Cloning' },
    { value: 'analyzing', label: 'Analyzing' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Repositories</h1>
          <p className="text-gray-600 mt-1">
            Manage and view analysis results for your repositories
          </p>
        </div>
        <Link to="/" className="btn-primary flex items-center space-x-2 mt-4 sm:mt-0">
          <Plus className="h-4 w-4" />
          <span>Analyze New Repository</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search repositories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RepositoryStatus | '')}
              className="input"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Results Count */}
          <div className="text-sm text-gray-600 whitespace-nowrap">
            {filteredRepositories.length} result{filteredRepositories.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="card text-center">
          <p className="text-red-600">Failed to load repositories: {error.message}</p>
          <button onClick={() => refetch()} className="btn-primary mt-4">
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredRepositories.length === 0 && (
        <div className="card text-center py-12">
          <Github className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {search || statusFilter ? 'No repositories found' : 'No repositories analyzed yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {search || statusFilter
              ? 'Try adjusting your search or filter criteria'
              : 'Start by analyzing your first repository'}
          </p>
          <Link to="/" className="btn-primary">
            Analyze Repository
          </Link>
        </div>
      )}

      {/* Repositories List */}
      {!isLoading && !error && filteredRepositories.length > 0 && (
        <div className="space-y-4">
          {filteredRepositories.map((repo) => (
            <div key={repo.id} className="card hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  <Github className="h-8 w-8 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {repo.repo_owner}/{repo.repo_name}
                      </h3>
                      <Badge variant={repo.status}>{repo.status}</Badge>
                    </div>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                      <span>Branch: {repo.branch}</span>
                      <span>•</span>
                      <span>Created: {new Date(repo.created_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <a
                        href={repo.repo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1 text-primary-600 hover:text-primary-700"
                      >
                        <span>View on GitHub</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 ml-4">
                  {/* Job Status */}
                  {repo.review_jobs && repo.review_jobs.length > 0 && (
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        Latest Analysis
                      </div>
                      <Badge variant={repo.review_jobs[0].status}>
                        {repo.review_jobs[0].status}
                      </Badge>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    {repo.review_jobs && repo.review_jobs.length > 0 && (
                      <Link
                        to={`/jobs/${repo.review_jobs[0].id}`}
                        className="btn-secondary text-sm"
                      >
                        View Results
                      </Link>
                    )}
                    <Link
                      to={`/repositories/${repo.id}`}
                      className="btn-secondary text-sm"
                    >
                      Details
                    </Link>
                    <button
                      onClick={() => handleDelete(repo.id, `${repo.repo_owner}/${repo.repo_name}`)}
                      disabled={deleteRepository.isPending}
                      className="btn-danger text-sm flex items-center space-x-1"
                    >
                      {deleteRepository.isPending ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {repositoriesResponse?.pagination && repositoriesResponse.pagination.totalPages > 1 && (
        <div className="flex justify-center">
          <div className="text-sm text-gray-600">
            Page {repositoriesResponse.pagination.page} of {repositoriesResponse.pagination.totalPages}
          </div>
          {/* Add pagination controls here if needed */}
        </div>
      )}
    </div>
  );
};

export default RepositoriesPage;