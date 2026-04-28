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

const isAnalyticsEligibleOrder = (order: any) => {
  const paymentStatus = String(order?.payment_status || '').toLowerCase();
  return paymentStatus === 'paid' || paymentStatus === 'completed';
};

export const useAnalytics = (days: number = 30) => {
  const { data: vendor } = useVendor();

  return useQuery({
    queryKey: ['analytics', vendor?.id, days],
    queryFn: async () => {
      if (!vendor?.id) throw new Error('No vendor ID');

      const startDate = startOfDay(subDays(new Date(), Math.max(days, 365)));

      // Fetch orders (items are stored as JSONB in orders table)
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('vendor_id', vendor.id)
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

      const eligibleOrders = (orders || []).filter(isAnalyticsEligibleOrder);

      // Calculate daily sales (key: yyyy-MM-dd for correct sort)
      const salesByDayRaw = eligibleOrders.reduce((acc, order) => {
        const day = format(parseISO(order.created_at), 'yyyy-MM-dd');
        acc[day] = (acc[day] || 0) + Number(order.total_amount);
        return acc;
      }, {} as Record<string, number>);

      // Calculate monthly sales (key: yyyy-MM for correct sort)
      const salesByMonthRaw = eligibleOrders.reduce((acc, order) => {
        const month = format(parseISO(order.created_at), 'yyyy-MM');
        acc[month] = (acc[month] || 0) + Number(order.total_amount);
        return acc;
      }, {} as Record<string, number>);

      const salesByDay = Object.entries(salesByDayRaw || {})
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, amount]) => ({
          date: format(parseISO(day), 'MMM dd'),
          label: format(parseISO(day), 'MMM dd'),
          amount,
        }));

      const salesByMonth = Object.entries(salesByMonthRaw || {})
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, amount]) => ({
          date: format(parseISO(month + '-01'), 'MMM yy'),
          label: format(parseISO(month + '-01'), 'MMM yy'),
          amount,
        }));

      // Calculate hourly distribution (peak hours)
      const ordersByHour = eligibleOrders.reduce((acc, order) => {
        const hour = new Date(order.created_at).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      // Fetch products for category & name lookup used in analytics
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, category')
        .eq('vendor_id', vendor.id);

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

      // Calculate product performance
      // Items are stored as JSONB array in orders.items
      const productStats = eligibleOrders.reduce((acc, order) => {
        const items = order.items || [];
        if (Array.isArray(items)) {
          items.forEach((item: any) => {
            const productId = item.product_id;
            const productMeta = productLookup[productId] || {};
            const productName = productMeta.name || item.name || 'Unknown';
            const category = productMeta.category || 'Uncategorized';

            if (!acc[productId]) {
              acc[productId] = {
                id: productId,
                name: productName,
                category,
                totalSold: 0,
                revenue: 0,
                orders: 0,
              };
            }

            acc[productId].totalSold += item.quantity || 0;
            acc[productId].revenue += Number(item.subtotal || (item.price * item.quantity) || 0);
            acc[productId].orders += 1;
          });
        }
        return acc;
      }, {} as Record<string, any>);

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
      const statusDistribution = eligibleOrders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculate weekly comparison
      const thisWeekStart = startOfWeek(new Date());
      const lastWeekStart = startOfWeek(subDays(new Date(), 7));
      const lastWeekEnd = endOfWeek(subDays(new Date(), 7));

      const thisWeekOrders = eligibleOrders.filter(o => 
        new Date(o.created_at) >= thisWeekStart
      );
      
      const lastWeekOrders = eligibleOrders.filter(o => {
        const date = new Date(o.created_at);
        return date >= lastWeekStart && date <= lastWeekEnd;
      });

      const thisWeekRevenue = thisWeekOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
      const lastWeekRevenue = lastWeekOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);

      // Day comparison (today vs yesterday)
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());
      const yesterdayStart = startOfDay(subDays(new Date(), 1));
      const yesterdayEnd = endOfDay(subDays(new Date(), 1));
      const todayOrders = eligibleOrders.filter((o) => {
        const d = new Date(o.created_at);
        return d >= todayStart && d <= todayEnd;
      });
      const yesterdayOrders = eligibleOrders.filter((o) => {
        const d = new Date(o.created_at);
        return d >= yesterdayStart && d <= yesterdayEnd;
      });
      const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
      const yesterdayRevenue = yesterdayOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);

      // Month comparison (this month vs last month)
      const thisMonthStart = startOfMonth(new Date());
      const thisMonthEnd = endOfMonth(new Date());
      const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
      const lastMonthEnd = endOfMonth(subMonths(new Date(), 1));
      const thisMonthOrders = eligibleOrders.filter((o) => {
        const d = new Date(o.created_at);
        return d >= thisMonthStart && d <= thisMonthEnd;
      });
      const lastMonthOrders = eligibleOrders.filter((o) => {
        const d = new Date(o.created_at);
        return d >= lastMonthStart && d <= lastMonthEnd;
      });
      const thisMonthRevenue = thisMonthOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
      const lastMonthRevenue = lastMonthOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);

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

      eligibleOrders.forEach((order) => {
        const date = new Date(order.created_at);
        const dIndex = date.getDay();
        const hour = date.getHours();
        const bucket = heatmap[dIndex]?.hours[hour];
        if (bucket) {
          bucket.orders += 1;
          bucket.revenue += Number(order.total_amount) || 0;
        }
      });

      // Simple conversion funnel (orders placed -> completed)
      const totalOrders = eligibleOrders.length;
      const completedOrders = eligibleOrders.filter((o) => o.status === 'completed').length;
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

      return {
        totalRevenue: eligibleOrders.reduce((sum, o) => sum + Number(o.total_amount), 0),
        totalOrders,
        averageOrderValue: eligibleOrders.length 
          ? (eligibleOrders.reduce((sum, o) => sum + Number(o.total_amount), 0) / eligibleOrders.length)
          : 0,
        salesByDay,
        salesByMonth,
        peakHours: Object.entries(ordersByHour || {})
          .map(([hour, count]) => ({
            hour: parseInt(hour),
            orders: count,
          }))
          .sort((a, b) => b.orders - a.orders)
          .slice(0, 5),
        topProducts: Object.values(productStats || {})
          .sort((a: any, b: any) => b.revenue - a.revenue)
          .slice(0, 10),
        categoryPerformance: Object.values(categoryStats || {}),
        statusDistribution: Object.entries(statusDistribution || {}).map(([status, count]) => ({
          status,
          count,
        })),
        weeklyComparison: {
          thisWeek: {
            revenue: thisWeekRevenue,
            orders: thisWeekOrders.length,
          },
          lastWeek: {
            revenue: lastWeekRevenue,
            orders: lastWeekOrders.length,
          },
          revenueGrowth: lastWeekRevenue > 0 
            ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 
            : 0,
          orderGrowth: lastWeekOrders.length > 0
            ? ((thisWeekOrders.length - lastWeekOrders.length) / lastWeekOrders.length) * 100
            : 0,
        },
        dayComparison: {
          today: { revenue: todayRevenue, orders: todayOrders.length },
          yesterday: { revenue: yesterdayRevenue, orders: yesterdayOrders.length },
          revenueGrowth: yesterdayRevenue > 0 
            ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 
            : (todayRevenue > 0 ? 100 : 0),
          orderGrowth: yesterdayOrders.length > 0
            ? ((todayOrders.length - yesterdayOrders.length) / yesterdayOrders.length) * 100
            : (todayOrders.length > 0 ? 100 : 0),
        },
        monthComparison: {
          thisMonth: { revenue: thisMonthRevenue, orders: thisMonthOrders.length },
          lastMonth: { revenue: lastMonthRevenue, orders: lastMonthOrders.length },
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
      };
    },
    enabled: !!vendor?.id,
    retry: false, // Don't retry on error
  });
};

