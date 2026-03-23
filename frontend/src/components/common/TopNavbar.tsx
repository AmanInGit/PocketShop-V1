/**
 * Top Navbar Component
 * 
 * Persistent header bar that spans the full width of the application.
 * Contains logo, search, status indicator, and user menu.
 * Handles operational hours: modal for going online outside hours, extended session timer.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, LogOut, ChevronDown, User, Menu } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import StatusToggle from '@/components/common/StatusToggle';
import { useVendorStatusContext } from '@/features/vendor/context/VendorStatusContext';
import { useProfileCompletion } from '@/features/vendor/hooks/useProfileCompletion';
import { useProfileCompletionModal } from '@/features/vendor/context/ProfileCompletionModalContext';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { GoOnlineOutsideHoursModal } from '@/components/vendor/GoOnlineOutsideHoursModal';
import { ExtendedSessionTimer } from '@/components/vendor/ExtendedSessionTimer';
import { ConfirmActionDialog } from '@/components/common/ConfirmActionDialog';
import comradeAiLogo from '@/assets/images/Comrade_AI.png';

interface TopNavbarProps {
  onMenuToggle?: () => void;
  isMenuOpen?: boolean;
  isSidebarCollapsed?: boolean;
  sidebarWidth?: number;
  /**
   * Universal search options (typically the sidebar navigation items).
   * When provided, the search input will filter and navigate to matching routes.
   */
  searchItems?: Array<{
    id: string;
    label: string;
    description?: string;
    path: string;
    openInNewTab?: boolean;
  }>;
  onSearchSelect?: (item: { path: string; openInNewTab?: boolean }) => void;
}

