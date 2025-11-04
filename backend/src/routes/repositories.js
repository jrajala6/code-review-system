import express from 'express';
import { supabase } from '../config/supabase.js';
import { 
  isValidGitHubUrl, 
  parseGitHubUrl 
} from '../utils/validators.js';
import { 
  successResponse, 
  errorResponse 
} from '../utils/responses.js';
import { logger } from '../utils/logger.js';
import { queueReviewJob } from '../queues/reviewQueue.js';

const router = express.Router();

// ==============================================
// CREATE REPOSITORY 
// ==============================================

router.post('/', async (req, res) => {
  try {
    const { repo_url, branch = 'main' } = req.body;
    
    // Validate
    if (!repo_url) {
      return res.status(400).json(
        errorResponse('repo_url is required', {
          example: { repo_url: 'https://github.com/facebook/react' }
        })
      );
    }
    
    if (!isValidGitHubUrl(repo_url)) {
      return res.status(400).json(
        errorResponse('Invalid GitHub URL format', {
          example: 'https://github.com/owner/repository',
          received: repo_url
        })
      );
    }
    
    // Parse URL
    const repoInfo = parseGitHubUrl(repo_url);
    if (!repoInfo) {
      return res.status(400).json(
        errorResponse('Failed to parse GitHub URL')
      );
    }
    
    logger.info(`Creating repository: ${repoInfo.owner}/${repoInfo.repo}`);
    
    // Insert repository
    const { data: repository, error: repoError } = await supabase
      .from('repositories')
      .insert({
        repo_url: repoInfo.url,
        repo_name: repoInfo.repo,
        repo_owner: repoInfo.owner,
        branch,
        status: 'pending'
      })
      .select()
      .single();
    
    if (repoError) {
      logger.error('Database error (repository):', repoError);
      throw repoError;
    }
    
    logger.success(`Repository created: ${repository.id}`);
    
    // Create review job
    const { data: job, error: jobError } = await supabase
      .from('review_jobs')
      .insert({
        repo_id: repository.id,
        status: 'queued',
        progress: 0
      })
      .select()
      .single();
    
    if (jobError) {
      logger.error('Database error (job):', jobError);
      
      // Cleanup
      await supabase
        .from('repositories')
        .delete()
        .eq('id', repository.id);
      
      throw jobError;
    }
    
    logger.success(`Review job created: ${job.id}`);
    
    // Add job to Bull queue for processing
    try {
      await queueReviewJob(job.id, repository.id);
      logger.success(`Job ${job.id} added to queue`);
    } catch (queueError) {
      // Log error but don't fail the request - job is already in database
      logger.error(`Failed to add job ${job.id} to queue:`, queueError);
      // Note: Job will remain in database with status 'queued' but won't be processed
      // This can be manually retried later or handled by a cleanup job
    }
    
    // Return response
    res.status(201).json(
      successResponse(
        {
          repository: {
            id: repository.id,
            repo_url: repository.repo_url,
            repo_name: repository.repo_name,
            repo_owner: repository.repo_owner,
            branch: repository.branch,
            status: repository.status,
            created_at: repository.created_at
          },
          job: {
            id: job.id,
            status: job.status,
            progress: job.progress,
            created_at: job.created_at
          }
        },
        'Repository created and review job queued'
      )
    );
    
  } catch (error) {
    logger.error('Error creating repository:', error);
    
    res.status(500).json(
      errorResponse(
        'Failed to create repository',
        process.env.NODE_ENV === 'development' ? error.message : undefined
      )
    );
  }
});

// ==============================================
// GET REPOSITORY BY ID
// ==============================================

/**
 * GET /api/repositories/:id
 * Retrieves a repository by its ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log('Getting repository:', id);

    // ==============================================
    // FETCH REPOSITORY WITH RELATED JOBS
    // ==============================================
    
    const { data: repository, error: repoError } = await supabase
        .from('repositories')
        .select('*, review_jobs(id, status, progress, total_files, processed_files, error_message, started_at, completed_at, created_at)')
        .eq('id', id)
        .single();
    
    if (repoError) {
        if (repoError.code === 'PGRST116') {
            return res.status(404).json({ error: 'Repository not found' });
        }
        throw repoError;
    }

    console.log('Repository found:', repository.repo_name);

    res.status(200).json({
        success: true,
        message: 'Repository found',
        data: repository
    });
  } catch (error) {
    console.error('Error fetching repository:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch repository',
      error: error.message
    });
  }
});

// ==============================================
// List USER'S REPOSITORIES
// ==============================================

/**
 * GET /api/repositories
 * Retrieves all repositories
 * 
 * Query Params:
 * - status: string (optional) - Status of the repositories to fetch
 * - limit: number (optional) - Number of repositories to fetch
 * - offset: number (optional) - Offset for pagination
 */
router.get('/', async (req, res) => {
  try {
    const { status, limit=50, offset=0 } = req.query;

    console.log('Listing repositories with filters:', { status, limit, offset });

    // ==============================================
    // BUILD QUERY
    // ==============================================
    let query = supabase
        .from('repositories')
        .select('*', {count: 'exact'})
        .order('created_at', { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);
    
    // Add status filter if provided
    if (status) {
        query = query.eq('status', status);
    }

    // Execute query
    const { data: repositories, error: repoError, count } = await query;
    
    if (repoError) {
        console.error('Error fetching repositories:', repoError);
        throw repoError;
    }
    
    console.log('Repositories fetched:', repositories.length);

    res.status(200).json({
        success: true,
        message: 'Repositories fetched',
        data: repositories,
        total: count
    });
  } catch (error) {
    console.error('Error listing repositories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list repositories',
      error: error.message
    });
  }
});


// ==============================================
// UPDATE REPOSITORY STATUS
// ==============================================

/**
 * PATCH /api/repositories/:id
 * Updates the status of a repository by its ID
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'cloning', 'analyzing', 'completed', 'failed'];

    if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status', validStatuses });
    }

    console.log('Updating repository status:', id, status);

    const { data: repository, error: repoError } = await supabase
        .from('repositories')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
    
    if (repoError) {
        if (repoError.code === 'PGRST116') {
            return res.status(404).json({ error: 'Repository not found', id });
        }
        console.error('Error updating repository status:', repoError);
        throw repoError;
    }
    
    console.log('Repository status updated:', repository.id);

    res.status(200).json({
        success: true,
        message: 'Repository status updated',
        data: repository
    });
  } catch (error) {
    console.error('Error updating repository status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update repository status',
      error: error.message
    });
  }
});

// ==============================================
// DELETE REPOSITORY
// ==============================================

/**
 * DELETE /api/repositories/:id
 * Deletes a repository by its ID
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log('Deleting repository:', id);

    // ==============================================
    // DELETE REPOSITORY
    // ==============================================
    const { error: repoError } = await supabase
        .from('repositories')
        .delete()
        .eq('id', id);
    
    if (repoError) {
        throw repoError;
    }
    
    console.log('Repository deleted:', id);

    res.status(200).json({
        success: true,
        message: 'Repository deleted',
        data: { id }
    });
  } catch (error) {
    console.error('Error deleting repository:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete repository',
      error: error.message
    });
  } 
});

export default router;