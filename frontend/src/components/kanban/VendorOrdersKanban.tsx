/**
 * VendorOrdersKanban - Drag-and-drop Kanban board for vendor orders
 * 
 * Features:
 * - Three columns: NEW, IN_PROGRESS, READY
 * - Drag-and-drop between columns with optimistic updates
 * - Quick action buttons (Accept/Start/Ready/View)
 * - Responsive design
 * - Keyboard accessible
 * - Real-time updates via OrderProvider
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  UniqueIdentifier,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Clock, AlertCircle, Inbox, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { useOrderContext } from '@/context/OrderProvider';
import { useProducts } from '@/features/vendor/hooks/useProducts';
import type { Order, OrderStatus } from '@/types';
import { OrderCard } from './OrderCard';
import { isOrderStuck } from '@/constants/orderSla';

type VendorOrdersKanbanProps = {
  vendorId?: string; // Optional - OrderProvider already has vendorId
};

type ColumnId = 'NEW' | 'IN_PROGRESS' | 'READY';

interface ColumnConfig {
  id: ColumnId;
  title: string;
  status: OrderStatus;
  borderColor: string;
  leftAccent: string;
  titleColor: string;
  bgColor: string;
  bgGradient: string;
  iconBg: string;
  darkBg: string;
  darkLeftAccent: string;
  darkTitle: string;
  darkIconBg: string;
  Icon: React.ComponentType<{ className?: string; size?: number }>;
  emptyIcon: React.ComponentType<{ className?: string; size?: number }>;
  emptyCopy: string;
  nextStatus?: OrderStatus;
  actionLabel?: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'NEW',
    title: 'New Orders',
    status: 'NEW',
    borderColor: 'border-orange-400',
    leftAccent: 'border-l-orange-400',
    titleColor: 'text-orange-700',
    bgColor: 'bg-orange-50',
    bgGradient: 'from-orange-50/80 to-amber-50/60',
    iconBg: 'bg-orange-100',
    darkBg: 'dark:bg-orange-950/30',
    darkLeftAccent: 'dark:border-l-orange-500/70',
    darkTitle: 'dark:text-orange-300',
    darkIconBg: 'dark:bg-orange-900/50',
    Icon: Inbox,
    emptyIcon: Sparkles,
    emptyCopy: 'New orders will appear here',
    nextStatus: 'IN_PROGRESS',
    actionLabel: 'Accept',
  },
  {
    id: 'IN_PROGRESS',
    title: 'In Progress',
    status: 'IN_PROGRESS',
    borderColor: 'border-blue-400',
    leftAccent: 'border-l-blue-400',
    titleColor: 'text-blue-700',
    bgColor: 'bg-blue-50',
    bgGradient: 'from-blue-50/80 to-indigo-50/60',
    iconBg: 'bg-blue-100',
    darkBg: 'dark:bg-blue-950/30',
    darkLeftAccent: 'dark:border-l-blue-500/70',
    darkTitle: 'dark:text-blue-300',
    darkIconBg: 'dark:bg-blue-900/50',
    Icon: Loader2,
    emptyIcon: Loader2,
    emptyCopy: 'Orders you\'re preparing',
    nextStatus: 'READY',
    actionLabel: 'Mark Ready',
  },
  {
    id: 'READY',
    title: 'Ready',
    status: 'READY',
    borderColor: 'border-green-400',
    leftAccent: 'border-l-green-400',
    titleColor: 'text-green-700',
    bgColor: 'bg-green-50',
    bgGradient: 'from-green-50/80 to-emerald-50/60',
    iconBg: 'bg-green-100',
    darkBg: 'dark:bg-green-950/30',
    darkLeftAccent: 'dark:border-l-green-500/70',
    darkTitle: 'dark:text-green-300',
    darkIconBg: 'dark:bg-green-900/50',
    Icon: CheckCircle2,
    emptyIcon: CheckCircle2,
    emptyCopy: 'Ready for pickup',
    nextStatus: 'COMPLETED',
    actionLabel: 'Complete',
  },
];


/**
 * Kanban Column Component (Droppable)
 */
