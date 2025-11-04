import express from 'express';
import { supabase } from '../config/supabase.js';
import { 
  isValidJobStatus,
  isValidSeverity,
  validatePagination
} from '../utils/validators.js';
import { 
  successResponse, 
  errorResponse,
  paginatedResponse,
  notFoundResponse
} from '../utils/responses.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// ==============================================
// GET JOB BY ID (with status)
// ==============================================

/**
 * GET /api/jobs/:id
 * Fetches a review job with its repository info
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info(`Fetching job: ${id}`);
    
    // ===========================================
    // FETCH JOB WITH REPOSITORY INFO
    // ===========================================
    
    const { data: job, error } = await supabase
      .from('review_jobs')
      .select(`
        *,
        repositories (
          id,
          repo_url,
          repo_name,
          repo_owner,
          branch
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        logger.warn(`Job not found: ${id}`);
        return res.status(404).json(notFoundResponse('Job', id));
      }
      throw error;
    }
    
    logger.success(`Job found: ${job.status}`);
    
    // ===========================================
    // CALCULATE TIME METRICS
    // ===========================================
    
    const metrics = calculateJobMetrics(job);
    
    res.json(
      successResponse({
        ...job,
        metrics
      })
    );
    
  } catch (error) {
    logger.error('Error fetching job:', error);
    
    res.status(500).json(
      errorResponse(
        'Failed to fetch job',
        process.env.NODE_ENV === 'development' ? error.message : undefined
      )
    );
  }
});

// ==============================================
// GET JOB REVIEWS (with pagination and filters)
// ==============================================

/**
 * GET /api/jobs/:id/reviews
 * Fetches all review findings for a job
 * Query params:
 *   - severity: Filter by severity (critical, high, medium, low, info)
 *   - category: Filter by category (security, performance, style, bug)
 *   - agent: Filter by agent name
 *   - limit: Results per page (default: 50, max: 100)
 *   - offset: Pagination offset (default: 0)
 */
router.get('/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      severity, 
      category,
      agent,
      limit = 50, 
      offset = 0 
    } = req.query;
    
    logger.info(`Fetching reviews for job ${id}`, { 
      severity, 
      category, 
      agent,
      limit,
      offset 
    });
    
    // ===========================================
    // VALIDATE QUERY PARAMETERS
    // ===========================================
    
    // Validate pagination
    const paginationValidation = validatePagination(limit, offset);
    if (!paginationValidation.valid) {
      return res.status(400).json(
        errorResponse('Invalid pagination parameters', {
          errors: paginationValidation.errors
        })
      );
    }
    
    // Validate severity if provided
    if (severity && !isValidSeverity(severity)) {
      return res.status(400).json(
        errorResponse('Invalid severity', {
          validValues: ['critical', 'high', 'medium', 'low', 'info'],
          received: severity
        })
      );
    }
    
    // ===========================================
    // BUILD QUERY WITH FILTERS
    // ===========================================
    
    let query = supabase
      .from('reviews')
      .select(`
        *,
        agents (
          name,
          description
        )
      `, { count: 'exact' })
      .eq('job_id', id)
      .order('severity', { ascending: false })
      .order('created_at', { ascending: false })
      .range(
        paginationValidation.offset, 
        paginationValidation.offset + paginationValidation.limit - 1
      );
    
    // Apply filters
    if (severity) {
      query = query.eq('severity', severity);
      logger.debug(`Filtering by severity: ${severity}`);
    }
    
    if (category) {
      query = query.eq('category', category);
      logger.debug(`Filtering by category: ${category}`);
    }
    
    if (agent) {
      query = query.eq('agents.name', agent);
      logger.debug(`Filtering by agent: ${agent}`);
    }
    
    // ===========================================
    // EXECUTE QUERY
    // ===========================================
    
    const { data: reviews, error, count } = await query;
    
    if (error) {
      throw error;
    }
    
    logger.success(`Found ${reviews.length} reviews (total: ${count})`);
    
    // ===========================================
    // GROUP BY SEVERITY FOR SUMMARY
    // ===========================================
    
    const summary = groupBySeverity(reviews);
    
    const response = paginatedResponse(
      reviews,
      count,
      paginationValidation.limit,
      paginationValidation.offset
    );
    
    // Add summary to response
    response.summary = summary;
    
    res.json(response);
    
  } catch (error) {
    logger.error('Error fetching reviews:', error);
    
    res.status(500).json(
      errorResponse(
        'Failed to fetch reviews',
        process.env.NODE_ENV === 'development' ? error.message : undefined
      )
    );
  }
});

