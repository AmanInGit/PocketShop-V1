/**
 * Route Preload Utilities
 * 
 * Preloads route chunks to improve navigation performance.
 * Call these functions to warm up the browser cache before navigation.
 */

/**
 * Preloads only the critical dashboard overview (lightweight).
 * Use this immediately after login to avoid bandwidth spikes.
 */
export const preloadDashboardOverview = () => {
  // Only preload the overview page, not the entire dashboard
  // Dashboard overview (features/vendor/pages/Dashboard)
  return import('../features/vendor/pages/Dashboard');
};

/**
 * Preloads the dashboard layout and overview page.
 * Call after successful login to prepare for dashboard navigation.
 * Note: This preloads the full dashboard - use preloadDashboardOverview() for lighter preload.
 */
export const preloadDashboard = () => {
  return import('../features/vendor/pages/VendorDashboard');
};

/**
 * Preloads the orders page.
 */
export const preloadOrders = () => {
  return import('../features/vendor/pages/Orders');
};

/**
 * Preloads the inventory page.
 */
export const preloadInventory = () => {
  // Use the new inventory implementation inside the vendor dashboard
  return import('../features/vendor/pages/Inventory');
};

/**
 * Preloads the insights/analytics page (heavy chunk).
 * Call when user hovers over Insights nav item.
 * For background prefetching, use preloadInsightsOnIdle() instead.
 */
export const preloadInsights = () => {
  // Use vendor analytics (real-data) page; do not preload demo InsightsPage.
  return import('../features/vendor/pages/Analytics');
};

/**
 * Preloads insights on idle (background prefetch).
 * Use this for low-priority prefetching to avoid network congestion.
 */
export const preloadInsightsOnIdle = () => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      import('../features/vendor/pages/Analytics').catch(console.error);
    }, { timeout: 3000 });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      import('../features/vendor/pages/Analytics').catch(console.error);
    }, 3000);
  }
};

/**
 * Preloads the payouts page.
 */
export const preloadPayouts = () => {
  return import('../features/vendor/pages/Payouts');
};

/**
 * Preloads the settings page.
 */
export const preloadSettings = () => {
  return import('../features/vendor/pages/Settings');
};

/**
 * Preloads onboarding stages.
 * @param stage - The onboarding stage number (1, 2, 3) or 'completion'
 */
export const preloadOnboardingStage = (stage: number | 'completion') => {
  switch (stage) {
    case 1:
      return import('../features/vendor/onboarding/stage-1/OnboardingStage1');
    case 2:
      return import('../features/vendor/onboarding/stage-2/OnboardingStage2');
    case 3:
      return import('../features/vendor/onboarding/stage-3/OnboardingStage3');
    case 'completion':
      return import('../features/vendor/onboarding/completion/OnboardingCompletion');
    default:
      return Promise.resolve();
  }
};

/**
 * Preloads the next onboarding stage after completing the current one.
 * @param currentStage - The current onboarding stage number (1, 2, 3)
 */
export const preloadNextOnboardingStage = (currentStage: number) => {
  if (currentStage === 1) {
    return preloadOnboardingStage(2);
  } else if (currentStage === 2) {
    return preloadOnboardingStage(3);
  } else if (currentStage === 3) {
    return preloadOnboardingStage('completion');
  }
  return Promise.resolve();
};

/**
 * Preloads all dashboard routes at once.
 * Useful for aggressive prefetching after login.
 */
export const preloadAllDashboardRoutes = () => {
  return Promise.all([
    preloadDashboard(),
    preloadOrders(),
    preloadInventory(),
    preloadPayouts(),
    preloadSettings(),
  ]);
};

/**
 * Preloads onboarding layout (shared component).
 */
export const preloadOnboardingLayout = () => {
  return import('../features/vendor/onboarding/OnboardingLayout');
};

