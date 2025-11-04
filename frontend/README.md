# CodeReview AI - Frontend

A modern React frontend for the AI-powered code review system. This application provides a clean, intuitive interface for analyzing GitHub repositories using multi-agent AI analysis.

## 🚀 Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Open in browser**: `http://localhost:5173`

## ✨ Features

- **Repository Analysis**: Submit GitHub repositories for AI-powered analysis
- **Real-time Progress**: Live updates on analysis progress with automatic polling
- **Comprehensive Results**: Detailed findings from 4 specialized AI agents
- **Smart Filtering**: Filter by severity, category, file path, and agent type
- **Queue Monitoring**: Track system performance and job processing
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## 🛠 Technology Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Query** for state management and API caching
- **React Router** for navigation
- **Lucide React** for icons

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
├── hooks/              # Custom React hooks
├── pages/              # Page components
├── services/           # API services
├── types/              # TypeScript types
└── lib/                # Utilities
```

## 🔗 API Integration

Connects to the backend API running on `http://localhost:3000` with endpoints for:
- Repository management
- Job progress tracking
- Analysis results
- Queue monitoring

## 📱 Pages

- **Home**: Repository input and analysis submission
- **Repositories**: List and manage analyzed repositories
- **Job Detail**: Real-time progress and comprehensive results
- **Queue**: System monitoring and performance metrics

## 🎨 Design System

Built with a consistent design system featuring:
- Custom color palette (primary, success, warning, danger)
- Reusable components (Badge, ProgressBar, LoadingSpinner)
- Responsive layouts with Tailwind CSS
- Modern, clean interface

## 🔧 Environment Configuration

Create a `.env` file:
```bash
VITE_API_URL=http://localhost:3000
```

## 📦 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🤝 Integration with Backend

This frontend is designed to work with the code review backend API. Make sure the backend is running on port 3000 before starting the frontend.
