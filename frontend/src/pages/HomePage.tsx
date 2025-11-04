import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Github,
  Zap,
  Shield,
  TrendingUp,
  Code,
  CheckCircle,
  Clock,
  BarChart3,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { useStartReview, useQueueStats, useRepositories } from '../hooks/useApi';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Badge from '../components/ui/Badge';

const HomePage: React.FC = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const navigate = useNavigate();

  const startReviewMutation = useStartReview();
  const { data: queueStats } = useQueueStats();
  const { data: recentRepos } = useRepositories({ limit: 5 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;

    try {
      const result = await startReviewMutation.mutateAsync({
        repoUrl: repoUrl.trim(),
        branch: branch.trim() || 'main'
      });

      // Navigate to the job detail page to show progress
      navigate(`/jobs/${result.job.id}`);
    } catch (error) {
      console.error('Failed to start review:', error);
    }
  };

  const validateGitHubUrl = (url: string): boolean => {
    const githubUrlPattern = /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+\/?$/;
    return githubUrlPattern.test(url);
  };

  const isValidUrl = repoUrl ? validateGitHubUrl(repoUrl) : true;

  const features = [
    {
      icon: Shield,
      title: 'Security Analysis',
      description: 'Detect vulnerabilities, injection attacks, and security anti-patterns',
      color: 'text-purple-600'
    },
    {
      icon: TrendingUp,
      title: 'Performance Optimization',
      description: 'Identify bottlenecks, memory leaks, and inefficient algorithms',
      color: 'text-orange-600'
    },
    {
      icon: Code,
      title: 'Bug Detection',
      description: 'Find logic errors, null pointer issues, and type problems',
      color: 'text-red-600'
    },
    {
      icon: CheckCircle,
      title: 'Code Style',
      description: 'Ensure consistent formatting, naming, and documentation',
      color: 'text-blue-600'
    }
  ];

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl">
            <Zap className="h-8 w-8 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          AI-Powered Code Review
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
          Get instant, comprehensive analysis of your GitHub repositories using our multi-agent AI system.
          Detect bugs, security vulnerabilities, performance issues, and style problems automatically.
        </p>

        {/* Queue Stats */}
        {queueStats?.data && (
          <div className="flex justify-center space-x-6 text-sm text-gray-600 mb-8">
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{queueStats.data.waiting} in queue</span>
            </div>
            <div className="flex items-center space-x-1">
              <BarChart3 className="h-4 w-4" />
              <span>{queueStats.data.completed} completed</span>
            </div>
            <div className="flex items-center space-x-1">
              <Zap className="h-4 w-4" />
              <span>{queueStats.data.active} processing</span>
            </div>
          </div>
        )}
      </div>

      {/* Repository Input Form */}
      <div className="max-w-2xl mx-auto">
        <div className="card">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
            Start Code Analysis
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="repo-url" className="block text-sm font-medium text-gray-700 mb-2">
                GitHub Repository URL
              </label>
              <div className="relative">
                <Github className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="repo-url"
                  type="url"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/username/repository"
                  className={`input pl-10 ${!isValidUrl ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}`}
                  required
                />
              </div>
              {!isValidUrl && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Please enter a valid GitHub repository URL
                </p>
              )}
            </div>

            <div>
              <label htmlFor="branch" className="block text-sm font-medium text-gray-700 mb-2">
                Branch (optional)
              </label>
              <input
                id="branch"
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
                className="input"
              />
            </div>

            <button
              type="submit"
              disabled={!repoUrl || !isValidUrl || startReviewMutation.isPending}
              className="btn-primary w-full flex items-center justify-center space-x-2"
            >
              {startReviewMutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Starting Analysis...</span>
                </>
              ) : (
                <>
                  <span>Analyze Repository</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {startReviewMutation.error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">
                {startReviewMutation.error.message || 'Failed to start analysis'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div key={index} className="card text-center">
              <div className="flex justify-center mb-4">
                <Icon className={`h-8 w-8 ${feature.color}`} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-sm">
                {feature.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Recent Repositories */}
      {recentRepos?.data && recentRepos.data.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Recent Analyses</h2>
          <div className="space-y-4">
            {recentRepos.data.map((repo) => (
              <div key={repo.id} className="card hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Github className="h-5 w-5 text-gray-400" />
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {repo.repo_owner}/{repo.repo_name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Branch: {repo.branch} • {new Date(repo.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant={repo.status}>{repo.status}</Badge>
                    {repo.review_jobs && repo.review_jobs.length > 0 && (
                      <button
                        onClick={() => navigate(`/jobs/${repo.review_jobs![0].id}`)}
                        className="btn-secondary text-sm"
                      >
                        View Results
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;