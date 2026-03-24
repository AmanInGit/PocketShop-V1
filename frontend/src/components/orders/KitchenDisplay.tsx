/**
 * Kitchen Display - Live order tickets & production summary
 * Migrated from Migration_Data/backup-after-f94dab5
 */

import { useMemo, useState, useRef, useEffect } from 'react';
import { useOrders } from '@/features/vendor/hooks/useOrders';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OrderStatusBadge } from './OrderStatusBadge';
import { ChefHat, Clock, CheckCircle2, Package, Loader2, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface AggregatedItem {
  productId: string;
  productName: string;
  imageUrl: string | null;
  totalQuantity: number;
  orderIds: string[];
}

export function KitchenDisplay() {
  const { data: orders, isLoading } = useOrders();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const prevOrderIdsRef = useRef<Set<string>>(new Set());
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());

  const kitchenOrders = useMemo(() => {
    if (!orders) return [];
    return (orders as { id: string; status?: string; created_at: string; [key: string]: unknown }[])
      .filter((o) => {
        const status = String(o.status || '').toLowerCase();
        return status === 'processing' || status === 'preparing' || status === 'ready';
      })
      .sort(
        (a: { created_at: string }, b: { created_at: string }) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
  }, [orders]);

  useEffect(() => {
    const currentIds = new Set(kitchenOrders.map((o: { id: string }) => o.id));
    const freshIds = new Set<string>();
    currentIds.forEach((id) => {
      if (!prevOrderIdsRef.current.has(id)) freshIds.add(id);
    });
    if (freshIds.size > 0) {
      setNewOrderIds(freshIds);
      const timer = setTimeout(() => setNewOrderIds(new Set()), 3000);
      return () => clearTimeout(timer);
    }
    prevOrderIdsRef.current = currentIds;
  }, [kitchenOrders]);

  const aggregatedItems = useMemo(() => {
    const processingOrders = kitchenOrders.filter((o: { status?: string }) => {
      const status = String(o.status || '').toLowerCase();
      return status === 'processing' || status === 'preparing';
    });
    const map = new Map<string, AggregatedItem>();

    (processingOrders as { id: string; items?: unknown; order_items?: unknown }[]).forEach((order) => {
      const rawItems = order.order_items || (Array.isArray(order.items) ? order.items : []);
      const items = (Array.isArray(rawItems) ? rawItems : []) as { product_id?: string; productId?: string; quantity: number; products?: { name?: string; image_url?: string }; product?: { name?: string } }[];
      items.forEach((item) => {
        const pid = item.product_id || item.productId || 'unknown';
        const name = item.products?.name || item.product?.name || 'Unknown';
        const img = item.products?.image_url || null;
        const existing = map.get(pid);
        if (existing) {
          existing.totalQuantity += item.quantity;
          existing.orderIds.push(order.id);
        } else {
          map.set(pid, {
            productId: pid,
            productName: name,
            imageUrl: img,
            totalQuantity: item.quantity,
            orderIds: [order.id],
          });
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [kitchenOrders]);

  const batchCompleteMutation = useMutation({
    mutationFn: async (item: AggregatedItem) => {
      const uniqueOrderIds = [...new Set(item.orderIds)];
      for (const orderId of uniqueOrderIds) {
        const { error } = await supabase.from('orders').update({ status: 'ready' }).eq('id', orderId);
        if (error) throw error;
        if (user?.id) {
          await supabase.from('notifications').insert({
            user_id: user.id,
            title: 'Order Ready',
            message: `Order moved to ready (batch: ${item.productName})`,
            type: 'order_update',
          });
        }
      }
    },
    onSuccess: (_, item) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(`${item.productName} marked ready across ${new Set(item.orderIds).size} order(s)`);
    },
    onError: () => toast.error('Failed to batch update orders'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: string; newStatus: string }) => {
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Status Updated');
    },
    onError: () => toast.error('Failed to update order'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const processingOrders = kitchenOrders.filter((o: { status?: string }) => {
    const status = String(o.status || '').toLowerCase();
    return status === 'processing' || status === 'preparing';
  });
  const readyOrders = kitchenOrders.filter((o: { status?: string }) => o.status === 'ready');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-12rem)]">
      <div className="lg:col-span-3 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <ChefHat className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Cooking</h3>
            <Badge variant="secondary">{processingOrders.length}</Badge>
          </div>

          {processingOrders.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ChefHat className="h-12 w-12 mb-3 opacity-40" />
                <p>No orders being prepared</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {processingOrders.map((order) => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -20 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  >
                    <Card className={newOrderIds.has(order.id) ? 'border-2 border-primary' : ''}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-bold">
                            #{order.order_number || order.id.slice(0, 8)}
                          </CardTitle>
                          <OrderStatusBadge status={order.status || 'processing'} />
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                        </div>
                        {order.customer_name && (
                          <p className="text-sm text-muted-foreground">{order.customer_name}</p>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {((order.order_items as { id?: string; quantity: number; products?: { name?: string } }[]) || (Array.isArray(order.items) ? order.items : []) || []).map((item: { id?: string; quantity: number; products?: { name?: string } }, idx: number) => (
                          <div key={item.id || idx} className="flex justify-between items-center text-sm">
                            <span className="font-medium">
                              {item.products?.name || 'Item'}
                            </span>
                            <Badge variant="outline" className="font-mono">x{item.quantity}</Badge>
                          </div>
                        ))}
                        <Button
                          className="w-full"
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ orderId: order.id, newStatus: 'ready' })}
                          disabled={updateStatusMutation.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Mark Ready
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {readyOrders.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center">
                <Package className="h-4 w-4 text-accent" />
              </div>
              <h3 className="text-lg font-semibold">Ready for Pickup</h3>
              <Badge variant="secondary">{readyOrders.length}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {readyOrders.map((order) => (
                  <motion.div key={order.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                    <Card className="border-2 border-accent/30 bg-accent/5">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-bold">
                            #{order.order_number || order.id.slice(0, 8)}
                          </CardTitle>
                          <OrderStatusBadge status={order.status || 'ready'} />
                        </div>
                        {order.customer_name && <p className="text-sm text-muted-foreground">{order.customer_name}</p>}
                      </CardHeader>
                      <CardContent>
                        <Button
                          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ orderId: order.id, newStatus: 'completed' })}
                          disabled={updateStatusMutation.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-1">
        <Card className="sticky top-4 border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Production Summary</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              Aggregated items from {processingOrders.length} active order(s)
            </p>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-22rem)]">
              {aggregatedItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No items in production</p>
              ) : (
                <div className="space-y-3">
                  {aggregatedItems.map((item) => (
                    <div key={item.productId} className="rounded-lg border bg-card p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate flex-1">{item.productName}</span>
                        <Badge className="font-mono text-base px-3 bg-primary text-primary-foreground">
                          {item.totalQuantity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Across {new Set(item.orderIds).size} order(s)</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => batchCompleteMutation.mutate(item)}
                        disabled={batchCompleteMutation.isPending}
                      >
                        {batchCompleteMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                        Batch Complete
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
