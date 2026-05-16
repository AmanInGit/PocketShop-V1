import { useMemo, useState } from "react";
import { AnalyticsCard } from "@/components/analytics/AnalyticsCard";
import { AnalyticsSection } from "@/components/analytics/AnalyticsSection";
import { ChartContainer } from "@/components/analytics/ChartContainer";
import { ChartFrame } from "@/components/analytics/ChartFrame";
import { WeekComparePanel } from "@/components/analytics/WeekComparePanel";
import {
  CHART_COLORS,
  PIE_COLORS,
  STATUS_CHART_COLORS,
  STATUS_LABELS,
  tooltipContentStyle,
} from "@/components/analytics/analyticsChartConfig";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Clock,
  Flame,
  IndianRupee,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  ShoppingCart,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAnalytics } from "@/features/vendor/hooks/useAnalytics";
import { useRecommendations } from "@/features/vendor/hooks/useRecommendations";
import { useVendor } from "@/features/vendor/hooks/useVendor";
import { RealtimeFeedback } from "../components/RealtimeFeedback";

const PERIOD_OPTIONS = [
  { value: 7, label: "7d" },
  { value: 14, label: "14d" },
  { value: 30, label: "30d" },
  { value: 90, label: "90d" },
] as const;

const formatCurrency = (
  value: number,
  options: Intl.NumberFormatOptions = {}
) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
    ...options,
  }).format(value);

const formatCompactCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);

const formatHour = (hour: number) => {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
};

function EmptyChart({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center"
    >
      <BarChart3 className="h-10 w-10 text-muted-foreground/40" />
      <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
    </motion.div>
  );
}

