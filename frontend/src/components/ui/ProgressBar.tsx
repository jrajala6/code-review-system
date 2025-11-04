import React from 'react';

interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'danger';
  showLabel?: boolean;
  label?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  className = '',
  size = 'md',
  variant = 'default',
  showLabel = true,
  label
}) => {
  const clampedValue = Math.max(0, Math.min(100, value));

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return 'h-1';
      case 'lg':
        return 'h-4';
      case 'md':
      default:
        return 'h-2';
    }
  };

  const getVariantClasses = (variant: string) => {
    switch (variant) {
      case 'success':
        return 'bg-green-600';
      case 'warning':
        return 'bg-yellow-600';
      case 'danger':
        return 'bg-red-600';
      case 'default':
      default:
        return 'bg-primary-600';
    }
  };

  const displayLabel = label || `${Math.round(clampedValue)}%`;

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">
            {displayLabel}
          </span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${getSizeClasses(size)}`}>
        <div
          className={`${getSizeClasses(size)} rounded-full transition-all duration-300 ease-in-out ${getVariantClasses(variant)}`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;