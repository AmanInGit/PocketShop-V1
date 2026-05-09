export type RecommendationSeverity = 'info' | 'warning' | 'critical';

export type RecommendationType =
  | 'trending_dish'
  | 'weak_revenue_today'
  | 'low_stock'
  | 'out_of_stock'
  | 'data_note';

export type RecommendationItem = {
  id: string;
  type: RecommendationType;
  severity: RecommendationSeverity;
  title: string;
  facts: Record<string, string | number | boolean | null>;
  suggestedAction?: string;
};

type AnalyticsLike = {
  todayRevenue?: number;
  trendingDishes?: Array<{ id: string | null; name: string; quantity: number; revenue?: number }>;
  todayVsYesterday?: {
    revenue?: { today?: number; yesterday?: number; delta?: number };
  };
};

type ProductLike = {
  id: string;
  name: string;
  availability_mode?: 'quantity' | 'requirement' | string | null;
  stock_quantity?: number | null;
  low_stock_threshold?: number | null;
  is_available?: boolean | null;
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clampTop<T>(arr: T[], n: number) {
  if (arr.length <= n) return arr;
  return arr.slice(0, n);
}

export function buildRecommendations(args: {
  analytics: AnalyticsLike | null | undefined;
  products: ProductLike[] | null | undefined;
  config?: {
    weakRevenueDeltaPct?: number; // default 10 -> triggers if <= -10%
    maxItemsPerCategory?: number; // default 3
  };
}): RecommendationItem[] {
  const analytics = args.analytics;
  const products = args.products ?? [];
  const weakRevenueDeltaPct = args.config?.weakRevenueDeltaPct ?? 10;
  const maxItemsPerCategory = args.config?.maxItemsPerCategory ?? 3;

  const items: RecommendationItem[] = [];

  // Data note if we have neither analytics nor products
  if (!analytics && products.length === 0) {
    items.push({
      id: 'data_note:missing',
      type: 'data_note',
      severity: 'info',
      title: 'Not enough data yet',
      facts: { hasAnalytics: false, productsCount: 0 },
      suggestedAction: 'Place a few test orders and add stock to products to unlock recommendations.',
    });
    return items;
  }

  // Trending dishes (top 1–3)
  const trending = clampTop(
    (analytics?.trendingDishes ?? []).filter((d) => num(d.quantity) > 0),
    maxItemsPerCategory
  );
  trending.forEach((dish, idx) => {
    items.push({
      id: `trending_dish:${dish.id ?? dish.name}:${idx}`,
      type: 'trending_dish',
      severity: 'info',
      title: `Trending today: ${dish.name}`,
      facts: {
        dishId: dish.id ?? null,
        dishName: dish.name,
        quantitySold: num(dish.quantity),
      },
      suggestedAction: 'Consider featuring it prominently or ensuring ingredients are stocked.',
    });
  });

  // Weak revenue today vs yesterday
  const delta = num(analytics?.todayVsYesterday?.revenue?.delta);
  const todayRevenue = num(analytics?.todayVsYesterday?.revenue?.today ?? analytics?.todayRevenue);
  const yesterdayRevenue = num(analytics?.todayVsYesterday?.revenue?.yesterday);
  if (delta <= -Math.abs(weakRevenueDeltaPct)) {
    items.push({
      id: 'weak_revenue_today',
      type: 'weak_revenue_today',
      severity: 'warning',
      title: 'Revenue is down today',
      facts: { todayRevenue, yesterdayRevenue, deltaPct: delta },
      suggestedAction: 'Try a limited-time offer or highlight your top-selling dish to recover sales.',
    });
  }

  // Stock alerts (products table only)
  const quantityTracked = products.filter(
    (p) => (p.availability_mode ?? 'quantity') === 'quantity'
  );
  const outOfStock = quantityTracked
    .filter((p) => num(p.stock_quantity) <= 0 || p.is_available === false)
    .sort((a, b) => num(a.stock_quantity) - num(b.stock_quantity));
  const lowStock = quantityTracked
    .filter((p) => {
      const stock = num(p.stock_quantity);
      const threshold = num(p.low_stock_threshold);
      return stock > 0 && stock <= threshold;
    })
    .sort((a, b) => num(a.stock_quantity) - num(b.stock_quantity));

  clampTop(outOfStock, maxItemsPerCategory).forEach((p, idx) => {
    items.push({
      id: `out_of_stock:${p.id}:${idx}`,
      type: 'out_of_stock',
      severity: 'critical',
      title: `Out of stock: ${p.name}`,
      facts: {
        productId: p.id,
        productName: p.name,
        stockQuantity: num(p.stock_quantity),
        lowStockThreshold: num(p.low_stock_threshold),
        isAvailable: p.is_available ?? null,
      },
      suggestedAction: 'Restock this item or mark it unavailable to avoid order issues.',
    });
  });

  clampTop(lowStock, maxItemsPerCategory).forEach((p, idx) => {
    items.push({
      id: `low_stock:${p.id}:${idx}`,
      type: 'low_stock',
      severity: 'warning',
      title: `Low stock: ${p.name}`,
      facts: {
        productId: p.id,
        productName: p.name,
        stockQuantity: num(p.stock_quantity),
        lowStockThreshold: num(p.low_stock_threshold),
      },
      suggestedAction: 'Restock soon to prevent this item from running out.',
    });
  });

  if (items.length === 0) {
    items.push({
      id: 'data_note:empty',
      type: 'data_note',
      severity: 'info',
      title: 'All clear',
      facts: { todayRevenue, deltaPct: delta, productsCount: products.length },
      suggestedAction: 'Keep monitoring — recommendations will appear as data changes.',
    });
  }

  // Sort by severity: critical -> warning -> info
  const severityScore: Record<RecommendationSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };

  return items.sort(
    (a, b) => severityScore[a.severity] - severityScore[b.severity]
  );
}

export function formatRecommendationFallback(item: RecommendationItem): {
  title: string;
  message: string;
  why?: string;
} {
  switch (item.type) {
    case 'trending_dish': {
      const name = String(item.facts.dishName ?? 'This dish');
      const qty = num(item.facts.quantitySold);
      return {
        title: item.title,
        message: `${name} is trending today.`,
        why: `Sold ${qty} units in completed orders.`,
      };
    }
    case 'weak_revenue_today': {
      const deltaPct = num(item.facts.deltaPct);
      const todayRevenue = num(item.facts.todayRevenue);
      const yesterdayRevenue = num(item.facts.yesterdayRevenue);
      return {
        title: item.title,
        message: `Revenue is down ${Math.abs(deltaPct).toFixed(1)}% vs yesterday.`,
        why: `Today: ₹${todayRevenue.toFixed(0)} • Yesterday: ₹${yesterdayRevenue.toFixed(0)} (completed orders).`,
      };
    }
    case 'out_of_stock': {
      const name = String(item.facts.productName ?? 'This item');
      const stock = num(item.facts.stockQuantity);
      return {
        title: item.title,
        message: `${name} is out of stock.`,
        why: `Stock quantity is ${stock}.`,
      };
    }
    case 'low_stock': {
      const name = String(item.facts.productName ?? 'This item');
      const stock = num(item.facts.stockQuantity);
      const threshold = num(item.facts.lowStockThreshold);
      return {
        title: item.title,
        message: `${name} is running low.`,
        why: `Stock ${stock} (threshold ${threshold}).`,
      };
    }
    default:
      return {
        title: item.title,
        message: 'Recommendation generated from current data.',
      };
  }
}

