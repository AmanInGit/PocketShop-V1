/**
 * Supabase Order Repository
 *
 * Fetches orders from Supabase (vendor_profiles.id = vendor_id).
 * Maps DB schema (pending, preparing, ready, etc.) to frontend Order type (NEW, IN_PROGRESS, etc.)
 */

import type IOrderRepository from '@/services/IOrderRepository';
import type { Order, OrderStatus, MenuItem, ItemStock } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { logAuditEntry } from '@/services/auditService';

// DB status -> frontend OrderStatus
// PHASE4/schema may use 'processing' (not 'preparing'/'confirmed'); support both
const DB_TO_UI_STATUS: Record<string, OrderStatus> = {
  pending: 'NEW',
  confirmed: 'NEW',
  preparing: 'IN_PROGRESS',
  processing: 'IN_PROGRESS',
  ready: 'READY',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
};

// Frontend OrderStatus -> DB status
// Use 'processing' for IN_PROGRESS (PHASE4_MIGRATION uses pending|processing|ready|completed|cancelled)
const UI_TO_DB_STATUS: Record<OrderStatus, string> = {
  NEW: 'pending',
  IN_PROGRESS: 'processing',
  READY: 'ready',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['READY', 'CANCELLED'],
  READY: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

// DB payment_status (orders table: unpaid/paid/refunded) -> frontend PaymentStatus
const DB_TO_UI_PAYMENT: Record<string, 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'> = {
  unpaid: 'PENDING',
  pending: 'PENDING',
  paid: 'PAID',
  completed: 'PAID',
  failed: 'FAILED',
  refunded: 'REFUNDED',
};

// payments.payment_status (enum: pending/completed/failed) -> treat completed as PAID
function resolvePaymentStatus(
  orderPaymentStatus: string | undefined,
  payments: { payment_status?: string }[] | { payment_status?: string } | null | undefined
): 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | undefined {
  const payList = Array.isArray(payments) ? payments : payments ? [payments] : [];
  const hasCompleted = payList.some((p) => (p?.payment_status ?? '').toLowerCase() === 'completed');
  if (hasCompleted) return 'PAID';
  if (orderPaymentStatus) return DB_TO_UI_PAYMENT[orderPaymentStatus];
  return undefined;
}

function mapDbOrderToOrder(row: any): Order {
  const items = Array.isArray(row.items) ? row.items : [];
  const orderItems = items.map((it: any, idx: number) => ({
    itemId: it.product_id ?? it.itemId ?? String(idx),
    qty: it.quantity ?? it.qty ?? 1,
    price: Number(it.price ?? 0),
    name: it.name,
  }));
  const itemsCount = orderItems.reduce((sum: number, it: any) => sum + (it.qty ?? 0), 0);
  const total = Number(row.total_amount ?? row.total ?? 0) || orderItems.reduce((s: number, it: any) => s + (it.qty ?? 0) * (it.price ?? 0), 0);

  return {
    id: row.id,
    vendorId: row.vendor_id,
    total,
    status: DB_TO_UI_STATUS[row.status] ?? 'NEW',
    paymentStatus: resolvePaymentStatus(row.payment_status, row.payments),
    createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.updatedAt ?? new Date().toISOString(),
    version: 1,
    items: orderItems,
    customerName: row.customer_name ?? row.customerName,
    orderNumber: row.order_number ?? row.orderNumber,
    paymentMethod: mapPaymentMethod(row.payment_method ?? row.paymentMethod),
    itemsCount,
    isUrgent: Boolean(row.is_urgent),
  };
}

function mapPaymentMethod(v?: string | null): Order['paymentMethod'] {
  if (!v) return undefined;
  const u = (v || '').toLowerCase();
  if (u === 'cash') return 'CASH';
  if (u === 'card') return 'CARD';
  if (u === 'upi' || u === 'google_pay') return 'GOOGLE_PAY';
  if (u === 'paytm') return 'PAYTM';
  if (u === 'phonepe') return 'PHONEPE';
  return u.toUpperCase() as Order['paymentMethod'];
}

export class SupabaseOrderRepository implements IOrderRepository {
  private async getVendorQueryIds(vendorId: string): Promise<string[]> {
    const ids = new Set<string>([vendorId]);
    const { data } = await supabase
      .from('vendor_profiles')
      .select('id, user_id')
      .or(`id.eq.${vendorId},user_id.eq.${vendorId}`)
      .maybeSingle();

    const profile = data as { id?: string | null; user_id?: string | null } | null;
    if (profile?.id) ids.add(profile.id);
    if (profile?.user_id) ids.add(profile.user_id);
    return Array.from(ids);
  }

