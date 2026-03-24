/**
 * Order tracking – customer order status view.
 * Shows order status, 5-min acceptance timer for pending orders, and realtime updates.
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, ChevronLeft, RefreshCcw, Store } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { OrderStatusTracker } from '@/components/orders/OrderStatusTracker';
import { AcceptanceCountdown } from '@/components/orders/AcceptanceCountdown';
import { toast } from 'sonner';

interface OrderData {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  total_amount: number;
  status: 'pending' | 'processing' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  payment_status: string;
  payment_method: string | null;
  created_at: string;
  updated_at: string;
  vendor_id: string;
  table_code?: string | null;
  kitchen_state?: 'queued' | 'active' | 'done' | null;
  queue_rank?: number | null;
  activated_at?: string | null;
  delivered_at?: string | null;
  items: Array<{
    product_id?: string;
    name?: string;
    quantity?: number;
    price?: number;
    subtotal?: number;
  }>;
  vendor?: { business_name?: string };
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export default function OrderTracking() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  const fetchOrder = async () => {
    if (!orderId) return;
    try {
      const { data, err } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (err) throw err;
      setOrder(data as OrderData);
      setError(null);
    } catch (e: unknown) {
      console.error('Error fetching order:', e);
      setError('Order not found');
      setOrder(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!orderId) {
      setError('Order ID is missing');
      setIsLoading(false);
      return;
    }

    fetchOrder();

    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          setOrder((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              status: (payload.new as OrderData).status,
              updated_at: (payload.new as OrderData).updated_at,
            };
          });
          toast.success('Order status updated');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const handleRefresh = () => {
    setIsLoading(true);
    fetchOrder();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading order…</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
        <header className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b pt-[env(safe-area-inset-top,0px)]">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => navigate(-1)}
              className="p-3 -ml-3 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800"
              aria-label="Go back"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="flex-1 text-lg font-semibold">Order tracking</h1>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="p-6 text-center">
              <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Order not found</h2>
              <p className="text-sm text-muted-foreground mb-4">
                We couldn&apos;t find this order. Check the link or try again.
              </p>
              <Button onClick={() => navigate(ROUTES.CUSTOMER_HOME)}>Go to Home</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const statusDisplay: Record<string, string> = {
    pending: 'Order placed',
    processing: 'Being prepared',
    preparing: 'Being prepared',
    ready: 'Ready for pickup/delivery',
    completed: 'Completed',
    cancelled: 'Unable to deliver',
  };
  const timerStart = order.activated_at || order.created_at;
  const timerEnd = order.delivered_at || new Date(now).toISOString();
  const startMs = new Date(timerStart).getTime();
  const endMs = new Date(timerEnd).getTime();
  const elapsedText = formatDuration(endMs - startMs);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
      <header className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-sm pt-[env(safe-area-inset-top,0px)]">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-3 -ml-3 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800"
            aria-label="Go back"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="flex-1 text-lg font-semibold text-gray-900 dark:text-slate-100">
            Order #{order.order_number || order.id.slice(-6)}
          </h1>
          <Button variant="ghost" size="icon" onClick={handleRefresh} aria-label="Refresh">
            <RefreshCcw className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Status tracker */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="w-5 h-5" />
              Order status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <OrderStatusTracker currentStatus={order.status} />

            {/* 5-min acceptance timer – only for pending orders */}
            {order.status === 'pending' && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3">
                <AcceptanceCountdown
                  createdAt={order.created_at}
                  status="pending"
                  variant="full"
                  customerView
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Vendor must accept within 5 minutes or the order may be cancelled.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm">
              {order.table_code && order.table_code !== 'PICKUP' && (
                <p>
                  <span className="text-muted-foreground">Table:</span>{' '}
                  <span className="font-medium">{order.table_code}</span>
                </p>
              )}
              <p>
                <span className="text-muted-foreground">Status:</span>{' '}
                <span className="font-medium">{statusDisplay[order.status] ?? order.status}</span>
              </p>
              {order.kitchen_state && (
                <p>
                  <span className="text-muted-foreground">Kitchen:</span>{' '}
                  <span className="font-medium capitalize">
                    {order.kitchen_state}
                    {order.kitchen_state === 'queued' && order.queue_rank ? ` (Queue #${order.queue_rank})` : ''}
                  </span>
                </p>
              )}
              <p>
                <span className="text-muted-foreground">Total:</span>{' '}
                <span className="font-medium">
                  ₹{order.total_amount?.toLocaleString() ?? '—'}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Payment:</span>{' '}
                <span className="capitalize">{order.payment_method ?? '—'}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Ordered at:</span>{' '}
                <span className="font-medium">{new Date(order.created_at).toLocaleString()}</span>
              </p>
              {order.delivered_at ? (
                <>
                  <p>
                    <span className="text-muted-foreground">Delivered at:</span>{' '}
                    <span className="font-medium">{new Date(order.delivered_at).toLocaleString()}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Total duration:</span>{' '}
                    <span className="font-medium">{elapsedText}</span>
                  </p>
                </>
              ) : (
                <p>
                  <span className="text-muted-foreground">Elapsed:</span>{' '}
                  <span className="font-medium">{elapsedText}</span>
                </p>
              )}
            </div>

            {items.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Items</p>
                <ul className="space-y-1 text-sm">
                  {items.map((item, idx) => (
                    <li key={idx}>
                      {item.quantity}x {item.name ?? 'Item'} — ₹
                      {(item.subtotal ?? (item.price ?? 0) * (item.quantity ?? 1)).toLocaleString()}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate(ROUTES.CUSTOMER_HOME)}
        >
          Back to home
        </Button>
      </main>
    </div>
  );
}
