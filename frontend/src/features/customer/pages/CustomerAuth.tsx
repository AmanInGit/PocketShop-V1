/**
 * Customer Auth – mobile OTP flow.
 * Used when customer taps Login on storefront or accesses profile.
 * Supports: Phone OTP verification and Continue as Guest.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/features/auth/context/AuthContext';
import { toE164Phone, toIndian10DigitPhone } from '@/features/common/utils/phone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Phone, Loader2, ChevronLeft, ShieldCheck } from 'lucide-react';
import Logo from '@/features/common/components/Logo';

const CUSTOMER_VIEW_AUTH_KEY = 'pocketshop_customer_view_auth';

export default function CustomerAuth() {
  const [searchParams] = useSearchParams();
  const rawRedirect = searchParams.get('redirect') || '';
  const redirect = (() => {
    // Only allow customer-facing redirects.
    // Prevents accidental redirects into vendor onboarding after OTP.
    if (!rawRedirect) return ROUTES.CUSTOMER_HOME;

    const decoded = (() => {
      try {
        return decodeURIComponent(rawRedirect);
      } catch {
        return rawRedirect;
      }
    })();

    const candidate = decoded.startsWith('/') ? decoded : `/${decoded}`;
    if (candidate.includes('/vendor/')) return ROUTES.CUSTOMER_HOME;
    if (candidate.startsWith('vendor/')) return ROUTES.CUSTOMER_HOME;

    const allowedPrefixes = [
      ROUTES.CUSTOMER_HOME,
      ROUTES.CUSTOMER_PROFILE,
      ROUTES.SHOPS,
      '/storefront/',
      '/order-tracking/',
      '/order-feedback/',
      ROUTES.HOME,
    ];

    const isAllowed = allowedPrefixes.some((p) => candidate === p || candidate.startsWith(p));
    return isAllowed ? candidate : ROUTES.CUSTOMER_HOME;
  })();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localInfo, setLocalInfo] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    otp: '',
  });

  const normalizedPhone = toIndian10DigitPhone(formData.phone) || '';
  const e164Phone = toE164Phone(formData.phone);

  useEffect(() => {
    // Skip auth page when customer is already signed in.
    if (authLoading) return;
    if (user?.role === 'customer') {
      localStorage.setItem(CUSTOMER_VIEW_AUTH_KEY, '1');
      navigate(redirect, { replace: true });
    }
  }, [authLoading, user, navigate, redirect]);

  const ensureCustomerProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data: existing } = await supabase
      .from('customer_profiles')
      .select('id, name, phone')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (existing?.id) {
      // Keep profile phone aligned with verified OTP phone.
      if (e164Phone && existing.phone !== e164Phone) {
        await supabase
          .from('customer_profiles')
          .update({ phone: e164Phone, phone_verified: true })
          .eq('id', existing.id);
      }
      return;
    }

    await supabase.from('customer_profiles').insert({
      user_id: session.user.id,
      name: formData.name.trim() || 'Customer',
      phone: e164Phone,
      email: session.user.email || null,
      phone_verified: true,
    });
  };

  const handleSendOtp = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (loading) return;
    setLocalError(null);
    setLocalInfo(null);
    if (otpCooldown > 0) {
      setLocalError(`Please wait ${otpCooldown}s before requesting new OTP`);
      return;
    }
    if (!e164Phone || normalizedPhone.length !== 10) {
      setLocalError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: e164Phone,
        options: { channel: 'sms' },
      });
      if (error) throw error;
      setOtpSent(true);
      setOtpCooldown(30);
      setLocalInfo(`OTP sent to ${e164Phone}`);
    } catch (error: any) {
      setLocalError(error?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (loading) return;
    setLocalError(null);
    setLocalInfo(null);
    if (!e164Phone || normalizedPhone.length !== 10) {
      setLocalError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!formData.otp || formData.otp.trim().length < 4) {
      setLocalError('Please enter the OTP sent to your phone');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: e164Phone,
        token: formData.otp.trim(),
        type: 'sms',
      });
      if (error) throw error;
      localStorage.setItem(CUSTOMER_VIEW_AUTH_KEY, '1');
      await ensureCustomerProfile();
      navigate(redirect);
    } catch (error: any) {
      setLocalError(error?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestContinue = () => {
    localStorage.setItem(CUSTOMER_VIEW_AUTH_KEY, '0');
    navigate(redirect);
  };

  // cooldown timer
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const id = window.setInterval(() => {
      setOtpCooldown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [otpCooldown]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
      {/* Header - mobile optimized, safe area for notched devices */}
      <header className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 pt-[env(safe-area-inset-top,0px)] px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-3 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 active:bg-gray-200 dark:active:bg-slate-700 touch-manipulation touch-target"
            aria-label="Back"
          >
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div className="flex-1 flex justify-center">
            <Link to={ROUTES.HOME}>
              <Logo size="md" variant="light" />
            </Link>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="flex-1 px-4 py-6 pb-8 max-w-md mx-auto w-full">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-1">Verify your mobile</h1>
        <p className="text-gray-600 dark:text-slate-400 text-sm mb-6">
          Use OTP to sign in and access your order history.
        </p>

        <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4">
          {localError && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">
              {localError}
            </div>
          )}
          {localInfo && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              {localInfo}
            </div>
          )}

          <div>
            <Label htmlFor="name" className="text-gray-700">Name (optional)</Label>
            <div className="relative mt-1">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                className="pl-11 h-12 text-base"
                autoComplete="name"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="phone" className="text-gray-700">Mobile Number</Label>
            <div className="relative mt-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="phone"
                type="tel"
                placeholder="10-digit mobile number"
                value={formData.phone}
                onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                className="pl-11 h-12 text-base"
                autoComplete="tel"
                required
                maxLength={10}
                disabled={otpSent}
              />
            </div>
          </div>

          {otpSent && (
            <div>
              <Label htmlFor="otp" className="text-gray-700">OTP</Label>
              <Input
                id="otp"
                type="text"
                placeholder="Enter OTP"
                value={formData.otp}
                onChange={(e) => setFormData((p) => ({ ...p, otp: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                className="h-12 text-base"
                required
                maxLength={6}
              />
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 min-h-[48px] text-base font-semibold bg-orange-500 hover:bg-orange-600 active:scale-[0.99] touch-target"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : otpSent ? 'Verify OTP' : 'Send OTP'}
          </Button>
          {otpSent && (
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 min-h-[48px] text-base touch-target mt-2"
              disabled={otpCooldown > 0 || loading}
              onClick={handleSendOtp}
            >
              {otpCooldown > 0 ? `Resend OTP in ${otpCooldown}s` : 'Resend OTP'}
            </Button>
          )}
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 min-h-[48px] text-base touch-target"
            onClick={handleGuestContinue}
          >
            Continue as Guest
          </Button>
          <p className="text-center text-gray-500 text-xs mt-3">
            You can sign in later to track orders
          </p>
        </div>
      </main>
    </div>
  );
}

