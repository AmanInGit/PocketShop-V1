import type { Order } from '@/types';

export const ORDER_SLA_MINUTES = 10;

export function isOrderStuck(order: Pick<Order, 'status' | 'createdAt'>, nowMs = Date.now()): boolean {
  const active = order.status === 'NEW' || order.status === 'IN_PROGRESS' || order.status === 'READY';
  if (!active) return false;
  const createdMs = new Date(order.createdAt).getTime();
  return nowMs - createdMs > ORDER_SLA_MINUTES * 60 * 1000;
}

