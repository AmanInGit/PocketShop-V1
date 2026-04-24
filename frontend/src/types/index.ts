/**
 * src/types/index.ts
 * PocketShop — Vendor Orders Kanban types
 *
 * Keep these minimal and strict. Use for both DemoRepo and SupabaseRepo.
 */

/** Allowed order statuses */
export type OrderStatus = 'NEW' | 'IN_PROGRESS' | 'READY' | 'COMPLETED' | 'CANCELLED';

/** Payment status */
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

/** A single menu item */
export interface MenuItem {
  /** stable id (uuid or string key) */
  id: string;
  vendorId: string;
  name: string;
  description?: string;
  /** currency units (e.g. rupees) — decimal allowed */
  price: number;
  status: 'ACTIVE' | 'ARCHIVED';
  needsPhoto?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Stock information for a menu item */
export interface ItemStock {
  itemId: string;
  inStock: boolean;
  outOfStockUntil?: string | null;
  qty?: number | null;
  updatedAt?: string;
}

/** Order line item (denormalized fields allowed for UI convenience) */
export interface OrderItem {
  id?: string;
  orderId?: string;
  itemId: string;
  name?: string;
  qty: number;
  price: number; // price per unit
}

/** Order aggregate */
export interface Order {
  id: string;
  vendorId: string;
  total: number; // total amount (sum of qty*price)
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
  items: OrderItem[];
  // optional denormalized fields to speed UI (e.g. customer name)
  customerName?: string | null;
  orderType?: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  // Additional fields for demo/compatibility
  orderNumber?: string;
  paymentMethod?: 'GOOGLE_PAY' | 'PAYTM' | 'PHONEPE' | 'CASH' | 'CARD';
  itemsCount?: number;
  /** Total preparation time in minutes (sum of product prep times). Used for overdue highlight. */
  preparationMinutes?: number;
  /** Priority override used by FIFO queue sorting. */
  isUrgent?: boolean;
}

/** Vendor event log entry (used by EventLogger) */
export interface VendorEvent {
  id?: string;
  vendorId?: string;
  eventType: string;
  payload: Record<string, any>;
  createdAt?: string;
}

