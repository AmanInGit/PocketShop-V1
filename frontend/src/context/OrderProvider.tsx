/**
 * OrderProvider - React Context for order management
 * 
 * Centralizes order state, subscriptions, and optimistic updates.
 * Provides a single source of truth for orders, menu items, and stock.
 * 
 * Supports dependency injection of IOrderRepository for easy swapping
 * between DemoOrderRepository and SupabaseOrderRepository.
 */

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Order, MenuItem, ItemStock } from '@/types';
import type IOrderRepository from '@/services/IOrderRepository';
import { DemoOrderRepository } from '@/features/vendor/services/demoOrderRepository';
import { reconcileOrder } from '@/utils/reconciliation';

const ALLOWED_TRANSITIONS: Record<Order['status'], Order['status'][]> = {
  NEW: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['READY', 'CANCELLED'],
  READY: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export type OrderContextType = {
  orders: Order[];
  menuItems: MenuItem[];
  stock: Record<string, ItemStock> | null;
  loading: boolean;
  error: string | null;
  selectedOrder: Order | null;
  refresh: () => Promise<void>;
  changeOrderStatus: (orderId: string, newStatus: string, options?: { markPaymentReceived?: boolean }) => Promise<void>;
  openOrder: (orderId: string | null) => void;
};

const OrderContext = createContext<OrderContextType | undefined>(undefined);

/**
 * Hook to access order context
 * @throws Error if used outside OrderProvider
 */
export function useOrderContext(): OrderContextType {
  const ctx = useContext(OrderContext);
  if (!ctx) {
    throw new Error('useOrderContext must be used within OrderProvider');
  }
  return ctx;
}

type OrderProviderProps = {
  vendorId?: string;
  repo?: IOrderRepository;
  children?: React.ReactNode;
};

/**
 * OrderProvider Component
 * 
 * Provides order management context to child components.
 * Handles data fetching, subscriptions, and optimistic updates.
 */
export const OrderProvider: React.FC<OrderProviderProps> = ({
  vendorId = 'vendor-demo',
  repo,
  children,
}) => {
  // Repository instance (dependency injection)
  const repositoryRef = useRef<IOrderRepository>(repo ?? new DemoOrderRepository());
  const repository = repositoryRef.current;

  // State
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [stock, setStock] = useState<Record<string, ItemStock> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Keep latest snapshot for rollback on optimistic update failures
  const lastSnapshotRef = useRef<Order[] | null>(null);

  // Initialize data and set up subscriptions
  useEffect(() => {
    let unsub: (() => void) | undefined;
    let mounted = true;

    async function init() {
      setLoading(true);
      setError(null);

      try {
        // Fetch initial data in parallel
        const [fetchedOrders, fetchedMenu, fetchedStock] = await Promise.all([
          repository.fetchOrders(vendorId),
          repository.fetchMenuItems
            ? repository.fetchMenuItems(vendorId)
            : Promise.resolve([] as MenuItem[]),
          repository.fetchItemStock
            ? repository.fetchItemStock(vendorId)
            : Promise.resolve(null),
        ]);

        if (!mounted) return;

        setOrders(fetchedOrders);
        setMenuItems(fetchedMenu);
        setStock(fetchedStock);
        setError(null);
        setLoading(false);
      } catch (e: unknown) {
        if (!mounted) return;
        const err = e as Error;
        setError(err?.message ?? 'Failed to load orders');
        setLoading(false);
      }

      // Set up realtime subscription if available
      if (repository.subscribeToOrders) {
        unsub = repository.subscribeToOrders(vendorId, (rows) => {
          if (!mounted) return;

          // Reconcile incoming rows with local optimistic changes
          setOrders((local) => {
            // Merge remote orders with local state using version-based reconciliation
            const merged = rows.map((remote) => {
              const localOrder = local.find((o) => o.id === remote.id);
              if (!localOrder) return remote;

              // Use reconciliation to handle version conflicts
              return reconcileOrder(localOrder, remote);
            });

            // Add any local-only orders (should be rare, e.g., pending creates)
            const localOnly = local.filter(
              (l) => !merged.find((m) => m.id === l.id)
            );

            return [...merged, ...localOnly];
          });
        });
      }
    }

    init();

    return () => {
      mounted = false;
      if (unsub) {
        unsub();
      }
    };
  }, [vendorId, repository]);

  /**
   * Change order status with optimistic updates and rollback on error
   */
  const changeOrderStatus = async (
    orderId: string,
    newStatus: string,
    options?: { markPaymentReceived?: boolean }
  ): Promise<void> => {
    // Snapshot current state for potential rollback
    lastSnapshotRef.current = orders.map((o) => ({
      ...o,
      items: o.items.map((i) => ({ ...i })),
    }));

    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx === -1) {
      throw new Error('Order not found');
    }

    const prev = orders[idx];
    const targetStatus = newStatus as Order['status'];
    if (!ALLOWED_TRANSITIONS[prev.status].includes(targetStatus)) {
      throw new Error(`Invalid transition: ${prev.status} -> ${targetStatus}`);
    }

    // Create optimistic update
    const optimistic: Order = {
      ...prev,
      status: targetStatus,
      ...(options?.markPaymentReceived && { paymentStatus: 'PAID' as const }),
      version: prev.version + 1,
      updatedAt: new Date().toISOString(),
    };

    // Update UI immediately (optimistic update)
    setOrders((s) => s.map((o) => (o.id === orderId ? optimistic : o)));
    setError(null);

    try {
      // Call repository to persist change
      const updated = await repository.changeOrderStatus(vendorId, orderId, newStatus, undefined, options);

      // Merge authoritative result from server
      setOrders((s) =>
        s.map((o) => {
          if (o.id === orderId) {
            // Use server version if it's newer
            return reconcileOrder(optimistic, updated);
          }
          return o;
        })
      );
    } catch (err: unknown) {
      // Rollback to snapshot on error
      if (lastSnapshotRef.current) {
        setOrders(lastSnapshotRef.current);
      }
      const error = err as Error;
      setError(error?.message ?? 'Failed to change status');
      throw err;
    } finally {
      lastSnapshotRef.current = null;
    }
  };

  /**
   * Refresh orders from repository
   */
  const refresh = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const rows = await repository.fetchOrders(vendorId);
      setOrders(rows);
      setLoading(false);
    } catch (e: unknown) {
      const err = e as Error;
      setError(err?.message ?? 'Failed to refresh');
      setLoading(false);
    }
  };

  /**
   * Open order detail view
   */
  const openOrder = (orderId: string | null): void => {
    if (!orderId) {
      setSelectedOrder(null);
      return;
    }

    const order = orders.find((x) => x.id === orderId) ?? null;
    setSelectedOrder(order);
  };

  return (
    <OrderContext.Provider
      value={{
        orders,
        menuItems,
        stock,
        loading,
        error,
        selectedOrder,
        refresh,
        changeOrderStatus,
        openOrder,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

