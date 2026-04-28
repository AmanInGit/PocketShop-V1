/**
 * Route Configuration Types
 * 
 * Type definitions for route configuration objects.
 */

import { ComponentType, LazyExoticComponent } from 'react';
import { RoutePath } from '@/constants/routes';

export type RouteAccessLevel = 'public' | 'authenticated' | 'vendor' | 'admin';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export interface RouteConfig {
  /** Route path (from ROUTES constants) */
  path: RoutePath | string;
  
  /** Component to render (can be lazy loaded) */
  component?: ComponentType<any> | LazyExoticComponent<ComponentType<any>>;
  
  /** Route title for document title and breadcrumbs */
  title: string;
  
  /** Whether authentication is required */
  requiresAuth?: boolean;
  
  /** Whether completed onboarding is required */
  requiresOnboarding?: boolean;
  
  /** Onboarding stage number (for onboarding routes) */
  onboardingStage?: number | 'completion';
  
  /** Access level for future RBAC */
  accessLevel?: RouteAccessLevel;
  
  /** Breadcrumb items for navigation */
  breadcrumbs?: BreadcrumbItem[];
  
  /** Layout component to wrap route */
  layout?: ComponentType<{ children: React.ReactNode }>;
  
  /** Whether to eagerly load (include in main bundle) */
  eager?: boolean;
  
  /** Loading fallback variant */
  loadingVariant?: 'default' | 'dashboard' | 'onboarding' | 'full';
  
  /** Additional route props */
  props?: Record<string, any>;
  
  /** Nested routes (for nested routing) */
  children?: RouteConfig[];
  
  /** Redirect path (for redirect routes) */
  redirect?: RoutePath | string;
  
  /** Whether to replace in history */
  replace?: boolean;
}

