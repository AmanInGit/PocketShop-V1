/**
 * Main App Component
 * 
 * Application entry point with routing and auth provider.
 * Includes PWA hooks and offline indicator (non-blocking).
 */

import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/features/auth/context/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LoadingScreen } from '@/features/common/components/LoadingScreen';
import { ErrorBoundary } from '@/features/common/components';
import { AppRoutes } from '@/routes/AppRoutes';
import OfflineIndicator from '@/components/OfflineIndicator';
import { CustomerBottomNav } from '@/components/layout/CustomerBottomNav';
import { usePWA } from '@/hooks/usePWA';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster as ShadcnToaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { ConfigError } from '@/components/ConfigError';
import { isSupabaseConfigured } from '@/lib/appConfig';

// Create a QueryClient instance for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Inner component that has access to auth context
const AppContent = () => {
  const { loading } = useAuth();

  // Show loading screen during initial auth check
  if (loading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  return <AppRoutes />;
};

// Main App Router
function App() {
  if (import.meta.env.PROD && !isSupabaseConfigured()) {
    return <ConfigError />;
  }

  // Initialize PWA hook (non-blocking, detects installability)
  // Currently not used but available for future install prompt UI
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isInstalled: _isInstalled, isInstallable: _isInstallable } = usePWA();

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <ThemeProvider>
              <CartProvider>
                <TooltipProvider>
                {/* Global toasts */}
                <ShadcnToaster />
                <SonnerToaster />
                {/* Offline indicator - shows when network is unavailable */}
                <OfflineIndicator />
                <AppContent />
                {/* Customer bottom nav - shows on storefront, customer-home, customer-profile, order-tracking (mobile) */}
                <CustomerBottomNav />
                </TooltipProvider>
              </CartProvider>
            </ThemeProvider>
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
