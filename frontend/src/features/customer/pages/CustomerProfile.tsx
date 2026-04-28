/**
 * Customer Profile – mobile-first profile, orders, and account.
 * Shows profile info, order history, sign out.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { ROUTES } from '@/constants/routes';
import { getPhoneLookupCandidates, toE164Phone, toIndian10DigitPhone } from '@/features/common/utils/phone';
import Logo from '@/features/common/components/Logo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  User,
  Mail,
  Phone,
  LogOut,
  ChevronRight,
  Clock,
  Package,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
const CUSTOMER_VIEW_AUTH_KEY = 'pocketshop_customer_view_auth';

interface OrderSummary {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  payment_status?: string | null;
  table_code?: string | null;
  payment_method?: string | null;
  items?: Array<{ name?: string; quantity?: number }>;
  vendor?: { business_name: string };
}

export default function CustomerProfile() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab = requestedTab === 'orders' || requestedTab === 'profile' ? requestedTab : 'profile';
  const { user, signOut, loading: authLoading } = useAuth();
  const [customerViewAuth, setCustomerViewAuth] = useState<boolean>(() => localStorage.getItem(CUSTOMER_VIEW_AUTH_KEY) === '1');
  const [profile, setProfile] = useState<{ name: string; email: string | null; phone: string } | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [guestPhone, setGuestPhone] = useState('');
  const [guestOtp, setGuestOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [guestPhoneVerified, setGuestPhoneVerified] = useState(false);
  const [guestOrders, setGuestOrders] = useState<OrderSummary[]>([]);
  const [guestOrdersLoading, setGuestOrdersLoading] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);
  const [otpCooldown, setOtpCooldown] = useState(0);

  const shouldShowInCustomerHistory = (row: { payment_method?: string | null; payment_status?: string | null }) => {
    const method = String(row.payment_method || '').toLowerCase();
    const paymentStatus = String(row.payment_status || '').toLowerCase();
    if (method === 'card' && paymentStatus !== 'paid') return false;
    return true;
  };

  useEffect(() => {
    if (!user || user.role !== 'customer' || !customerViewAuth) return;
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data } = await supabase
        .from('customer_profiles')
        .select('name, email, phone')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (data) setProfile(data);
      else {
        localStorage.setItem(CUSTOMER_VIEW_AUTH_KEY, '0');
        setCustomerViewAuth(false);
        setProfile(null);
      }
    };
    loadProfile();
  }, [user, customerViewAuth]);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const id = window.setInterval(() => {
      setOtpCooldown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [otpCooldown]);

  const fetchOrdersByPhone = async (phone: string) => {
    setGuestOrdersLoading(true);
    setGuestError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const sessionPhone = session?.user?.phone ?? null;
      const requestedE164 = toE164Phone(phone);

      // Hard gate: never fetch history unless the authenticated OTP session
      // matches the requested phone identity.
      if (!session?.user || !requestedE164 || requestedE164 !== sessionPhone) {
        setGuestOrders([]);
        setGuestError('Session verification mismatch. Please verify OTP again.');
        return;
      }

      const lookupCandidates = getPhoneLookupCandidates(phone);
      if (lookupCandidates.length === 0) {
        setGuestOrders([]);
        return;
      }
      const { data, error } = await supabase
        .from('orders')
        .select('id,total_amount,status,created_at,vendor_id,payment_method,payment_status')
        .in('customer_phone', lookupCandidates)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const rows = (data || []).filter((row: any) => shouldShowInCustomerHistory(row));
      if (rows.length === 0) {
        setGuestOrders([]);
        return;
      }

      const vendorIds = [...new Set((rows as any[]).map((o) => o.vendor_id).filter(Boolean))];
      const { data: vendors } = await supabase
        .from('vendor_profiles')
        .select('id, business_name')
        .in('id', vendorIds);
      const vMap = new Map((vendors || []).map((v) => [v.id, v]));

      setGuestOrders(
        (rows as any[]).map((o) => ({
          ...o,
          vendor: vMap.get(o.vendor_id),
        }))
      );
    } catch (error: any) {
      console.error('Failed to fetch guest orders:', error);
      setGuestError(error?.message || 'Failed to load order history');
    } finally {
      setGuestOrdersLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setGuestError(null);
    const normalized = toIndian10DigitPhone(guestPhone) || '';
    const e164Phone = toE164Phone(guestPhone);
    if (!e164Phone || normalized.length !== 10) {
      setGuestError('Enter a valid 10-digit mobile number.');
      return;
    }
    if (otpCooldown > 0) {
      setGuestError(`Please wait ${otpCooldown}s before requesting a new OTP.`);
      return;
    }
    setIsSendingOtp(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: e164Phone,
        options: { channel: 'sms' },
      });
      if (error) throw error;
      setOtpCooldown(30);
      setGuestError('OTP sent. Please enter it below.');
    } catch (error: any) {
      console.error('Failed to send OTP:', error);
      setGuestError(error?.message || 'Failed to send OTP');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    setGuestError(null);
    const normalized = toIndian10DigitPhone(guestPhone) || '';
    const e164Phone = toE164Phone(guestPhone);
    if (!e164Phone || normalized.length !== 10) {
      setGuestError('Enter a valid 10-digit mobile number.');
      return;
    }
    if (!guestOtp || guestOtp.length < 4) {
      setGuestError('Enter the OTP sent to your phone.');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: e164Phone,
        token: guestOtp.trim(),
        type: 'sms',
      });
      if (error) throw error;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.phone || session.user.phone !== e164Phone) {
        throw new Error('Verified session does not match requested phone');
      }

      setGuestPhoneVerified(true);
      await fetchOrdersByPhone(e164Phone);
    } catch (error: any) {
      console.error('Failed to verify OTP:', error);
      setGuestError(error?.message || 'OTP verification failed');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'customer' || !customerViewAuth) {
      setOrdersLoading(false);
      return;
    }
    const loadOrders = async () => {
      const { data: cp } = await supabase
        .from('customer_profiles')
        .select('id, phone')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!cp?.id && !cp?.phone) {
        setOrdersLoading(false);
        return;
      }

      let rows: any[] = [];
      if (cp?.id) {
        const { data: byCustomerId } = await supabase
          .from('orders')
          .select(`
            id,
            total_amount,
            status,
            created_at,
            vendor_id,
            table_code,
            payment_method,
            payment_status,
            items
          `)
          .eq('customer_id', cp.id)
          .order('created_at', { ascending: false })
          .limit(100);
        rows = [...rows, ...(byCustomerId || [])];
      }

      if (cp?.phone) {
        const lookupCandidates = getPhoneLookupCandidates(cp.phone);
        if (lookupCandidates.length > 0) {
        const { data: byPhone } = await supabase
          .from('orders')
          .select(`
            id,
            total_amount,
            status,
            created_at,
            vendor_id,
            table_code,
            payment_method,
            payment_status,
            items
          `)
          .in('customer_phone', lookupCandidates)
          .order('created_at', { ascending: false })
          .limit(100);
        rows = [...rows, ...(byPhone || [])];
        }
      }

      const dedup = new Map<string, any>();
      rows.filter((r) => shouldShowInCustomerHistory(r)).forEach((r) => {
        if (!dedup.has(r.id)) dedup.set(r.id, r);
      });

      const data = Array.from(dedup.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      if (data.length > 0) {
        const vendorIds = [...new Set((data as any[]).map((o) => o.vendor_id).filter(Boolean))];
        const { data: vendors } = await supabase
          .from('vendor_profiles')
          .select('id, business_name')
          .in('id', vendorIds);
        const vMap = new Map((vendors || []).map((v) => [v.id, v]));
        setOrders(
          (data as any[]).map((o) => ({
            ...o,
            vendor: vMap.get(o.vendor_id),
          }))
        );
      } else {
        setOrders([]);
      }
      setOrdersLoading(false);
    };
    loadOrders();
  }, [user, customerViewAuth]);

  const handleSignOut = async () => {
    localStorage.setItem(CUSTOMER_VIEW_AUTH_KEY, '0');
    setCustomerViewAuth(false);
    await signOut();
    navigate(ROUTES.HOME);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
      {/* Header - safe area for notched devices */}
      <header className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-sm pt-[env(safe-area-inset-top,0px)]">
        <div className="px-4 py-3 flex items-center justify-between">
          <Link to={ROUTES.CUSTOMER_HOME}>
            <Logo size="md" variant="light" />
          </Link>
          <Link to={ROUTES.HOME} className="touch-target flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 py-2">
            Main site
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="mb-4 inline-flex rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1">
          <button
            type="button"
            onClick={() => setSearchParams({ tab: 'profile' })}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'profile'
                ? 'bg-orange-500 text-white'
                : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            Profile
          </button>
          <button
            type="button"
            onClick={() => setSearchParams({ tab: 'orders' })}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'orders'
                ? 'bg-orange-500 text-white'
                : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            Orders
          </button>
        </div>

        {!user || user.role !== 'customer' || !customerViewAuth ? (
          <div className="space-y-6">
            <div className="text-center py-6 px-4">
              <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                <User className="w-10 h-10 text-gray-400 dark:text-slate-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">Sign in to continue</h2>
              <p className="text-gray-600 dark:text-slate-400 mb-6 max-w-sm mx-auto">
                Create an account or sign in to track orders and manage your profile.
              </p>
              <Link
                to={ROUTES.CUSTOMER_AUTH}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 active:scale-[0.98] touch-target"
              >
                Sign in / Sign up
              </Link>
            </div>

            {activeTab === 'profile' && (
              <section className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
                <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Profile
                </h3>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  Sign in to manage account details, saved identity, and full order history.
                </p>
              </section>
            )}

            {activeTab === 'orders' && (
            <section className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                View orders by mobile number
              </h3>
              <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
                Verify with OTP to view your past guest orders.
              </p>

              <div className="space-y-3">
                <Input
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  maxLength={10}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendOtp}
                    disabled={isSendingOtp || otpCooldown > 0}
                    className="flex-1"
                  >
                    {isSendingOtp ? 'Sending OTP...' : otpCooldown > 0 ? `Resend in ${otpCooldown}s` : 'Send OTP'}
                  </Button>
                  <Input
                    type="text"
                    placeholder="OTP"
                    value={guestOtp}
                    onChange={(e) => setGuestOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    className="w-28"
                  />
                  <Button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={isVerifyingOtp}
                  >
                    {isVerifyingOtp ? 'Verifying...' : 'Verify'}
                  </Button>
                </div>
                {guestError && (
                  <p className="text-sm text-red-600">{guestError}</p>
                )}
              </div>

              {guestPhoneVerified && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-2">Recent orders</h4>
                  {guestOrdersLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                    </div>
                  ) : guestOrders.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-slate-400">No orders found for this mobile number.</p>
                  ) : (
                    <div className="space-y-2">
                      {guestOrders.map((order) => (
                        <Link
                          key={order.id}
                          to={`/order-tracking/${order.id}`}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700"
                        >
                          <div>
                            <p className="font-medium text-gray-900 dark:text-slate-100">
                              {order.vendor?.business_name || 'Order'}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-slate-400">
                              ₹{order.total_amount} • {order.status}
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
            )}
          </div>
        ) : (
          <>
            {activeTab === 'profile' && (
              <>
                {/* Profile card */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
                      <span className="text-2xl font-bold text-orange-600">
                        {(profile?.name || user.full_name || 'U')[0]}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
                        {profile?.name || user.full_name || 'Customer'}
                      </h2>
                      {profile?.email && (
                        <p className="text-sm text-gray-600 dark:text-slate-400 flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {profile.email}
                        </p>
                      )}
                      {profile?.phone && (
                        <p className="text-sm text-gray-600 dark:text-slate-400 flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          {profile.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* My orders */}
            {activeTab === 'orders' && (
            <section className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-3">My orders</h3>
              {ordersLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                </div>
              ) : orders.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-8 text-center">
                  <Package className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-gray-600 dark:text-slate-400">No orders yet</p>
                  <Link
                    to={ROUTES.SHOPS}
                    className="inline-block mt-3 text-orange-600 font-medium"
                  >
                    Browse shops
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(
                    orders.reduce<Record<string, OrderSummary[]>>((acc, order) => {
                      const key = new Date(order.created_at).toLocaleDateString();
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(order);
                      return acc;
                    }, {})
                  ).map(([dateKey, groupedOrders]) => (
                    <div key={dateKey}>
                      <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 px-1 pb-1">{dateKey}</p>
                      <div className="space-y-2">
                        {groupedOrders.map((order) => (
                          <Link
                            key={order.id}
                            to={`/order-tracking/${order.id}`}
                            className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 hover:border-orange-200 dark:hover:border-orange-900/50 active:bg-gray-50 dark:active:bg-slate-800 touch-target min-h-[52px]"
                          >
                            <div className="flex items-center gap-3">
                              <Clock className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="font-medium text-gray-900 dark:text-slate-100">
                                  {order.vendor?.business_name || 'Order'}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-slate-400">
                                  ₹{order.total_amount} • {order.status}
                                  {order.table_code ? ` • Table ${order.table_code}` : ''}
                                </p>
                                {Array.isArray(order.items) && order.items.length > 0 && (
                                  <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-1">
                                    {order.items
                                      .slice(0, 2)
                                      .map((it) => `${it.quantity || 1}x ${it.name || 'Item'}`)
                                      .join(', ')}
                                  </p>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
            )}

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 p-4 bg-white dark:bg-slate-900 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-[0.99] touch-target"
            >
              <LogOut className="w-5 h-5" />
              Sign out
            </button>
          </>
        )}
      </main>
    </div>
  );
}