function MiniSparkline({ data }: { data: { amount: number }[] }) {
  if (!data.length) return null;
  return (
    <ResponsiveContainer width={72} height={32}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.revenue} stopOpacity={0.35} />
            <stop offset="95%" stopColor={CHART_COLORS.revenue} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="amount"
          stroke={CHART_COLORS.revenue}
          fill="url(#sparkFill)"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function OrderHeatmap({
  heatmap,
  maxOrders,
}: {
  heatmap: { label: string; hours: { hour: number; orders: number }[] }[];
  maxOrders: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-2"
    >
      <motion.div className="ml-10 flex justify-between text-[10px] text-muted-foreground">
        <span>12 AM</span>
        <span>6 AM</span>
        <span>12 PM</span>
        <span>6 PM</span>
        <span>11 PM</span>
      </motion.div>
      {heatmap.map((day) => (
        <div
          key={day.label}
          className="grid grid-cols-[2.5rem_repeat(24,minmax(0,1fr))] items-center gap-0.5"
        >
          <span className="text-xs font-medium text-muted-foreground">
            {day.label}
          </span>
          {day.hours.map((bucket) => {
            const intensity =
              maxOrders > 0 ? bucket.orders / maxOrders : 0;
            return (
              <div
                key={`${day.label}-${bucket.hour}`}
                title={`${day.label} ${formatHour(bucket.hour)}: ${bucket.orders} orders`}
                className="aspect-square min-h-[14px] rounded-sm transition-transform hover:scale-110"
                style={{
                  backgroundColor:
                    bucket.orders > 0
                      ? `hsl(221, 83%, ${48 - intensity * 18}%)`
                      : "hsl(var(--muted) / 0.35)",
                  opacity: bucket.orders > 0 ? 0.35 + intensity * 0.65 : 1,
                }}
              />
            );
          })}
        </div>
      ))}
      <motion.div className="flex items-center justify-end gap-2 pt-1 text-[10px] text-muted-foreground">
        <span>Low</span>
        <div className="flex gap-0.5">
          {[0.15, 0.35, 0.55, 0.75, 1].map((o) => (
            <div
              key={o}
              className="h-2.5 w-5 rounded-sm"
              style={{
                backgroundColor: `hsl(221, 83%, 40%)`,
                opacity: 0.2 + o * 0.8,
              }}
            />
          ))}
        </div>
        <span>High</span>
      </motion.div>
    </motion.div>
  );
}

export default function Analytics() {
  const [days, setDays] = useState(30);
  const [revenueView, setRevenueView] = useState<"daily" | "monthly" | "yearly">(
    "daily"
  );

  const { data: vendor } = useVendor();
  const { data: analytics, isLoading: analyticsLoading } = useAnalytics(days);
  const { items: recommendations, isEnriching: recommendationsEnriching } =
    useRecommendations(days);

  const trendingDishes = analytics?.trendingDishes ?? [];
  const returningCustomersCount = analytics?.returningCustomersCount ?? 0;
  const uniqueCustomersCount = analytics?.uniqueCustomersCount ?? 0;
  const heatmap = analytics?.heatmap ?? [];
  const performanceScore = analytics?.performanceScore ?? 0;
  const completionRate =
    analytics && analytics.totalOrders > 0
      ? (analytics.completedOrders / analytics.totalOrders) * 100
      : 0;

  const sparklineData = useMemo(
    () => (analytics?.salesByDay ?? []).slice(-7),
    [analytics?.salesByDay]
  );

  const dailySliceCount = Math.min(days, 30);

  const mainRevenueChartData = useMemo(() => {
    if (!analytics) return [];
    if (revenueView === "daily") {
      return (analytics.salesByDay ?? []).slice(-dailySliceCount);
    }
    if (revenueView === "monthly") return analytics.salesByMonth ?? [];
    return analytics.revenueByYear ?? [];
  }, [analytics, revenueView, dailySliceCount]);

  const maxDailyOrders = useMemo(() => {
    if (!mainRevenueChartData.length) return 0;
    return Math.max(...mainRevenueChartData.map((d) => d.orders ?? 0), 0);
  }, [mainRevenueChartData]);

  const peakHoursFull = useMemo(() => {
    const totals = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: formatHour(hour),
      orders: 0,
    }));
    heatmap.forEach((day) => {
      day.hours.forEach((bucket) => {
        totals[bucket.hour].orders += bucket.orders;
      });
    });
    return totals;
  }, [heatmap]);

  const maxHeatmapOrders = useMemo(() => {
    let max = 0;
    heatmap.forEach((day) => {
      day.hours.forEach((h) => {
        if (h.orders > max) max = h.orders;
      });
    });
    return max;
  }, [heatmap]);

  const statusPieData = useMemo(() => {
    return (analytics?.statusDistribution ?? [])
      .filter((s) => s.count > 0)
      .map((s, i) => ({
        name: STATUS_LABELS[s.status] ?? s.status,
        value: s.count,
        color: STATUS_CHART_COLORS[s.status] ?? PIE_COLORS[i % PIE_COLORS.length],
      }));
  }, [analytics?.statusDistribution]);

  const categoryPieData = useMemo(() => {
    const sorted = [...(analytics?.categoryPerformance ?? [])].sort(
      (a, b) => (b.revenue || 0) - (a.revenue || 0)
    );
    const top = sorted.slice(0, 4);
    const rest = sorted.slice(4);
    const restRevenue = rest.reduce((sum, c) => sum + (c.revenue || 0), 0);
    return [
      ...top.map((c, i) => ({
        name:
          (c.category || "Uncategorized").length > 16
            ? `${(c.category || "Uncategorized").slice(0, 16)}…`
            : c.category || "Uncategorized",
        fullName: c.category || "Uncategorized",
        value: c.revenue || 0,
        color: PIE_COLORS[i],
      })),
      ...(restRevenue > 0
        ? [
            {
              name: "Other",
              fullName: "Other categories",
              value: restRevenue,
              color: PIE_COLORS[5],
            },
          ]
        : []),
    ];
  }, [analytics?.categoryPerformance]);

  const trendingBarData = useMemo(
    () =>
      trendingDishes.slice(0, 8).map((d) => ({
        name: d.name.length > 22 ? `${d.name.slice(0, 22)}…` : d.name,
        fullName: d.name,
        quantity: d.quantity,
        revenue: d.revenue,
      })),
    [trendingDishes]
  );

  const funnelData = analytics?.conversionFunnel ?? [];

  const metricCards = [
    {
      key: "todayRevenue",
      title: "Today's Revenue",
      value: formatCurrency(analytics?.todayRevenue || 0, {
        maximumFractionDigits: 0,
      }),
      subtitle: "Completed orders today",
      delta: analytics?.todayVsYesterday?.revenue?.delta ?? 0,
      deltaLabel: "vs yesterday",
      trend: ((analytics?.todayVsYesterday?.revenue?.delta ?? 0) >= 0
        ? "up"
        : "down") as "up" | "down" | "neutral",
      icon: <IndianRupee className="h-5 w-5" />,
      tone: "info" as const,
      loading: analyticsLoading,
    },
    {
      key: "revenue",
      title: "Total Revenue",
      value: formatCompactCurrency(analytics?.totalRevenue || 0),
      subtitle: `Last ${days} days · completed orders`,
      delta: analytics?.weeklyComparison?.revenueGrowth ?? 0,
      deltaLabel: "vs last week",
      trend: ((analytics?.weeklyComparison?.revenueGrowth ?? 0) >= 0
        ? "up"
        : "down") as "up" | "down" | "neutral",
      icon: <TrendingUp className="h-5 w-5" />,
      tone: "primary" as const,
      loading: analyticsLoading,
    },
    {
      key: "orders",
      title: "Total Orders",
      value: formatNumber(analytics?.totalOrders || 0),
      subtitle: `${formatNumber(analytics?.completedOrders || 0)} completed`,
      delta: analytics?.weeklyComparison?.orderGrowth ?? 0,
      deltaLabel: "vs last week",
      trend: ((analytics?.weeklyComparison?.orderGrowth ?? 0) >= 0
        ? "up"
        : "down") as "up" | "down" | "neutral",
      icon: <ShoppingCart className="h-5 w-5" />,
      tone: "accent" as const,
      loading: analyticsLoading,
    },
    {
      key: "aov",
      title: "Avg. Order Value",
      value: formatCurrency(analytics?.averageOrderValue || 0, {
        maximumFractionDigits: 2,
      }),
      subtitle: "Per completed order",
      delta: analytics?.todayVsYesterday?.aov?.delta ?? 0,
      deltaLabel: "vs yesterday",
      trend: ((analytics?.todayVsYesterday?.aov?.delta ?? 0) >= 0
        ? "up"
        : "down") as "up" | "down" | "neutral",
      icon: <Activity className="h-5 w-5" />,
      tone: "warning" as const,
      loading: analyticsLoading,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-10 pb-12"
    >
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-primary/8 via-card to-card p-6 shadow-[0_40px_80px_-50px_rgba(37,99,235,0.35)] sm:p-8">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20">
              <BarChart3 className="h-7 w-7" />
            </div>
            <motion.div className="space-y-1.5">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Analytics
              </h1>
              <p className="max-w-lg text-sm text-muted-foreground">
                Revenue, orders, products, and customer patterns from your live
                order data.
              </p>
            </motion.div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ToggleGroup
              type="single"
              value={String(days)}
              onValueChange={(v) => v && setDays(Number(v))}
              className="gap-0.5 rounded-xl border border-border/60 bg-background/80 p-1 backdrop-blur"
            >
              {PERIOD_OPTIONS.map((opt) => (
                <ToggleGroupItem
                  key={opt.value}
                  value={String(opt.value)}
                  size="sm"
                  className="h-8 rounded-lg px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  {opt.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-background/90 px-4 py-3 backdrop-blur">
              <div className="relative flex h-12 w-12 items-center justify-center">
                <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    className="stroke-muted"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    className="stroke-primary transition-all duration-700"
                    strokeWidth="3"
                    strokeDasharray={`${performanceScore} 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-xs font-bold tabular-nums">
                  {analyticsLoading ? "—" : performanceScore}
                </span>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Health score
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {performanceScore >= 70
                    ? "Strong"
                    : performanceScore >= 40
                      ? "Growing"
                      : "Needs focus"}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card, index) => (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <AnalyticsCard
              title={card.title}
              value={card.value}
              subtitle={card.subtitle}
              delta={card.delta ?? null}
              deltaLabel={card.deltaLabel}
              trend={card.trend}
              icon={card.icon}
              tone={card.tone}
              loading={card.loading}
              sparkline={
                card.key === "revenue" && !card.loading ? (
                  <MiniSparkline data={sparklineData} />
                ) : undefined
              }
            />
          </motion.div>
        ))}
      </div>

      {/* Quick stats strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Completion rate",
            value: `${completionRate.toFixed(1)}%`,
            sub: `${formatNumber(analytics?.completedOrders || 0)} of ${formatNumber(analytics?.totalOrders || 0)} orders`,
            icon: Target,
            color: "text-emerald-600",
            progress: completionRate,
          },
          {
            label: "Returning customers",
            value: formatNumber(returningCustomersCount),
            sub:
              uniqueCustomersCount > 0
                ? `${((returningCustomersCount / uniqueCustomersCount) * 100).toFixed(0)}% retention`
                : "No registered customers yet",
            icon: Users,
            color: "text-primary",
          },
          {
            label: "Busiest hour",
            value: (() => {
              const peak = [...peakHoursFull].sort(
                (a, b) => b.orders - a.orders
              )[0];
              return peak?.orders ? formatHour(peak.hour) : "—";
            })(),
            sub: (() => {
              const peak = [...peakHoursFull].sort(
                (a, b) => b.orders - a.orders
              )[0];
              return peak?.orders
                ? `${formatNumber(peak.orders)} orders in period`
                : "No order timing data";
            })(),
            icon: Flame,
            color: "text-orange-500",
          },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            whileHover={{ y: -2 }}
            className="rounded-2xl border border-border/50 bg-card/80 p-4 backdrop-blur"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {stat.label}
                </p>
                {analyticsLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
                )}
                <p className="text-xs text-muted-foreground">{stat.sub}</p>
                {"progress" in stat && stat.progress !== undefined ? (
                  <Progress value={stat.progress} className="mt-2 h-1.5" />
                ) : null}
              </div>
              <stat.icon className={cn("h-5 w-5 shrink-0 opacity-80", stat.color)} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Sales & revenue */}
      <AnalyticsSection
        title="Sales & revenue"
        description="Revenue trends and how this week compares to last week."
      >
        <div className="grid items-stretch gap-6 xl:grid-cols-[1fr_320px]">
          <ChartContainer
            title="Revenue overview"
            description={
              revenueView === "daily"
                ? `Daily revenue and order count (last ${dailySliceCount} days)`
                : revenueView === "monthly"
                  ? "Monthly revenue from completed orders"
                  : "Yearly revenue from completed orders"
            }
            badge={
              revenueView === "daily"
                ? `${dailySliceCount}d`
                : revenueView === "monthly"
                  ? "Monthly"
                  : "Yearly"
            }
            icon={<LineChartIcon className="h-4 w-4" />}
            isLoading={analyticsLoading}
            gradient="from-primary/5 via-background to-background"
            className="h-full"
            actions={
              <motion.div className="flex flex-wrap items-center gap-2">
                {(["daily", "monthly", "yearly"] as const).map((view) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setRevenueView(view)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
                      revenueView === view
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border/60 bg-background/80 text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    {view}
                  </button>
                ))}
              </motion.div>
            }
          >
            {mainRevenueChartData.length === 0 && !analyticsLoading ? (
              <EmptyChart message="No completed orders in this period yet." />
            ) : revenueView === "daily" ? (
              <ChartFrame height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={mainRevenueChartData}
                    margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="salesRevenueGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={CHART_COLORS.revenue}
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="95%"
                          stopColor={CHART_COLORS.revenue}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="4 4"
                      className="stroke-muted/40"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{
                        fontSize: 11,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="revenue"
                      tick={{
                        fontSize: 11,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => formatCompactCurrency(v)}
                      width={56}
                    />
                    <YAxis
                      yAxisId="orders"
                      orientation="right"
                      tick={{
                        fontSize: 11,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      domain={[0, Math.max(maxDailyOrders + 1, 1)]}
                      width={36}
                    />
                    <Tooltip
                      contentStyle={tooltipContentStyle}
                      formatter={(value: number, name: string) => [
                        name === "Revenue"
                          ? formatCurrency(value)
                          : formatNumber(value),
                        name,
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Bar
                      yAxisId="orders"
                      dataKey="orders"
                      fill={CHART_COLORS.orders}
                      fillOpacity={0.55}
                      radius={[4, 4, 0, 0]}
                      name="Orders"
                      barSize={14}
                    />
                    <Area
                      yAxisId="revenue"
                      type="monotone"
                      dataKey="amount"
                      stroke={CHART_COLORS.revenue}
                      fill="url(#salesRevenueGradient)"
                      strokeWidth={2.5}
                      name="Revenue"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartFrame>
            ) : (
              <ChartFrame height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={mainRevenueChartData}
                    margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="salesTrendGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={CHART_COLORS.revenue}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={CHART_COLORS.revenue}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="4 4"
                      className="stroke-muted/40"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{
                        fontSize: 11,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{
                        fontSize: 11,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => formatCompactCurrency(v)}
                      width={56}
                    />
                    <Tooltip
                      contentStyle={tooltipContentStyle}
                      formatter={(value: number) => [
                        formatCurrency(value),
                        "Revenue",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke={CHART_COLORS.revenue}
                      fill="url(#salesTrendGradient)"
                      strokeWidth={2.4}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartFrame>
            )}
          </ChartContainer>

          <ChartContainer
            title="Week over week"
            description="This week compared with the previous week"
            badge="Weekly"
            icon={<Zap className="h-4 w-4" />}
            isLoading={analyticsLoading}
            className="h-full"
          >
            <WeekComparePanel
              weeklyComparison={analytics?.weeklyComparison}
              loading={analyticsLoading}
              formatCurrency={(v) =>
                formatCurrency(v, { maximumFractionDigits: 0 })
              }
              formatNumber={formatNumber}
            />
          </ChartContainer>
        </div>
      </AnalyticsSection>

      {/* Orders & operations */}
      <AnalyticsSection
        title="Orders & operations"
        description="Status mix, conversion, and when customers order most."
      >
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <ChartContainer
            title="Order status"
            description="Distribution across all orders in period"
            badge="Mix"
            icon={<PieChartIcon className="h-4 w-4" />}
            isLoading={analyticsLoading}
          >
            {statusPieData.length === 0 && !analyticsLoading ? (
              <EmptyChart message="No orders in this period." />
            ) : (
              <div className="flex h-full flex-col items-center gap-4 sm:flex-row">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipContentStyle}
                      formatter={(value: number) => [formatNumber(value), "Orders"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full space-y-2 sm:max-w-[160px]">
                  {statusPieData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2 text-sm">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="flex-1 truncate text-muted-foreground">
                        {entry.name}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {entry.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ChartContainer>

          <ChartContainer
            title="Conversion funnel"
            description="Placed orders vs completed"
            badge="Funnel"
            icon={<Target className="h-4 w-4" />}
            isLoading={analyticsLoading}
          >
            {funnelData.length === 0 && !analyticsLoading ? (
              <EmptyChart message="No funnel data yet." />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={funnelData} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="4 4" className="stroke-muted/40" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="stage"
                    width={100}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipContentStyle}
                    formatter={(value: number) => [formatNumber(value), "Count"]}
                  />
                  <Bar dataKey="value" fill={CHART_COLORS.primary} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartContainer>

          <ChartContainer
            title="Peak hours"
            description="Order volume by hour of day (aggregated)"
            badge="24h"
            icon={<Clock className="h-4 w-4" />}
            isLoading={analyticsLoading}
          >
            {peakHoursFull.every((h) => h.orders === 0) && !analyticsLoading ? (
              <EmptyChart message="No hourly order data yet." />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={peakHoursFull}>
                  <CartesianGrid strokeDasharray="4 4" className="stroke-muted/40" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    interval={3}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={tooltipContentStyle}
                    formatter={(value: number) => [formatNumber(value), "Orders"]}
                  />
                  <Bar
                    dataKey="orders"
                    fill={CHART_COLORS.processing}
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartContainer>
        </div>
      </AnalyticsSection>

      {/* Products */}
      <AnalyticsSection
        title="Products & categories"
        description="What sells and where revenue concentrates."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartContainer
            title="Top dishes"
            description="By quantity sold (completed orders)"
            badge="Top 8"
            icon={<Flame className="h-4 w-4" />}
            isLoading={analyticsLoading}
          >
            {trendingBarData.length === 0 && !analyticsLoading ? (
              <EmptyChart message="No dish sales in this period." />
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(260, trendingBarData.length * 36)}>
                <BarChart data={trendingBarData} layout="vertical" margin={{ left: 4, right: 16 }}>
                  <CartesianGrid strokeDasharray="4 4" className="stroke-muted/40" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipContentStyle}
                    formatter={(value: number, _name: string, props: { payload?: { fullName?: string; revenue?: number } }) => [
                      `${formatNumber(value)} sold · ${formatCurrency(props.payload?.revenue ?? 0)}`,
                      props.payload?.fullName ?? "Dish",
                    ]}
                  />
                  <Bar dataKey="quantity" fill={CHART_COLORS.accent} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartContainer>

          <ChartContainer
            title="Revenue by category"
            description="Share of revenue across menu categories"
            badge="Categories"
            icon={<PieChartIcon className="h-4 w-4" />}
            isLoading={analyticsLoading}
          >
            {categoryPieData.length === 0 && !analyticsLoading ? (
              <EmptyChart message="No category revenue data yet." />
            ) : (
              <motion.div className="flex h-full flex-col items-center gap-4 sm:flex-row">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipContentStyle}
                      formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full space-y-2 sm:max-w-[200px]">
                  {categoryPieData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2 text-sm">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="flex-1 truncate" title={entry.fullName}>
                        {entry.name}
                      </span>
                      <span className="font-semibold tabular-nums text-xs">
                        {formatCompactCurrency(entry.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </ChartContainer>
        </div>
      </AnalyticsSection>

      {/* Customers & engagement */}
      <AnalyticsSection
        title="Customers & engagement"
        description="Retention, busy periods, and live feedback."
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <ChartContainer
            title="Returning customers"
            description="Registered customers with 2+ completed orders"
            badge="Retention"
            icon={<Users className="h-4 w-4" />}
            isLoading={analyticsLoading}
          >
            <div className="flex h-full flex-col items-center justify-center gap-4 py-4 text-center">
              <motion.div
                className="relative flex h-28 w-28 items-center justify-center"
                whileHover={{ scale: 1.03 }}
              >
                <svg className="absolute h-28 w-28 -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    className="stroke-muted"
                    strokeWidth="2.5"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    className="stroke-primary"
                    strokeWidth="2.5"
                    strokeDasharray={`${
                      uniqueCustomersCount > 0
                        ? (returningCustomersCount / uniqueCustomersCount) * 100
                        : 0
                    } 100`}
                    strokeLinecap="round"
                  />
                </svg>
                {analyticsLoading ? (
                  <Skeleton className="h-10 w-16" />
                ) : (
                  <span className="text-3xl font-bold tabular-nums">
                    {formatNumber(returningCustomersCount)}
                  </span>
                )}
              </motion.div>
              <p className="text-xs text-muted-foreground">
                {uniqueCustomersCount > 0
                  ? `${((returningCustomersCount / uniqueCustomersCount) * 100).toFixed(1)}% of ${formatNumber(uniqueCustomersCount)} unique customers`
                  : "No registered customers in this period."}
              </p>
            </div>
          </ChartContainer>

          <ChartContainer
            title="Busy times heatmap"
            description="Orders by day of week and hour"
            badge="7 × 24"
            icon={<Activity className="h-4 w-4" />}
            isLoading={analyticsLoading}
            className="lg:col-span-2"
          >
            {maxHeatmapOrders === 0 && !analyticsLoading ? (
              <EmptyChart message="No timing data for heatmap yet." />
            ) : (
              <OrderHeatmap heatmap={heatmap} maxOrders={maxHeatmapOrders} />
            )}
          </ChartContainer>
        </div>

        <ChartContainer
          title="Customer feedback"
          description="Realtime ratings and comments from customers"
          badge="Live"
          isLoading={analyticsLoading}
        >
          {vendor?.id ? (
            <RealtimeFeedback vendorId={vendor.id} />
          ) : (
            <EmptyChart message="Loading vendor data…" />
          )}
        </ChartContainer>
      </AnalyticsSection>

      {/* AI insights */}
      <AnalyticsSection
        title="AI insights"
        description="Actionable recommendations from your store data."
      >
        <ChartContainer
          title="Recommendations"
          description="Prioritized suggestions to grow revenue and reduce friction"
          badge={recommendationsEnriching ? "Updating" : "Live"}
          icon={<Sparkles className="h-4 w-4" />}
          isLoading={analyticsLoading}
          gradient="from-emerald-500/5 via-background to-background"
        >
          <div className="h-full overflow-auto">
            {recommendations.length === 0 ? (
              <EmptyChart message="No recommendations available yet — check back as more orders come in." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {recommendations.map((rec) => (
                  <motion.div
                    key={rec.id}
                    whileHover={{ y: -2 }}
                    className="rounded-2xl border border-border/40 bg-background/80 p-4 shadow-sm"
                  >
                    <motion.div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-foreground">
                          {rec.copy.title}
                        </div>
                        <motion.div className="text-sm text-muted-foreground">
                          {rec.copy.message}
                        </motion.div>
                        {rec.copy.why ? (
                          <div className="text-xs text-muted-foreground/80">
                            Why: {rec.copy.why}
                          </div>
                        ) : null}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full border-transparent text-xs font-semibold",
                          rec.severity === "critical" && "bg-red-500/15 text-red-500",
                          rec.severity === "warning" && "bg-yellow-500/15 text-yellow-600",
                          rec.severity === "info" && "bg-emerald-500/15 text-emerald-600"
                        )}
                      >
                        {rec.severity}
                      </Badge>
                    </motion.div>
                    {rec.suggestedAction ? (
                      <div className="mt-2 text-xs font-medium text-foreground">
                        Suggested:{" "}
                        <span className="font-normal text-muted-foreground">
                          {rec.suggestedAction}
                        </span>
                      </div>
                    ) : null}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </ChartContainer>
      </AnalyticsSection>
    </motion.div>
  );
}