  async fetchOrders(vendorId: string): Promise<Order[]> {
    const vendorIds = await this.getVendorQueryIds(vendorId);
    // Use orders.* only – base schema has payment_status on orders. If payments table exists, optional join can be added.
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .in('vendor_id', vendorIds)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.error('orders table does not exist.');
        return [];
      }
      throw error;
    }

    const filtered = (data ?? []).filter((row: any) => {
      const method = String(row?.payment_method || '').toLowerCase();
      const paymentStatus = String(row?.payment_status || '').toLowerCase();
      const isCard = method === 'card';
      const isUnknownMethod = !row?.payment_method;
      const isPaidLike = paymentStatus === 'paid' || paymentStatus === 'completed';
      // Keep unpaid online/unknown orders hidden until payment confirmation.
      if ((isCard || isUnknownMethod) && !isPaidLike) return false;
      return true;
    });

    return filtered.map(mapDbOrderToOrder);
  }

  subscribeToOrders(vendorId: string, cb: (orders: Order[]) => void): () => void {
    let mounted = true;
    let channels: any[] = [];

    // Initial fetch
    this.fetchOrders(vendorId).then((orders) => {
      if (mounted) cb(orders);
    });

    this.getVendorQueryIds(vendorId).then((vendorIds) => {
      if (!mounted) return;
      channels = vendorIds.map((id) =>
        supabase
          .channel(`orders-${id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'orders',
              filter: `vendor_id=eq.${id}`,
            },
            () => {
              if (mounted) {
                this.fetchOrders(vendorId).then((orders) => cb(orders));
              }
            }
          )
          .subscribe()
      );
    });

    return () => {
      mounted = false;
      channels.forEach((channel) => supabase.removeChannel(channel));
    };
  }

  async changeOrderStatus(
    vendorId: string,
    orderId: string,
    newStatus: string,
    _clientTxnId?: string,
    options?: { markPaymentReceived?: boolean }
  ): Promise<Order> {
    const { data: currentRow, error: currentError } = await supabase
      .from('orders')
      .select('id, status, payment_status, payment_method, updated_at')
      .eq('id', orderId)
      .eq('vendor_id', vendorId)
      .single();

    if (currentError) throw currentError;
    const currentStatus = DB_TO_UI_STATUS[currentRow?.status] ?? 'NEW';
    const targetStatus = (newStatus as OrderStatus);
    if (!ALLOWED_TRANSITIONS[currentStatus].includes(targetStatus)) {
      throw new Error(`Invalid transition: ${currentStatus} -> ${targetStatus}`);
    }

    const dbStatus = UI_TO_DB_STATUS[newStatus as OrderStatus] ?? newStatus;

    const orderUpdate: Record<string, unknown> = { status: dbStatus };
    if (options?.markPaymentReceived) {
      orderUpdate.payment_status = 'paid';
    }

    const { data, error } = await supabase
      .from('orders')
      .update(orderUpdate)
      .eq('id', orderId)
      .eq('vendor_id', vendorId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Order not found');

    if (options?.markPaymentReceived) {
      await supabase
        .from('payments')
        .update({ payment_status: 'completed' })
        .eq('order_id', orderId);
    }

    const mapped = mapDbOrderToOrder(data);

    await logAuditEntry({
      entityTable: 'orders',
      entityId: orderId,
      actionType: options?.markPaymentReceived ? 'PAYMENT_RECEIVED' : 'STATUS_UPDATE',
      stateBefore: {
        status: currentStatus,
        payment_status: currentRow?.payment_status ?? null,
        payment_method: currentRow?.payment_method ?? null,
        updated_at: currentRow?.updated_at ?? null,
      },
      stateAfter: {
        status: mapped.status,
        payment_status: mapped.paymentStatus ?? null,
        payment_method: mapped.paymentMethod ?? null,
        updated_at: mapped.updatedAt,
      },
    });

    return mapped;
  }

  async fetchMenuItems(vendorId: string): Promise<MenuItem[]> {
    const vendorIds = await this.getVendorQueryIds(vendorId);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .in('vendor_id', vendorIds)
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data ?? []).map((p: any) => ({
      id: p.id,
      vendorId: p.vendor_id,
      name: p.name,
      description: p.description,
      price: Number(p.price ?? 0),
      status: p.is_available ? 'ACTIVE' : 'ARCHIVED',
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));
  }

  async fetchItemStock(_vendorId: string): Promise<Record<string, ItemStock>> {
    return {};
  }
}
