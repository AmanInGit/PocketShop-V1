/**
 * OrderCard - Compact order card component for Kanban board
 * 
 * Features:
 * - Drag handle for drag-and-drop
 * - Order ID, customer name, items summary
 * - Total amount, payment status
 * - Time ago display
 * - Quick action buttons
 * - View button to open detail panel
 */

import React, { useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Clock,
  UtensilsCrossed,
  ShoppingBag,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { AcceptanceCountdown } from '@/components/orders/AcceptanceCountdown';
import type { Order, OrderStatus } from '@/types';

export interface OrderCardProps {
  order: Order;
  borderColor: string;
  nextStatus?: OrderStatus;
  actionLabel?: string;
  onQuickAction?: (orderId: string, newStatus: OrderStatus) => void;
  onViewMore: (orderId: string) => void;
  isDragging?: boolean;
  /** Highlight when order exceeds 2× preparation time (depends on #7) */
  isOverdue?: boolean;
  queuePosition?: number;
}

/**
 * Utility functions
 */
const getTimeAgo = (dateString: string): string => {
  const now = new Date();
  const orderDate = new Date(dateString);
  const diffMs = now.getTime() - orderDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins === 1) return '1 min ago';
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return '1 hour ago';
  return `${diffHours} hours ago`;
};

const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}.${minutes}`;
};

const getPaymentMethodDisplay = (method?: Order['paymentMethod']) => {
  if (!method) {
    return { name: 'Unknown', color: 'text-gray-600' };
  }
  switch (method) {
    case 'GOOGLE_PAY':
      return { name: 'Google Pay', color: 'text-blue-600' };
    case 'PAYTM':
      return { name: 'Paytm', color: 'text-blue-600' };
    case 'PHONEPE':
      return { name: 'PhonePe', color: 'text-blue-600' };
    case 'CASH':
      return { name: 'Cash', color: 'text-green-600' };
    case 'CARD':
      return { name: 'Card', color: 'text-blue-600' };
    default:
      return { name: method, color: 'text-gray-600' };
  }
};

const getOrderTypeIcon = (type?: Order['orderType']) => {
  if (type === 'DINE_IN') {
    return (
      <div
        className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0"
        aria-label="Dine in order"
      >
        <UtensilsCrossed className="w-4 h-4 text-red-600" />
      </div>
    );
  } else if (type === 'TAKEAWAY') {
    return (
      <div
        className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0"
        aria-label="Takeaway order"
      >
        <ShoppingBag className="w-4 h-4 text-white" />
      </div>
    );
  } else if (type === 'DELIVERY') {
    return (
      <div
        className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0"
        aria-label="Delivery order"
      >
        <Info className="w-4 h-4 text-blue-600" />
      </div>
    );
  } else {
    return (
      <div
        className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0"
        aria-label="Order"
      >
        <Info className="w-4 h-4 text-gray-600" />
      </div>
    );
  }
};

/**
 * OrderCard Component
 */
export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  borderColor,
  nextStatus,
  actionLabel,
  onQuickAction,
  onViewMore,
  isDragging = false,
  isOverdue = false,
  queuePosition,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: order.id,
    disabled: false,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const paymentMethod = getPaymentMethodDisplay(order.paymentMethod);
  const timeAgo = getTimeAgo(order.createdAt);
  const time = formatTime(order.createdAt);
  const customerName = order.customerName ?? 'Anonymous';
  const orderNumber = order.orderNumber ?? order.id.slice(-6).toUpperCase();

  const formattedTotal = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(order.total);

  // Items summary (first 2 items + count)
  const itemsSummary = useMemo(() => {
    const items = order.items || [];
    if (items.length === 0) return 'No items';
    if (items.length <= 2) {
      return items.map((item) => `${item.qty}x ${item.name || 'Item'}`).join(', ');
    }
    const firstTwo = items.slice(0, 2).map((item) => `${item.qty}x ${item.name || 'Item'}`).join(', ');
    return `${firstTwo} +${items.length - 2} more`;
  }, [order.items]);

  const handleQuickAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nextStatus && onQuickAction) {
      onQuickAction(order.id, nextStatus);
    }
  };

  const handleViewMore = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewMore(order.id);
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      data-testid={`order-card-${order.id}`}
      className={`bg-white dark:bg-gray-800/80 rounded-md shadow-md border-l-4 ${borderColor} p-4 mb-3 hover:shadow-lg transition-shadow ${
        isDragging ? 'ring-2 ring-blue-500' : ''
      } ${isOverdue ? 'ring-2 ring-destructive/70 border-destructive/50' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={`Order ${orderNumber} from ${customerName}, ${formattedTotal}`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-between mb-3 cursor-grab active:cursor-grabbing"
        aria-label="Drag to move order"
      >
        <div className="flex items-start gap-3 flex-1">
          {typeof queuePosition === 'number' && (
            <span className="inline-flex h-6 min-w-[2rem] items-center justify-center rounded-full bg-orange-100 px-2 text-xs font-semibold text-orange-800">
              #{queuePosition}
            </span>
          )}
          {getOrderTypeIcon(order.orderType)}
          <div className="flex-1 min-w-0">
            <div className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">
              #{orderNumber} - {customerName}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <div className="flex items-center gap-2">
                <span>{itemsSummary}</span>
                {isOverdue && (
                  <span className="inline-flex items-center gap-1 text-red-600 text-xs font-semibold">
                    <AlertTriangle className="w-3 h-3" />
                    Stuck
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={paymentMethod.color}>{paymentMethod.name}</span>
                {order.paymentStatus === 'PAID' && (
                  <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" aria-hidden="true"></span>
                    Paid
                  </span>
                )}
                {order.paymentStatus === 'PENDING' && (
                  <span className="inline-flex items-center gap-1 text-orange-600 text-xs font-medium">
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" aria-hidden="true"></span>
                    Pending
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="text-right ml-4">
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100" aria-label={`Total: ${formattedTotal}`}>
            {formattedTotal}
          </div>
        </div>
        <GripVertical className="w-5 h-5 text-gray-400 ml-2 flex-shrink-0" aria-hidden="true" />
      </div>

      {/* Quick Actions & Time */}
      <div className="flex flex-col gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
        {order.status === 'NEW' && (
          <AcceptanceCountdown createdAt={order.createdAt} status={order.status} variant="compact" />
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Clock className="w-3 h-3" aria-hidden="true" />
            <time dateTime={order.createdAt} title={new Date(order.createdAt).toLocaleString()}>
              {time} • {timeAgo}
            </time>
          </div>
        <div className="flex items-center gap-2">
          {nextStatus && actionLabel && onQuickAction && (
            <button
              onClick={handleQuickAction}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
              aria-label={`${actionLabel} order ${orderNumber}`}
            >
              {actionLabel}
            </button>
          )}
          <button
            onClick={handleViewMore}
            className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs font-medium px-3 py-1.5 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          aria-label={`View details for order ${orderNumber}`}
          >
            View
          </button>
        </div>
        </div>
      </div>
    </article>
  );
};

export default OrderCard;

