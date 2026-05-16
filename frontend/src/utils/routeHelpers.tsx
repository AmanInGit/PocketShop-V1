/**
 * Route Helpers
 * 
 * Utility functions for generating routes from configuration.
 */

import { Suspense, ComponentType } from 'react';
import { Route, Navigate } from 'react-router-dom';
import type { RouteConfig } from '@/routes/types';
import { ROUTES } from '@/constants/routes';
import { OnboardingProtectedRoute } from '@/features/common/components/shared/OnboardingProtectedRoute';
import { AuthRouteGuard } from '@/features/common/components/shared/AuthRouteGuard';
import ErrorBoundary from '@/features/common/components/ErrorBoundary';
import { LoadingFallback } from '@/features/common/components/LoadingFallback';

/**
 * Generate a React Router Route element from route configuration
 */
export const generateRoute = (config: RouteConfig): JSX.Element => {
  const {
    path,
    component: Component,
    redirect,
    requiresAuth,
    requiresOnboarding,
    onboardingStage,
    layout: Layout,
    loadingVariant = 'default',
    props: routeProps = {},
    replace = false,
  } = config;

  // Handle redirect routes
  if (redirect) {
    return <Route key={path} path={path} element={<Navigate to={redirect} replace={replace} />} />;
  }

  if (!Component) {
    throw new Error(`Route config for "${path}" is missing a component`);
  }

  // Wrap component with layout if provided
  let WrappedComponent: ComponentType<any> = Component;
  if (Layout) {
    WrappedComponent = (props: any) => (
      <Layout>
        <Component {...props} {...routeProps} />
      </Layout>
    );
  } else if (routeProps && Object.keys(routeProps).length > 0) {
    // If no layout but has props, create wrapper
    WrappedComponent = (props: any) => <Component {...props} {...routeProps} />;
  }

  // Determine if we need Suspense (lazy loaded components)
  const isLazyLoaded = !config.eager;
  const needsSuspense = isLazyLoaded;

  // Build the route element with appropriate wrappers
  let routeElement = <WrappedComponent />;

  // Wrap with Suspense if lazy loaded
  if (needsSuspense) {
    routeElement = (
      <Suspense fallback={<LoadingFallback variant={loadingVariant} />}>
        {routeElement}
      </Suspense>
    );
  }

  // Wrap with OnboardingProtectedRoute if needed
  if (requiresAuth && onboardingStage !== undefined) {
    routeElement = (
      <OnboardingProtectedRoute
        requireCompletedOnboarding={requiresOnboarding ?? false}
        stage={onboardingStage}
      >
        {routeElement}
      </OnboardingProtectedRoute>
    );
  } else if (requiresAuth && requiresOnboarding) {
    routeElement = (
      <OnboardingProtectedRoute requireCompletedOnboarding={true}>
        {routeElement}
      </OnboardingProtectedRoute>
    );
  }

  // Wrap with AuthRouteGuard for public auth routes (login/register)
  // These routes should redirect if already authenticated
  if (!requiresAuth && (path === ROUTES.LOGIN || path === ROUTES.REGISTER)) {
    routeElement = (
      <AuthRouteGuard>
        {routeElement}
      </AuthRouteGuard>
    );
  }

  // Wrap with ErrorBoundary for all routes
  routeElement = (
    <ErrorBoundary>
      {routeElement}
    </ErrorBoundary>
  );

  return <Route key={path} path={path} element={routeElement} />;
};

/**
 * Generate multiple routes from route configurations
 */
export const generateRoutes = (configs: RouteConfig[]): JSX.Element[] => {
  return configs.map(generateRoute);
};

/**
 * Get route title for document title
 */
export const getRouteTitle = (path: string, routes: RouteConfig[]): string => {
  const route = routes.find(r => r.path === path || path.startsWith(r.path + '/'));
  return route?.title || 'PocketShop';
};

/**
 * Get breadcrumbs for a route
 */
export const getRouteBreadcrumbs = (path: string, routes: RouteConfig[]): RouteConfig['breadcrumbs'] => {
  const route = routes.find(r => r.path === path || path.startsWith(r.path + '/'));
  return route?.breadcrumbs || [];
};

/**
 * Check if a route requires authentication
 */
export const routeRequiresAuth = (path: string, routes: RouteConfig[]): boolean => {
  const route = routes.find(r => r.path === path || path.startsWith(r.path + '/'));
  return route?.requiresAuth ?? false;
};

/**
 * Check if a route requires completed onboarding
 */
export const routeRequiresOnboarding = (path: string, routes: RouteConfig[]): boolean => {
  const route = routes.find(r => r.path === path || path.startsWith(r.path + '/'));
  return route?.requiresOnboarding ?? false;
};

/**
 * Get onboarding stage for a route
 */
export const getRouteOnboardingStage = (path: string, routes: RouteConfig[]): number | 'completion' | undefined => {
  const route = routes.find(r => r.path === path || path.startsWith(r.path + '/'));
  return route?.onboardingStage;
};