// ==============================================
// UPDATE JOB STATUS (Internal use by workers)
// ==============================================

/**
 * PATCH /api/jobs/:id
 * Updates job status and progress
 * Body: {
 *   status?: string,
 *   progress?: number,
 *   total_files?: number,
 *   processed_files?: number,
 *   error_message?: string
 * }
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    logger.info(`Updating job ${id}`, updates);
    
    // ===========================================
    // VALIDATE UPDATES
    // ===========================================
    
    // Validate status if provided
    if (updates.status && !isValidJobStatus(updates.status)) {
      return res.status(400).json(
        errorResponse('Invalid status', {
          validStatuses: ['queued', 'processing', 'completed', 'failed'],
          received: updates.status
        })
      );
    }
    
    // Validate progress if provided
    if (updates.progress !== undefined) {
      const progress = parseInt(updates.progress, 10);
      if (isNaN(progress) || progress < 0 || progress > 100) {
        return res.status(400).json(
          errorResponse('Progress must be between 0 and 100', {
            received: updates.progress
          })
        );
      }
      updates.progress = progress;
    }
    
    // Validate file counts if provided
    if (updates.total_files !== undefined) {
      const totalFiles = parseInt(updates.total_files, 10);
      if (isNaN(totalFiles) || totalFiles < 0) {
        return res.status(400).json(
          errorResponse('total_files must be a non-negative number', {
            received: updates.total_files
          })
        );
      }
      updates.total_files = totalFiles;
    }
    
    if (updates.processed_files !== undefined) {
      const processedFiles = parseInt(updates.processed_files, 10);
      if (isNaN(processedFiles) || processedFiles < 0) {
        return res.status(400).json(
          errorResponse('processed_files must be a non-negative number', {
            received: updates.processed_files
          })
        );
      }
      updates.processed_files = processedFiles;
    }
    
    // ===========================================
    // ADD TIMESTAMPS BASED ON STATUS
    // ===========================================
    
    if (updates.status === 'processing' && !updates.started_at) {
      updates.started_at = new Date().toISOString();
      logger.debug('Adding started_at timestamp');
    }
    
    if (updates.status === 'completed' && !updates.completed_at) {
      updates.completed_at = new Date().toISOString();
      logger.debug('Adding completed_at timestamp');
    }
    
    if (updates.status === 'failed' && !updates.completed_at) {
      updates.completed_at = new Date().toISOString();
      logger.debug('Adding completed_at timestamp (failed)');
    }
    
    // ===========================================
    // UPDATE JOB
    // ===========================================
    
    const { data: job, error } = await supabase
      .from('review_jobs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        logger.warn(`Job not found: ${id}`);
        return res.status(404).json(notFoundResponse('Job', id));
      }
      throw error;
    }
    
    logger.success(`Job updated: ${job.status} (progress: ${job.progress}%)`);
    
    res.json(
      successResponse(job, 'Job updated successfully')
    );
    
  } catch (error) {
    logger.error('Error updating job:', error);
    
    res.status(500).json(
      errorResponse(
        'Failed to update job',
        process.env.NODE_ENV === 'development' ? error.message : undefined
      )
    );
  }
});

// ==============================================
// GET JOB STATISTICS
// ==============================================

/**
 * GET /api/jobs/:id/stats
 * Returns aggregated statistics for a job
 */
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info(`Fetching stats for job ${id}`);
    
    // ===========================================
    // VERIFY JOB EXISTS
    // ===========================================
    
    const { data: job, error: jobError } = await supabase
      .from('review_jobs')
      .select('id, status')
      .eq('id', id)
      .single();
    
    if (jobError) {
      if (jobError.code === 'PGRST116') {
        logger.warn(`Job not found: ${id}`);
        return res.status(404).json(notFoundResponse('Job', id));
      }
      throw jobError;
    }
    
    // ===========================================
    // FETCH ALL REVIEWS FOR JOB
    // ===========================================
    // First try without join to see if basic query works
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('severity, category, agent_id')
      .eq('job_id', id);
    
    if (error) {
      logger.error('Error fetching reviews for stats:', error);
      throw error;
    }
    
    logger.info(`Found ${reviews?.length || 0} reviews for job ${id}`);
    
    // Debug: Check if reviews exist and their structure
    if (reviews && reviews.length > 0) {
      logger.debug('Sample review data:', JSON.stringify(reviews[0], null, 2));
      logger.debug('Severities found:', [...new Set(reviews.map(r => r.severity))]);
      logger.debug('Categories found:', [...new Set(reviews.map(r => r.category))]);
    } else {
      logger.warn(`No reviews found for job ${id}. Checking if reviews exist for this job...`);
      // Double-check: query without filters
      const { data: allReviews, error: checkError } = await supabase
        .from('reviews')
        .select('id, job_id, severity, category')
        .eq('job_id', id)
        .limit(5);
      if (!checkError && allReviews) {
        logger.info(`Direct query found ${allReviews.length} reviews`);
      }
    }
    
    // ===========================================
    // CALCULATE STATISTICS
    // ===========================================
    
    const bySeverity = countBy(reviews || [], 'severity');
    const byCategory = countBy(reviews || [], 'category');
    
    logger.debug('bySeverity result:', bySeverity);
    logger.debug('byCategory result:', byCategory);
    
    const stats = {
      total: reviews?.length || 0,
      total_issues: reviews?.length || 0, // Add alias for frontend compatibility
      bySeverity: bySeverity,
      byCategory: byCategory,
      byAgent: {}, // Agent stats not available without join
      mostCommon: {
        severity: getMostCommon(reviews || [], 'severity'),
        category: getMostCommon(reviews || [], 'category')
      }
    };
    
    logger.info('Stats calculated:', JSON.stringify(stats, null, 2));
    
    res.json(
      successResponse(stats)
    );
    
  } catch (error) {
    logger.error('Error fetching stats:', error);
    
    res.status(500).json(
      errorResponse(
        'Failed to fetch statistics',
        process.env.NODE_ENV === 'development' ? error.message : undefined
      )
    );
  }
});

