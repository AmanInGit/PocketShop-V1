import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CHART_COLORS } from "./analyticsChartConfig";

type WeeklyComparison = {
  thisWeek: {
    revenue: number;
    orders: number;
    averageOrderValue: number;
  };
  lastWeek: {
    revenue: number;
    orders: number;
    averageOrderValue: number;
  };
  revenueGrowth: number;
  orderGrowth: number;
};

type WeekComparePanelProps = {
  weeklyComparison?: WeeklyComparison | null;
  loading?: boolean;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
};

function growthPct(thisVal: number, lastVal: number) {
  if (lastVal > 0) return ((thisVal - lastVal) / lastVal) * 100;
  return thisVal > 0 ? 100 : 0;
}

function CompareRow({
  label,
  thisValue,
  lastValue,
  growth,
  formattedThis,
  formattedLast,
  accent,
}: {
  label: string;
  thisValue: number;
  lastValue: number;
  growth: number;
  formattedThis: string;
  formattedLast: string;
  accent: string;
}) {
  const max = Math.max(thisValue, lastValue, 1);
  const thisPct = (thisValue / max) * 100;
  const lastPct = (lastValue / max) * 100;
  const up = growth >= 0;

  return (
    <div className="rounded-xl border border-border/50 bg-background/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
            up ? "bg-emerald-500/15 text-emerald-600" : "bg-red-500/15 text-red-500"
          )}
        >
          {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(growth).toFixed(1)}%
        </span>
      </div>
      <div className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
        {formattedThis}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        Last week: <span className="font-medium text-foreground/80">{formattedLast}</span>
      </div>
      <div className="mt-4 space-y-1.5">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
          <span className="w-14">This wk</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted/50">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${thisPct}%`, backgroundColor: accent }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
          <span className="w-14">Last wk</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted/50">
            <div
              className="h-full rounded-full bg-muted-foreground/35 transition-all"
              style={{ width: `${lastPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function WeekComparePanel({
  weeklyComparison,
  loading,
  formatCurrency,
  formatNumber,
}: WeekComparePanelProps) {
  if (loading) {
    return (
      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!weeklyComparison) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-muted-foreground">
        Not enough data for weekly comparison.
      </div>
    );
  }

  const { thisWeek, lastWeek } = weeklyComparison;
  const aovGrowth = growthPct(
    thisWeek.averageOrderValue,
    lastWeek.averageOrderValue
  );

  return (
    <div className="grid gap-4">
      <CompareRow
        label="Revenue"
        thisValue={thisWeek.revenue}
        lastValue={lastWeek.revenue}
        growth={weeklyComparison.revenueGrowth}
        formattedThis={formatCurrency(thisWeek.revenue)}
        formattedLast={formatCurrency(lastWeek.revenue)}
        accent={CHART_COLORS.revenue}
      />
      <CompareRow
        label="Orders"
        thisValue={thisWeek.orders}
        lastValue={lastWeek.orders}
        growth={weeklyComparison.orderGrowth}
        formattedThis={formatNumber(thisWeek.orders)}
        formattedLast={formatNumber(lastWeek.orders)}
        accent={CHART_COLORS.orders}
      />
      <CompareRow
        label="Avg. order value"
        thisValue={thisWeek.averageOrderValue}
        lastValue={lastWeek.averageOrderValue}
        growth={aovGrowth}
        formattedThis={formatCurrency(thisWeek.averageOrderValue)}
        formattedLast={formatCurrency(lastWeek.averageOrderValue)}
        accent={CHART_COLORS.processing}
      />
    </div>
  );
}
