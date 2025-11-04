import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient';

// Layout
import Layout from './components/Layout';

// Pages
import HomePage from './pages/HomePage';
import RepositoriesPage from './pages/RepositoriesPage';
import RepositoryDetailPage from './pages/RepositoryDetailPage';
import JobDetailPage from './pages/JobDetailPage';
import QueuePage from './pages/QueuePage';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/repositories" element={<RepositoriesPage />} />
              <Route path="/repositories/:id" element={<RepositoryDetailPage />} />
              <Route path="/jobs/:id" element={<JobDetailPage />} />
              <Route path="/queue" element={<QueuePage />} />
            </Routes>
          </Layout>
        </div>
      </Router>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
