import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useVendor } from './useVendor';
import {
  startOfDay,
  endOfDay,
  subDays,
  subMonths,
  startOfMonth,
  endOfMonth,
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import {
  getOrderAmount,
  getOrderCreatedAt,
  isCompletedOrderStatus,
  normalizeOrderStatus,
} from '@/features/vendor/utils/metrics';

type TrendingDish = {
  id: string | null;
  name: string;
  quantity: number;
  revenue: number;
};

export const useAnalytics = (days: number = 30) => {
  const { data: vendor } = useVendor();
  const vendorIds = [vendor?.id, vendor?.user_id].filter(Boolean) as string[];

  return useQuery({
    queryKey: ['analytics', vendor?.id, days],
    queryFn: async () => {
      if (!vendor?.id) throw new Error('No vendor ID');

      const selectedDays = Math.max(days, 1);
      const startDate = startOfDay(subDays(new Date(), selectedDays - 1));

      // Fetch orders (items are stored as JSONB in orders table)
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .in('vendor_id', vendorIds)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (ordersError) {
        // If table doesn't exist, return empty analytics
        if (ordersError.code === '42P01' || ordersError.message?.includes('does not exist')) {
          console.error('orders table does not exist. Please run database setup SQL files.');
          return getEmptyAnalytics();
        }
        throw ordersError;
      }

      const revenueOrders = (orders || []).filter((order) => isCompletedOrderStatus(order.status));

      // Calculate daily sales (key: yyyy-MM-dd for correct sort)
      const salesByDayRaw = revenueOrders.reduce((acc, order) => {
        const createdAt = getOrderCreatedAt(order);
        if (!createdAt) return acc;
        const day = format(parseISO(createdAt), 'yyyy-MM-dd');
        if (!acc[day]) {
          acc[day] = { amount: 0, orders: 0 };
        }
        acc[day].amount += getOrderAmount(order);
        acc[day].orders += 1;
        return acc;
      }, {} as Record<string, { amount: number; orders: number }>);

      // Calculate monthly sales (key: yyyy-MM for correct sort)
      const salesByMonthRaw = revenueOrders.reduce((acc, order) => {
        const createdAt = getOrderCreatedAt(order);
        if (!createdAt) return acc;
        const month = format(parseISO(createdAt), 'yyyy-MM');
        if (!acc[month]) {
          acc[month] = { amount: 0, orders: 0 };
        }
        acc[month].amount += getOrderAmount(order);
        acc[month].orders += 1;
        return acc;
      }, {} as Record<string, { amount: number; orders: number }>);

      // Calculate yearly revenue (key: yyyy for correct sort)
      const revenueByYearRaw = revenueOrders.reduce((acc, order) => {
        const createdAt = getOrderCreatedAt(order);
        if (!createdAt) return acc;
        const year = format(parseISO(createdAt), 'yyyy');
        if (!acc[year]) {
          acc[year] = { amount: 0, orders: 0 };
        }
        acc[year].amount += getOrderAmount(order);
        acc[year].orders += 1;
        return acc;
      }, {} as Record<string, { amount: number; orders: number }>);

      const salesByDay = Object.entries(salesByDayRaw || {})
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, values]) => ({
          date: format(parseISO(day), 'MMM dd'),
          label: format(parseISO(day), 'MMM dd'),
          amount: values.amount,
          orders: values.orders,
        }));

      const salesByMonth = Object.entries(salesByMonthRaw || {})
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, values]) => ({
          date: format(parseISO(month + '-01'), 'MMM yy'),
          label: format(parseISO(month + '-01'), 'MMM yy'),
          amount: values.amount,
          orders: values.orders,
        }));

      const revenueByYear = Object.entries(revenueByYearRaw || {})
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([year, values]) => ({
          date: year,
          label: year,
          amount: values.amount,
          orders: values.orders,
        }));

      // Calculate hourly distribution (peak hours)
      const ordersByHour = (orders || []).reduce((acc, order) => {
        const createdAt = getOrderCreatedAt(order);
        if (!createdAt) return acc;
        const hour = new Date(createdAt).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      // Fetch products for category & name lookup used in analytics
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, category')
        .in('vendor_id', vendorIds);

      if (productsError && productsError.code !== '42P01') {
        throw productsError;
      }

      const productLookup = (products || []).reduce((map, product: any) => {
        map[product.id] = {
          name: product.name,
          category: product.category,
        };
        return map;
      }, {} as Record<string, { name: string | null; category: string | null }>);

      // Calculate product performance + trending dishes (items stored as JSONB array in orders.items)
      const productStats = revenueOrders.reduce((acc, order) => {
        const items = order.items || [];
        if (!Array.isArray(items)) return acc;

        items.forEach((item: any) => {
          const productId: string | null =
            item.product_id ? String(item.product_id) : null;
          const productMeta = productId ? productLookup[productId] || {} : {};
          const productName: string =
            productMeta.name || item.name || 'Unknown';
          const category: string =
            productMeta.category || item.category || 'Uncategorized';

          const key = productId ?? `name:${productName}`;
          if (!acc[key]) {
            acc[key] = {
              id: productId,
              name: productName,
              category,
              totalSold: 0,
              revenue: 0,
              orders: 0,
            };
          }

          const qty = Number(item.quantity ?? item.qty ?? 0) || 0;
          const price = Number(item.price ?? 0) || 0;
          const subtotal =
            Number(item.subtotal ?? item.total ?? 0) || price * qty;

          acc[key].totalSold += qty;
          acc[key].revenue += subtotal;
          acc[key].orders += 1;
        });

        return acc;
      }, {} as Record<string, any>);

      const trendingDishes: TrendingDish[] = (Object.values(productStats || {}) as any[])
        .map((p) => ({
          id: p.id ?? null,
          name: p.name ?? 'Unknown',
          quantity: Number(p.totalSold ?? 0) || 0,
          revenue: Number(p.revenue ?? 0) || 0,
        }))
        .filter((p) => p.quantity > 0)
        .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
        .slice(0, 10);

      // Calculate category performance
      const categoryStats = Object.values(productStats || {}).reduce((acc, product: any) => {
        const category = product.category;
        if (!acc[category]) {
          acc[category] = { category, revenue: 0, count: 0 };
        }
        acc[category].revenue += product.revenue;
        acc[category].count += product.totalSold;
        return acc;
      }, {} as Record<string, any>);

      // Calculate status distribution
      const statusDistribution = (orders || []).reduce((acc, order) => {
        const normalizedStatus = normalizeOrderStatus(order.status);
        acc[normalizedStatus] = (acc[normalizedStatus] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculate weekly comparison
      const thisWeekStart = startOfWeek(new Date());
      const lastWeekStart = startOfWeek(subDays(new Date(), 7));
      const lastWeekEnd = endOfWeek(subDays(new Date(), 7));

      const thisWeekOrders = (orders || []).filter((o) => {
        const createdAt = getOrderCreatedAt(o);
        return createdAt ? new Date(createdAt) >= thisWeekStart : false;
      });
      
      const lastWeekOrders = (orders || []).filter((o) => {
        const createdAt = getOrderCreatedAt(o);
        if (!createdAt) return false;
        const date = new Date(createdAt);
        return date >= lastWeekStart && date <= lastWeekEnd;
      });
      const thisWeekRevenueOrders = thisWeekOrders.filter((o) => isCompletedOrderStatus(o.status));
      const lastWeekRevenueOrders = lastWeekOrders.filter((o) => isCompletedOrderStatus(o.status));
      const thisWeekRevenue = thisWeekRevenueOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);
      const lastWeekRevenue = lastWeekRevenueOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);

      // Day comparison (today vs yesterday)
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());
      const yesterdayStart = startOfDay(subDays(new Date(), 1));
      const yesterdayEnd = endOfDay(subDays(new Date(), 1));
      const todayOrders = (orders || []).filter((o) => {
        const createdAt = getOrderCreatedAt(o);
        if (!createdAt) return false;
        const d = new Date(createdAt);
        return d >= todayStart && d <= todayEnd;
      });
      const yesterdayOrders = (orders || []).filter((o) => {
        const createdAt = getOrderCreatedAt(o);
        if (!createdAt) return false;
        const d = new Date(createdAt);
        return d >= yesterdayStart && d <= yesterdayEnd;
      });
      const todayRevenueOrders = todayOrders.filter((o) => isCompletedOrderStatus(o.status));
      const yesterdayRevenueOrders = yesterdayOrders.filter((o) => isCompletedOrderStatus(o.status));
      const todayRevenue = todayRevenueOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);
      const yesterdayRevenue = yesterdayRevenueOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);

      // Month comparison (this month vs last month)
      const thisMonthStart = startOfMonth(new Date());
      const thisMonthEnd = endOfMonth(new Date());
      const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
      const lastMonthEnd = endOfMonth(subMonths(new Date(), 1));
      const thisMonthOrders = (orders || []).filter((o) => {
        const createdAt = getOrderCreatedAt(o);
        if (!createdAt) return false;
        const d = new Date(createdAt);
        return d >= thisMonthStart && d <= thisMonthEnd;
      });
      const lastMonthOrders = (orders || []).filter((o) => {
        const createdAt = getOrderCreatedAt(o);
        if (!createdAt) return false;
        const d = new Date(createdAt);
        return d >= lastMonthStart && d <= lastMonthEnd;
      });
      const thisMonthRevenueOrders = thisMonthOrders.filter((o) => isCompletedOrderStatus(o.status));
      const lastMonthRevenueOrders = lastMonthOrders.filter((o) => isCompletedOrderStatus(o.status));
      const thisMonthRevenue = thisMonthRevenueOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);
      const lastMonthRevenue = lastMonthRevenueOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);

      // Returning customers (registered only): customer_id with 2+ completed orders in selected period
      const completedByCustomerId = revenueOrders.reduce((acc, order) => {
        const customerId = order.customer_id ? String(order.customer_id) : null;
        if (!customerId) return acc;
        acc[customerId] = (acc[customerId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const uniqueCustomersCount = Object.keys(completedByCustomerId).length;
      const returningCustomersCount = Object.values(completedByCustomerId).filter(
        (count) => count >= 2
      ).length;

      // Build engagement heatmap: 7 days x 24 hours
      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const heatmap = daysOfWeek.map((label, dayIndex) => ({
        dayIndex,
        label,
        hours: Array.from({ length: 24 }, (_, hour) => ({
          hour,
          orders: 0,
          revenue: 0,
        })),
      }));

      revenueOrders.forEach((order) => {
        const createdAt = getOrderCreatedAt(order);
        if (!createdAt) return;
        const date = new Date(createdAt);
        const dIndex = date.getDay();
        const hour = date.getHours();
        const bucket = heatmap[dIndex]?.hours[hour];
        if (bucket) {
          bucket.orders += 1;
          bucket.revenue += getOrderAmount(order);
        }
      });

      // Simple conversion funnel (orders placed -> completed)
      const totalOrders = orders?.length || 0;
      const completedOrders = revenueOrders.length;
      const conversionFunnel =
        totalOrders === 0
          ? [
              { stage: 'Orders placed', value: 1 },
              { stage: 'Completed', value: 0 },
            ]
          : [
              { stage: 'Orders placed', value: totalOrders },
              { stage: 'Completed', value: completedOrders },
            ];

      // Simple performance score: blend completion rate + recent growth (0-100)
      const completionRate = totalOrders > 0 ? completedOrders / totalOrders : 0;
      const revenueGrowthPct =
        lastWeekRevenue > 0 ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 : 0;
      const growthScore = Math.max(Math.min(revenueGrowthPct / 2, 40), 0); // cap contribution
      const completionScore = completionRate * 60;
      const performanceScore = Math.max(
        0,
        Math.min(100, Math.round(completionScore + growthScore)),
      );

      const totalRevenue = revenueOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);
      const averageOrderValue = revenueOrders.length ? totalRevenue / revenueOrders.length : 0;
      const thisWeekAov = thisWeekRevenueOrders.length ? thisWeekRevenue / thisWeekRevenueOrders.length : 0;
      const lastWeekAov = lastWeekRevenueOrders.length ? lastWeekRevenue / lastWeekRevenueOrders.length : 0;
      const todayAov = todayRevenueOrders.length ? todayRevenue / todayRevenueOrders.length : 0;
      const yesterdayAov = yesterdayRevenueOrders.length ? yesterdayRevenue / yesterdayRevenueOrders.length : 0;
      const thisMonthAov = thisMonthRevenueOrders.length ? thisMonthRevenue / thisMonthRevenueOrders.length : 0;
      const lastMonthAov = lastMonthRevenueOrders.length ? lastMonthRevenue / lastMonthRevenueOrders.length : 0;

      return {
        totalRevenue,
        todayRevenue,
        totalOrders,
        completedOrders,
        averageOrderValue,
        salesByDay,
        salesByMonth,
        revenueByYear,
        peakHours: Object.entries(ordersByHour || {})
          .map(([hour, count]) => ({
            hour: parseInt(hour),
            orders: count,
          }))
          .sort((a, b) => b.orders - a.orders)
          .slice(0, 5),
        topProducts: (Object.values(productStats || {}) as any[])
          .sort((a: any, b: any) => (b.totalSold ?? 0) - (a.totalSold ?? 0) || (b.revenue ?? 0) - (a.revenue ?? 0))
          .slice(0, 10),
        trendingDishes,
        uniqueCustomersCount,
        returningCustomersCount,
        categoryPerformance: Object.values(categoryStats || {}) as any[],
        statusDistribution: Object.entries(statusDistribution || {}).map(([status, count]) => ({
          status,
          count,
        })),
        weeklyComparison: {
          thisWeek: {
            revenue: thisWeekRevenue,
            orders: thisWeekOrders.length,
            completedOrders: thisWeekRevenueOrders.length,
            averageOrderValue: thisWeekAov,
          },
          lastWeek: {
            revenue: lastWeekRevenue,
            orders: lastWeekOrders.length,
            completedOrders: lastWeekRevenueOrders.length,
            averageOrderValue: lastWeekAov,
          },
          revenueGrowth: lastWeekRevenue > 0 
            ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 
            : 0,
          orderGrowth: lastWeekOrders.length > 0
            ? ((thisWeekOrders.length - lastWeekOrders.length) / lastWeekOrders.length) * 100
            : 0,
        },
        dayComparison: {
          today: {
            revenue: todayRevenue,
            orders: todayOrders.length,
            completedOrders: todayRevenueOrders.length,
            averageOrderValue: todayAov,
          },
          yesterday: {
            revenue: yesterdayRevenue,
            orders: yesterdayOrders.length,
            completedOrders: yesterdayRevenueOrders.length,
            averageOrderValue: yesterdayAov,
          },
          revenueGrowth: yesterdayRevenue > 0 
            ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 
            : (todayRevenue > 0 ? 100 : 0),
          orderGrowth: yesterdayOrders.length > 0
            ? ((todayOrders.length - yesterdayOrders.length) / yesterdayOrders.length) * 100
            : (todayOrders.length > 0 ? 100 : 0),
        },
        monthComparison: {
          thisMonth: {
            revenue: thisMonthRevenue,
            orders: thisMonthOrders.length,
            completedOrders: thisMonthRevenueOrders.length,
            averageOrderValue: thisMonthAov,
          },
          lastMonth: {
            revenue: lastMonthRevenue,
            orders: lastMonthOrders.length,
            completedOrders: lastMonthRevenueOrders.length,
            averageOrderValue: lastMonthAov,
          },
          revenueGrowth: lastMonthRevenue > 0 
            ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
            : (thisMonthRevenue > 0 ? 100 : 0),
          orderGrowth: lastMonthOrders.length > 0
            ? ((thisMonthOrders.length - lastMonthOrders.length) / lastMonthOrders.length) * 100
            : (thisMonthOrders.length > 0 ? 100 : 0),
        },
        heatmap,
        conversionFunnel,
        performanceScore,
        anomaly: null,
        trendSummary: null,
        segmentAnalytics: {
          devices: [],
          regions: [],
          categories: [],
        },
        radarMetrics: [],
        todayVsYesterday: {
          revenue: {
            today: todayRevenue,
            yesterday: yesterdayRevenue,
            delta: yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : (todayRevenue > 0 ? 100 : 0),
          },
          orders: {
            today: todayOrders.length,
            yesterday: yesterdayOrders.length,
            delta: yesterdayOrders.length > 0 ? ((todayOrders.length - yesterdayOrders.length) / yesterdayOrders.length) * 100 : (todayOrders.length > 0 ? 100 : 0),
          },
          aov: {
            today: todayAov,
            yesterday: yesterdayAov,
            delta: yesterdayAov > 0 ? ((todayAov - yesterdayAov) / yesterdayAov) * 100 : (todayAov > 0 ? 100 : 0),
          },
        },
      };
    },
    enabled: vendorIds.length > 0,
    retry: false, // Don't retry on error
  });
};

