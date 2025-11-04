import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Code2,
  Clock,
  Github,
  Zap
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  const navigation = [
    { name: 'Home', href: '/', icon: Code2 },
    { name: 'Repositories', href: '/repositories', icon: Github },
    { name: 'Queue', href: '/queue', icon: Clock },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-8 h-8 bg-primary-600 rounded">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">
                CodeReview AI
              </span>
            </Link>

            {/* Navigation */}
            <nav className="flex space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                      isActive(item.href)
                        ? 'bg-primary-50 text-primary-700 border border-primary-200'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Zap className="h-4 w-4 text-primary-600" />
              <span className="text-sm text-gray-600">
                Powered by AI-driven multi-agent code analysis
              </span>
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <span>4 AI Agents</span>
              <span>•</span>
              <span>Real-time Analysis</span>
              <span>•</span>
              <span>Comprehensive Reports</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;