interface KanbanColumnProps {
  column: ColumnConfig;
  orders: Order[];
  onViewMore: (orderId: string) => void;
  onQuickAction: (orderId: string, newStatus: OrderStatus) => void;
  isOverdueMap?: Record<string, boolean>;
  queuePositionMap?: Record<string, number>;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  orders,
  onViewMore,
  onQuickAction,
  isOverdueMap = {},
  queuePositionMap = {},
}) => {
  const orderIds = useMemo(() => orders.map((o) => o.id), [orders]);
  
  // Make column droppable
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const EmptyIcon = column.emptyIcon;

  return (
    <section
      ref={setNodeRef}
      className={`
        ${column.bgColor} ${column.darkBg} relative overflow-hidden rounded-xl p-4 min-h-[500px] flex flex-col
        shadow-sm border border-gray-200/60 dark:border-gray-700/50 border-l-4 ${column.leftAccent} ${column.darkLeftAccent}
        transition-all duration-200
        ${isOver ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-background scale-[1.02] shadow-md' : 'hover:shadow-md'}
      `}
      aria-label={`${column.title} column with ${orders.length} orders`}
    >
      {/* Subtle gradient overlay - lighter in dark mode */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${column.bgGradient} dark:opacity-20 pointer-events-none opacity-60`}
        aria-hidden="true"
      />

      <div className="relative z-10 flex items-center justify-between mb-4 pb-3 border-b border-gray-200/80 dark:border-gray-600/50">
        <div className="flex items-center gap-2.5">
          <div className={`${column.iconBg} ${column.darkIconBg} ${column.titleColor} ${column.darkTitle} p-2 rounded-lg`}>
            <column.Icon className="w-4 h-4" aria-hidden="true" />
          </div>
          <h3 className={`text-sm font-bold ${column.titleColor} ${column.darkTitle}`}>{column.title}</h3>
        </div>
        <span
          className={`
            min-w-[1.75rem] h-7 flex items-center justify-center rounded-full text-xs font-bold
            ${orders.length > 0
              ? 'bg-white/90 dark:bg-white/10 text-gray-700 dark:text-gray-300 shadow-sm'
              : 'bg-gray-200/80 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400'}
          `}
          aria-label={`${orders.length} ${column.title.toLowerCase()}`}
        >
          {orders.length}
        </span>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto">
        <SortableContext items={orderIds} strategy={verticalListSortingStrategy}>
          {orders.length > 0 ? (
            orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                borderColor={column.borderColor}
                nextStatus={column.nextStatus}
                actionLabel={column.actionLabel}
                onQuickAction={onQuickAction}
                onViewMore={onViewMore}
                isOverdue={isOverdueMap[order.id]}
                queuePosition={queuePositionMap[order.id]}
              />
            ))
          ) : (
            <div
              className={`
                flex flex-col items-center justify-center py-14 px-4 text-center rounded-lg
                border-2 border-dashed border-gray-200/80 dark:border-gray-600/50
                ${isOver
                  ? 'border-blue-400 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-900/30'
                  : 'bg-white/40 dark:bg-white/5'}
              `}
              role="status"
              aria-live="polite"
            >
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
                  isOver ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-gray-100 dark:bg-gray-800/60'
                }`}
              >
                <EmptyIcon
                  className={`w-7 h-7 ${isOver ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`}
                  aria-hidden="true"
                />
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                No {column.title.toLowerCase()}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{column.emptyCopy}</p>
            </div>
          )}
        </SortableContext>
      </div>
    </section>
  );
};

/**
 * Main VendorOrdersKanban Component
 */
