# Code Review System - Complete Architecture Guide

**For Complete Beginners: Understanding Every Component**

This document provides a thorough breakdown of the multi-agent code review system's architecture, technologies, and deployment strategies. After reading this, you'll understand the entire system well enough to work on it independently.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Core Architecture Patterns](#core-architecture-patterns)
5. [Component Deep Dive](#component-deep-dive)
6. [Data Flow](#data-flow)
7. [Database Design](#database-design)
8. [Multi-Agent System](#multi-agent-system)
9. [Queue System](#queue-system)
10. [Deployment Strategies](#deployment-strategies)
11. [Development Environment Setup](#development-environment-setup)
12. [Scaling Considerations](#scaling-considerations)
13. [Security Considerations](#security-considerations)
14. [Troubleshooting Guide](#troubleshooting-guide)

---

## System Overview

### What This System Does
This is a **multi-agent code review system** that:
- Takes GitHub repository URLs from users
- Clones the repository locally
- Analyzes the code using multiple AI agents (Bug Detection, Security, Performance, Style)
- Provides comprehensive code review reports
- Manages everything through a queue system for scalability

### High-Level Architecture
```
[Frontend] → [Express API] → [Queue System] → [Worker Processes] → [AI Agents] → [Database]
                ↓
         [Supabase Database]
```

---

## Technology Stack

### Backend Core Technologies

#### **Node.js** (Runtime Environment)
- **What it is**: JavaScript runtime that lets you run JavaScript on the server
- **Why we use it**: Fast, event-driven, great for I/O operations
- **In our system**: Runs the entire backend server

#### **Express.js** (Web Framework)
- **What it is**: Minimal web framework for Node.js
- **Why we use it**: Simple to set up REST APIs, middleware support
- **In our system**: Handles HTTP requests, routing, middleware

#### **ES Modules** (Module System)
- **What it is**: Modern JavaScript module system using `import/export`
- **Why we use it**: Cleaner syntax, better tree-shaking, future-proof
- **In our system**: All files use `import` instead of `require()`

### Database & Storage

#### **Supabase** (Backend-as-a-Service)
- **What it is**: Firebase alternative built on PostgreSQL
- **Why we use it**: Real-time database, built-in auth, easy to use
- **In our system**: Stores repositories, jobs, and review results
- **Key tables**: `repositories`, `review_jobs`, `review_results`

### Queue & Background Processing

#### **Bull Queue** (Job Queue)
- **What it is**: Redis-based queue for Node.js
- **Why we use it**: Reliable job processing, retry logic, monitoring
- **In our system**: Manages code review jobs asynchronously

#### **Redis** (In-Memory Database)
- **What it is**: Fast in-memory data structure store
- **Why we use it**: Required by Bull Queue for job storage
- **In our system**: Stores queue data, job states

### AI & Code Analysis

#### **OpenAI API** (Language Model)
- **What it is**: Access to GPT models for code analysis
- **Why we use it**: Advanced code understanding and analysis
- **In our system**: Powers all AI agents for code review

### Git & Version Control

#### **simple-git** (Git Operations)
- **What it is**: Node.js library for Git operations
- **Why we use it**: Clone repositories programmatically
- **In our system**: Clones GitHub repos for analysis

#### **@octokit/rest** (GitHub API)
- **What it is**: Official GitHub API client
- **Why we use it**: Validate repositories, fetch metadata
- **In our system**: Checks if repos exist and are accessible

---

## Project Structure

```
code-review-system/
├── backend/                          # Backend application
│   ├── src/                         # Source code
│   │   ├── agents/                  # AI agents for code analysis
│   │   │   ├── BaseAgent.js         # Abstract base class for all agents
│   │   │   ├── AgentOrchestrator.js # Coordinates multiple agents
│   │   │   ├── BugDetectionAgent.js # Finds potential bugs
│   │   │   ├── SecurityAgent.js     # Security vulnerability scanning
│   │   │   ├── PerformanceAgent.js  # Performance issue detection
│   │   │   └── StyleAgent.js        # Code style and formatting
│   │   ├── config/                  # Configuration files
│   │   │   └── supabase.js         # Database connection setup
│   │   ├── queues/                  # Queue management
│   │   │   └── reviewQueue.js       # Bull queue configuration
│   │   ├── routes/                  # API endpoints
│   │   │   ├── repositories.js      # Repository CRUD operations
│   │   │   ├── jobs.js             # Job status and management
│   │   │   ├── queue.js            # Queue monitoring
│   │   │   └── docs.js             # API documentation
│   │   ├── services/                # Business logic
│   │   │   └── githubService.js     # GitHub operations
│   │   ├── utils/                   # Utility functions
│   │   │   ├── logger.js           # Logging utility
│   │   │   ├── validators.js       # Input validation
│   │   │   └── responses.js        # Standardized API responses
│   │   ├── workers/                 # Background job processors
│   │   │   └── reviewWorker.js      # Processes review jobs
│   │   └── server.js               # Main application entry point
│   ├── package.json                # Dependencies and scripts
│   └── .env                        # Environment variables
├── node_modules/                   # Root dependencies
├── package.json                    # Root package file
└── README.md                       # Project documentation
```

---

## Core Architecture Patterns

### 1. **Multi-Agent Pattern**
Multiple specialized AI agents work together:
- **Separation of Concerns**: Each agent has one responsibility
- **Parallel Processing**: Agents run simultaneously for speed
- **Aggregated Results**: Orchestrator combines all findings

### 2. **Queue-Based Processing**
Asynchronous job processing:
- **Decoupling**: API and processing are separate
- **Scalability**: Can add more workers as needed
- **Reliability**: Jobs are retried on failure

### 3. **RESTful API Design**
Standard HTTP methods and status codes:
- **GET**: Retrieve data
- **POST**: Create new resources
- **PATCH**: Update existing resources
- **DELETE**: Remove resources

### 4. **Layered Architecture**
```
Routes (API Layer)
    ↓
Services (Business Logic)
    ↓
Utilities (Helper Functions)
    ↓
Database (Data Layer)
```

---

## Component Deep Dive

### Server.js (Main Entry Point)
**Location**: `backend/src/server.js`

**Purpose**: Application bootstrap and configuration

**Key Features**:
- **Middleware Setup**: CORS, JSON parsing, logging
- **Route Registration**: API endpoints
- **Error Handling**: Global error catching
- **Health Check**: `/health` endpoint

**Code Structure**:
```javascript
// Middleware chain
app.use(cors())           // Enable cross-origin requests
app.use(express.json())   // Parse JSON bodies
app.use(logger)           // Log all requests

// Routes
app.use('/api/repositories', repositoryRoutes)
app.use('/api/jobs', jobRoutes)
app.use('/api/queue', queueRoutes)

// Error handling
app.use(errorHandler)     // Catch all errors
```

### Supabase Configuration
**Location**: `backend/src/config/supabase.js`

**Purpose**: Database connection setup

**Key Features**:
- **Environment Validation**: Ensures required vars exist
- **Client Creation**: Initializes Supabase client
- **Connection Testing**: Verifies database connectivity

**Configuration Options**:
```javascript
{
  auth: {
    autoRefreshToken: false,  // Server doesn't need token refresh
    persistSession: false     // Server doesn't persist sessions
  }
}
```

### Repository Routes
**Location**: `backend/src/routes/repositories.js`

**Purpose**: Handle repository-related API requests

**Endpoints**:
- `POST /api/repositories` - Add new repository for review
- `GET /api/repositories` - List all repositories (with pagination)
- `GET /api/repositories/:id` - Get specific repository details
- `PATCH /api/repositories/:id` - Update repository status
- `DELETE /api/repositories/:id` - Remove repository

**Request Flow for Creating Repository**:
1. Validate GitHub URL format
2. Parse owner/repo from URL
3. Insert repository record
4. Create associated review job
5. Return both repository and job data

### Queue System
**Location**: `backend/src/queues/reviewQueue.js`

**Purpose**: Manage background job processing

**Queue Configuration**:
```javascript
const reviewQueue = new Queue('code-review', {
  redis: {
    host: 'localhost',
    port: 6379,
    retryStrategy: (times) => Math.min(times * 50, 2000)
  },
  defaultJobOptions: {
    attempts: 3,              // Retry failed jobs 3 times
    backoff: 'exponential',   // Wait longer between retries
    removeOnComplete: false,  // Keep completed jobs for history
    removeOnFail: false      // Keep failed jobs for debugging
  }
})
```

**Queue Events**:
- `waiting` - Job added to queue
- `active` - Job started processing
- `completed` - Job finished successfully
- `failed` - Job failed with error
- `stalled` - Job took too long (worker crashed)

### Review Worker
**Location**: `backend/src/workers/reviewWorker.js`

**Purpose**: Process review jobs step by step

**Job Processing Steps**:
1. **Fetch Repository**: Get repo details from database
2. **Update Status**: Mark job as "processing"
3. **Clone Repository**: Download code to temporary directory
4. **Parse Files**: Find all code files to analyze
5. **Analyze Code**: Run AI agents on each file
6. **Aggregate Results**: Combine all findings
7. **Save Results**: Store in database
8. **Cleanup**: Remove temporary files

**Error Handling**:
- Database update failures
- Git clone failures
- AI API failures
- Cleanup failures (always runs in `finally` block)

### Multi-Agent System
**Location**: `backend/src/agents/`

#### BaseAgent (Abstract Class)
**Purpose**: Common functionality for all agents

**Key Methods**:
- `analyze(code, language)` - Main analysis method
- `buildUserPrompt(code, language)` - Create AI prompt
- OpenAI API call with error handling

#### AgentOrchestrator
**Purpose**: Coordinate multiple agents

**Process**:
1. Initialize all agents
2. Run agents in parallel using `Promise.all()`
3. Aggregate results from all agents
4. Calculate overall score and metrics
5. Return comprehensive analysis

#### Specialized Agents
Each agent has a specific focus:

**BugDetectionAgent**:
- Looks for potential bugs
- Logic errors
- Null pointer issues
- Array bounds problems

**SecurityAgent**:
- SQL injection vulnerabilities
- XSS vulnerabilities
- Authentication issues
- Data exposure risks

**PerformanceAgent**:
- Inefficient algorithms
- Memory leaks
- Database query optimization
- Caching opportunities

**StyleAgent**:
- Code formatting
- Naming conventions
- Documentation quality
- Best practices

### GitHub Service
**Location**: `backend/src/services/githubService.js`

**Purpose**: Handle all GitHub-related operations

**Key Functions**:

**cloneRepository()**:
- Creates temporary directory
- Uses shallow clone (--depth 1) for speed
- Returns cleanup function
- Handles clone failures

**parseCodeFiles()**:
- Recursively scans directory
- Filters by supported file extensions
- Ignores common build/dependency directories
- Skips large files (>100KB)
- Returns parsed file objects

**Supported Languages**:
- JavaScript/TypeScript (.js, .jsx, .ts, .tsx)
- Python (.py)
- Java (.java)
- C/C++ (.c, .cpp, .h, .hpp)
- Go (.go)
- Ruby (.rb)
- PHP (.php)
- Rust (.rs)
- And more...

---

## Data Flow

### Complete Request Flow

```
1. User submits GitHub URL
   ↓
2. Express server receives POST /api/repositories
   ↓
3. Repository route validates URL
   ↓
4. Repository inserted into database
   ↓
5. Review job created and queued
   ↓
6. API returns repository + job data
   ↓
7. Worker picks up job from queue
   ↓
8. Worker clones repository
   ↓
9. Worker parses code files
   ↓
10. Worker runs AI agents on each file
    ↓
11. Worker aggregates results
    ↓
12. Results saved to database
    ↓
13. Job marked as completed
    ↓
14. Frontend can poll for results
```

### Data Transformations

**GitHub URL → Repository Object**:
```javascript
// Input
"https://github.com/facebook/react"

// Processed to
{
  repo_url: "https://github.com/facebook/react",
  repo_owner: "facebook",
  repo_name: "react",
  branch: "main",
  status: "pending"
}
```

**Code File → Analysis Result**:
```javascript
// Input: Raw code file
const content = "function add(a, b) { return a + b; }"

// Processed to
{
  path: "src/utils.js",
  language: "JavaScript",
  results: {
    overallScore: 85,
    totalIssuesFound: 2,
    issuesBySeverity: { high: 0, medium: 1, low: 1 },
    agentResults: [...],
    allIssues: [...]
  }
}
```

---

## Database Design

### Tables Overview

#### repositories
```sql
CREATE TABLE repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_url TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  repo_owner TEXT NOT NULL,
  branch TEXT DEFAULT 'main',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Status Values**: `pending`, `cloning`, `analyzing`, `completed`, `failed`

#### review_jobs
```sql
CREATE TABLE review_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'queued',
  progress INTEGER DEFAULT 0,
  total_files INTEGER,
  processed_files INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Status Values**: `queued`, `processing`, `completed`, `failed`

#### review_results
```sql
CREATE TABLE review_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES review_jobs(id) ON DELETE CASCADE,
  repo_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
  results JSONB NOT NULL,
  overall_score INTEGER,
  total_issues INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Relationships
- One repository can have multiple review jobs
- Each review job has one result
- Results are stored as JSON for flexibility

---

## Queue System Deep Dive

### Why Use a Queue?
1. **Asynchronous Processing**: Don't make users wait for long-running tasks
2. **Scalability**: Can process multiple jobs simultaneously
3. **Reliability**: Jobs are persisted and can be retried
4. **Monitoring**: Track job progress and failures

### Job Lifecycle
```
QUEUED → PROCESSING → COMPLETED
   ↓           ↓
DELAYED     FAILED
   ↓           ↓
QUEUED    RETRYING → COMPLETED/FAILED
```

### Queue Management Functions

**queueReviewJob()**: Add new job
**getQueueJobStatus()**: Check job progress
**removeQueueJob()**: Cancel job
**getQueueStats()**: Monitor queue health
**cleanQueue()**: Remove old completed/failed jobs
**pauseQueue()**: Stop processing (maintenance)
**resumeQueue()**: Start processing again

### Monitoring
The queue emits events for:
- Job progress updates
- Error tracking
- Performance monitoring
- Worker health checks

---

## Deployment Strategies

### Current Deployment (Development)
```
Local Development Environment:
- Node.js application running on localhost:3000
- Supabase cloud database
- Redis running locally
- Environment variables in .env file
```

### Production Deployment Options

#### Option 1: Traditional VPS/Cloud Server
```
Cloud Provider (AWS/DigitalOcean/Linode):
├── Application Server (PM2 or similar)
├── Redis Server (for queue)
├── Nginx (reverse proxy)
└── SSL Certificate (Let's Encrypt)
```

**Setup Steps**:
1. **Server Setup**: Ubuntu/CentOS server with Node.js
2. **Process Manager**: PM2 for application lifecycle
3. **Reverse Proxy**: Nginx for load balancing
4. **Database**: Keep Supabase or migrate to self-hosted PostgreSQL
5. **Queue**: Redis server (can be managed service)
6. **SSL**: Let's Encrypt for HTTPS

**PM2 Configuration** (`ecosystem.config.js`):
```javascript
module.exports = {
  apps: [{
    name: 'code-review-api',
    script: 'src/server.js',
    instances: 'max',  // Use all CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }, {
    name: 'code-review-worker',
    script: 'src/workers/reviewWorker.js',
    instances: 2,  // 2 worker processes
    exec_mode: 'fork'
  }]
}
```

#### Option 2: Docker Containerization
```
Docker Setup:
├── Dockerfile (application)
├── docker-compose.yml (orchestration)
├── Redis container
└── Nginx container
```

**Dockerfile**:
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/
EXPOSE 3000

CMD ["node", "src/server.js"]
```

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - REDIS_HOST=redis
    depends_on:
      - redis

  worker:
    build: .
    command: node src/workers/reviewWorker.js
    environment:
      - REDIS_HOST=redis
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - api
```

#### Option 3: Platform-as-a-Service (PaaS)
```
Heroku/Railway/Vercel:
├── Application dyno/instance
├── Redis add-on
├── Worker dyno/instance
└── Environment variables
```

**Heroku Procfile**:
```
web: node src/server.js
worker: node src/workers/reviewWorker.js
```

#### Option 4: Serverless (Advanced)
```
AWS Lambda/Vercel Functions:
├── API routes as separate functions
├── SQS for job queue
├── Lambda workers for processing
└── S3 for temporary file storage
```

### Environment Variables for Production
```bash
# Database
SUPABASE_URL=your_production_url
SUPABASE_SERVICE_ROLE_KEY=your_production_key

# Server
NODE_ENV=production
PORT=3000

# Queue
REDIS_HOST=your_redis_host
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# External APIs
GITHUB_TOKEN=your_github_token
OPENAI_API_KEY=your_openai_key

# Security
FRONTEND_URL=https://yourdomain.com
```

### SSL/HTTPS Setup
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Development Environment Setup

### Prerequisites
1. **Node.js** (v18+): `node --version`
2. **npm** (comes with Node.js): `npm --version`
3. **Git**: `git --version`
4. **Redis** (local or cloud): Redis server running
5. **Code Editor**: VS Code recommended

### Step-by-Step Setup

#### 1. Clone and Install
```bash
# Clone repository
git clone https://github.com/yourusername/code-review-system
cd code-review-system

# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install
```

#### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your values
nano .env
```

#### 3. Database Setup (Supabase)
1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Copy URL and service role key to `.env`
4. Create tables using SQL editor

#### 4. Redis Setup
**Option A: Local Redis**
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu
sudo apt install redis-server
sudo systemctl start redis
```

**Option B: Cloud Redis**
- Use Redis Labs, AWS ElastiCache, or similar
- Update `REDIS_HOST` in `.env`

#### 5. External API Keys
```bash
# GitHub Token (optional, for private repos)
# Create at: https://github.com/settings/tokens

# OpenAI API Key (required)
# Create at: https://platform.openai.com/api-keys
```

#### 6. Run the Application
```bash
# Development server (auto-restart)
npm run dev

# Worker process (separate terminal)
node src/workers/reviewWorker.js
```

### Development Workflow

#### Testing the API
```bash
# Health check
curl http://localhost:3000/health

# Create repository
curl -X POST http://localhost:3000/api/repositories \
  -H "Content-Type: application/json" \
  -d '{"repo_url": "https://github.com/facebook/react"}'

# Check job status
curl http://localhost:3000/api/jobs/{job_id}
```

#### Debugging
```bash
# Enable debug logging
NODE_ENV=development npm run dev

# View logs with colors
npm install --global pino-pretty
npm run dev | pino-pretty
```

#### Database Management
```bash
# Supabase local development
npx supabase init
npx supabase start
npx supabase db reset
```

---

## Scaling Considerations

### Performance Bottlenecks

#### 1. **AI API Rate Limits**
**Problem**: OpenAI has rate limits per minute
**Solutions**:
- Implement request queuing
- Use multiple API keys
- Add retry logic with exponential backoff
- Cache common analysis results

#### 2. **File Processing Speed**
**Problem**: Large repositories take long to analyze
**Solutions**:
- Parallel file processing
- Skip binary/generated files
- File size limits
- Intelligent file sampling

#### 3. **Memory Usage**
**Problem**: Large codebases consume lots of memory
**Solutions**:
- Stream file processing
- Cleanup temporary files immediately
- Use worker processes
- Implement memory monitoring

### Horizontal Scaling

#### Multiple Workers
```javascript
// Scale workers based on load
const numWorkers = process.env.WORKER_COUNT || require('os').cpus().length;

for (let i = 0; i < numWorkers; i++) {
  const worker = cluster.fork();
  worker.on('exit', () => {
    console.log('Worker died, restarting...');
    cluster.fork();
  });
}
```

#### Load Balancing
```nginx
upstream backend {
    server localhost:3000;
    server localhost:3001;
    server localhost:3002;
}

server {
    location / {
        proxy_pass http://backend;
    }
}
```

#### Database Scaling
```javascript
// Read replicas for heavy queries
const readDB = createClient(READ_REPLICA_URL);
const writeDB = createClient(MASTER_DB_URL);

// Use read replica for job status checks
const jobs = await readDB.from('review_jobs').select('*');

// Use master for updates
await writeDB.from('review_jobs').update({status: 'completed'});
```

### Monitoring and Observability

#### Application Metrics
```javascript
// Custom metrics endpoint
app.get('/metrics', async (req, res) => {
  const queueStats = await getQueueStats();
  const dbStats = await getDatabaseStats();

  res.json({
    queue: queueStats,
    database: dbStats,
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
});
```

#### Health Checks
```javascript
app.get('/health', async (req, res) => {
  const checks = await Promise.allSettled([
    checkDatabase(),
    checkRedis(),
    checkOpenAI(),
    checkDiskSpace()
  ]);

  const failed = checks.filter(c => c.status === 'rejected');

  res.status(failed.length > 0 ? 503 : 200).json({
    status: failed.length > 0 ? 'degraded' : 'healthy',
    checks: checks
  });
});
```

#### Error Tracking
```javascript
// Integration with error tracking services
import Sentry from '@sentry/node';

Sentry.init({ dsn: process.env.SENTRY_DSN });

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

---

## Security Considerations

### Input Validation

#### URL Validation
```javascript
function isValidGitHubUrl(url) {
  const pattern = /^https:\/\/github\.com\/[\w\.-]+\/[\w\.-]+$/;
  return pattern.test(url);
}

function sanitizeInput(input) {
  return input.trim().toLowerCase();
}
```

#### Rate Limiting
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);
```

### Environment Security

#### Secrets Management
```bash
# Never commit these files
.env
.env.local
.env.production

# Use secrets management in production
# AWS Secrets Manager, HashiCorp Vault, etc.
```

#### Database Security
```javascript
// Use environment variables, never hardcode
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Enable Row Level Security (RLS) in Supabase
-- CREATE POLICY "Users can only see their own repos"
-- ON repositories FOR SELECT
-- USING (auth.uid() = user_id);
```

### API Security

#### CORS Configuration
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

#### Input Sanitization
```javascript
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';

app.use(helmet()); // Set security headers
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(express.json({ limit: '10mb' })); // Limit payload size
```

### Code Analysis Security

#### Sandboxing
```javascript
// Run git clone in isolated directory
const tempDir = path.join(os.tmpdir(), 'sandbox', randomId());
await fs.ensureDir(tempDir);

// Cleanup after analysis
process.on('exit', () => {
  fs.removeSync(tempDir);
});
```

#### API Key Protection
```javascript
// Never log API keys
function sanitizeLogData(data) {
  const sanitized = { ...data };
  if (sanitized.apiKey) sanitized.apiKey = '***';
  if (sanitized.token) sanitized.token = '***';
  return sanitized;
}
```

---

## Troubleshooting Guide

### Common Issues and Solutions

#### Database Connection Issues
**Problem**: `Database connection failed`
**Solutions**:
1. Check environment variables are set correctly
2. Verify Supabase project is active
3. Check internet connectivity
4. Verify API key permissions

```bash
# Test database connection manually
curl -H "apikey: YOUR_KEY" \
     -H "Authorization: Bearer YOUR_KEY" \
     "https://your-project.supabase.co/rest/v1/repositories"
```

#### Redis Connection Issues
**Problem**: `Redis connection failed`
**Solutions**:
1. Check Redis server is running: `redis-cli ping`
2. Verify host/port in environment variables
3. Check firewall settings
4. Ensure Redis password is correct

```bash
# Test Redis connection
redis-cli -h localhost -p 6379 ping
# Should return PONG
```

#### Queue Not Processing Jobs
**Problem**: Jobs stuck in queue
**Solutions**:
1. Check worker process is running
2. Verify Redis connection from worker
3. Check for worker crashes in logs
4. Restart worker process

```bash
# Check queue status
curl http://localhost:3000/api/queue/stats

# Manual worker restart
pkill -f reviewWorker
node src/workers/reviewWorker.js
```

#### AI Analysis Failures
**Problem**: `OpenAI API error`
**Solutions**:
1. Check API key is valid and has credits
2. Verify request format and size limits
3. Implement retry logic for rate limits
4. Check network connectivity

```bash
# Test OpenAI API directly
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### Git Clone Failures
**Problem**: `Repository clone failed`
**Solutions**:
1. Verify repository URL is correct and accessible
2. Check network connectivity
3. Ensure temp directory has write permissions
4. Verify Git is installed on system

```bash
# Test git clone manually
git clone --depth 1 https://github.com/facebook/react /tmp/test-clone
```

#### Memory Issues
**Problem**: `Out of memory` errors
**Solutions**:
1. Increase Node.js memory limit: `--max-old-space-size=4096`
2. Skip large files during analysis
3. Process files in smaller batches
4. Implement streaming for large repositories

```bash
# Run with more memory
node --max-old-space-size=4096 src/server.js
```

### Debugging Tools

#### Application Logs
```javascript
// Add detailed logging
logger.debug('Processing file:', {
  path: file.path,
  size: file.size,
  language: file.language
});
```

#### Performance Monitoring
```javascript
// Add timing to operations
const startTime = process.hrtime.bigint();
await heavyOperation();
const endTime = process.hrtime.bigint();
logger.info(`Operation took ${Number(endTime - startTime) / 1000000}ms`);
```

#### Memory Monitoring
```javascript
// Monitor memory usage
setInterval(() => {
  const usage = process.memoryUsage();
  logger.debug('Memory usage:', {
    rss: `${Math.round(usage.rss / 1024 / 1024)} MB`,
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)} MB`
  });
}, 30000);
```

### Production Debugging

#### Log Aggregation
```bash
# Use structured logging for production
npm install winston

# Centralized logging with ELK stack or similar
# Ship logs to CloudWatch, Datadog, etc.
```

#### Application Performance Monitoring (APM)
```javascript
// Integration with APM tools
import * as Sentry from '@sentry/node';
import { NodeSDK } from '@opentelemetry/sdk-node';

// Track performance and errors
const transaction = Sentry.startTransaction({
  op: 'code-analysis',
  name: 'Analyze Repository'
});

try {
  await analyzeRepository();
  transaction.setStatus('ok');
} catch (error) {
  transaction.setStatus('internal_error');
  Sentry.captureException(error);
} finally {
  transaction.finish();
}
```

---

## Next Steps and Extensions

### Immediate Improvements
1. **Add Authentication**: User accounts and private repositories
2. **Frontend Interface**: React/Vue.js dashboard for results
3. **Webhooks**: Real-time notifications when analysis completes
4. **Caching**: Cache analysis results for frequently analyzed repos
5. **Batch Processing**: Analyze multiple repositories at once

### Advanced Features
1. **Custom Rules**: Let users define their own analysis rules
2. **Integration**: GitHub App for automatic PR analysis
3. **Reporting**: PDF/HTML report generation
4. **Analytics**: Track code quality trends over time
5. **ML Models**: Train custom models for domain-specific analysis

### Architecture Evolution
1. **Microservices**: Split into smaller, focused services
2. **Event-Driven**: Use event sourcing for better scalability
3. **GraphQL**: Replace REST API with GraphQL for flexibility
4. **Kubernetes**: Container orchestration for large scale deployment

---

## Conclusion

This system demonstrates several important backend concepts:

- **Asynchronous Processing**: Using queues for long-running tasks
- **Multi-Agent Architecture**: Coordinating specialized AI agents
- **RESTful API Design**: Clean, well-structured API endpoints
- **Database Integration**: Using modern BaaS solutions
- **Error Handling**: Robust error handling and recovery
- **Scalability**: Architecture that can grow with demand

You now understand:
- How each component works and why it's needed
- How data flows through the system
- How to deploy and scale the application
- How to debug common issues
- How to extend the system with new features

With this knowledge, you should be able to work on this project independently, add new features, debug issues, and deploy it to production environments.