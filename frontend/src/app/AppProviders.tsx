import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/auth/context/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import ErrorBoundary from '@/features/common/components/ErrorBoundary';
import { AppRoutes } from '@/routes/AppRoutes';
import OfflineIndicator from '@/components/OfflineIndicator';
import { CustomerBottomNav } from '@/components/layout/CustomerBottomNav';
import { usePWA } from '@/hooks/usePWA';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster as ShadcnToaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

export function AppProviders() {
  usePWA();

  return (
    <QueryClientProvider client={queryClient}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ErrorBoundary>
          <AuthProvider>
            <ThemeProvider>
              <CartProvider>
                <TooltipProvider>
                  <ShadcnToaster />
                  <SonnerToaster />
                  <OfflineIndicator />
                  <AppRoutes />
                  <CustomerBottomNav />
                </TooltipProvider>
              </CartProvider>
            </ThemeProvider>
          </AuthProvider>
        </ErrorBoundary>
      </Router>
    </QueryClientProvider>
  );
}
