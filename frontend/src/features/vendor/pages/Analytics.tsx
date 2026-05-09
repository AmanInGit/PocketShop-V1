import { useMemo, useState } from "react";
import { AnalyticsCard } from "@/components/analytics/AnalyticsCard";
import { ChartContainer } from "@/components/analytics/ChartContainer";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { IndianRupee, ShoppingCart, TrendingUp, Users, MessageSquare } from "lucide-react";
import {
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
} from "recharts";
import { useAnalytics } from "@/features/vendor/hooks/useAnalytics";
import { useRecommendations } from "@/features/vendor/hooks/useRecommendations";
import { useVendor } from "@/features/vendor/hooks/useVendor";
import { RealtimeFeedback } from "../components/RealtimeFeedback";

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

export default function Analytics() {
  const [days] = useState(30);
  const [revenueView, setRevenueView] = useState<"daily" | "monthly" | "yearly">(
    "daily"
  );

  const { data: vendor } = useVendor();
  const {
    data: analytics,
    isLoading: analyticsLoading,
  } = useAnalytics(days);
  const {
    items: recommendations,
    isEnriching: recommendationsEnriching,
  } = useRecommendations(days);
  const trendingDishes = analytics?.trendingDishes ?? [];
  const returningCustomersCount = analytics?.returningCustomersCount ?? 0;
  const uniqueCustomersCount = analytics?.uniqueCustomersCount ?? 0;

  const revenueSeries = useMemo(() => {
    if (!analytics) return [];
    if (revenueView === "daily") return analytics.salesByDay ?? [];
    if (revenueView === "monthly") return analytics.salesByMonth ?? [];
    return analytics.revenueByYear ?? [];
  }, [analytics, revenueView]);

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
      subtitle: "Completed orders only",
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
      value: formatNumber(analytics?.totalOrders || 0),
      subtitle: "Placed in selected period",
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
      icon: <TrendingUp className="h-5 w-5" />,
      tone: "warning" as const,
      loading: analyticsLoading,
    },
  ];

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
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Analytics
            </h1>
            <p className="text-sm text-muted-foreground">
              Real, order-based metrics from completed orders.
            </p>
          </div>
        </div>

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
            />
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          <ChartContainer
            title="Trending dishes"
            description="Top dishes by quantity sold (completed orders only)"
            badge="Quantity"
            isLoading={analyticsLoading}
            className="lg:col-span-2"
          >
            <div className="h-full overflow-auto rounded-xl">
              {analyticsLoading ? (
                <Skeleton className="h-full w-full rounded-2xl" />
              ) : trendingDishes.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No completed order items found in this period.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background/80 backdrop-blur">
                    <tr className="border-b border-border/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2">Dish</th>
                      <th className="px-3 py-2 text-right">Qty sold</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trendingDishes.slice(0, 10).map((dish, idx) => (
                      <tr
                        key={`${dish.id ?? dish.name}-${idx}`}
                        className="border-b border-border/30 last:border-b-0"
                      >
                        <td className="px-3 py-2 font-medium text-foreground">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate">{dish.name}</span>
                            <Badge
                              variant="outline"
                              className="rounded-full border-primary/30 bg-primary/10 text-xs font-semibold text-primary"
                            >
                              #{idx + 1}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-foreground">
                          {formatNumber(dish.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </ChartContainer>

          <ChartContainer
            title="Returning customers"
            description="Registered customers with 2+ completed orders (selected period)"
            badge="Retention"
            isLoading={analyticsLoading}
            className="lg:col-span-1"
          >
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Users className="h-6 w-6" />
              </div>
              {analyticsLoading ? (
                <Skeleton className="h-10 w-24 rounded-xl" />
              ) : (
                <div className="text-4xl font-bold tabular-nums text-foreground">
                  {formatNumber(returningCustomersCount)}
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                {analyticsLoading
                  ? "Calculating…"
                  : uniqueCustomersCount > 0
                    ? `${((returningCustomersCount / uniqueCustomersCount) * 100).toFixed(1)}% of ${formatNumber(
                        uniqueCustomersCount
                      )} unique registered customers`
                    : "No registered customers found in this period."}
              </div>
            </div>
          </ChartContainer>

          <ChartContainer
            title="Customer Feedback"
            description="Realtime user feedback and ratings"
            badge="Live"
            isLoading={analyticsLoading}
            className="lg:col-span-1"
          >
            {vendor?.id ? (
              <RealtimeFeedback vendorId={vendor.id} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Loading vendor data...
              </div>
            )}
          </ChartContainer>
        </div>

        <ChartContainer
          title="Recommendations"
          description="AI-powered recommendations from real data (with safe fallback)"
          badge={recommendationsEnriching ? "Updating" : "Live"}
          isLoading={analyticsLoading}
        >
          <div className="h-full overflow-auto">
            {recommendations.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No recommendations available yet.
              </div>
            ) : (
              <div className="space-y-3">
                {recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="rounded-2xl border border-border/40 bg-background/80 p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-foreground">
                          {rec.copy.title}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {rec.copy.message}
                        </div>
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
                          rec.severity === "critical" &&
                            "bg-red-500/15 text-red-500",
                          rec.severity === "warning" &&
                            "bg-yellow-500/15 text-yellow-600",
                          rec.severity === "info" &&
                            "bg-emerald-500/15 text-emerald-600"
                        )}
                      >
                        {rec.severity}
                      </Badge>
                    </div>
                    {rec.suggestedAction ? (
                      <div className="mt-2 text-xs font-medium text-foreground">
                        Suggested:{" "}
                        <span className="font-normal text-muted-foreground">
                          {rec.suggestedAction}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ChartContainer>

        <ChartContainer
          title="Revenue comparison"
          description="Completed order revenue grouped by month or year"
          badge={
            revenueView === "daily"
              ? "Daily"
              : revenueView === "monthly"
                ? "Monthly"
                : "Yearly"
          }
          isLoading={analyticsLoading}
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRevenueView("daily")}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  revenueView === "daily"
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/60 bg-background/80 text-muted-foreground hover:bg-muted/40"
                )}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => setRevenueView("monthly")}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  revenueView === "monthly"
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/60 bg-background/80 text-muted-foreground hover:bg-muted/40"
                )}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setRevenueView("yearly")}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  revenueView === "yearly"
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/60 bg-background/80 text-muted-foreground hover:bg-muted/40"
                )}
              >
                Yearly
              </button>
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={revenueSeries}>
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="rgba(148, 163, 184, 0.25)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
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
                  boxShadow: "0 12px 32px -12px rgba(15,23,42,0.22)",
                }}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="hsl(221, 83%, 40%)"
                strokeWidth={2.4}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </motion.div>
    </>
  );
}

