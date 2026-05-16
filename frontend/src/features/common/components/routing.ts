/**
 * Routing-related components (guards, error boundaries, loading fallbacks).
 * Kept separate from the UI component barrel to avoid pulling maps/auth into bootstrap.
 */

export { ProtectedRoute } from './shared/ProtectedRoute';
export { OnboardingProtectedRoute } from './shared/OnboardingProtectedRoute';
export { AuthRouteGuard } from './shared/AuthRouteGuard';
export { default as LoadingScreen } from './LoadingScreen';
export { default as ErrorBoundary } from './ErrorBoundary';
export { ErrorFallback } from './ErrorFallback';
export { LoadingFallback } from './LoadingFallback';
