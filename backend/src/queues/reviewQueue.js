import Queue from 'bull';
import {logger} from '../utils/logger.js';

// ==============================================
// CREATE QUEUE
// ==============================================
/**
 * Review Queue
 * Manages code review jobs
 */
export const reviewQueue = new Queue('code-review', {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        // Retry connection if Redis is temporarily down
        retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            logger.info(`Redis connection attempt ${times} failed. Retrying in ${delay}ms...`);
            return delay;
        }
    },
    // Default job options (can be overridden per job)
    defaultJobOptions: {
        attempts: 3, // Rety up to 3 times
        backoff: {
            type: 'exponential', // Wait longer between retries
            delay: 2000         // Start with 2 seconds delay
        },
        removeOnComplete: false, // Keep completed jobs for 7 days
        removeOnFail: false,    // Keep failed jobs for debugging
    }
});

// ==============================================
// QUEUE EVENT LISTENERS
// ==============================================
/**
 * These run when queue events happend
 * Useful for logging, monitoring, debugging
 */

reviewQueue.on('error', (error) => {
    logger.error(`Review queue error: ${error}`);
});

reviewQueue.on('waiting', (jobId) => {
    logger.info(`Review job ${jobId} is waiting in queue`);
});

reviewQueue.on('active', (job) => {
    logger.info(`Review job ${job.id} started processing`);
});

reviewQueue.on('completed', (job, result) => {
    logger.info(`Review job ${job.id} completed with result: ${result}`);
});

reviewQueue.on('failed', (job, error) => {
    logger.error(`Review job ${job.id} failed with error: ${error}`);

    if (job.attemptsMade < job.opts.attempts) {
        logger.info(`Review job ${job.id} will be retried ${job.opts.attempts - job.attemptsMade} more times`);
    } else {
        logger.error(`Review job ${job.id} failed after ${job.attemptsMade} attempts`);
    }
});

reviewQueue.on('stalled', (job) => {
    logger.warn(`Review job ${job.id} has been stalled (worker crashed or took too long)`);
});

reviewQueue.on('progress', (jobs, progress) => {
    logger.info(`Review job ${jobs.id} is ${progress}% complete`);
});

// ==============================================
// QUEUE MANAGEMENT FUNCTIONS
// ==============================================
/**
 * Add a review job to the queue
 */
export const queueReviewJob = async (jobId, repoId, options = {}) => {
    try {
        logger.info(`Queueing review job: ${jobId} for repo: ${repoId}`);

        const job = await reviewQueue.add(
            'code-review',
            {
                jobId,
                repoId,
                queuedAt: new Date().toISOString(),
            },
            {
                jobId: jobId,
                priority: options.priority || 10,
                delay: options.delay || 0,
                ...options
            }
        );

        logger.success('Job queued successfully: ${job.id}');
        return job;
    } catch (error) {
        logger.error('Failed to queue review job: ${error}');
        throw error;
    }
};

/**
 * Get job status from queue
 */
export async function getQueueJobStatus(jobId) {
    try {
        const job = await reviewQueue.getJob(jobId);

        if (!job) {
            return null;
        }

        const state = await job.getState();
        const progress = await job.progress();
        const failedReason = await job.failedReason;
        const attemptsMade = await job.attemptsMade;

        return {
            id: jobId,
            state,
            progress,
            fdata: job.data,
            attemptsMade,
            failedReason,
            processedOn: job.processedOn,
            finishedOn: job.finishedOn,
            timestamp: job.timestamp
        };
    } catch (error) {
        logger.error('Failed to get job status: ${error}');
        return null;
    }
}

/**
 * Remove a job from queue
 */
export async function removeQueueJob(jobId) {
    try {
        const job = await reviewQueue.getJob(jobId);
        if (job) {
            await job.remove();
            logger.info('Job ${jobId} removed from queue');
            return true;
        } else {
            logger.info('Job ${jobId} not found in queue');
            return false;
        }
    } catch (error) {
        logger.error('Failed to remove job: ${error}');
        throw error;
    }
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
    try {
        const [
            waiting,
            active,
            completed,
            failed,
            delayed
        ] = await Promise.all([
            reviewQueue.getWaitingCount(),
            reviewQueue.getActiveCount(),
            reviewQueue.getCompletedCount(),
            reviewQueue.getFailedCount(),
            reviewQueue.getDelayedCount()
        ]);

        return {
            waiting,
            active,
            completed,
            failed,
            delayed,
            total: waiting + active + completed + failed + delayed
        };

    } catch (error) {
        logger.error('Failed to get queue stats: ${error}');
        return null;
    }
}

/**
 * Clean old jobs from queue
 * Call this periodically (e.g., daily cron job)
 */
export async function cleanQueue() {
    try {
        logger.info('Cleaning queue...');

        const completedRemove = await reviewQueue.clean(
            7 * 24 * 60 * 60 * 1000, // Keep completed jobs for 7 days
            'completed'
        );

        const failedRemove = await reviewQueue.clean(
            30 * 24 * 60 * 60 * 1000, // Keep failed jobs for 30 days
            'failed'
        );

        logger.success('Queue cleaned: ${completedRemove} completed jobs, ${failedRemove} failed jobs');
        return {
            completedRemoved: completedRemove,
            failedRemoved: failedRemove
        };
    } catch (error) {
        logger.error('Failed to clean queue: ${error}');
        throw error;
    }
}

/**
 * Pause queue (stop processing new jobs)
 * Useful for maintenance
 */
export async function pauseQueue() {
    await reviewQueue.pause();
    logger.info('Queue paused');
}

/**
 * Resume queue (start processing new jobs)
 */
export async function resumeQueue() {
    await reviewQueue.resume();
}

/**
 * Gracefull shutdown
 * Call this whenever server stops
 */
export async function shutdownQueue() {
    logger.info('Shutting down queue...');
    await reviewQueue.close();
    logger.success('Queue shut down successfully');
}

// ==============================================
// EXPORT QUEUE INSTANCE
// ==============================================
export default reviewQueue;