function getEmptyAnalytics() {
  return {
    totalRevenue: 0,
    todayRevenue: 0,
    totalOrders: 0,
    completedOrders: 0,
    averageOrderValue: 0,
    salesByDay: [],
    salesByMonth: [],
    revenueByYear: [],
    peakHours: [],
    topProducts: [],
    trendingDishes: [],
    uniqueCustomersCount: 0,
    returningCustomersCount: 0,
    categoryPerformance: [],
    statusDistribution: [],
    weeklyComparison: {
      thisWeek: { revenue: 0, orders: 0, completedOrders: 0, averageOrderValue: 0 },
      lastWeek: { revenue: 0, orders: 0, completedOrders: 0, averageOrderValue: 0 },
      revenueGrowth: 0,
      orderGrowth: 0,
    },
    dayComparison: {
      today: { revenue: 0, orders: 0, completedOrders: 0, averageOrderValue: 0 },
      yesterday: { revenue: 0, orders: 0, completedOrders: 0, averageOrderValue: 0 },
      revenueGrowth: 0,
      orderGrowth: 0,
    },
    monthComparison: {
      thisMonth: { revenue: 0, orders: 0, completedOrders: 0, averageOrderValue: 0 },
      lastMonth: { revenue: 0, orders: 0, completedOrders: 0, averageOrderValue: 0 },
      revenueGrowth: 0,
      orderGrowth: 0,
    },
    heatmap: [],
    conversionFunnel: [],
    performanceScore: 0,
    anomaly: null,
    trendSummary: null,
    segmentAnalytics: {
      devices: [],
      regions: [],
      categories: [],
    },
    radarMetrics: [],
    todayVsYesterday: {
      revenue: { today: 0, yesterday: 0, delta: 0 },
      orders: { today: 0, yesterday: 0, delta: 0 },
      aov: { today: 0, yesterday: 0, delta: 0 },
    },
  };
}
