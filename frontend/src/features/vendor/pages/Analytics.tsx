/**
 * Vendor Analytics Page
 *
 * UI is adapted from Migration_Data/src/pages/Analytics.tsx.
 * We keep the rich analytics cards, charts, heatmap, funnel, gauge,
 * and AI insights layout from that version, but wire it to the current
 * vendor analytics hooks (useAnalytics, useAIInsights) and dashboard layout.
 *
 * Migration notes:
 * - The original implementation expects many derived analytics fields
 *   (heatmap, conversionFunnel, anomaly, trendSummary, segmentAnalytics, etc.).
 * - Our current `useAnalytics` hook only returns a simpler shape (totals,
 *   salesByDay, categoryPerformance, statusDistribution, weeklyComparison),
 *   so several charts will render empty until the backend + hook are extended.
 * - This is intentional: UI is in place now; data wiring can be upgraded
 *   later without rewriting the page again.
 *
 * NOTE: Any global dark-mode toggling from the original file has been
 * restricted so this page no longer changes the root document theme.
 * Theme will be handled at the app level after migration.
 */

import { Fragment, useEffect, useMemo, useState } from "react";
import { AnalyticsCard } from "@/components/analytics/AnalyticsCard";
import { ChartContainer } from "@/components/analytics/ChartContainer";
import { ChartPopup } from "@/components/analytics/ChartPopup";
import {
  useAnalytics,
  useAIInsights,
} from "@/features/vendor/hooks/useAnalytics";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  ShoppingCart,
  IndianRupee,
  Clock,
  Sparkles,
  Zap,
  Activity,
  PieChart as PieChartIcon,
  BarChart3,
  GaugeCircle,
  Globe2,
  Smartphone,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  LineChart as LineChartIcon,
} from "lucide-react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadialBarChart,
  RadialBar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  RadarChart,
  Radar,
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts";

type ChartKey =
  | "sales"
  | "liveOrders"
  | "category"
  | "devices"
  | "regions"
  | "heatmap"
  | "funnel"
  | "gauge"
  | "radar";

const chartMeta: Record<ChartKey, { title: string; description: string }> = {
  sales: {
    title: "Revenue Velocity",
    description: "Smoothed daily revenue with real-time deltas",
  },
  liveOrders: {
    title: "Live Order Stream",
    description: "Real-time orders and revenue heartbeat",
  },
  category: {
    title: "Category Mix",
    description: "Share of revenue by category",
  },
  devices: {
    title: "Device Preference",
    description: "Orders split by device footprint",
  },
  regions: {
    title: "Regional Performance",
    description: "Order density across regions",
  },
  heatmap: {
    title: "Engagement Heatmap",
    description: "Hourly activity intensity by weekday",
  },
  funnel: {
    title: "Orders Completed",
    description: "Total completed orders",
  },
  gauge: {
    title: "Performance Gauge",
    description:
      "Composite health score derived from fulfillment, growth and efficiency",
  },
  radar: {
    title: "Benchmark Radar",
    description:
      "Multi-dimension comparison against internal benchmarks",
  },
};

const COLORS = [
  "hsl(221, 83%, 40%)",
  "hsl(142, 71%, 45%)",
  "hsl(48, 96%, 53%)",
  "hsl(280, 65%, 60%)",
  "hsl(340, 75%, 55%)",
  "hsl(199, 89%, 48%)",
];

