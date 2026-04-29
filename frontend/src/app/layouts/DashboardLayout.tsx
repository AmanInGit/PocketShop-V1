/**
 * Dashboard Layout Component
 * 
 * Main layout wrapper with sidebar navigation for vendor dashboard.
 * Provides responsive sidebar with dynamic route handling.
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  BarChart3, 
  CreditCard, 
  Settings, 
  Store,
  ChefHat,
  Tv2,
  Building2,
  User,
  Tag,
  Clock,
  Bell,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { 
  preloadInsights, 
  preloadInsightsOnIdle,
  preloadOrders, 
  preloadInventory, 
  preloadPayouts, 
  preloadSettings 
} from '@/utils/preloaders';
import TopNavbar from '@/components/common/TopNavbar';
import { ConfirmActionDialog } from '@/components/common/ConfirmActionDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { OperationalHoursBanner } from '@/components/vendor/OperationalHoursBanner';
import { VendorStatusProvider, useVendorStatusContext } from '@/features/vendor/context/VendorStatusContext';
import { useProfileCompletion } from '@/features/vendor/hooks/useProfileCompletion';
import logoImage from '@/assets/images/logo.png';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  openInNewTab?: boolean;
}

const coreItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', description: 'Overview & insights', icon: <LayoutDashboard className="w-5 h-5" />, path: ROUTES.VENDOR_DASHBOARD_OVERVIEW },
  { id: 'orders', label: 'Orders', description: 'Manage orders', icon: <ShoppingBag className="w-5 h-5" />, path: ROUTES.VENDOR_DASHBOARD_ORDERS },
  { id: 'inventory', label: 'Inventory', description: 'Products & stock', icon: <Package className="w-5 h-5" />, path: ROUTES.VENDOR_DASHBOARD_INVENTORY },
  { id: 'kitchen', label: 'Kitchen', description: 'Kitchen display', icon: <ChefHat className="w-5 h-5" />, path: ROUTES.VENDOR_DASHBOARD_KITCHEN },
  { id: 'pickup-monitor', label: 'Pickup Screen', description: 'Wall display for customers', icon: <Tv2 className="w-5 h-5" />, path: ROUTES.PICKUP_MONITOR, openInNewTab: true },
];

const businessItems: NavItem[] = [
  { id: 'analytics', label: 'Analytics', description: 'Reports & metrics', icon: <BarChart3 className="w-5 h-5" />, path: ROUTES.VENDOR_DASHBOARD_INSIGHTS },
  { id: 'storefront', label: 'Storefront', description: 'Your store view', icon: <Store className="w-5 h-5" />, path: ROUTES.VENDOR_DASHBOARD_STOREFRONT },
  { id: 'payments', label: 'Payments', description: 'Payment tracking', icon: <CreditCard className="w-5 h-5" />, path: ROUTES.VENDOR_DASHBOARD_PAYOUTS },
];

const settingsItems: NavItem[] = [
  { id: 'settings', label: 'Settings', description: 'Preferences & config', icon: <Settings className="w-5 h-5" />, path: ROUTES.VENDOR_DASHBOARD_SETTINGS },
];

const settingsSearchItems: NavItem[] = [
  // Settings tabs
  { id: 'settings-business', label: 'Business settings', description: 'Business info & details', icon: <Building2 className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=business` },
  { id: 'settings-profile', label: 'Profile settings', description: 'Owner profile, contact, branding', icon: <User className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=profile` },
  { id: 'settings-staff', label: 'Staff settings', description: 'Staff members & roles', icon: <User className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=staff` },
  { id: 'settings-layout', label: 'Layout settings', description: 'Tables, layout & storefront structure', icon: <LayoutGrid className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=layout` },
  { id: 'settings-offers', label: 'Offers settings', description: 'Promotions, discounts & offers', icon: <Tag className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=offers` },
  { id: 'settings-operations', label: 'Operations settings', description: 'Hours, operational controls & workflows', icon: <Clock className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=operations` },
  { id: 'settings-notifications', label: 'Notifications settings', description: 'Email/order alerts & preferences', icon: <Bell className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=notifications` },
  { id: 'settings-payment', label: 'Payment settings', description: 'Payouts, payment modes & tax/KYC', icon: <CreditCard className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=payment` },

  // Business tab fields (so queries like “address”, “city”, “state” work)
  { id: 'settings-business-name', label: 'Business name', description: 'Your business display name', icon: <Building2 className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=business` },
  { id: 'settings-business-type', label: 'Business type', description: 'Type of business (restaurant, cafe, etc.)', icon: <Building2 className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=business` },
  { id: 'settings-business-description', label: 'Business description', description: 'Short description shown to customers', icon: <Building2 className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=business` },
  { id: 'settings-address', label: 'Address', description: 'Street address / location', icon: <Building2 className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=business` },
  { id: 'settings-city', label: 'City', description: 'Business city', icon: <Building2 className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=business` },
  { id: 'settings-state', label: 'State', description: 'Business state', icon: <Building2 className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=business` },
  { id: 'settings-postal-code', label: 'Postal code', description: 'ZIP / postal code', icon: <Building2 className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=business` },
  { id: 'settings-country', label: 'Country', description: 'Country / region', icon: <Building2 className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=business` },

  // Profile tab fields
  { id: 'settings-owner-name', label: 'Owner name', description: 'Profile owner name', icon: <User className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=profile` },
  { id: 'settings-profile-email', label: 'Email', description: 'Owner contact email', icon: <User className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=profile` },
  { id: 'settings-mobile-number', label: 'Mobile number', description: 'Owner mobile phone', icon: <User className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=profile` },
  { id: 'settings-logo-url', label: 'Logo URL', description: 'Upload/provide your logo URL', icon: <User className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=profile` },
  { id: 'settings-banner-url', label: 'Banner URL', description: 'Upload/provide banner URL', icon: <User className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=profile` },
  { id: 'settings-banner-color', label: 'Banner color', description: 'Brand/banner color', icon: <User className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=profile` },

  // Staff tab fields (common search terms)
  { id: 'settings-staff-members', label: 'Staff', description: 'Manage staff members', icon: <User className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=staff` },
  { id: 'settings-staff-name', label: 'Staff name', description: 'Add/edit staff member name', icon: <User className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=staff` },
  { id: 'settings-staff-phone', label: 'Staff phone', description: 'Staff member phone number', icon: <User className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=staff` },
  { id: 'settings-staff-role', label: 'Staff role', description: 'Manager / staff role', icon: <User className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=staff` },

  // Offers tab fields
  { id: 'settings-offers-promo-code', label: 'Promo code', description: 'Offer/promotion code', icon: <Tag className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=offers` },
  { id: 'settings-offer-type', label: 'Offer type', description: 'Percentage or flat discounts', icon: <Tag className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=offers` },
  { id: 'settings-discount-value', label: 'Discount value', description: 'The discount amount/percent', icon: <Tag className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=offers` },
  { id: 'settings-min-order', label: 'Minimum order', description: 'Minimum order required for offer', icon: <Tag className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=offers` },
  { id: 'settings-max-discount', label: 'Max discount', description: 'Maximum discount value', icon: <Tag className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=offers` },

  // Operations tab fields
  { id: 'settings-working-days', label: 'Working days', description: 'Which days you are open', icon: <Clock className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=operations` },
  { id: 'settings-opening-time', label: 'Opening time', description: 'Store opening time', icon: <Clock className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=operations` },
  { id: 'settings-closing-time', label: 'Closing time', description: 'Store closing time', icon: <Clock className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=operations` },
  { id: 'settings-operational-hours', label: 'Operational hours', description: 'Opening/closing schedule', icon: <Clock className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=operations` },

  // Notifications tab fields
  { id: 'settings-notification-email', label: 'Email notifications', description: 'Email alerts', icon: <Bell className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=notifications` },
  { id: 'settings-notification-orders', label: 'Order notifications', description: 'Get alerts for new orders', icon: <Bell className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=notifications` },
  { id: 'settings-notification-low-stock', label: 'Low stock alerts', description: 'Alerts when inventory is low', icon: <Bell className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=notifications` },
  { id: 'settings-notification-payouts', label: 'Payout notifications', description: 'Alerts for payouts', icon: <Bell className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=notifications` },

  // Layout tab fields (generic but useful search tokens)
  { id: 'settings-layout-tables', label: 'Tables', description: 'Configure tables for your layout', icon: <LayoutGrid className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=layout` },
  { id: 'settings-layout-zones', label: 'Zones', description: 'Define table zones/areas', icon: <LayoutGrid className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=layout` },
  { id: 'settings-layout-display-order', label: 'Display order', description: 'Ordering of zones/tables', icon: <LayoutGrid className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=layout` },

  // Payment tab subsections (common “search missing” items)
  { id: 'settings-bank-account', label: 'Bank account info', description: 'Bank account details + IFSC for payouts', icon: <CreditCard className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=payment` },
  { id: 'settings-bank-account-number', label: 'Bank account number', description: 'Enter your bank account number', icon: <CreditCard className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=payment` },
  { id: 'settings-ifsc', label: 'IFSC code', description: 'Enter/search IFSC code for your bank', icon: <CreditCard className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=payment` },
  { id: 'settings-kyc-tax', label: 'KYC & tax info', description: 'Legal compliance, PAN, GSTIN and related fields', icon: <Settings className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=payment` },
  { id: 'settings-pan', label: 'PAN number', description: 'Enter your PAN number', icon: <Settings className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=payment` },
  { id: 'settings-gst', label: 'GSTIN / GST settings', description: 'GST registered, GSTIN and related fields', icon: <Settings className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=payment` },
  { id: 'settings-business-entity-type', label: 'Business entity type', description: 'Sole proprietorship / partnership / LLP / etc.', icon: <Settings className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=payment` },
  { id: 'settings-cancelled-cheque', label: 'Cancelled cheque URL', description: 'Optional compliance upload integration placeholder', icon: <Settings className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=payment` },

  { id: 'settings-payment-modes', label: 'Payment collection modes', description: 'Cash/QR/waiter modes in dine-in flow', icon: <CreditCard className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=payment` },
  { id: 'settings-accept-cash', label: 'Accept cash at counter', description: 'Enable cash payments at billing counter', icon: <CreditCard className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=payment` },
  { id: 'settings-online-qr', label: 'Accept online via QR/App', description: 'Enable QR/App payments', icon: <CreditCard className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=payment` },
  { id: 'settings-pay-at-table', label: 'Pay at table via waiter', description: 'Enable waiter-assisted payments', icon: <CreditCard className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=payment` },
  { id: 'settings-bill-request', label: 'Allow bill request', description: 'Allow bill requests from table', icon: <CreditCard className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=payment` },
  { id: 'settings-call-waiter', label: 'Allow call waiter', description: 'Allow staff call from table', icon: <CreditCard className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=payment` },

  { id: 'settings-kot', label: 'KOT settings', description: 'Auto-print KOT + printer target', icon: <Clock className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=payment` },
  { id: 'settings-auto-print-kot', label: 'Auto-print KOT', description: 'Kitchen ticket auto print preference', icon: <Clock className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=payment` },
  { id: 'settings-printer-target', label: 'Printer target', description: 'Thermal printer target name/IP/Bluetooth id', icon: <Clock className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=payment` },

  { id: 'settings-fssai', label: 'FSSAI details', description: 'Food business compliance details (license number, expiry, status)', icon: <Settings className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=payment` },
  { id: 'settings-fssai-license', label: 'FSSAI license number', description: 'FSSAI license number', icon: <Settings className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=payment` },
  { id: 'settings-fssai-expiry', label: 'FSSAI expiry date', description: 'FSSAI expiry date', icon: <Settings className="w-5 h-5" />, path: `${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=payment` },
];

const SIDEBAR_WIDTH_EXPANDED = 256; // w-64
const SIDEBAR_WIDTH_COLLAPSED = 72; // w-[72px]

const DashboardLayoutInner: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showGoOnlineConfirm, setShowGoOnlineConfirm] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isOnline,
    isToggling,
    operationalInfo,
    extendPastClosing,
    goOnlineWithExtension,
  } = useVendorStatusContext();
  const { canGoOnline, percentage, missingRequired } = useProfileCompletion();

  const handleNavigation = (path: string, openInNewTab?: boolean) => {
    if (openInNewTab) {
      window.open(path, '_blank', 'noopener,noreferrer');
    } else {
      navigate(path);
    }
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  // Preload route on hover for faster navigation
  // Uses immediate preload for lightweight routes, idle preload for heavy ones
  const handleNavItemHover = (path: string) => {
    if (path === ROUTES.VENDOR_DASHBOARD_INSIGHTS) {
      // Heavy chunk - use immediate preload on hover (user likely to click)
      preloadInsights().catch(console.error);
    } else if (path === ROUTES.VENDOR_DASHBOARD_ORDERS) {
      preloadOrders().catch(console.error);
    } else if (path === ROUTES.VENDOR_DASHBOARD_INVENTORY) {
      preloadInventory().catch(console.error);
    } else if (path === ROUTES.VENDOR_DASHBOARD_PAYOUTS) {
      preloadPayouts().catch(console.error);
    } else if (path === ROUTES.VENDOR_DASHBOARD_SETTINGS) {
      preloadSettings().catch(console.error);
    }
  };
  
  // Preload insights on idle for users already in dashboard (background prefetch)
  useEffect(() => {
    // Only preload insights on idle if user is on dashboard (not already on insights)
    if (location.pathname.startsWith(ROUTES.VENDOR_DASHBOARD) && !location.pathname.includes(ROUTES.VENDOR_DASHBOARD_INSIGHTS)) {
      preloadInsightsOnIdle();
    }
  }, [location.pathname]);

  const isActiveRoute = (path: string): boolean => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar - Persistent header */}
      <TopNavbar 
        onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        isMenuOpen={isSidebarOpen}
        isSidebarCollapsed={isSidebarCollapsed}
        sidebarWidth={isSidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED}
        searchItems={[...coreItems, ...businessItems, ...settingsItems, ...settingsSearchItems]}
        onSearchSelect={(item) => handleNavigation(item.path, item.openInNewTab)}
      />

      <div className="pt-16">
        {/* Pre-closing banner: within 30 mins of closing (when online) */}
        {isOnline &&
          operationalInfo?.isWithin30MinsOfClosing &&
          operationalInfo.minutesUntilClosing != null &&
          operationalInfo.closingTimeFormatted && (
            <OperationalHoursBanner
              variant="closing"
              minutesUntil={operationalInfo.minutesUntilClosing}
              timeFormatted={operationalInfo.closingTimeFormatted}
              onAction={() => extendPastClosing(30)}
              isActioning={false}
            />
          )}

        {/* Pre-opening banner: within 30 mins of opening (when offline) */}
        {!isOnline &&
          operationalInfo?.isWithin30MinsOfOpening &&
          operationalInfo.minutesUntilOpening != null &&
          operationalInfo.openingTimeFormatted && (
            <OperationalHoursBanner
              variant="opening"
              minutesUntil={operationalInfo.minutesUntilOpening}
              timeFormatted={operationalInfo.openingTimeFormatted}
              onAction={() => setShowGoOnlineConfirm(true)}
              isActioning={isToggling}
              disabled={!canGoOnline}
            />
          )}

        {/* Profile incomplete banner - always visible when profile &lt; 100% */}
        {!canGoOnline && (
          <div
            className={`bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/50 transition-[padding] duration-300 ${
              isSidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
            }`}
          >
            <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Profile incomplete ({percentage}%)
                </span>
                <span className="text-xs text-amber-700 dark:text-amber-300 truncate">
                  {missingRequired.length > 0 && `Missing: ${missingRequired.slice(0, 3).join(', ')}${missingRequired.length > 3 ? '…' : ''}`}
                </span>
              </div>
              <button
                onClick={() => navigate(ROUTES.VENDOR_DASHBOARD_SETTINGS)}
                className="text-sm font-medium text-amber-800 dark:text-amber-200 hover:underline underline-offset-2 shrink-0"
              >
                Finish setup →
              </button>
            </div>
          </div>
        )}

        <div className="flex">
        {/* Sidebar - Logo + Navigation, collapsible on desktop */}
        <aside
          className={`
            fixed top-0 left-0 bottom-0 z-40
            lg:z-30
            bg-card border-r border-border
            transition-all duration-300 ease-in-out overflow-hidden
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:translate-x-0
            ${isSidebarCollapsed ? 'lg:w-[72px]' : 'lg:w-64'}
            w-64
          `}
        >
          <div className="h-full flex flex-col overflow-y-auto">
            {/* Logo Section - icon only when collapsed */}
            <div className={`h-16 flex items-center shrink-0 border-b border-border transition-all duration-300 ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-4'}`}>
              <img src={logoImage} alt="PocketShop" className="w-9 h-9 object-contain shrink-0" />
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <div className="text-foreground text-sm font-semibold leading-tight truncate">PocketShop</div>
                  <div className="text-muted-foreground text-xs leading-tight">Vendor Portal</div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className={`flex-1 py-4 transition-all duration-300 ${isSidebarCollapsed ? 'px-2' : 'px-4'}`}>
              <nav className="space-y-5 text-sm">
                {/* CORE */}
                <div>
                  {!isSidebarCollapsed && (
                    <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Core</p>
                  )}
                  <div className="space-y-1">
                    {coreItems.map((item) => {
                      const isActive = isActiveRoute(item.path);
                      const btn = (
                        <button
                          key={item.id}
                          onClick={() => handleNavigation(item.path, item.openInNewTab)}
                          onMouseEnter={() => handleNavItemHover(item.path)}
                          className={`relative w-full flex items-center rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary ${
                            isSidebarCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'
                          } ${isActive ? 'bg-primary/10 text-primary font-semibold border-l-4 border-l-primary -ml-px' : 'text-foreground hover:bg-muted hover:text-foreground'} ${isSidebarCollapsed ? 'pl-0 border-l-0' : 'pl-[11px]'}`}
                        >
                          {item.icon}
                          {!isSidebarCollapsed && (
                            <>
                              <div className="flex flex-col items-start text-left min-w-0 flex-1">
                                <span>{item.label}</span>
                                <span className={`text-xs truncate w-full ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>{item.description}</span>
                              </div>
                              {isActive && <div className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0" />}
                            </>
                          )}
                        </button>
                      );
                      return isSidebarCollapsed ? (
                        <Tooltip key={item.id}>
                          <TooltipTrigger asChild>{btn}</TooltipTrigger>
                          <TooltipContent side="right">{item.label}</TooltipContent>
                        </Tooltip>
                      ) : (
                        <React.Fragment key={item.id}>{btn}</React.Fragment>
                      );
                    })}
                  </div>
                </div>
                {/* BUSINESS */}
                <div>
                  {!isSidebarCollapsed && (
                    <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Business</p>
                  )}
                  <div className="space-y-1">
                    {businessItems.map((item) => {
                      const isActive = isActiveRoute(item.path);
                      const btn = (
                        <button
                          key={item.id}
                          onClick={() => handleNavigation(item.path, item.openInNewTab)}
                          onMouseEnter={() => handleNavItemHover(item.path)}
                          className={`relative w-full flex items-center rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary ${
                            isSidebarCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'
                          } ${isActive ? 'bg-primary/10 text-primary font-semibold border-l-4 border-l-primary -ml-px' : 'text-foreground hover:bg-muted hover:text-foreground'} ${isSidebarCollapsed ? 'pl-0 border-l-0' : 'pl-[11px]'}`}
                        >
                          {item.icon}
                          {!isSidebarCollapsed && (
                            <>
                              <div className="flex flex-col items-start text-left min-w-0 flex-1">
                                <span>{item.label}</span>
                                <span className={`text-xs truncate w-full ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>{item.description}</span>
                              </div>
                              {isActive && <div className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0" />}
                            </>
                          )}
                        </button>
                      );
                      return isSidebarCollapsed ? (
                        <Tooltip key={item.id}>
                          <TooltipTrigger asChild>{btn}</TooltipTrigger>
                          <TooltipContent side="right">{item.label}</TooltipContent>
                        </Tooltip>
                      ) : (
                        <React.Fragment key={item.id}>{btn}</React.Fragment>
                      );
                    })}
                  </div>
                </div>
                {/* SETTINGS */}
                <div>
                  {!isSidebarCollapsed && (
                    <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Settings</p>
                  )}
                  <div className="space-y-1">
                    {settingsItems.map((item) => {
                      const isActive = isActiveRoute(item.path);
                      const btn = (
                        <button
                          key={item.id}
                          onClick={() => handleNavigation(item.path, item.openInNewTab)}
                          onMouseEnter={() => handleNavItemHover(item.path)}
                          className={`relative w-full flex items-center rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary ${
                            isSidebarCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'
                          } ${isActive ? 'bg-primary/10 text-primary font-semibold border-l-4 border-l-primary -ml-px' : 'text-foreground hover:bg-muted hover:text-foreground'} ${isSidebarCollapsed ? 'pl-0 border-l-0' : 'pl-[11px]'}`}
                        >
                          {item.icon}
                          {!isSidebarCollapsed && (
                            <>
                              <div className="flex flex-col items-start text-left min-w-0 flex-1">
                                <span>{item.label}</span>
                                <span className={`text-xs truncate w-full ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>{item.description}</span>
                              </div>
                              {isActive && <div className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0" />}
                            </>
                          )}
                        </button>
                      );
                      return isSidebarCollapsed ? (
                        <Tooltip key={item.id}>
                          <TooltipTrigger asChild>{btn}</TooltipTrigger>
                          <TooltipContent side="right">{item.label}</TooltipContent>
                        </Tooltip>
                      ) : (
                        <React.Fragment key={item.id}>{btn}</React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </nav>
            </div>

            {/* Collapse/Expand toggle - desktop only */}
            <div className="hidden lg:flex border-t border-border p-2 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className={`w-full flex items-center justify-center rounded-md p-2.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${isSidebarCollapsed ? '' : 'gap-2'}`}
                    aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  >
                    {isSidebarCollapsed ? (
                      <ChevronRight className="h-5 w-5" />
                    ) : (
                      <>
                        <ChevronLeft className="h-5 w-5" />
                        <span className="text-xs font-medium">Collapse</span>
                      </>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile - starts below navbar so "Go Online" / StatusToggle stays clickable */}
        {isSidebarOpen && (
          <div
            className="fixed top-16 left-0 right-0 bottom-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Main Content Area - padding matches sidebar width */}
        <main
          className={`flex-1 min-w-0 bg-background min-h-screen transition-[padding] duration-300 ${
            isSidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
          }`}
        >
          {/* Consistent padding wrapper for all pages */}
          <div className="p-6 lg:p-8">
            {children}
          </div>
        </main>
        </div>
      </div>
      <ConfirmActionDialog
        open={showGoOnlineConfirm}
        onOpenChange={setShowGoOnlineConfirm}
        onConfirm={async () => {
          setShowGoOnlineConfirm(false);
          await goOnlineWithExtension(30);
        }}
        title="Go online?"
        description="Your store will become live to customers and can start receiving orders."
        confirmLabel="Yes, go online"
        isConfirming={isToggling}
      />
    </div>
  );
};

const DashboardLayout: React.FC<DashboardLayoutProps> = (props) => (
  <VendorStatusProvider>
    <DashboardLayoutInner {...props} />
  </VendorStatusProvider>
);

export default DashboardLayout;
