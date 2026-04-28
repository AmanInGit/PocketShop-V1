import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Package, ChevronDown, ChevronUp, Clock, CheckCircle2 } from 'lucide-react';
import { useActiveOrders } from '@/features/vendor/hooks/useActiveOrders';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

interface ActiveOrdersWidgetProps {
  vendorId: string;
}

export function ActiveOrdersWidget({ vendorId }: ActiveOrdersWidgetProps) {
  const { activeOrders, updateOrderStatus, removeActiveOrder } = useActiveOrders(vendorId);
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(true);
  const [liveOrderStatuses, setLiveOrderStatuses] = useState<Record<string, any>>({});
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Subscribe to real-time order updates
  useEffect(() => {
    if (activeOrders.length === 0) return;

    const orderIds = activeOrders.map(order => order.orderId);
    
    // Initial fetch of current statuses
    const fetchStatuses = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('id, status, kitchen_state, queue_rank, table_code, created_at, activated_at, delivered_at')
          .in('id', orderIds);

        if (error) throw error;

        const statusMap: Record<string, any> = {};
        data?.forEach(order => {
          statusMap[order.id] = order;
        });
        setLiveOrderStatuses(statusMap);

        const foundIds = new Set((data || []).map((o) => o.id));
        // If order is deleted, or terminal, remove it from local active cache.
        activeOrders.forEach((order) => {
          if (!foundIds.has(order.orderId)) {
            removeActiveOrder(order.orderId);
            return;
          }
          const status = String(statusMap[order.orderId]?.status || '').toLowerCase();
          if (status === 'completed' || status === 'cancelled') {
            removeActiveOrder(order.orderId);
          }
        });
      } catch (error) {
        console.error('Error fetching order statuses:', error);
      }
    };

    fetchStatuses();

    // Set up real-time subscription
    const channel = supabase
      .channel('order-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=in.(${orderIds.join(',')})`,
        },
        (payload) => {
          const updatedOrder = payload.new as any;
          setLiveOrderStatuses(prev => ({
            ...prev,
            [updatedOrder.id]: {
              ...(prev[updatedOrder.id] || {}),
              ...updatedOrder,
            },
          }));
          updateOrderStatus(updatedOrder.id, updatedOrder.status);
          if (updatedOrder.status === 'completed' || updatedOrder.status === 'cancelled') {
            removeActiveOrder(updatedOrder.id);
          }
          
          // Show notification for status change
          if (updatedOrder.status === 'ready') {
            toast.success('Your order is ready for pickup!');
          } else if (updatedOrder.status === 'completed') {
            toast.success('Order completed! Thank you!');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeOrders, updateOrderStatus, removeActiveOrder]);

  const visibleOrders = activeOrders.filter((order) => {
    const liveStatus = String(liveOrderStatuses[order.orderId]?.status || order.status || '').toLowerCase();
    return liveStatus !== 'completed' && liveStatus !== 'cancelled';
  });

  if (visibleOrders.length === 0) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'preparing':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'ready':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'completed':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      case 'cancelled':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'preparing':
        return <Package className="h-4 w-4" />;
      case 'ready':
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <Card className="sticky top-4 z-10 shadow-lg border-2">
      <CardHeader 
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">
              Active Orders ({visibleOrders.length})
            </CardTitle>
          </div>
          <Button variant="ghost" size="sm">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-3">
          {visibleOrders.map((order, index) => {
            const liveOrder = liveOrderStatuses[order.orderId];
            const currentStatus = liveOrder?.status || order.status;
            const kitchenState = liveOrder?.kitchen_state as string | undefined;
            const tableCode = liveOrder?.table_code as string | undefined;
            const queueRank = liveOrder?.queue_rank as number | undefined;
            const timerStart = liveOrder?.activated_at || liveOrder?.created_at || order.createdAt;
            const elapsedSeconds = Math.max(0, Math.floor((now - new Date(timerStart).getTime()) / 1000));
            const mm = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
            const ss = String(elapsedSeconds % 60).padStart(2, '0');
            
            return (
              <div key={order.orderId}>
                {index > 0 && <Separator className="my-3" />}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="font-mono text-xs">
                          #{order.orderNumber}
                        </Badge>
                        <Badge className={getStatusColor(currentStatus)}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(currentStatus)}
                            {currentStatus}
                          </span>
                        </Badge>
                      </div>
                      <p className="text-sm font-medium truncate">
                        {order.vendorName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ₹{order.totalAmount}
                      </p>
                      {tableCode && tableCode !== 'PICKUP' && (
                        <p className="text-xs text-muted-foreground">Table {tableCode}</p>
                      )}
                      <p className="text-xs text-muted-foreground">Elapsed: {mm}:{ss}</p>
                      {kitchenState && (
                        <p className="text-xs text-muted-foreground capitalize">
                          {kitchenState}{kitchenState === 'queued' && queueRank ? ` (Queue #${queueRank})` : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate(`/order-tracking/${order.orderId}`)}
                  >
                    Track Live
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}
