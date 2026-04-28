/**
 * Loading Fallback Component
 * 
 * Loading UI for Suspense boundaries with skeleton screens.
 * Used when lazy-loaded components are being loaded.
 */

import React from 'react';
import { RouteSkeleton } from './RouteSkeleton';

interface LoadingFallbackProps {
  message?: string;
  variant?: 'default' | 'dashboard' | 'onboarding' | 'full';
}

export const LoadingFallback: React.FC<LoadingFallbackProps> = ({ 
  message,
  variant = 'default'
}) => {
  // Use RouteSkeleton for better UX, but fallback to LoadingScreen if message is provided
  if (message && variant === 'default') {
    // For non-skeleton cases, show simple spinner
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative w-12 h-12">
            <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-gray-600 text-sm font-medium">{message}</p>
        </div>
      </div>
    );
  }

  return <RouteSkeleton variant={variant} />;
};

export default LoadingFallback;

