/**
 * Routes Index
 * 
 * Centralized route configuration exports.
 * Combines all route configurations for the application.
 */

export { publicRoutes } from './publicRoutes';
export { protectedRoutes } from './protectedRoutes';
export { onboardingRoutes } from './onboardingRoutes';
export { allRoutes } from './allRoutes';
export type { RouteConfig, RouteAccessLevel, BreadcrumbItem } from './types';

import { allRoutes } from './allRoutes';
import type { RouteConfig } from './types';

/**
 * Get route configuration by path
 */
export const getRouteByPath = (path: string): RouteConfig | undefined => {
  return allRoutes.find(route => route.path === path || path.startsWith(route.path + '/'));
};

/**
 * Get all routes that require authentication
 */
export const getAuthenticatedRoutes = (): RouteConfig[] => {
  return allRoutes.filter(route => route.requiresAuth);
};

/**
 * Get all routes that require completed onboarding
 */
export const getOnboardingRequiredRoutes = (): RouteConfig[] => {
  return allRoutes.filter(route => route.requiresOnboarding);
};

/**
 * Get all public routes
 */
export const getPublicRoutes = (): RouteConfig[] => {
  return allRoutes.filter(route => !route.requiresAuth);
};