// ==============================================
// LIST JOBS (with filters)
// ==============================================

/**
 * GET /api/jobs
 * Lists all jobs with optional filters
 * Query params:
 *   - status: Filter by status
 *   - repo_id: Filter by repository
 *   - limit: Results per page (default: 50)
 *   - offset: Pagination offset (default: 0)
 */
router.get('/', async (req, res) => {
  try {
    const {
      status,
      repo_id,
      limit = 50,
      offset = 0
    } = req.query;
    
    logger.info('Listing jobs with filters:', { status, repo_id, limit, offset });
    
    // ===========================================
    // VALIDATE QUERY PARAMETERS
    // ===========================================
    
    const paginationValidation = validatePagination(limit, offset);
    if (!paginationValidation.valid) {
      return res.status(400).json(
        errorResponse('Invalid pagination parameters', {
          errors: paginationValidation.errors
        })
      );
    }
    
    if (status && !isValidJobStatus(status)) {
      return res.status(400).json(
        errorResponse('Invalid status', {
          validStatuses: ['queued', 'processing', 'completed', 'failed'],
          received: status
        })
      );
    }
    
    // ===========================================
    // BUILD QUERY
    // ===========================================
    
    let query = supabase
      .from('review_jobs')
      .select(`
        *,
        repositories (
          id,
          repo_name,
          repo_owner
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(
        paginationValidation.offset,
        paginationValidation.offset + paginationValidation.limit - 1
      );
    
    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    
    if (repo_id) {
      query = query.eq('repo_id', repo_id);
    }
    
    // ===========================================
    // EXECUTE QUERY
    // ===========================================
    
    const { data: jobs, error, count } = await query;
    
    if (error) {
      throw error;
    }
    
    logger.success(`Found ${jobs.length} jobs (total: ${count})`);
    
    res.json(
      paginatedResponse(
        jobs,
        count,
        paginationValidation.limit,
        paginationValidation.offset
      )
    );
    
  } catch (error) {
    logger.error('Error listing jobs:', error);
    
    res.status(500).json(
      errorResponse(
        'Failed to list jobs',
        process.env.NODE_ENV === 'development' ? error.message : undefined
      )
    );
  }
});

// ==============================================
// DELETE JOB
// ==============================================

/**
 * DELETE /api/jobs/:id
 * Deletes a job and all associated reviews
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info(`Deleting job: ${id}`);
    
    // ===========================================
    // CHECK IF JOB IS PROCESSING
    // ===========================================
    
    const { data: job, error: checkError } = await supabase
      .from('review_jobs')
      .select('status')
      .eq('id', id)
      .single();
    
    if (checkError) {
      if (checkError.code === 'PGRST116') {
        logger.warn(`Job not found: ${id}`);
        return res.status(404).json(notFoundResponse('Job', id));
      }
      throw checkError;
    }
    
    // Prevent deletion of processing jobs
    if (job.status === 'processing') {
      logger.warn(`Cannot delete processing job: ${id}`);
      return res.status(400).json(
        errorResponse('Cannot delete job that is currently processing', {
          status: job.status,
          suggestion: 'Wait for job to complete or fail'
        })
      );
    }
    
    // ===========================================
    // DELETE JOB (CASCADE DELETES REVIEWS)
    // ===========================================
    
    const { error } = await supabase
      .from('review_jobs')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw error;
    }
    
    logger.success(`Job deleted successfully: ${id}`);
    
    res.json(
      successResponse(
        { id },
        'Job and associated reviews deleted successfully'
      )
    );
    
  } catch (error) {
    logger.error('Error deleting job:', error);
    
    res.status(500).json(
      errorResponse(
        'Failed to delete job',
        process.env.NODE_ENV === 'development' ? error.message : undefined
      )
    );
  }
});

// ==============================================
// HELPER FUNCTIONS
// ==============================================

/**
 * Calculate time-based metrics for a job
 */
function calculateJobMetrics(job) {
  const metrics = {
    queueTime: null,
    queueTimeFormatted: null,
    processingTime: null,
    processingTimeFormatted: null,
    totalTime: null,
    totalTimeFormatted: null
  };
  
  if (job.created_at && job.started_at) {
    const queued = new Date(job.created_at);
    const started = new Date(job.started_at);
    const seconds = Math.round((started - queued) / 1000);
    metrics.queueTime = seconds;
    metrics.queueTimeFormatted = formatDuration(seconds);
  }
  
  if (job.started_at && job.completed_at) {
    const started = new Date(job.started_at);
    const completed = new Date(job.completed_at);
    const seconds = Math.round((completed - started) / 1000);
    metrics.processingTime = seconds;
    metrics.processingTimeFormatted = formatDuration(seconds);
  }
  
  if (job.created_at && job.completed_at) {
    const created = new Date(job.created_at);
    const completed = new Date(job.completed_at);
    const seconds = Math.round((completed - created) / 1000);
    metrics.totalTime = seconds;
    metrics.totalTimeFormatted = formatDuration(seconds);
  }
  
  return metrics;
}

/**
 * Format duration in seconds to human-readable string
 */
function formatDuration(seconds) {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}

/**
 * Group reviews by severity
 */
function groupBySeverity(reviews) {
  const summary = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0
  };
  
  reviews.forEach(review => {
    if (summary.hasOwnProperty(review.severity)) {
      summary[review.severity]++;
    }
  });
  
  return summary;
}

/**
 * Count occurrences by field
 */
function countBy(array, field) {
  return array.reduce((acc, item) => {
    const key = item[field] || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

/**
 * Get most common value for a field
 */
function getMostCommon(array, field) {
  if (array.length === 0) return null;
  
  const counts = countBy(array, field);
  const entries = Object.entries(counts);
  
  if (entries.length === 0) return null;
  
  const [value, count] = entries.reduce((max, entry) => 
    entry[1] > max[1] ? entry : max
  );
  
  return { value, count };
}

export default router;