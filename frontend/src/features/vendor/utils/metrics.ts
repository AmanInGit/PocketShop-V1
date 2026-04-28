export type NormalizedOrderStatus =
  | 'NEW'
  | 'IN_PROGRESS'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

type OrderLike = {
  status?: string | null;
  total?: number | null;
  total_amount?: number | null;
  createdAt?: string | null;
  created_at?: string | null;
};

type ProductLike = {
  availability_mode?: 'quantity' | 'requirement' | string | null;
  stock_quantity?: number | null;
  low_stock_threshold?: number | null;
  is_available?: boolean | null;
  price?: number | null;
};

export function normalizeOrderStatus(status?: string | null): NormalizedOrderStatus {
  const normalized = String(status || '').trim().toLowerCase();

  switch (normalized) {
    case 'new':
    case 'pending':
    case 'confirmed':
      return 'NEW';
    case 'in_progress':
    case 'preparing':
    case 'processing':
      return 'IN_PROGRESS';
    case 'ready':
      return 'READY';
    case 'completed':
      return 'COMPLETED';
    case 'cancelled':
      return 'CANCELLED';
    default:
      return 'NEW';
  }
}

export function isActiveOrderStatus(status?: string | null) {
  const normalized = normalizeOrderStatus(status);
  return normalized === 'NEW' || normalized === 'IN_PROGRESS' || normalized === 'READY';
}

export function isCompletedOrderStatus(status?: string | null) {
  return normalizeOrderStatus(status) === 'COMPLETED';
}

export function isCancelledOrderStatus(status?: string | null) {
  return normalizeOrderStatus(status) === 'CANCELLED';
}

export function getOrderAmount(order: OrderLike) {
  return Number(order.total ?? order.total_amount ?? 0) || 0;
}

export function getOrderCreatedAt(order: OrderLike) {
  return order.createdAt ?? order.created_at ?? null;
}

export function isRequirementBasedProduct(product: ProductLike) {
  return product.availability_mode === 'requirement';
}

export function getProductThreshold(product: ProductLike) {
  return Math.max(0, Number(product.low_stock_threshold ?? 10) || 10);
}

export function getProductQuantity(product: ProductLike) {
  return Math.max(0, Number(product.stock_quantity ?? 0) || 0);
}

export function isProductAvailable(product: ProductLike) {
  if (isRequirementBasedProduct(product)) {
    return Boolean(product.is_available);
  }

  return getProductQuantity(product) > 0;
}

export function isProductOutOfStock(product: ProductLike) {
  return !isProductAvailable(product);
}

export function isProductLowStock(product: ProductLike) {
  if (isRequirementBasedProduct(product)) {
    return false;
  }

  const quantity = getProductQuantity(product);
  return quantity > 0 && quantity <= getProductThreshold(product);
}

export function needsProductRestock(product: ProductLike) {
  if (isRequirementBasedProduct(product)) {
    return !Boolean(product.is_available);
  }

  return getProductQuantity(product) <= getProductThreshold(product);
}

export function getInventoryValue(product: ProductLike) {
  if (isRequirementBasedProduct(product)) {
    return 0;
  }

  return (Number(product.price ?? 0) || 0) * getProductQuantity(product);
}
