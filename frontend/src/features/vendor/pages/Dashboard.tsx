/**
 * Vendor Dashboard Overview
 *
 * This page is adapted from Migration_Data/src/pages/Dashboard.tsx.
 * It keeps the richer metrics, charts, and quick actions from that version,
 * but is wired to the current frontend vendor hooks (useVendor, useOrders,
 * useProducts, usePaymentStats, useAnalytics) and the existing layout/routing.
 *
 * NOTE: Dark mode styling will be revisited after the full migration is complete.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IndianRupee,
  ShoppingCart,
  Package,
  AlertCircle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  BarChart3,
  Clock,
  Zap,
  Eye,
  PlayCircle,
  QrCode,
  LayoutDashboard,
  Store,
  CheckCircle2,
  XCircle,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { useVendor } from '@/features/vendor/hooks/useVendor';
import { useOrders } from '@/features/vendor/hooks/useOrders';
import { useProducts } from '@/features/vendor/hooks/useProducts';
import { usePaymentStats } from '@/features/vendor/hooks/usePayments';
import { useAnalytics } from '@/features/vendor/hooks/useAnalytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
// NOTE: Dark mode toggle will be revisited after migration.
// For now we keep the dashboard always in the default theme.
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useOrderContext } from '@/context/OrderProvider';
import type { OrderStatus } from '@/types';
import { DraggableMetricCards } from '@/features/vendor/components/DraggableMetricCards';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ORDER_SLA_MINUTES, isOrderStuck } from '@/constants/orderSla';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  isActiveOrderStatus,
  needsProductRestock,
  normalizeOrderStatus,
} from '@/features/vendor/utils/metrics';

const CHART_COLORS = {
  revenue: 'hsl(221, 83%, 40%)',
  orders: 'hsl(142, 71%, 45%)',
  accent: 'hsl(142, 71%, 45%)',
  primary: 'hsl(221, 83%, 40%)',
  warning: 'hsl(48, 96%, 53%)',
  destructive: 'hsl(0, 84%, 60%)',
  processing: 'hsl(199, 89%, 48%)',
  ready: 'hsl(142, 71%, 45%)',
} as const;

const PIE_COLORS = [
  'hsl(221, 83%, 40%)',
  'hsl(142, 71%, 45%)',
  'hsl(199, 89%, 48%)',
  'hsl(48, 96%, 53%)',
  'hsl(280, 60%, 50%)',
  'hsl(0, 0%, 65%)', // Rest - muted gray
];

const ORDER_STATUS_CONFIG = {
  pending: {
    icon: Clock,
    color: CHART_COLORS.warning,
    label: 'Pending',
    badgeVariant: 'secondary' as const,
  },
  processing: {
    icon: AlertCircle,
    color: CHART_COLORS.processing,
    label: 'Processing',
    badgeVariant: 'default' as const,
  },
  ready: {
    icon: CheckCircle2,
    color: CHART_COLORS.ready,
    label: 'Ready',
    badgeVariant: 'outline' as const,
  },
  completed: {
    icon: CheckCircle2,
    color: CHART_COLORS.orders,
    label: 'Completed',
    badgeVariant: 'default' as const,
  },
  cancelled: {
    icon: XCircle,
    color: 'hsl(25, 95%, 53%)', // orange - Unable to deliver (red reserved for Cancelled)
    label: 'Unable to deliver',
    badgeVariant: 'outline' as const,
  },
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const formatCurrency = (value: number) =>
  `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const getRecentOrderAction = (status: OrderStatus): { label: string; nextStatus: OrderStatus } | null => {
  if (status === 'NEW') return { label: 'Accept', nextStatus: 'IN_PROGRESS' };
  if (status === 'IN_PROGRESS') return { label: 'Mark Ready', nextStatus: 'READY' };
  if (status === 'READY') return { label: 'Complete', nextStatus: 'COMPLETED' };
  return null;
};

const getSourceLabel = (order: any) => {
  if (order.orderType === 'DINE_IN') return 'Walk-in';
  if (order.orderType === 'TAKEAWAY') return 'Takeaway';
  if (order.orderType === 'DELIVERY') return 'Delivery';
  return 'Storefront';
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: vendor, isLoading: vendorLoading } = useVendor();
  const { data: orders, isLoading: ordersLoading } = useOrders();
  const { data: products, isLoading: productsLoading } = useProducts();
  const { isLoading: paymentsLoading } = usePaymentStats();
  const { data: analytics, isLoading: analyticsLoading } = useAnalytics(30);
  const { orders: liveOrders, changeOrderStatus } = useOrderContext();
  const [metricRange, setMetricRange] = useState<'day' | 'week' | 'month'>('week');
  const [chartRange, setChartRange] = useState<'7d' | 'monthly' | 'lifetime'>('7d');
  const [statusFilter, setStatusFilter] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [quickViewOrder, setQuickViewOrder] = useState<any | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  // Revenue & orders by selected range (Total Revenue & Total Orders cards)
  const rangeData = (() => {
    if (!analytics) return { revenue: 0, orders: 0, growth: { revenue: 0, orders: 0 }, label: 'vs last week' };
    if (metricRange === 'day') {
      const d = analytics.dayComparison;
      return {
        revenue: d.today.revenue,
        orders: d.today.orders,
        growth: { revenue: d.revenueGrowth, orders: d.orderGrowth },
        label: 'vs yesterday',
      };
    }
    if (metricRange === 'month') {
      const m = analytics.monthComparison;
      return {
        revenue: m.thisMonth.revenue,
        orders: m.thisMonth.orders,
        growth: { revenue: m.revenueGrowth, orders: m.orderGrowth },
        label: 'vs last month',
      };
    }
    const w = analytics.weeklyComparison;
    return {
      revenue: w.thisWeek.revenue,
      orders: w.thisWeek.orders,
      growth: { revenue: w.revenueGrowth, orders: w.orderGrowth },
      label: 'vs last week',
    };
  })();

  const totalRevenue = rangeData.revenue;
  const totalOrders = rangeData.orders;
  const stockAttentionProducts =
    products?.filter((product: any) => needsProductRestock(product)).length || 0;

  const recentOrders = useMemo(() => (liveOrders || []).slice(0, 5), [liveOrders]);
  const pendingLiveOrders = useMemo(
    () => (liveOrders || []).filter((o) => o.status === 'NEW'),
    [liveOrders]
  );

  // Filter orders for Order Status section by period
  const ordersForStatus = (() => {
    const list = orders || [];
    const now = new Date();
    if (statusFilter === 'daily') {
      const todayStart = startOfDay(now);
      return list.filter((o: any) => new Date(o.created_at) >= todayStart);
    }
    if (statusFilter === 'weekly') {
      const weekStart = startOfWeek(now);
      return list.filter((o: any) => new Date(o.created_at) >= weekStart);
    }
    const monthStart = startOfMonth(now);
    return list.filter((o: any) => new Date(o.created_at) >= monthStart);
  })();

  const pendingOrders = ordersForStatus.filter((o: any) => normalizeOrderStatus(o.status) === 'NEW').length;
  const processingOrders = ordersForStatus.filter((o: any) => normalizeOrderStatus(o.status) === 'IN_PROGRESS').length;
  const readyOrders = ordersForStatus.filter((o: any) => normalizeOrderStatus(o.status) === 'READY').length;
  const completedOrders = ordersForStatus.filter((o: any) => normalizeOrderStatus(o.status) === 'COMPLETED').length;
  const cancelledOrders = ordersForStatus.filter((o: any) => normalizeOrderStatus(o.status) === 'CANCELLED').length;
  const activeOrdersAll = (orders || []).filter((o: any) => isActiveOrderStatus(o.status)).length;

  const statusData = [
    { name: 'Completed', value: completedOrders, color: CHART_COLORS.orders },
    { name: 'Pending', value: pendingOrders, color: CHART_COLORS.warning },
    { name: 'Processing', value: processingOrders, color: CHART_COLORS.processing },
    { name: 'Ready', value: readyOrders, color: CHART_COLORS.ready },
    { name: 'Unable to deliver', value: cancelledOrders, color: 'hsl(25, 95%, 53%)' },
  ].filter((item) => item.value > 0);

  const revenueGrowth = rangeData.growth.revenue;
  const orderGrowth = rangeData.growth.orders;
  const comparisonLabel = rangeData.label;
  const averageOrderValue =
    metricRange === 'day'
      ? (analytics?.dayComparison?.today?.averageOrderValue || 0)
      : metricRange === 'month'
        ? (analytics?.monthComparison?.thisMonth?.averageOrderValue || 0)
        : (analytics?.weeklyComparison?.thisWeek?.averageOrderValue || 0);
  const allTopProducts = analytics?.topProducts || [];
  const topProducts = allTopProducts.slice(0, 5);
  const restProducts = allTopProducts.slice(5);
  const restSold = restProducts.reduce((sum: number, p: any) => sum + (p.totalSold || 0), 0);
  const topProductsPieData = [
    ...topProducts.map((p: any, i: number) => ({
      name: p.name?.length > 18 ? p.name.slice(0, 18) + '…' : p.name,
      value: p.totalSold || 0,
      fullName: p.name,
      color: PIE_COLORS[i],
    })),
    ...(restSold > 0 ? [{ name: 'Rest', value: restSold, fullName: 'Other products', color: PIE_COLORS[5] }] : []),
  ];

  const categoryPerformance = analytics?.categoryPerformance || [];
  const topCategories = categoryPerformance
    .sort((a: any, b: any) => (b.revenue || 0) - (a.revenue || 0))
    .slice(0, 3);
  const restCategories = categoryPerformance
    .sort((a: any, b: any) => (b.revenue || 0) - (a.revenue || 0))
    .slice(3);
  const restCategoryRevenue = restCategories.reduce((sum: number, c: any) => sum + (c.revenue || 0), 0);
  const topCategoriesPieData = [
    ...topCategories.map((c: any, i: number) => ({
      name: (c.category || 'Uncategorized')?.length > 14 ? (c.category || '').slice(0, 14) + '…' : (c.category || 'Uncategorized'),
      value: c.revenue || 0,
      fullName: c.category || 'Uncategorized',
      color: PIE_COLORS[i],
    })),
    ...(restCategoryRevenue > 0 ? [{ name: 'Rest', value: restCategoryRevenue, fullName: 'Other categories', color: PIE_COLORS[5] }] : []),
  ];
  const salesChartData = (() => {
    if (!analytics) return [];
    if (chartRange === '7d') return analytics.salesByDay?.slice(-7) || [];
    if (chartRange === 'monthly') return (analytics.salesByMonth || []).slice(-12);
    return analytics.salesByMonth || [];
  })();

  const vendorName = vendor?.business_name || user?.full_name || 'Vendor';

  const handleRecentOrderAction = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      await changeOrderStatus(orderId, nextStatus);
    } catch (error) {
      console.error('Failed to change order status from dashboard:', error);
    }
  };

  const handleStartNextOrder = async () => {
    if (pendingLiveOrders.length === 0) return;
    const nextOrder = [...pendingLiveOrders].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )[0];
    await handleRecentOrderAction(nextOrder.id, 'IN_PROGRESS');
  };

  if (vendorLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <LayoutDashboard className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                <p className="text-muted-foreground">
                  {getGreeting()}, <span className="font-semibold text-foreground">{vendorName}</span>
                </p>
                <Badge variant="secondary" className="gap-1 font-normal">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(), 'EEEE, d MMM yyyy')}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/vendor/dashboard/insights')}
            className="gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            View Analytics
          </Button>
        </div>
      </div>

      {/* Metric Cards (draggable – drag handle on hover) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <ToggleGroup
            type="single"
            value={metricRange}
            onValueChange={(v) => v && setMetricRange(v as 'day' | 'week' | 'month')}
            className="gap-0.5 rounded-md border bg-muted/50 p-0.5"
          >
            <ToggleGroupItem value="day" size="sm" className="h-7 rounded px-2 text-xs">
              Day
            </ToggleGroupItem>
            <ToggleGroupItem value="week" size="sm" className="h-7 rounded px-2 text-xs">
              Week
            </ToggleGroupItem>
            <ToggleGroupItem value="month" size="sm" className="h-7 rounded px-2 text-xs">
              Month
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      <DraggableMetricCards vendorId={vendor?.id}>
        {/* Total Revenue */}
        <Card className="h-full min-h-[180px] relative overflow-hidden border-2 border-primary/20 hover:border-primary/50 transition-all duration-300 group hover:shadow-lg bg-gradient-to-br from-primary/5 to-card flex flex-col">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-primary/50 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <IndianRupee className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-4 w-24" />
              </>
            ) : (
              <>
                <div className="text-3xl font-bold mb-2">{formatCurrency(totalRevenue)}</div>
                <div className="flex items-center gap-2 text-xs">
                  <Badge
                    variant={revenueGrowth >= 0 ? 'default' : 'destructive'}
                    className="gap-1"
                  >
                    {revenueGrowth >= 0 ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {Math.abs(revenueGrowth).toFixed(1)}%
                  </Badge>
                  <span className="text-muted-foreground">{comparisonLabel}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total Orders */}
        <Card className="h-full min-h-[180px] relative overflow-hidden border-2 border-accent/20 hover:border-accent/50 transition-all duration-300 group hover:shadow-lg bg-gradient-to-br from-accent/5 to-card flex flex-col">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent via-accent/50 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
            <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
              <ShoppingCart className="h-5 w-5 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <>
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-4 w-24" />
              </>
            ) : (
              <>
                <div className="text-3xl font-bold mb-2">{totalOrders}</div>
                <div className="flex items-center gap-2 text-xs">
                  <Badge
                    variant={orderGrowth >= 0 ? 'default' : 'destructive'}
                    className="gap-1"
                  >
                    {orderGrowth >= 0 ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {Math.abs(orderGrowth).toFixed(1)}%
                  </Badge>
                  <span className="text-muted-foreground">
                    {metricRange === 'day' ? 'today' : metricRange === 'week' ? `${activeOrdersAll} active` : 'this month'}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Average Order Value */}
        <Card className="h-full min-h-[180px] relative overflow-hidden border-2 border-[hsl(48,96%,53%)]/20 hover:border-[hsl(48,96%,53%)]/50 transition-all duration-300 group hover:shadow-lg bg-gradient-to-br from-[hsl(48,96%,53%)]/5 to-card flex flex-col">
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(48,96%,53%)]/10 via-[hsl(48,96%,53%)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[hsl(48,96%,53%)] via-[hsl(48,96%,53%)]/50 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Order Value
            </CardTitle>
            <div className="h-10 w-10 rounded-full bg-[hsl(48,96%,53%)]/10 flex items-center justify-center group-hover:bg-[hsl(48,96%,53%)]/20 transition-colors">
              <TrendingUp className="h-5 w-5" style={{ color: 'hsl(48, 96%, 53%)' }} />
            </div>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <>
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-4 w-32" />
              </>
            ) : (
              <>
                <div className="text-3xl font-bold mb-2">{formatCurrency(averageOrderValue)}</div>
                <p className="text-xs text-muted-foreground">Per order</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Stock Status */}
        <Card
          className={cn(
            'h-full min-h-[180px] relative overflow-hidden border-2 transition-all duration-300 group hover:shadow-lg flex flex-col',
            stockAttentionProducts > 0
              ? 'hover:border-destructive/50 border-destructive/20 bg-gradient-to-br from-destructive/5 to-card'
              : 'hover:border-accent/50 border-accent/20 bg-gradient-to-br from-accent/5 to-card',
          )}
        >
          <div
            className={cn(
              'absolute inset-0 bg-gradient-to-br to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300',
              stockAttentionProducts > 0 ? 'from-destructive/10 via-destructive/5' : 'from-accent/10 via-accent/5',
            )}
          />
          <div
            className={cn(
              'absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r to-transparent opacity-50 group-hover:opacity-100 transition-opacity',
              stockAttentionProducts > 0 ? 'from-destructive via-destructive/50' : 'from-accent via-accent/50',
            )}
          />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stock Status</CardTitle>
            <div
              className={cn(
                'h-10 w-10 rounded-full flex items-center justify-center transition-colors',
                stockAttentionProducts > 0
                  ? 'bg-destructive/10 group-hover:bg-destructive/20'
                  : 'bg-accent/10 group-hover:bg-accent/20',
              )}
            >
              {stockAttentionProducts > 0 ? (
                <AlertCircle className="h-5 w-5 text-destructive" />
              ) : (
                <Package className="h-5 w-5 text-accent" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {productsLoading ? (
              <>
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-4 w-32" />
              </>
            ) : (
              <>
                <div className="text-3xl font-bold mb-2">{stockAttentionProducts}</div>
                <p className="text-xs text-muted-foreground">
                  {stockAttentionProducts > 0 ? 'Products need restocking' : 'All products stocked'}
                </p>
                <p className="text-xs text-muted-foreground/80 mt-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Stock as of {format(new Date(), 'd MMM yyyy')}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </DraggableMetricCards>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Sales Overview */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Sales Overview
                </CardTitle>
                <CardDescription>
                  {chartRange === '7d' && 'Last 7 days revenue trend'}
                  {chartRange === 'monthly' && 'Last 12 months revenue trend'}
                  {chartRange === 'lifetime' && 'All-time revenue trend'}
                </CardDescription>
              </div>
              <ToggleGroup
                type="single"
                value={chartRange}
                onValueChange={(v) => v && setChartRange(v as '7d' | 'monthly' | 'lifetime')}
                className="gap-0.5 rounded-md border bg-muted/50 p-0.5 w-fit"
              >
                <ToggleGroupItem value="7d" size="sm" className="h-7 rounded px-2 text-xs">
                  7 Days
                </ToggleGroupItem>
                <ToggleGroupItem value="monthly" size="sm" className="h-7 rounded px-2 text-xs">
                  Monthly
                </ToggleGroupItem>
                <ToggleGroupItem value="lifetime" size="sm" className="h-7 rounded px-2 text-xs">
                  Lifetime
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : salesChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={salesChartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.revenue} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.revenue} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke={CHART_COLORS.revenue}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No sales data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Status Distribution */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Order Status
                </CardTitle>
                <CardDescription>Distribution of orders</CardDescription>
              </div>
              <ToggleGroup
                type="single"
                value={statusFilter}
                onValueChange={(v) => v && setStatusFilter(v as 'daily' | 'weekly' | 'monthly')}
                className="gap-0.5 rounded-md border bg-muted/50 p-0.5 w-fit"
              >
                <ToggleGroupItem value="daily" size="sm" className="h-7 rounded px-2 text-xs">
                  Daily
                </ToggleGroupItem>
                <ToggleGroupItem value="weekly" size="sm" className="h-7 rounded px-2 text-xs">
                  Weekly
                </ToggleGroupItem>
                <ToggleGroupItem value="monthly" size="sm" className="h-7 rounded px-2 text-xs">
                  Monthly
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : statusData.length > 0 ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(Number(percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 pt-4 border-t border-border">
                  {statusData.map((status, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        <span className="text-sm text-foreground">{status.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-foreground">{status.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No orders yet</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-2 border-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Quick Actions
          </CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3 hover:bg-primary/5 hover:border-primary/30 transition-all group"
              onClick={() => navigate('/vendor/dashboard/inventory')}
            >
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Package className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Inventory</p>
                <p className="text-xs text-muted-foreground">Products & stock</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3 hover:bg-accent/5 hover:border-accent/30 transition-all group"
              onClick={() => navigate('/vendor/dashboard/orders')}
            >
              <div className="p-2 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                <ShoppingCart className="h-4 w-4 text-accent" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">View Orders</p>
                <p className="text-xs text-muted-foreground">Manage all orders</p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {pendingLiveOrders.length}
              </Badge>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3 hover:bg-[hsl(48,96%,53%)]/5 hover:border-[hsl(48,96%,53%)]/30 transition-all group"
              onClick={() => navigate('/vendor/dashboard/storefront')}
            >
              <div className="p-2 rounded-lg bg-[hsl(48,96%,53%)]/10 group-hover:bg-[hsl(48,96%,53%)]/20 transition-colors">
                <Store className="h-4 w-4" style={{ color: 'hsl(48, 96%, 53%)' }} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Storefront</p>
                <p className="text-xs text-muted-foreground">View your store</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3 hover:bg-primary/5 hover:border-primary/30 transition-all group"
              onClick={() => navigate('/vendor/dashboard/insights')}
            >
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Analytics</p>
                <p className="text-xs text-muted-foreground">View insights</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3 hover:bg-emerald-50 hover:border-emerald-300 transition-all group"
              onClick={handleStartNextOrder}
              disabled={pendingLiveOrders.length === 0}
            >
              <div className="p-2 rounded-lg bg-emerald-100 group-hover:bg-emerald-200 transition-colors">
                <PlayCircle className="h-4 w-4 text-emerald-700" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Start Next Order</p>
                <p className="text-xs text-muted-foreground">Auto-pick oldest pending</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3 hover:bg-blue-50 hover:border-blue-300 transition-all group"
              onClick={() => navigate('/vendor/dashboard/storefront')}
            >
              <div className="p-2 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors">
                <QrCode className="h-4 w-4 text-blue-700" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Share QR</p>
                <p className="text-xs text-muted-foreground">Bring more walk-ins</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Top Products, Top Categories & Recent Orders */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Top Products
                </CardTitle>
                <CardDescription>Best performing products</CardDescription>
              </div>
              {topProductsPieData.length > 0 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                      <BarChart3 className="h-3 w-3" />
                      View chart
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Top Products</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <ResponsiveContainer width={200} height={200}>
                        <PieChart>
                          <Pie
                            data={topProductsPieData}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(Number(percent || 0) * 100).toFixed(0)}%`}
                          >
                            {topProductsPieData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            formatter={(value: number) => [`${value} sold`, 'Sold']}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-1.5 text-sm">
                        {topProductsPieData.map((entry, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="truncate" title={entry.fullName}>
                              {entry.name}
                            </span>
                            <span className="font-semibold text-foreground">{entry.value} sold</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : topProducts.length > 0 ? (
              <div className="space-y-3">
                {topProducts.map((product: any, index: number) => (
                  <div
                    key={product.id || index}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: PIE_COLORS[index] }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">{product.totalSold} sold</span>
                          {' • '}
                          {formatCurrency(product.revenue)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-2 shrink-0 text-xs">
                      {product.category || '—'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No product data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Categories */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-primary" />
                  Top Categories
                </CardTitle>
                <CardDescription>Revenue by category</CardDescription>
              </div>
              {topCategoriesPieData.length > 0 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                      <BarChart3 className="h-3 w-3" />
                      View chart
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Top Categories</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <ResponsiveContainer width={200} height={200}>
                        <PieChart>
                          <Pie
                            data={topCategoriesPieData}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(Number(percent || 0) * 100).toFixed(0)}%`}
                          >
                            {topCategoriesPieData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-1.5 text-sm">
                        {topCategoriesPieData.map((entry, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="truncate" title={entry.fullName}>
                              {entry.name}
                            </span>
                            <span className="font-semibold text-foreground">{formatCurrency(entry.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : topCategories.length > 0 ? (
              <div className="space-y-3">
                {topCategories.map((cat: any, index: number) => (
                  <div
                    key={cat.category || index}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: PIE_COLORS[index] }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{cat.category || 'Uncategorized'}</p>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">{formatCurrency(cat.revenue || 0)}</span>
                          {' • '}
                          {cat.count || 0} sold
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No category data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders - full width */}
      <div>
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Recent Orders
                </CardTitle>
                <CardDescription>Latest orders from your storefront</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/vendor/dashboard/orders')}
                className="gap-1"
              >
                View All
                <ArrowUpRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3">
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.map((order: any) => {
                  const stuck = isOrderStuck(order, nowMs);
                  const dashboardStatus =
                    order.status === 'NEW'
                      ? 'pending'
                      : order.status === 'IN_PROGRESS'
                        ? 'processing'
                        : order.status === 'READY'
                          ? 'ready'
                          : order.status === 'COMPLETED'
                            ? 'completed'
                            : 'cancelled';
                  const statusConfig =
                    ORDER_STATUS_CONFIG[dashboardStatus as keyof typeof ORDER_STATUS_CONFIG] ||
                    ORDER_STATUS_CONFIG.pending;
                  const StatusIcon = statusConfig.icon;
                  const action = getRecentOrderAction(order.status as OrderStatus);
                  return (
                    <div
                      key={order.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setQuickViewOrder(order)}
                      onKeyDown={(e) => e.key === 'Enter' && setQuickViewOrder(order)}
                      className={cn(
                        'group flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-all cursor-pointer hover:shadow-md hover:border-primary/20 relative overflow-hidden',
                        stuck && 'border-red-300 bg-red-50/40'
                      )}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 translate-x-2 group-hover:translate-x-0">
                        <Eye className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className="p-2 rounded-lg flex-shrink-0"
                          style={{ backgroundColor: `${statusConfig.color}15` }}
                        >
                          <StatusIcon
                            className="h-4 w-4"
                            style={{ color: statusConfig.color }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-medium truncate">{order.orderNumber ?? order.id.slice(-6).toUpperCase()}</p>
                            <Badge variant={statusConfig.badgeVariant} className="text-xs">
                              {statusConfig.label}
                            </Badge>
                            <Badge variant={order.paymentStatus === 'PAID' ? 'default' : 'secondary'} className="text-xs">
                              {order.paymentStatus === 'PAID' ? 'Paid' : 'Payment Pending'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {getSourceLabel(order)}
                            </Badge>
                            {stuck && (
                              <Badge variant="destructive" className="text-xs gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Stuck
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>{order.customerName || 'Guest'}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(order.createdAt), 'MMM dd, HH:mm')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-semibold text-lg">
                          {formatCurrency(Number(order.total))}
                        </p>
                        {action && (
                          <Button
                            size="sm"
                            className="mt-2 h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRecentOrderAction(order.id, action.nextStatus);
                            }}
                          >
                            {action.label}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No orders yet</p>
                <p className="text-xs mt-1">Share your storefront QR to start receiving orders</p>
                <p className="text-xs mt-1">SLA alert threshold: {ORDER_SLA_MINUTES} minutes</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => navigate('/vendor/dashboard/storefront')}
                >
                  View Storefront
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick view popup for Recent Orders */}
        <Dialog open={!!quickViewOrder} onOpenChange={(o) => !o && setQuickViewOrder(null)}>
          <DialogContent className="max-w-sm">
            {quickViewOrder && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    Order {quickViewOrder.orderNumber ?? quickViewOrder.id?.slice(-6)?.toUpperCase()}
                    <Badge
                      variant={
                        ORDER_STATUS_CONFIG[quickViewOrder.status as keyof typeof ORDER_STATUS_CONFIG]
                          ?.badgeVariant || 'secondary'
                      }
                    >
                      {ORDER_STATUS_CONFIG[quickViewOrder.status as keyof typeof ORDER_STATUS_CONFIG]?.label ||
                        quickViewOrder.status}
                    </Badge>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer</span>
                    <span>{quickViewOrder.customerName || 'Guest'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span>{format(new Date(quickViewOrder.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-semibold">{formatCurrency(Number(quickViewOrder.total))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Items</span>
                    <span>
                      {Array.isArray(quickViewOrder.items)
                        ? quickViewOrder.items.length
                        : 0}{' '}
                      items
                    </span>
                  </div>
                </div>
                <Button
                  className="w-full mt-2"
                  variant="outline"
                  onClick={() => {
                    setQuickViewOrder(null);
                    navigate(`${ROUTES.VENDOR_DASHBOARD_ORDERS}?scroll=history`);
                  }}
                >
                  View more in Order History
                </Button>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Stock Alert */}
      {stockAttentionProducts > 0 && (
        <Card className="border-2 border-destructive/20 bg-gradient-to-br from-[hsl(48,96%,53%)]/10 via-destructive/5 to-destructive/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Stock Alert
            </CardTitle>
            <CardDescription>Products that need immediate stock attention</CardDescription>
          </CardHeader>
          <CardContent>
            {productsLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {products
                  ?.filter((p: any) => needsProductRestock(p))
                  .slice(0, 5)
                  .map((product: any) => {
                    const threshold = product.low_stock_threshold ?? 10;
                    const qty = product.stock_quantity ?? 0;
                    const stockPercentage = threshold > 0 ? (qty / threshold) * 100 : 0;
                    const isCritical = qty < threshold * 0.5;
                    const borderColor = isCritical
                      ? 'border-destructive/30'
                      : 'border-[hsl(48,96%,53%)]/30';
                    const bgColor = isCritical ? 'bg-destructive/5' : 'bg-[hsl(48,96%,53%)]/5';

                    return (
                      <div
                        key={product.id}
                        className={cn(
                          'flex items-center justify-between p-4 rounded-lg border-2 bg-card hover:bg-muted/50 transition-all',
                          borderColor,
                          bgColor,
                        )}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-medium">{product.name}</p>
                            <Badge
                              variant={isCritical ? 'destructive' : 'secondary'}
                              className={cn(
                                'text-xs',
                                !isCritical &&
                                  'bg-[hsl(48,96%,53%)] text-white border-[hsl(48,96%,53%)]',
                              )}
                            >
                              {product.stock_quantity} left
                            </Badge>
                          </div>
                          <Progress value={Math.min(stockPercentage, 100)} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            Threshold: {product.low_stock_threshold} units
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-4"
                          onClick={() => navigate(`/vendor/dashboard/inventory/edit/${product.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Edit Stock
                        </Button>
                      </div>
                    );
                  })}
                {stockAttentionProducts > 5 && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/vendor/dashboard/inventory')}
                  >
                    View All {stockAttentionProducts} Products Needing Restock
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

