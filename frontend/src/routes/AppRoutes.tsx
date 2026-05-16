/**
 * Application Routes
 *
 * Centralized route definitions using route configuration.
 * Routes are generated from configuration files for better maintainability.
 *
 * Route optimization:
 * - Landing page and login stay in main bundle (critical path)
 * - Dashboard routes lazy loaded (heavy chunk)
 * - Onboarding routes lazy loaded (separate chunk)
 * - Analytics/Insights lazy loaded (heavy dependencies)
 */

import { Routes } from 'react-router-dom';
import ErrorBoundary from '@/features/common/components/ErrorBoundary';
import { allRoutes } from '@/routes/allRoutes';
import { generateRoutes } from '@/utils/routeHelpers';

export const AppRoutes = () => {
  // Generate routes from centralized configuration
  const routeElements = generateRoutes(allRoutes);

  return (
    <ErrorBoundary>
      <Routes>
        {routeElements}
      </Routes>
    </ErrorBoundary>
  );
};
