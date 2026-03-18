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
          <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/50 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
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