function getEmptyAnalytics() {
  return {
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    salesByDay: [],
    salesByMonth: [],
    peakHours: [],
    topProducts: [],
    categoryPerformance: [],
    statusDistribution: [],
    weeklyComparison: {
      thisWeek: { revenue: 0, orders: 0 },
      lastWeek: { revenue: 0, orders: 0 },
      revenueGrowth: 0,
      orderGrowth: 0,
    },
    dayComparison: {
      today: { revenue: 0, orders: 0 },
      yesterday: { revenue: 0, orders: 0 },
      revenueGrowth: 0,
      orderGrowth: 0,
    },
    monthComparison: {
      thisMonth: { revenue: 0, orders: 0 },
      lastMonth: { revenue: 0, orders: 0 },
      revenueGrowth: 0,
      orderGrowth: 0,
    },
    heatmap: [],
    conversionFunnel: [],
    performanceScore: 0,
  };
}

export const useAIInsights = () => {
  const { data: vendor } = useVendor();
  const { data: analytics } = useAnalytics(30);

  return useQuery({
    queryKey: ['ai-insights', vendor?.id, analytics],
    queryFn: async () => {
      if (!vendor?.id || !analytics) throw new Error('Missing data');

      const { data, error } = await supabase.functions.invoke('generate-insights', {
        body: { 
          vendorId: vendor.id,
          analytics 
        },
      });

      if (error) throw error;
      return data;
    },
    enabled: !!vendor?.id && !!analytics,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    retry: false, // Don't retry on error (edge function may not exist yet)
  });
};

