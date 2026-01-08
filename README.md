# Code Review System

A powerful, multi-agent code review system that automates code analysis using AI. This system clones repositories, analyzes code for bugs, security vulnerabilities, performance issues, and style violations, and manages the workload using a robust queue system.

## 🚀 Key Features

*   **Multi-Agent Analysis**: Specialized AI agents for different aspects of code quality:
    *   🐛 **Bug Detection**: Finds logic errors and potential crashes.
    *   🔒 **Security**: Scans for vulnerabilities like SQL injection and XSS.
    *   ⚡ **Performance**: Identifies inefficiencies and memory leaks.
    *   🎨 **Style**: Checks for formatting and best practices.
*   **Queue-Based Architecture**: Uses Bull/Redis to handle multiple reviews asynchronously and reliably.
*   **Scalable**: Designed to separate the API from the heavy processing workers.
*   **Detailed Reports**: Aggregates findings from all agents into a comprehensive report.

## 🛠️ Technology Stack

*   **Runtime**: Node.js
*   **Framework**: Express.js
*   **Database**: Supabase (PostgreSQL)
*   **Queue**: Bull & Redis
*   **AI**: OpenAI API

## 📋 Prerequisites

Before running the system, ensure you have the following installed:

*   **Node.js** (v18+)
*   **Redis** (Local or Cloud)
*   **Git**

## 🔧 Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/code-review-system.git
    cd code-review-system
    ```

2.  **Install dependencies**:
    ```bash
    # Install root dependencies
    npm install

    # Install backend dependencies
    cd backend
    npm install
    ```

## ⚙️ Configuration

1.  Copy the example environment file:
    ```bash
    cp backend/.env.example backend/.env
    ```

2.  Update `backend/.env` with your credentials:
    ```env
    # Database (Supabase)
    SUPABASE_URL=your_supabase_project_url
    SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key

    # AI Provider
    OPENAI_API_KEY=your_openai_api_key

    # Queue (Redis)
    REDIS_HOST=localhost
    REDIS_PORT=6379
    ```

## 🚀 Running the Application

To run the system locally, you need to start both the API server and the background worker.

**1. Start the API Server:**
```bash
cd backend
npm run dev
# Server runs at http://localhost:3000
```

**2. Start the Worker Process:**
Open a new terminal window:
```bash
cd backend
npm run worker
```

## 🔌 API Endpoints

*   `POST /api/repositories`: Submit a GitHub URL for review.
*   `GET /api/repositories`: List submitted repositories.
*   `GET /api/repositories/:id`: Get details and review status for a repository.

## 📚 Documentation

For a deep dive into the system's architecture, including database schema, component breakdown, and deployment strategies, please refer to the [System Architecture Guide](SYSTEM_ARCHITECTURE.md).
