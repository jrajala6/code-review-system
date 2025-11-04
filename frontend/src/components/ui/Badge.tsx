import React from 'react';
import type { Severity, Category, JobStatus, RepositoryStatus } from '../../types/api';

interface BadgeProps {
  variant: Severity | Category | JobStatus | RepositoryStatus | 'success' | 'warning' | 'danger' | 'info';
  children: React.ReactNode;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ variant, children, className = '' }) => {
  const getVariantClasses = (variant: string) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

    switch (variant) {
      // Severity variants
      case 'critical':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'high':
        return `${baseClasses} bg-orange-100 text-orange-800`;
      case 'medium':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'low':
        return `${baseClasses} bg-blue-100 text-blue-800`;

      // Category variants
      case 'bug':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'security':
        return `${baseClasses} bg-purple-100 text-purple-800`;
      case 'performance':
        return `${baseClasses} bg-orange-100 text-orange-800`;
      case 'style':
        return `${baseClasses} bg-blue-100 text-blue-800`;

      // Job status variants
      case 'queued':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      case 'processing':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'failed':
        return `${baseClasses} bg-red-100 text-red-800`;

      // Repository status variants
      case 'pending':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      case 'cloning':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'analyzing':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;

      // Generic variants
      case 'success':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'warning':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'danger':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'info':
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  return (
    <span className={`${getVariantClasses(variant)} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;