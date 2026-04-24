/**
 * Order Detail Page (New - Adapted from reference repo)
 * 
 * Detailed view of a single order with status management.
 * Adapted to use frontend's structure.
 * 
 * Note: Database queries will be adapted in Phase 3/4.
 */

import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, Mail, Receipt, IndianRupee, Loader2 } from "lucide-react";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { OrderStatusSelect } from "@/components/orders/OrderStatusSelect";
import { OrderMessaging } from "@/components/orders/OrderMessaging";
import { OrderReceipt } from "@/components/orders/OrderReceipt";
import { PaymentStatusButton } from "@/components/orders/PaymentStatusButton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useVendor } from "@/features/vendor/hooks/useVendor";
import { useOrder } from "@/features/vendor/hooks/useOrder";
import { ROUTES } from "@/constants/routes";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

type AuditLogEntry = {
  audit_id: number;
  action_type: string;
  actor_id: string;
  state_before: Record<string, any> | null;
  state_after: Record<string, any> | null;
  timestamp: string;
};

const formatAuditAction = (action: string) => action.replace(/_/g, ' ');

function RecordPaymentFallback({
  orderId,
  amount,
  paymentMethod,
  onSuccess,
}: {
  orderId: string;
  amount: number;
  paymentMethod: string | null;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const recordMutation = useMutation({
    mutationFn: async () => {
      const method = (paymentMethod === 'upi' || paymentMethod === 'wallet' || paymentMethod === 'card')
        ? paymentMethod
        : 'cash';
      const { error } = await supabase.from('payments').insert({
        order_id: orderId,
        amount,
        payment_method: method,
        payment_status: 'completed',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment', orderId] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-stats'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Payment recorded', { description: `₹${amount.toLocaleString()} has been recorded` });
      onSuccess();
    },
    onError: (e: any) => {
      toast.error(e.message || 'Failed to record payment');
    },
  });

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">No payment record found for this order.</p>
      <p className="text-sm font-medium">Amount: ₹{amount.toLocaleString()}</p>
      <Button
        onClick={() => recordMutation.mutate()}
        disabled={recordMutation.isPending}
      >
        {recordMutation.isPending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <IndianRupee className="h-4 w-4 mr-2" />
        )}
        Mark as Paid
      </Button>
    </div>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showReceipt, setShowReceipt] = useState(false);
  const { data: vendor } = useVendor();
  const { data: order, isLoading } = useOrder(id);

  // Get payment for this order
  const { data: payment } = useQuery({
    queryKey: ['payment', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', id)
        .single();

      if (error) {
        // If table doesn't exist or no payment found, return null
        if (error.code === '42P01' || error.message?.includes('does not exist') || error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }
      return data;
    },
    enabled: !!id,
    retry: false,
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['order-audit', id],
    queryFn: async (): Promise<AuditLogEntry[]> => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('audit_logs')
        .select('audit_id, action_type, actor_id, state_before, state_after, timestamp')
        .eq('entity_table', 'orders')
        .eq('entity_id', id)
        .order('timestamp', { ascending: false });

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return [];
        }
        throw error;
      }
      return (data ?? []) as AuditLogEntry[];
    },
    enabled: !!id,
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(ROUTES.VENDOR_DASHBOARD_ORDERS)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Order Not Found</h2>
            <p className="text-muted-foreground">
              The order you're looking for doesn't exist
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Order not found</p>
              <Button onClick={() => navigate(ROUTES.VENDOR_DASHBOARD_ORDERS)}>
                Back to Orders
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isTerminal = order.status === 'completed' || order.status === 'cancelled';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(ROUTES.VENDOR_DASHBOARD_ORDERS)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-3xl font-bold tracking-tight">Order Details</h2>
          <p className="text-muted-foreground">
            Order #{order.order_number}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowReceipt(!showReceipt)}>
            <Receipt className="mr-2 h-4 w-4" />
            {showReceipt ? 'Hide' : 'Show'} Receipt
          </Button>
        </div>
      </div>

      <Card className="sticky top-2 z-10 border-primary/20">
        <CardContent className="py-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Order</p>
              <p className="font-semibold">#{order.order_number}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <OrderStatusBadge status={order.status} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="font-semibold">₹{Number(order.total_amount).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="font-semibold">{format(new Date(order.created_at), 'MMM dd, HH:mm')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {showReceipt && (
        <OrderReceipt order={order} payment={payment} />
      )}

      <div className="grid gap-4 lg:grid-cols-[1.9fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 text-left">Item</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Unit</th>
                      <th className="px-3 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.order_items?.map((item: any) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-3 py-2">
                          <p className="font-medium leading-tight">{item.products?.name || 'Product'}</p>
                        </td>
                        <td className="px-3 py-2 text-right">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">₹{Number(item.unit_price).toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-medium">₹{Number(item.subtotal).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center pt-3 text-sm">
                <p className="font-semibold">Total</p>
                <p className="text-lg font-bold">₹{Number(order.total_amount).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isTerminal ? (
                <div>
                  <p className="text-sm text-muted-foreground">Status is locked for terminal orders.</p>
                  <div className="mt-2">
                    <OrderStatusBadge status={order.status} />
                  </div>
                </div>
              ) : (
                <OrderStatusSelect
                  orderId={order.id}
                  currentStatus={order.status as any}
                  vendorId={vendor?.id}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Name</p>
                <p className="font-medium">{order.customer_name || 'Guest'}</p>
              </div>
              {order.customer_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{order.customer_phone}</p>
                </div>
              )}
              {order.customer_email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{order.customer_email}</p>
                </div>
              )}
              {order.delivery_address && (
                <div>
                  <p className="text-muted-foreground">Delivery Address</p>
                  <p className="font-medium">{order.delivery_address}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
            </CardHeader>
            <CardContent>
              {order.status === 'cancelled' ? (
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Method</p>
                    <p className="font-medium capitalize">{payment?.payment_method || order.payment_method || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Amount</p>
                    <p className="font-medium">₹{Number(order.total_amount).toLocaleString()}</p>
                  </div>
                  <Badge variant="outline" className="text-muted-foreground">
                    N/A — Order cancelled
                  </Badge>
                </div>
              ) : payment ? (
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Method</p>
                    <p className="font-medium capitalize">{payment.payment_method}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Amount</p>
                    <p className="font-medium">₹{Number(payment.amount).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <Badge variant={payment.payment_status === 'completed' ? 'default' : 'secondary'}>
                      {payment.payment_status}
                    </Badge>
                  </div>
                  <PaymentStatusButton
                    orderId={order.id}
                    paymentStatus={payment.payment_status}
                    amount={Number(payment.amount)}
                  />
                </div>
              ) : (
                <RecordPaymentFallback
                  orderId={order.id}
                  amount={Number(order.total_amount)}
                  paymentMethod={order.payment_method}
                  onSuccess={() => queryClient.invalidateQueries({ queryKey: ['payment', id] })}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Progressive Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <details className="rounded-md border p-3">
                <summary className="cursor-pointer text-sm font-medium">Messages</summary>
                <div className="pt-3">
                  <OrderMessaging orderId={order.id} vendorId={vendor?.id} />
                </div>
              </details>
              <details className="rounded-md border p-3">
                <summary className="cursor-pointer text-sm font-medium">Audit Timeline</summary>
                <div className="pt-3 space-y-2">
                  {auditLogs.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No audit entries yet.</p>
                  ) : (
                    auditLogs.map((entry) => (
                      <div key={entry.audit_id} className="rounded-md border p-2 text-xs">
                        <p className="font-semibold">{formatAuditAction(entry.action_type)}</p>
                        <p className="text-muted-foreground">
                          {format(new Date(entry.timestamp), 'MMM dd, yyyy HH:mm')} • {entry.actor_id}
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          {entry.state_before?.status ?? '—'} → {entry.state_after?.status ?? '—'}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </details>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

