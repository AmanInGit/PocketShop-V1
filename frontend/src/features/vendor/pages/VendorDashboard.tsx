/**
 * Vendor Dashboard Page
 * 
 * Main dashboard route that handles sub-routes for different sections.
 * Sub-routes are lazy loaded for better performance and code splitting.
 */

import React, { useEffect, useMemo, useState, Suspense, lazy } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useVendor } from '@/features/vendor/hooks/useVendor';
import { useProfileCompletion } from '@/features/vendor/hooks/useProfileCompletion';
import { ProfileCompletionModalProvider, useProfileCompletionModal } from '@/features/vendor/context/ProfileCompletionModalContext';
import { Loader2 } from 'lucide-react';
import DashboardLayout from '@/app/layouts/DashboardLayout';
import { LoadingFallback } from '@/features/common/components/LoadingFallback';
import { ROUTES } from '@/constants/routes';
import { supabase } from '@/lib/supabaseClient';
import { OrderProvider } from '@/context/OrderProvider';
import { SupabaseOrderRepository } from '@/features/vendor/services/supabaseOrderRepository';

// Lazy load dashboard sub-routes for code splitting
const DashboardOverview = lazy(() => import('./Dashboard'));
const Orders = lazy(() => import('./Orders'));
const Inventory = lazy(() => import('./Inventory'));
const AddProduct = lazy(() => import('./AddProduct'));
const EditProduct = lazy(() => import('./EditProduct'));
const Insights = lazy(() => import('./Analytics'));
const Storefront = lazy(() => import('./Storefront'));
const Payouts = lazy(() => import('./Payouts'));
const Settings = lazy(() => import('./Settings'));
const Kitchen = lazy(() => import('./Kitchen'));
const OrderDetail = lazy(() => import('./OrderDetail'));

const VendorDashboardInner: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading, onboardingStatus } = useAuth();
  const { data: vendor, isLoading: vendorLoading } = useVendor();
  const { percentage, canGoOnline, missingRequired } = useProfileCompletion();
  const { showProfileCompletionModal, closeProfileCompletionModal } = useProfileCompletionModal();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);

  // Show profile completion popup when profile is incomplete (after vendor loads)
  useEffect(() => {
    if (!vendorLoading && vendor && !canGoOnline) {
      setShowProfileCompletion(true);
    } else if (canGoOnline) {
      setShowProfileCompletion(false); // Hide when profile becomes complete
    }
  }, [vendorLoading, vendor, canGoOnline]);
  const orderRepo = useMemo(() => new SupabaseOrderRepository(), []);

  // Redirect to auth if not authenticated, or to onboarding if incomplete. Use cached onboarding status when available.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate(ROUTES.LOGIN);
      return;
    }

    // Use cached status from auth (set once after login) – no DB call
    if (onboardingStatus === 'completed') {
      setCheckingOnboarding(false);
      return;
    }
    if (onboardingStatus !== null) {
      // Cached status exists but not completed – redirect to onboarding
      navigate(ROUTES.VENDOR_ONBOARDING_STAGE_1);
      return;
    }

    // No cache: fetch once (e.g. first load before profile loaded)
    let mounted = true;
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('vendor_profiles')
          .select('onboarding_status')
          .eq('user_id', user.id)
          .single();

        if (!mounted) return;
        if (error || !data || data.onboarding_status !== 'completed') {
          navigate(ROUTES.VENDOR_ONBOARDING_STAGE_1);
        } else {
          setCheckingOnboarding(false);
          if (!localStorage.getItem('ps_vendor_seen_welcome')) {
            setShowWelcome(true);
            localStorage.setItem('ps_vendor_seen_welcome', '1');
          }
        }
      } catch {
        if (mounted) navigate(ROUTES.VENDOR_ONBOARDING_STAGE_1);
      }
    })();
    return () => { mounted = false; };
  }, [user, loading, onboardingStatus, navigate]);

  // Show loading while checking auth, onboarding, or vendor profile
  if (loading || checkingOnboarding || vendorLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect via useEffect)
  if (!user) {
    return null;
  }

  // Must have a valid vendor profile – never use 'vendor-demo' for real API calls (causes 400s)
  if (!vendor?.id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <p className="text-gray-600 mb-4">Vendor profile not found. Please complete onboarding.</p>
          <button
            onClick={() => navigate(ROUTES.VENDOR_ONBOARDING_STAGE_1)}
            className="text-blue-600 hover:underline font-medium"
          >
            Go to onboarding
          </button>
        </div>
      </div>
    );
  }

  // Orders are stored by vendor_profiles.id (not auth user id). Use Supabase repo for real orders.
  const vendorId = vendor.id;

  return (
    <>
      <DashboardLayout>
        <OrderProvider vendorId={vendorId} repo={orderRepo}>
          <Suspense fallback={<LoadingFallback variant="dashboard" />}>
            <Routes>
              <Route path="" element={<DashboardOverview />} />
              <Route path="orders" element={<Orders />} />
              <Route path="orders/:id" element={<OrderDetail />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="inventory/add" element={<AddProduct />} />
              <Route path="inventory/edit/:id" element={<EditProduct />} />
              <Route path="insights" element={<Insights />} />
              <Route path="storefront" element={<Storefront />} />
              <Route path="payouts" element={<Payouts />} />
              <Route path="kitchen" element={<Kitchen />} />
              <Route path="settings" element={<Settings />} />
            </Routes>
          </Suspense>
        </OrderProvider>
      </DashboardLayout>

      {showWelcome && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Welcome to PocketShop</h2>
            <p className="text-sm text-gray-600">
              You&apos;re all set. Here are a couple of quick things to get you started.
            </p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  setShowWelcome(false);
                  navigate('inventory');
                }}
                className="w-full px-4 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
              >
                Add your menu items
              </button>
              <button
                type="button"
                onClick={() => setShowWelcome(false)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Explore dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile completion popup - shown after login or when clicking Go Online with incomplete profile */}
      {(showProfileCompletion || showProfileCompletionModal) && !canGoOnline && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Your profile is incomplete
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              To go online and start receiving orders, please complete the required details below. You can fill them in Settings.
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Profile completion</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{percentage}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#5522E2] transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              {missingRequired.length > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Missing: {missingRequired.slice(0, 5).join(', ')}
                  {missingRequired.length > 5 ? ` +${missingRequired.length - 5} more` : ''}
                </p>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Required fields are marked with * in Settings → Business, Profile &amp; Operations. This reminder will appear on each login until your profile is complete.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowProfileCompletion(false);
                  closeProfileCompletionModal();
                  navigate(ROUTES.VENDOR_DASHBOARD_SETTINGS);
                }}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#5522E2] text-white text-sm font-medium hover:bg-[#4A1EC9] transition-colors"
              >
                Finish setup
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowProfileCompletion(false);
                  closeProfileCompletionModal();
                }}
                className="px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const VendorDashboard: React.FC = () => (
  <ProfileCompletionModalProvider>
    <VendorDashboardInner />
  </ProfileCompletionModalProvider>
);

export default VendorDashboard;

