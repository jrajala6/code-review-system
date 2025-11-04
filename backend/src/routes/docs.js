import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  const docs = {
    version: '1.0.0',
    baseUrl: `${req.protocol}://${req.get('host')}`,
    endpoints: {
      health: {
        method: 'GET',
        path: '/health',
        description: 'Health check endpoint',
        response: {
          status: 'ok',
          timestamp: '2025-01-15T10:00:00.000Z',
          uptime: 3600,
          environment: 'development'
        }
      },
      repositories: {
        create: {
          method: 'POST',
          path: '/api/repositories',
          description: 'Create a new repository and start review job',
          body: {
            repo_url: 'https://github.com/facebook/react',
            branch: 'main (optional)'
          },
          response: {
            success: true,
            data: {
              repository: '{ ... }',
              job: '{ ... }'
            }
          }
        },
        list: {
          method: 'GET',
          path: '/api/repositories',
          description: 'List all repositories',
          query: {
            status: 'pending | cloning | analyzing | completed | failed (optional)',
            limit: '50 (optional, default: 50)',
            offset: '0 (optional, default: 0)'
          }
        },
        getOne: {
          method: 'GET',
          path: '/api/repositories/:id',
          description: 'Get a single repository with its jobs'
        },
        update: {
          method: 'PATCH',
          path: '/api/repositories/:id',
          description: 'Update repository status',
          body: {
            status: 'pending | cloning | analyzing | completed | failed'
          }
        },
        delete: {
          method: 'DELETE',
          path: '/api/repositories/:id',
          description: 'Delete repository and all associated data'
        }
      },
      jobs: {
        getOne: {
          method: 'GET',
          path: '/api/jobs/:id',
          description: 'Get job details with repository info'
        },
        getReviews: {
          method: 'GET',
          path: '/api/jobs/:id/reviews',
          description: 'Get all review findings for a job',
          query: {
            severity: 'critical | high | medium | low | info (optional)',
            category: 'security | performance | style | bug (optional)',
            agent: 'agent name (optional)',
            limit: '50 (optional)',
            offset: '0 (optional)'
          }
        },
        getStats: {
          method: 'GET',
          path: '/api/jobs/:id/stats',
          description: 'Get aggregated statistics for a job'
        },
        update: {
          method: 'PATCH',
          path: '/api/jobs/:id',
          description: 'Update job status and progress',
          body: {
            status: 'queued | processing | completed | failed (optional)',
            progress: 'number 0-100 (optional)',
            total_files: 'number (optional)',
            processed_files: 'number (optional)',
            error_message: 'string (optional)'
          }
        }
      }
    }
  };
  
  res.json(docs);
});

export default router;