const TopNavbar: React.FC<TopNavbarProps> = ({
  onMenuToggle,
  isMenuOpen: _isMenuOpen,
  isSidebarCollapsed = false,
  sidebarWidth = 256,
  searchItems,
  onSearchSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showGoOfflineConfirm, setShowGoOfflineConfirm] = useState(false);
  const [offlineReason, setOfflineReason] = useState('');
  const [showComradeAi, setShowComradeAi] = useState(false);
  const [showGoOnlineModal, setShowGoOnlineModal] = useState(false);
  const [showGoOnlineConfirm, setShowGoOnlineConfirm] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const {
    isOnline,
    isToggling,
    toggleStatus,
    goOnlineWithExtension,
    extendSession,
    operationalInfo,
    isInExtendedSession,
    minutesRemainingInExtendedSession,
  } = useVendorStatusContext();
  const { canGoOnline, percentage } = useProfileCompletion();
  const { openProfileCompletionModal } = useProfileCompletionModal();

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredSearchItems = useMemo(() => {
    if (!searchItems?.length) return [];
    if (!normalizedQuery) return [];
    return searchItems
      .filter((item) => {
        const haystack = `${item.label} ${item.description ?? ''}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .slice(0, 60);
  }, [normalizedQuery, searchItems]);

  useEffect(() => {
    setActiveResultIndex(0);
    setSearchOpen(!!normalizedQuery && filteredSearchItems.length > 0);
  }, [normalizedQuery, filteredSearchItems.length]);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (!searchWrapRef.current) return;
      if (!searchWrapRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  /** When profile incomplete and trying to go online, show modal instead. Allow going offline anytime. */
  const statusToggleDisabled = isToggling;
  const statusToggleTitle = !isOnline && !canGoOnline
    ? `Profile incomplete (${percentage}%) — click to see what to fill`
    : isOnline ? 'Click to go offline' : 'Click to go online';

  const attemptToggleStatus = async () => {
    if (!isOnline && !canGoOnline) {
      openProfileCompletionModal();
      return;
    }
    const result = await toggleStatus();
    if (result.success === false && 'needExtensionModal' in result && result.needExtensionModal) {
      setShowGoOnlineModal(true);
    }
  };

  const handleStatusToggle = () => {
    if (!isOnline) {
      setShowGoOnlineConfirm(true);
      return;
    }
    setShowGoOfflineConfirm(true);
  };

  const handleGoOnlineConfirm = async (minutes: number) => {
    await goOnlineWithExtension(minutes);
  };

  const requestLogout = () => {
    // Close dropdown immediately to avoid backdrop/layering issues.
    setUserMenuOpen(false);
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      navigate(ROUTES.BUSINESS);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 h-16 bg-background border-b border-border z-50 shadow-sm transition-[left] duration-300 ${
        (sidebarWidth ?? 256) <= 72 ? 'lg:left-[72px]' : 'lg:left-64'
      }`}
    >
      <div className="h-full px-4 sm:px-6 w-full min-w-0">
        <div className="flex items-center h-full w-full min-w-0 gap-4">
          {/* Left: Universal Search - pinned to left */}
          <div className="flex items-center gap-3 flex-shrink-0 min-w-0">
            {onMenuToggle && (
              <button
                onClick={onMenuToggle}
                className="lg:hidden h-9 w-9 shrink-0 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
                aria-label="Toggle sidebar"
              >
                <Menu className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
            <div
              ref={searchWrapRef}
              className="relative w-60 sm:w-80 md:max-w-lg min-w-[200px] flex-shrink-0"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Universal Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (normalizedQuery && filteredSearchItems.length > 0) setSearchOpen(true);
                }}
                onKeyDown={(e) => {
                  if (!searchOpen) return;
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setActiveResultIndex((i) => Math.min(i + 1, filteredSearchItems.length - 1));
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActiveResultIndex((i) => Math.max(i - 1, 0));
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const picked = filteredSearchItems[activeResultIndex];
                    if (picked) {
                      setSearchOpen(false);
                      setSearchQuery('');
                      onSearchSelect?.(picked);
                    }
                  }
                }}
                className="w-full h-9 pl-10 pr-4 rounded-md bg-muted border border-input text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              />

              {searchOpen && (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] bg-popover rounded-lg shadow-lg border border-border z-50 overflow-hidden">
                  {filteredSearchItems.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-muted-foreground">No results</div>
                  ) : (
                    <div className="max-h-80 overflow-auto">
                      {filteredSearchItems.map((item, idx) => {
                        const active = idx === activeResultIndex;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onMouseEnter={() => setActiveResultIndex(idx)}
                            onClick={() => {
                              setSearchOpen(false);
                              setSearchQuery('');
                              onSearchSelect?.(item);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                              active ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                            }`}
                          >
                            <div className="font-medium">{item.label}</div>
                            {item.description ? (
                              <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Spacer - pushes right section to the edge */}
          <div className="flex-1 min-w-4" aria-hidden="true" />

          {/* Right: Status + Theme + Notifications | Account - pinned to right */}
          <div className="flex items-center flex-shrink-0 h-9 gap-4">
            {/* Status, theme, notifications */}
            <div className="flex items-center gap-2">
              {isInExtendedSession && minutesRemainingInExtendedSession != null && (
                <ExtendedSessionTimer
                  minutesRemaining={minutesRemainingInExtendedSession}
                  onExtend={() => extendSession(30)}
                />
              )}
              <span className="relative z-[60] inline-flex items-center h-9" title={statusToggleTitle}>
                <StatusToggle
                  online={isOnline}
                  onToggle={handleStatusToggle}
                  disabled={statusToggleDisabled}
                  title={statusToggleTitle}
                />
              </span>
              <button
                type="button"
                onClick={() => setShowComradeAi(true)}
                className="h-9 w-9 inline-flex items-center justify-center rounded-md
                  bg-indigo-50/70 border border-indigo-100
                  hover:bg-indigo-50 transition-colors
                  dark:bg-indigo-950/40 dark:border-indigo-900
                  focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Comrade AI (Coming soon)"
                title="Comrade AI (Coming soon)"
              >
                <img
                  src={comradeAiLogo}
                  alt="Comrade AI"
                  className="w-6 h-6 object-contain"
                  draggable={false}
                />
              </button>
              <ThemeToggle />
              <NotificationBell />
            </div>

            {/* Account - far right, extra space from notifications */}
            <div className="relative h-9 flex items-center border-l border-border pl-4">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 h-9 px-3 rounded-md hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="User menu"
                aria-expanded={userMenuOpen}
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-sm font-medium text-foreground">
                    {user?.full_name || 'Vendor'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {user?.email?.split('@')[0] || 'user'}
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {userMenuOpen && (
                <>
                  {/* Backdrop to close menu */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  {/* Dropdown Content */}
                  <div className="absolute top-full right-0 mt-2 w-56 bg-popover rounded-lg shadow-lg border border-border z-50 py-1 origin-top-right overflow-hidden">
                    <div className="px-4 py-3 border-b border-border">
                      <div className="text-sm font-medium text-foreground">
                        {user?.full_name || 'Vendor'}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {user?.email}
                      </div>
                    </div>
                    <button
                      onClick={requestLogout}
                      className="w-full flex items-center gap-3 px-4 py-2 text-destructive hover:bg-destructive/10 transition-colors text-sm focus:outline-none"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <GoOnlineOutsideHoursModal
        open={showGoOnlineModal}
        onClose={() => setShowGoOnlineModal(false)}
        onConfirm={handleGoOnlineConfirm}
        isBeforeOpening={operationalInfo?.isBeforeOpening ?? false}
        openingTimeFormatted={operationalInfo?.openingTimeFormatted ?? null}
        closingTimeFormatted={operationalInfo?.closingTimeFormatted ?? null}
        isConfirming={isToggling}
      />
      <ConfirmActionDialog
        open={showGoOnlineConfirm}
        onOpenChange={setShowGoOnlineConfirm}
        onConfirm={async () => {
          setShowGoOnlineConfirm(false);
          await attemptToggleStatus();
        }}
        title="Go online?"
        description="Your store will become live to customers and can start receiving orders."
        confirmLabel="Yes, go online"
        isConfirming={isToggling}
      />
      <ConfirmActionDialog
        open={showGoOfflineConfirm}
        onOpenChange={(open) => {
          setShowGoOfflineConfirm(open);
          if (!open) setOfflineReason('');
        }}
        onConfirm={async () => {
          setShowGoOfflineConfirm(false);
          setOfflineReason('');
          await attemptToggleStatus();
        }}
        title="Go offline?"
        description="Your store will stop accepting new orders while you are offline."
        confirmLabel="Go offline"
        isConfirming={isToggling}
        extraContent={
          operationalInfo?.hasOperationalHours && !operationalInfo.isOutsideHours ? (
            <div className="mt-3">
              <div className="text-sm font-medium text-foreground mb-2">Why are you going offline?</div>
              <textarea
                value={offlineReason}
                onChange={(e) => setOfflineReason(e.target.value)}
                placeholder="Optional (e.g., maintenance, taking a break)"
                className="w-full min-h-[88px] resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                maxLength={200}
              />
              <div className="text-xs text-muted-foreground mt-1">
                {offlineReason.length}/200
              </div>
            </div>
          ) : undefined
        }
      />
      <ConfirmActionDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        onConfirm={async () => {
          setShowLogoutConfirm(false);
          await confirmLogout();
        }}
        title="Log out?"
        description="Are you sure you want to log out of your account?"
        confirmLabel="Logout"
        isConfirming={isLoggingOut}
      />
      <ConfirmActionDialog
        open={showComradeAi}
        onOpenChange={setShowComradeAi}
        onConfirm={() => setShowComradeAi(false)}
        title="Comrade AI"
        description="Comrade AI will help you run your store smarter using your store data (orders, busy hours, and your schedule). This is a UI preview—real recommendations are coming soon."
        confirmLabel="Got it"
        cancelLabel="Close"
        extraContent={
          <div className="mt-2">
            <div className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">
              Coming soon
            </div>
            <div className="text-sm text-muted-foreground mt-3">
              Next: you will see AI suggestions for what to do next (timing, actions, and smarter planning) based on your store activity.
            </div>
          </div>
        }
      />
    </header>
  );
};

export default TopNavbar;

