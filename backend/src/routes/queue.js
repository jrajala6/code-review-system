import express from 'express';
import { getQueueStats } from '../queues/reviewQueue.js';
import { successResponse, errorResponse } from '../utils/responses.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// ==============================================
// GET QUEUE STATISTICS
// ==============================================

router.get('/stats', async (req, res) => {
  try {
    const stats = await getQueueStats();
    
    if (!stats) {
      return res.status(500).json(
        errorResponse('Failed to fetch queue statistics')
      );
    }
    
    res.json(successResponse(stats));
  } catch (error) {
    logger.error('Error fetching queue stats:', error);
    res.status(500).json(
    errorResponse('Failed to fetch queue statistics', error.message)
    );
  }
});

export default router;