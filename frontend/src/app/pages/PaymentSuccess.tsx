import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock3, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { ROUTES } from '@/constants/routes';
import { toast } from 'sonner';
import { useActiveOrders } from '@/features/vendor/hooks/useActiveOrders';

type OrderPaymentState = 'loading' | 'paid' | 'pending' | 'failed' | 'missing';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const orderId = params.get('orderId');
  const [state, setState] = useState<OrderPaymentState>('loading');
  const [secondsToRedirect, setSecondsToRedirect] = useState(3);
  const { addActiveOrder } = useActiveOrders();

  useEffect(() => {
    let mounted = true;
    let timer: number | null = null;
    let polls = 0;
    const MAX_POLLS = 20; // ~80s at 4s interval

    const checkPayment = async () => {
      if (!orderId) {
        if (mounted) setState('missing');
        return;
      }

      const { data, error } = await supabase
        .from('orders')
        .select('payment_status')
        .eq('id', orderId)
        .maybeSingle();

      if (!mounted) return;
      if (error || !data) {
        setState('missing');
        return;
      }

      const paymentStatus = String(data.payment_status || '').toLowerCase();
      if (paymentStatus === 'paid') {
        setState('paid');
        return;
      }
      if (paymentStatus === 'failed' || paymentStatus === 'refunded') {
        setState('failed');
        return;
      }
      polls += 1;
      if (polls >= MAX_POLLS) {
        // Webhooks can sometimes be delayed; keep this as pending state.
        setState('pending');
        return;
      }
      setState('pending');
    };

    checkPayment();
    // Poll briefly to smooth webhook delay experience.
    timer = window.setInterval(checkPayment, 4000);

    return () => {
      mounted = false;
      if (timer !== null) window.clearInterval(timer);
    };
  }, [orderId]);

  useEffect(() => {
    if (state !== 'paid' || !orderId) return;

    toast.success('Payment confirmed. Redirecting to live order tracking...');
    // Add to local active tracking only after payment is confirmed.
    const syncActiveOrder = async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, vendor_id, total_amount, status, created_at, payment_method, payment_status')
        .eq('id', orderId)
        .maybeSingle();
      if (!data) return;
      let vendorName = 'Store';
      if ((data as any).vendor_id) {
        const { data: vendor } = await supabase
          .from('vendor_profiles')
          .select('business_name')
          .eq('id', (data as any).vendor_id)
          .maybeSingle();
        vendorName = vendor?.business_name || vendorName;
      }
      addActiveOrder({
        orderId: data.id,
        orderNumber: (data as any).order_number || data.id,
        vendorId: (data as any).vendor_id || '',
        vendorName,
        totalAmount: Number((data as any).total_amount || 0),
        status: (data as any).status || 'pending',
        createdAt: (data as any).created_at || new Date().toISOString(),
        paymentMethod: String((data as any).payment_method || 'card'),
        paymentStatus: String((data as any).payment_status || 'paid'),
      });
    };
    syncActiveOrder();
    setSecondsToRedirect(3);

    const interval = window.setInterval(() => {
      setSecondsToRedirect((s) => Math.max(0, s - 1));
    }, 1000);

    const timeout = window.setTimeout(() => {
      navigate(`/order-tracking/${orderId}`, { replace: true });
    }, 3000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [state, orderId, navigate, addActiveOrder]);

  const title = useMemo(() => {
    if (state === 'paid') return 'Payment successful';
    if (state === 'pending') return 'Payment received, confirming';
    if (state === 'failed') return 'Payment confirmation delayed';
    if (state === 'missing') return 'Order not found';
    return 'Checking payment status';
  }, [state]);

  const description = useMemo(() => {
    if (state === 'paid') {
      return 'Your payment is confirmed and order is now visible to the vendor.';
    }
    if (state === 'pending') {
      return 'We are waiting for final webhook confirmation. This usually completes in a few seconds.';
    }
    if (state === 'failed') {
      return 'We could not verify payment yet. Please open tracking to check live order status.';
    }
    if (state === 'missing') {
      return 'Unable to find this order. You can go to your profile and check order history.';
    }
    return 'Please wait while we verify payment status.';
  }, [state]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {state === 'paid' && <CheckCircle2 className="h-6 w-6 text-green-600" />}
            {state === 'pending' && <Clock3 className="h-6 w-6 text-amber-600" />}
            {state === 'failed' && <Clock3 className="h-6 w-6 text-rose-600" />}
            {state === 'loading' && <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />}
            {state === 'missing' && <Clock3 className="h-6 w-6 text-gray-500" />}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{description}</p>

          <div className="flex flex-col gap-2">
            {state === 'paid' && orderId && (
              <p className="text-xs text-center text-muted-foreground">
                Redirecting to tracking in {secondsToRedirect}s...
              </p>
            )}
            {orderId && (
              <Button onClick={() => navigate(`/order-tracking/${orderId}`)}>
                Track order
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate(ROUTES.CUSTOMER_PROFILE)}>
              Open my profile
            </Button>
            <Button variant="ghost" onClick={() => navigate(ROUTES.HOME)}>
              Back to home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