export const VendorOrdersKanban: React.FC<VendorOrdersKanbanProps> = ({ vendorId: _vendorId }) => {
  const { orders, loading, error, changeOrderStatus, openOrder } = useOrderContext();
  const [codConfirmOpen, setCodConfirmOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{ orderId: string; newStatus: OrderStatus } | null>(null);
  const { data: products } = useProducts();
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const productPrepMap = useMemo(() => {
    const map: Record<string, number> = {};
    (products || []).forEach((p: any) => {
      const mins = p.preparation_time_minutes ?? 15;
      map[p.id] = mins;
    });
    return map;
  }, [products]);

  const ordersWithPrep = useMemo(() => {
    return orders.map((o) => {
      const prepMins = (o.items || []).reduce((sum: number, it: any) => {
        const mins = productPrepMap[it.itemId] ?? 15;
        return sum + mins * (it.qty ?? 1);
      }, 0);
      const prepMinutes = Math.max(prepMins, 15);
      return { ...o, preparationMinutes: prepMinutes };
    });
  }, [orders, productPrepMap]);

  const isOverdueMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    const now = nowMs;
    ordersWithPrep.forEach((o) => {
      const slaStuck = isOrderStuck(o, now);
      if (o.status !== 'IN_PROGRESS' || !o.preparationMinutes) {
        map[o.id] = slaStuck;
        return;
      }
      const startedAt = new Date(o.updatedAt).getTime();
      const twicePrepMs = 2 * o.preparationMinutes * 60 * 1000;
      map[o.id] = slaStuck || now - startedAt > twicePrepMs;
    });
    return map;
  }, [ordersWithPrep, nowMs]);

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before dragging starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group orders by status (use ordersWithPrep for preparationMinutes)
  const ordersByColumn = useMemo(() => {
    const grouped: Record<ColumnId, Order[]> = {
      NEW: [],
      IN_PROGRESS: [],
      READY: [],
    };

    ordersWithPrep.forEach((order) => {
      if (order.status === 'NEW') {
        grouped.NEW.push(order);
      } else if (order.status === 'IN_PROGRESS') {
        grouped.IN_PROGRESS.push(order);
      } else if (order.status === 'READY') {
        grouped.READY.push(order);
      }
    });

    // NEW queue uses strict FIFO with priority tie-breakers.
    grouped.NEW.sort((a, b) => {
      const urgentDelta = Number(Boolean(b.isUrgent)) - Number(Boolean(a.isUrgent));
      if (urgentDelta !== 0) return urgentDelta;
      const createdDelta = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (createdDelta !== 0) return createdDelta;
      return a.id.localeCompare(b.id);
    });

    // Other columns preserve oldest-first ordering.
    grouped.IN_PROGRESS.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    grouped.READY.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return grouped;
  }, [ordersWithPrep]);

  const queuePositionMap = useMemo(() => {
    const map: Record<string, number> = {};
    ordersByColumn.NEW.forEach((order, index) => {
      map[order.id] = index + 1;
    });
    return map;
  }, [ordersByColumn.NEW]);

  // Get active order being dragged
  const activeOrder = useMemo(() => {
    if (!activeId) return null;
    return ordersWithPrep.find((o) => o.id === activeId) || null;
  }, [activeId, ordersWithPrep]);

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const orderId = active.id as string;
    const targetColumnId = over.id as ColumnId | string;

    // Check if dropping on a column (not another order)
    const targetColumn = COLUMNS.find((col) => col.id === targetColumnId);
    if (!targetColumn) {
      // Might be dropping on another order in a column - find which column
      const targetOrder = ordersWithPrep.find((o) => o.id === targetColumnId);
      if (targetOrder) {
        const targetCol = COLUMNS.find((col) => col.status === targetOrder.status);
        if (targetCol && targetCol.id) {
          return handleStatusChange(orderId, targetCol.status);
        }
      }
      return;
    }

    // Find current order
    const order = ordersWithPrep.find((o) => o.id === orderId);
    if (!order) return;

    // If dropping in the same column, do nothing
    if (order.status === targetColumn.status) return;

    // Drag rules: cannot drag backward (IN_PROGRESS→NEW, READY→IN_PROGRESS)
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      NEW: ['IN_PROGRESS'],
      IN_PROGRESS: ['READY'],
      READY: ['COMPLETED'],
      COMPLETED: [],
      CANCELLED: [],
    };
    const allowed = validTransitions[order.status];
    if (!allowed?.includes(targetColumn.status)) return;

    await handleStatusChange(orderId, targetColumn.status);
  };

  // For Cash orders, require confirmation before Mark as Ready or Complete
  const maybeRequireCodConfirm = (orderId: string, newStatus: OrderStatus): boolean => {
    const order = ordersWithPrep.find((o) => o.id === orderId);
    const isCOD = (order?.paymentMethod ?? '').toString().toUpperCase() === 'CASH';
    const needsConfirm = isCOD && (newStatus === 'READY' || newStatus === 'COMPLETED');
    if (needsConfirm) {
      setPendingStatusChange({ orderId, newStatus });
      setCodConfirmOpen(true);
      return true;
    }
    return false;
  };

  const executeStatusChange = async (
    orderId: string,
    newStatus: OrderStatus,
    markPaymentReceived = false
  ) => {
    try {
      await changeOrderStatus(orderId, newStatus, markPaymentReceived ? { markPaymentReceived: true } : undefined);
    } catch (err) {
      console.error('Failed to change order status:', err);
    } finally {
      setCodConfirmOpen(false);
      setPendingStatusChange(null);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    if (maybeRequireCodConfirm(orderId, newStatus)) return;
    await executeStatusChange(orderId, newStatus);
  };

  const handleDragOver = (_event: DragOverEvent) => {};

  const handleQuickAction = async (orderId: string, newStatus: OrderStatus) => {
    if (maybeRequireCodConfirm(orderId, newStatus)) return;
    await executeStatusChange(orderId, newStatus);
  };

  // Handle view more
  const handleViewMore = (orderId: string) => {
    openOrder(orderId);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading orders...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="mb-4 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-md flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">Error loading orders</p>
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              orders={ordersByColumn[column.id]}
              onViewMore={handleViewMore}
              onQuickAction={handleQuickAction}
              isOverdueMap={isOverdueMap}
              queuePositionMap={queuePositionMap}
            />
          ))}
        </div>

        {/* COD confirmation – when marking Cash order as Ready or Complete from Kanban */}
        <AlertDialog open={codConfirmOpen} onOpenChange={setCodConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cash on Delivery</AlertDialogTitle>
              <AlertDialogDescription>
                Has cash been collected from the customer? Please verify manually before proceeding. Do not mark as Ready or Complete for unpaid orders.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="!flex-row items-center justify-end gap-3">
              <AlertDialogCancel
                className="mt-0 h-11 min-w-[130px]"
                onClick={() => setPendingStatusChange(null)}
              >
                No, not yet
              </AlertDialogCancel>
              <AlertDialogAction
                className="h-11 min-w-[130px]"
                onClick={() => pendingStatusChange && executeStatusChange(pendingStatusChange.orderId, pendingStatusChange.newStatus, true)}
              >
                Yes, received
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Drag Overlay - Shows the card being dragged */}
        <DragOverlay dropAnimation={null}>
          {activeOrder ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border-l-4 border-blue-500 p-4 opacity-95 rotate-1 scale-105 ring-2 ring-blue-200/80 dark:ring-blue-500/40 cursor-grabbing">
              <div className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">
                #{activeOrder.orderNumber ?? activeOrder.id.slice(-6).toUpperCase()} -{' '}
                {activeOrder.customerName ?? 'Anonymous'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {new Intl.NumberFormat('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(activeOrder.total)}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default VendorOrdersKanban;