const formatHour = (hour: number) => {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}${period}`;
};

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

type HeatmapMatrixProps = {
  data: Array<{
    dayIndex: number;
    label: string;
    hours: Array<{ hour: number; orders: number; revenue: number }>;
  }>;
  mode?: "orders" | "revenue";
  compact?: boolean;
};

function HeatmapMatrix({
  data,
  mode = "orders",
  compact = false,
}: HeatmapMatrixProps) {
  const flatValues = data.flatMap((day) =>
    day.hours.map((cell) => (mode === "orders" ? cell.orders : cell.revenue))
  );
  const maxValue = Math.max(...flatValues, 1);

  return (
    <div className={cn("relative overflow-x-auto", compact && "max-h-[280px]")}>
      <div className="grid min-w-[720px] grid-cols-[80px_repeat(24,minmax(0,1fr))] gap-1 text-[11px] text-muted-foreground">
        <div className="sticky left-0 z-10 bg-background/90 font-semibold text-foreground backdrop-blur">
          Hour
        </div>
        {Array.from({ length: 24 }, (_, hour) => (
          <div
            key={`hour-header-${hour}`}
            className="text-center font-medium text-muted-foreground/80"
          >
            {hour}
          </div>
        ))}
        {data.map((day) => (
          <Fragment key={day.label}>
            <div className="sticky left-0 z-10 flex items-center justify-start rounded-lg bg-background/90 px-2 py-1 font-medium text-foreground backdrop-blur">
              {day.label}
            </div>
            {day.hours.map((cell) => {
              const value = mode === "orders" ? cell.orders : cell.revenue;
              const intensity = value / maxValue;
              const background = `rgba(79, 70, 229, ${
                0.08 + intensity * 0.72
              })`;
              return (
                <motion.div
                  key={`${day.label}-${cell.hour}`}
                  className="flex aspect-square items-center justify-center rounded-md text-[10px] text-white"
                  style={{ background }}
                  whileHover={{ scale: 1.08 }}
                  title={`${day.label} ${formatHour(cell.hour)} • ${
                    mode === "orders"
                      ? `${value} orders`
                      : formatCurrency(value)
                  }`}
                >
                  {intensity > 0.6 ? Math.round(intensity * 100) : ""}
                </motion.div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

export default function Analytics() {
  const [days, setDays] = useState(30);
  const [activeChart, setActiveChart] = useState<ChartKey | null>(null);
  const [isDarkMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("ps-dashboard-theme") === "dark";
  });

  const {
    data: analytics,
    isLoading: analyticsLoading,
  } = useAnalytics(days);
  const {
    data: insights,
    isLoading: insightsLoading,
  } = useAIInsights();
  const analyticsData: any = analytics;

  const [realTimeMetrics, setRealTimeMetrics] = useState({
    revenue: 0,
    orders: 0,
    aov: 0,
  });
  const [liveOrdersTrend, setLiveOrdersTrend] = useState<
    Array<{ time: string; orders: number; revenue: number }>
  >([]);

  useEffect(() => {
    // NOTE: In this frontend we avoid toggling the global document theme
    // from the Analytics page. We only persist the preference so a future
    // layout-level theme switcher can reuse it.
    if (typeof window === "undefined") return;
    localStorage.setItem(
      "ps-dashboard-theme",
      isDarkMode ? "dark" : "light"
    );
  }, [isDarkMode]);

  useEffect(() => {
    if (!analytics) return;

    setRealTimeMetrics({
      revenue: analytics.totalRevenue,
      orders: analytics.totalOrders,
      aov: analytics.averageOrderValue,
    });

    const baseTrend =
      analytics.salesByDay
        ?.slice(-12)
        .map((item: any) => {
          const baseOrders = Math.max(
            Math.round(
              item.amount /
                Math.max(analytics.averageOrderValue || 1, 1)
            ),
            0
          );
          return {
            time: item.label ?? item.date ?? "",
            orders: baseOrders,
            revenue: item.amount,
          };
        }) ?? [];
    setLiveOrdersTrend(baseTrend);
  }, [analytics]);

  const metricCards = [
    {
      key: "revenue",
      title: "Total Revenue",
      value: formatCompactCurrency(realTimeMetrics.revenue || 0),
      subtitle: "Live rolling total",
      delta: analytics?.weeklyComparison?.revenueGrowth ?? 0,
      deltaLabel: "vs last week",
      trend: ((analytics?.weeklyComparison?.revenueGrowth ?? 0) >= 0
        ? "up"
        : "down") as "up" | "down" | "neutral",
      icon: <IndianRupee className="h-5 w-5" />,
      tone: "primary" as const,
      loading: analyticsLoading,
    },
    {
      key: "orders",
      title: "Total Orders",
      value: formatNumber(realTimeMetrics.orders || 0),
      subtitle: "Completed across period",
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
      value: formatCurrency(realTimeMetrics.aov || 0, {
        maximumFractionDigits: 2,
      }),
      subtitle: "Per successful order",
      delta: analyticsData?.todayVsYesterday?.aov?.delta ?? 0,
      deltaLabel: "vs yesterday",
      trend: ((analyticsData?.todayVsYesterday?.aov?.delta ?? 0) >= 0
        ? "up"
        : "down") as "up" | "down" | "neutral",
      icon: <TrendingUp className="h-5 w-5" />,
      tone: "warning" as const,
      loading: analyticsLoading,
    },
    {
      key: "anomaly",
      title: analyticsData?.anomaly?.isAnomaly
        ? "Anomaly Detected"
        : "Stability Monitor",
      value: analyticsData?.anomaly?.isAnomaly
        ? `${analyticsData?.anomaly?.direction === "up" ? "+" : "-"}${(
            analyticsData?.anomaly?.severity ?? 0
          ).toFixed(1)}σ`
        : "All clear",
      subtitle: analyticsData?.anomaly?.isAnomaly
        ? `Spike on ${analyticsData?.anomaly?.displayDate}`
        : "Within expected thresholds",
      delta: analyticsData?.anomaly?.isAnomaly
        ? analyticsData?.anomaly?.severity ?? 0
        : null,
      deltaLabel: analyticsData?.anomaly?.isAnomaly ? "Deviation" : undefined,
      trend: (analyticsData?.anomaly?.direction === "down"
        ? "down"
        : "up") as "up" | "down" | "neutral",
      icon: analyticsData?.anomaly?.isAnomaly ? (
        <AlertTriangle className="h-5 w-5 text-red-500" />
      ) : (
        <Activity className="h-5 w-5" />
      ),
      tone: analyticsData?.anomaly?.isAnomaly
        ? ("info" as const)
        : ("neutral" as const),
      loading: analyticsLoading,
      isLive: true,
    },
  ];

  const comparisonMetrics =
    analyticsData?.todayVsYesterday
      ? [
          {
            label: "Revenue",
            today: formatCurrency(
              analyticsData.todayVsYesterday.revenue?.today || 0,
              { maximumFractionDigits: 0 }
            ),
            yesterday: formatCurrency(
              analyticsData.todayVsYesterday.revenue?.yesterday || 0,
              { maximumFractionDigits: 0 }
            ),
            delta: analyticsData.todayVsYesterday.revenue?.delta || 0,
          },
          {
            label: "Orders",
            today: formatNumber(
              analyticsData.todayVsYesterday.orders?.today || 0
            ),
            yesterday: formatNumber(
              analyticsData.todayVsYesterday.orders?.yesterday || 0
            ),
            delta: analyticsData.todayVsYesterday.orders?.delta || 0,
          },
          {
            label: "Avg Order Value",
            today: formatCurrency(
              analyticsData.todayVsYesterday.aov?.today || 0,
              { maximumFractionDigits: 2 }
            ),
            yesterday: formatCurrency(
              analyticsData.todayVsYesterday.aov?.yesterday || 0,
              { maximumFractionDigits: 2 }
            ),
            delta: analyticsData.todayVsYesterday.aov?.delta || 0,
          },
        ]
      : [];

  const segmentDevices = analyticsData?.segmentAnalytics?.devices ?? [];
  const segmentRegions = analyticsData?.segmentAnalytics?.regions ?? [];
  const segmentCategories = analyticsData?.segmentAnalytics?.categories ?? [];

  const openChart = (key: ChartKey) => setActiveChart(key);

  const renderChart = (key: ChartKey, extended = false) => {
    switch (key) {
      case "sales":
        return (
          <ResponsiveContainer
            width="100%"
            height={extended ? 440 : 300}
          >
            <AreaChart
              data={analytics?.salesByDay || []}
              margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="gradientRevenue"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="hsl(221, 83%, 40%)"
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(221, 83%, 40%)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="rgba(148, 163, 184, 0.25)"
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
                tickFormatter={(value) => formatCompactCurrency(value)}
              />
              <Tooltip
                formatter={(value: number) => [
                  formatCurrency(value, { maximumFractionDigits: 0 }),
                  "Revenue",
                ]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  boxShadow:
                    "0 12px 32px -12px rgba(15,23,42,0.22)",
                }}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="hsl(221, 83%, 40%)"
                strokeWidth={2.4}
                fill="url(#gradientRevenue)"
                dot={false}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      case "liveOrders":
        return (
          <ResponsiveContainer
            width="100%"
            height={extended ? 440 : 300}
          >
            <LineChart data={liveOrdersTrend}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148, 163, 184, 0.2)"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                yAxisId="orders"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => `${value}`}
              />
              <YAxis
                yAxisId="revenue"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => formatCompactCurrency(value)}
              />
              <Tooltip
                formatter={(value: number, name: string) =>
                  name === "orders"
                    ? [value, "Orders"]
                    : [
                        formatCurrency(value, {
                          maximumFractionDigits: 0,
                        }),
                        "Revenue",
                      ]
                }
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  boxShadow:
                    "0 12px 32px -12px rgba(15,23,42,0.22)",
                }}
              />
              <Legend />
              <Line
                yAxisId="orders"
                type="monotone"
                dataKey="orders"
                stroke="hsl(142, 71%, 45%)"
                strokeWidth={2.4}
                dot={false}
                activeDot={{ r: 6 }}
              />
              <Line
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                stroke="hsl(280, 65%, 60%)"
                strokeDasharray="6 4"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      case "category":
        return (
          <ResponsiveContainer
            width="100%"
            height={extended ? 420 : 280}
          >
            <PieChart>
              <Pie
                data={(analytics?.categoryPerformance || []) as any[]}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={extended ? 140 : 100}
                paddingAngle={3}
                dataKey="revenue"
              >
                {(analytics?.categoryPerformance || []).map(
                  (_entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  )
                )}
                <LabelList
                  dataKey="category"
                  position="outside"
                  fill="hsl(var(--foreground))"
                  style={{ fontSize: "12px", fontWeight: 600 }}
                />
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatCurrency(value, {
                    maximumFractionDigits: 0,
                  }),
                  name,
                ]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      case "devices":
        if (!segmentDevices.length) {
          return (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              Device analytics coming soon (requires advanced tracking).
            </div>
          );
        }
        return (
          <ResponsiveContainer
            width="100%"
            height={extended ? 420 : 280}
          >
            <BarChart data={segmentDevices}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148, 163, 184, 0.2)"
                vertical={false}
              />
              <XAxis dataKey="device" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar
                dataKey="count"
                radius={[12, 12, 12, 12]}
                fill="hsl(142, 71%, 45%)"
              >
                {segmentDevices.map((_: any, index: number) => (
                  <Cell
                    key={index}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      case "regions":
        if (!segmentRegions.length) {
          return (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              Regional analytics coming soon (requires location data).
            </div>
          );
        }
        return (
          <ResponsiveContainer
            width="100%"
            height={extended ? 420 : 280}
          >
            <BarChart data={segmentRegions}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148, 163, 184, 0.2)"
                vertical={false}
              />
              <XAxis dataKey="region" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar
                dataKey="count"
                radius={[12, 12, 0, 0]}
                fill="hsl(199, 89%, 48%)"
              >
                {segmentRegions.map((_: any, index: number) => (
                  <Cell
                    key={index}
                    fill={COLORS[(index + 2) % COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      case "heatmap":
        return (
          <HeatmapMatrix
            data={analytics?.heatmap || []}
            compact={!extended}
          />
        );
      case "funnel":
        return (
          <ResponsiveContainer
            width="100%"
            height={extended ? 420 : 320}
          >
            <FunnelChart>
              <Tooltip
                formatter={(value: number, name: string) => [value, name]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                }}
              />
              <Funnel
                dataKey="value"
                data={analytics?.conversionFunnel || []}
                isAnimationActive
                stroke="hsl(221, 83%, 40%)"
              >
                <LabelList
                  position="right"
                  fill="hsl(var(--foreground))"
                  stroke="none"
                  dataKey="stage"
                  formatter={(value: React.ReactNode) => value}
                />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        );
      case "gauge":
        return (
          <ResponsiveContainer
            width="100%"
            height={extended ? 380 : 260}
          >
            <RadialBarChart
              innerRadius="60%"
              outerRadius="100%"
              barSize={16}
              data={[
                {
                  name: "Performance",
                  value: analytics?.performanceScore ?? 0,
                  fill: "hsl(142, 71%, 45%)",
                },
                {
                  name: "Target",
                  value: 100,
                  fill: "rgba(148, 163, 184, 0.25)",
                },
              ]}
            >
              <RadialBar
                dataKey="value"
                cornerRadius={20}
                background={{ fill: "rgba(148, 163, 184, 0.25)" }}
              />
              <Legend />
            </RadialBarChart>
          </ResponsiveContainer>
        );
      case "radar":
        if (!analyticsData?.radarMetrics || !analyticsData.radarMetrics.length) {
          return (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              Benchmark radar coming soon.
            </div>
          );
        }
        return (
          <ResponsiveContainer
            width="100%"
            height={extended ? 420 : 300}
          >
            <RadarChart data={analyticsData.radarMetrics}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis angle={30} domain={[0, 120]} />
              <Radar
                name="Performance"
                dataKey="value"
                stroke="hsl(280, 65%, 60%)"
                fill="hsl(280, 65%, 60%)"
                fillOpacity={0.4}
              />
            </RadarChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="space-y-8 pb-10"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              <BarChart3 className="h-3.5 w-3.5" />
              Live intelligent analytics
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Analytics Control Center
            </h1>
            <p className="text-sm text-muted-foreground">
              Modern, real-time intelligence with AI-assisted forecasting and
              delightful micro-interactions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Select
              value={days.toString()}
              onValueChange={(value) => setDays(Number(value))}
            >
              <SelectTrigger className="w-[160px] rounded-full border border-border/60 bg-background/80 backdrop-blur">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <AnimatePresence>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {metricCards.map((card) => (
              <AnalyticsCard
                key={card.key}
                title={card.title}
                value={card.value}
                subtitle={card.subtitle}
                delta={card.delta ?? null}
                deltaLabel={card.deltaLabel}
                trend={card.trend}
                icon={card.icon}
                tone={card.tone}
                loading={card.loading}
                isLive={card.isLive}
              />
            ))}
          </div>
        </AnimatePresence>

        {comparisonMetrics.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35 }}
            className="rounded-3xl border border-border/50 bg-gradient-to-br from-background via-background to-primary/5 p-6 shadow-inner backdrop-blur"
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <LineChartIcon className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Comparison Pulse
                </h2>
              </div>
              {analyticsData?.trendSummary?.summary && (
                <p className="text-sm text-muted-foreground/80">
                  {analyticsData.trendSummary.summary}
                </p>
              )}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {comparisonMetrics.map((row) => (
                <div
                  key={row.label}
                  className="group flex flex-col gap-2 rounded-2xl border border-border/40 bg-background/60 p-4 shadow-sm transition hover:-translate-y-1 hover:border-primary/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-muted-foreground">
                      {row.label}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full border-transparent text-xs font-semibold",
                        row.delta >= 0
                          ? "bg-emerald-500/15 text-emerald-500"
                          : "bg-red-500/15 text-red-500"
                      )}
                    >
                      {row.delta >= 0 ? (
                        <ArrowUpRight className="mr-1 h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="mr-1 h-3 w-3" />
                      )}
                      {Math.abs(row.delta).toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="text-lg font-semibold text-foreground">
                    {row.today}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Yesterday • {row.yesterday}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <ChartContainer
            title="Revenue Velocity"
            description="Smoothed daily revenue trends with live signal overlay"
            badge="Daily"
            icon={<TrendingUp className="h-4 w-4 text-primary" />}
            isLoading={analyticsLoading}
            onViewFull={() => openChart("sales")}
          >
            {renderChart("sales")}
          </ChartContainer>

          <ChartContainer
            title="Live Order Stream"
            description="Real-time orders & revenue heartbeat with soft transitions"
            badge="Realtime"
            icon={<Activity className="h-4 w-4 text-accent" />}
            isLoading={analyticsLoading}
            onViewFull={() => openChart("liveOrders")}
          >
            {renderChart("liveOrders")}
          </ChartContainer>

          <ChartContainer
            title="Category Mix"
            description="Revenue distribution by category with donut emphasis"
            badge="Segments"
            icon={
              <PieChartIcon className="h-4 w-4 text-[hsl(280,65%,60%)]" />
            }
            isLoading={analyticsLoading}
            onViewFull={() => openChart("category")}
          >
            {renderChart("category")}
          </ChartContainer>

          <ChartContainer
            title="Engagement Heatmap"
            description="Hour-by-hour intensity across weekdays"
            badge="Heatmap"
            icon={<Clock className="h-4 w-4 text-primary" />}
            isLoading={analyticsLoading}
            onViewFull={() => openChart("heatmap")}
          >
            {renderChart("heatmap")}
          </ChartContainer>

          <ChartContainer
            title="Orders Completed"
            description="Total completed orders"
            badge="Orders"
            icon={<Zap className="h-4 w-4 text-yellow-500" />}
            isLoading={analyticsLoading}
            onViewFull={() => openChart("funnel")}
          >
            {renderChart("funnel")}
          </ChartContainer>

          <ChartContainer
            title="Performance Gauge"
            description="Composite score blending growth, fulfillment and retention"
            badge="Score"
            icon={<GaugeCircle className="h-4 w-4 text-emerald-500" />}
            isLoading={analyticsLoading}
            onViewFull={() => openChart("gauge")}
          >
            <div className="flex h-full flex-col items-center justify-center gap-4">
              {renderChart("gauge")}
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Current score
                </p>
                <p className="text-4xl font-bold text-foreground">
                  {analytics?.performanceScore ?? 0}/100
                </p>
              </div>
            </div>
          </ChartContainer>

          <ChartContainer
            title="Device Preference"
            description="Understand where customers engage the most"
            badge="Device"
            icon={<Smartphone className="h-4 w-4 text-primary" />}
            isLoading={analyticsLoading}
            onViewFull={() => openChart("devices")}
          >
            {renderChart("devices")}
          </ChartContainer>

          <ChartContainer
            title="Regional Momentum"
            description="Regional distribution of orders"
            badge="Region"
            icon={<Globe2 className="h-4 w-4 text-[hsl(199,89%,48%)]" />}
            isLoading={analyticsLoading}
            onViewFull={() => openChart("regions")}
          >
            {renderChart("regions")}
          </ChartContainer>

          <ChartContainer
            title="Benchmark Radar"
            description="Multi-dimension benchmark vs. goals"
            badge="Radar"
            icon={<Activity className="h-4 w-4 text-[hsl(280,65%,60%)]" />}
            isLoading={analyticsLoading}
            onViewFull={() => openChart("radar")}
            className="lg:col-span-2"
          >
            {renderChart("radar")}
          </ChartContainer>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="rounded-3xl border border-border/60 bg-gradient-to-br from-background via-background to-primary/10 p-6 shadow-xl backdrop-blur"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-primary/30 bg-primary/10 p-3">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  AI-powered Insights
                </h2>
                <p className="text-sm text-muted-foreground">
                  Automated trend detection and opportunity mapping tuned
                  for your storefront.
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="rounded-full border-primary/40 bg-primary/10 text-xs font-semibold text-primary"
            >
              <Zap className="mr-1 h-3 w-3" />
              AI Enhanced
            </Badge>
          </div>

          <div className="mt-6">
            {insightsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full rounded-full" />
                <Skeleton className="h-4 w-5/6 rounded-full" />
                <Skeleton className="h-4 w-3/4 rounded-full" />
              </div>
            ) : insights ? (
              <Tabs defaultValue="highlights" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4 rounded-2xl border border-border/50 bg-background/60 p-1">
                  <TabsTrigger value="highlights">Highlights</TabsTrigger>
                  <TabsTrigger value="opportunities">
                    Opportunities
                  </TabsTrigger>
                  <TabsTrigger value="forecast">Forecast</TabsTrigger>
                  <TabsTrigger value="actions">Actions</TabsTrigger>
                </TabsList>
                <TabsContent
                  value="highlights"
                  className="grid gap-3 md:grid-cols-2"
                >
                  {(insights.highlights?.length
                    ? insights.highlights
                    : [insights.summary || "Analyzing your data..."]
                  ).map((highlight: string, idx: number) => (
                    <motion.div
                      key={idx}
                      className="rounded-2xl border border-border/40 bg-background/70 p-4 shadow-sm"
                      whileHover={{ y: -4 }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full bg-primary/10 p-1.5">
                          <TrendingUp className="h-4 w-4 text-primary" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {highlight}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </TabsContent>
                <TabsContent value="opportunities" className="space-y-3">
                  {(insights.opportunities?.length
                    ? insights.opportunities
                    : [
                        "We’re crunching numbers to surface the highest-leverage opportunities...",
                      ]
                  ).map((opportunity: string, idx: number) => (
                    <motion.div
                      key={idx}
                      className="rounded-2xl border border-border/40 bg-background/70 p-4 shadow-sm"
                      whileHover={{ y: -4 }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full bg-emerald-500/10 p-1.5">
                          <TrendingUp className="h-4 w-4 text-emerald-500" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {opportunity}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </TabsContent>
                <TabsContent value="forecast">
                  <div className="rounded-2xl border border-border/40 bg-background/70 p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-yellow-500/10 p-1.5">
                        <Activity className="h-4 w-4 text-yellow-500" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {insights.forecast ||
                          "We’re building your forecast model..."}
                      </p>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="actions" className="space-y-3">
                  {(insights.actionItems?.length
                    ? insights.actionItems
                    : ["No immediate actions detected."]
                  ).map((action: string, idx: number) => (
                    <motion.div
                      key={idx}
                      className="rounded-2xl border border-border/40 bg-background/70 p-4 shadow-sm"
                      whileHover={{ y: -4 }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {idx + 1}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {action}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </TabsContent>
              </Tabs>
            ) : (
              <div className="grid place-items-center rounded-2xl border border-border/40 bg-background/70 p-12 text-center shadow-inner">
                <AlertTriangle className="mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Once we have enough data, smart insights will appear
                  automatically.
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {segmentCategories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="rounded-3xl border border-border/50 bg-background/70 p-6 shadow-lg backdrop-blur"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-primary/10 p-2.5">
                  <PieChartIcon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Segment Analytics
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Category, device, and region level intelligence.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {segmentCategories.slice(0, 6).map(
                (category: any, idx: number) => (
                  <div
                    key={category.category}
                    className="rounded-2xl border border-border/40 bg-background/80 p-4 shadow-sm transition hover:-translate-y-1 hover:border-primary/40"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-muted-foreground">
                        {category.category}
                      </span>
                      <Badge
                        variant="outline"
                        className="rounded-full border-transparent bg-primary/10 text-xs font-semibold text-primary"
                      >
                        #{idx + 1}
                      </Badge>
                    </div>
                    <div className="mt-3 text-lg font-semibold text-foreground">
                      {formatCurrency(category.revenue, {
                        maximumFractionDigits: 0,
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {category.orders} units
                    </p>
                  </div>
                )
              )}
            </div>
          </motion.div>
        )}

        {(analyticsData?.statusDistribution?.length ?? 0) > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="rounded-3xl border border-border/60 bg-background/70 p-6 shadow-lg backdrop-blur"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-2.5">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Order Status Distribution
                </h2>
                <p className="text-sm text-muted-foreground">
                  Operational breakdown across the order lifecycle.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {analyticsData.statusDistribution.map(
                (status: any, index: number) => {
                  const total = analyticsData.statusDistribution.reduce(
                    (sum: number, entry: any) => sum + entry.count,
                    0
                  );
                  const percentage =
                    total > 0 ? (status.count / total) * 100 : 0;
                  return (
                    <div
                      key={status.status}
                      className="flex flex-col gap-2 rounded-2xl border border-border/40 bg-background/80 p-4 text-center shadow-sm"
                    >
                      <div
                        className="mx-auto flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold text-white shadow-lg"
                        style={{
                          backgroundColor:
                            COLORS[index % COLORS.length],
                        }}
                      >
                        {status.count}
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {status.status}
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          </motion.div>
        )}
      </motion.div>

      <ChartPopup
        open={!!activeChart}
        onOpenChange={(open) => {
          if (!open) setActiveChart(null);
        }}
        title={activeChart ? chartMeta[activeChart].title : ""}
        description={
          activeChart ? chartMeta[activeChart].description : ""
        }
      >
        {activeChart && renderChart(activeChart, true)}
      </ChartPopup>
    </>
  );
}

