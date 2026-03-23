/**
 * Route Constants
 * 
 * Centralized route path definitions for the application.
 * Use these constants instead of hardcoded strings for better maintainability and type safety.
 */

export const ROUTES = {
  // Public routes
  HOME: '/',
  BUSINESS: '/business',
  ABOUT: '/about-us',
  BLOG: '/blog',
  HELP_CENTER: '/help-center',
  DOCUMENTATION: '/documentation',
  
  // Authentication routes
  LOGIN: '/login',
  REGISTER: '/register',
  AUTH_CALLBACK: '/auth/callback', // OAuth return (Google, etc.) – waits for session then redirects
  VENDOR_AUTH: '/vendor/auth', // Legacy route, redirects to LOGIN
  
  // Onboarding routes
  VENDOR_ONBOARDING: '/vendor/onboarding',
  VENDOR_ONBOARDING_STAGE_1: '/vendor/onboarding/stage-1',
  VENDOR_ONBOARDING_STAGE_2: '/vendor/onboarding/stage-2',
  VENDOR_ONBOARDING_STAGE_3: '/vendor/onboarding/stage-3',
  VENDOR_ONBOARDING_COMPLETION: '/vendor/onboarding/completion',
  
  // Dashboard routes
  VENDOR_DASHBOARD: '/vendor/dashboard',
  VENDOR_DASHBOARD_OVERVIEW: '/vendor/dashboard',
  VENDOR_DASHBOARD_ORDERS: '/vendor/dashboard/orders',
  VENDOR_DASHBOARD_INVENTORY: '/vendor/dashboard/inventory',
  VENDOR_DASHBOARD_INSIGHTS: '/vendor/dashboard/insights',
  VENDOR_DASHBOARD_STOREFRONT: '/vendor/dashboard/storefront',
  VENDOR_DASHBOARD_PAYOUTS: '/vendor/dashboard/payouts',
  VENDOR_DASHBOARD_SETTINGS: '/vendor/dashboard/settings',
  VENDOR_DASHBOARD_KITCHEN: '/vendor/dashboard/kitchen',

  // Pickup Monitor - public wall display for customers (no auth)
  PICKUP_MONITOR: '/pickup-monitor',
  
  // Public storefront route
  PUBLIC_STOREFRONT: '/storefront/:vendorId',

  // Shops / Ordering - browse online vendors by category
  SHOPS: '/shops',

  // Payment result routes (Stripe return URLs)
  PAYMENT_SUCCESS: '/payment-success',
  PAYMENT_CANCEL: '/payment-cancel',

  // Order confirmation (after checkout)
  ORDER_CONFIRMATION: '/order-confirmation',

  // Customer order & feedback
  ORDER_TRACKING: '/order-tracking/:orderId',
  ORDER_FEEDBACK: '/order-feedback/:orderId',

  // Customer app routes
  CUSTOMER_AUTH: '/customer-auth',
  CUSTOMER_HOME: '/customer-home',
  CUSTOMER_PROFILE: '/customer-profile',

  // PWA routes
  OFFLINE: '/offline',

  // 404 - catch-all
  NOT_FOUND: '*',
} as const;

// Type for route paths
export type RoutePath = typeof ROUTES[keyof typeof ROUTES];

// Helper to get route paths as array (useful for validation)
export const getAllRoutes = (): string[] => {
  return Object.values(ROUTES);
};

// Helper to check if a path is a valid route
export const isValidRoute = (path: string): boolean => {
  return getAllRoutes().includes(path);
};

// Helper to get route name from path (for debugging/logging)
export const getRouteName = (path: string): string | null => {
  const entry = Object.entries(ROUTES).find(([_, value]) => value === path);
  return entry ? entry[0] : null;
};

