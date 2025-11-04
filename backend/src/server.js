import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import repositoryRoutes from './routes/repositories.js';
import jobRoutes from './routes/jobs.js';
import docsRoutes from './routes/docs.js';
import queueRoutes from './routes/queue.js';
import { startWorker } from './workers/reviewWorker.js';

const app = express();
const PORT = process.env.PORT || 3000;

// ==============================================
// MIDDLEWARE
// ==============================================

// 1. CORS - Allow frontend to make requests to backend API
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));

// 2. JSON Parser - Parse incoming requests body as JSON
app.use(express.json());

// 3. URL Encoded Parser - Parse incoming requests with URL encoded payloads
app.use(express.urlencoded({ extended: true }));

// 4. Request Logger - Log all incoming requests
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    next();
});

// ==============================================
// ROUTES
// ==============================================

// Health check endpoint 
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
})

// API Routes
app.use('/api/repositories', repositoryRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/docs', docsRoutes);
app.use('/api/queue', queueRoutes);

// 404 handler - Catch all undefined routes
app.use((req, res) => {
    res.status(404).json({
        status: 'NOT_FOUND',
        message: 'Route not found',
        error: "Route not found",
        path: req.path,
        method: req.method
    });
});

// ==============================================
// ERROR HANDLER
// ==============================================

// Global error handler (catches all errors)
app.use((err, req, res, next) => {
    console.error('Error: ', err);

    res.status(err.status || 500).json({
        status: 'ERROR',
        message: err.message || 'Internal Server Error',
        error: err.message || 'Internal Server Error',
        path: req.path,
        method: req.method
    });
});

// ==============================================
// START SERVER
// ==============================================

// Start the worker BEFORE the server starts listening
// This ensures the processor is registered before any jobs can be processed
startWorker();

app.listen(PORT, () => {
    console.log(`
  ╔══════════════════════════════════════════╗
  ║  🚀 Server running on port ${PORT}        ║
  ║  📝 Environment: ${process.env.NODE_ENV || 'development'}            ║
  ║  🌐 URL: http://localhost:${PORT}        ║
  ╚══════════════════════════════════════════╝
    `);
  });