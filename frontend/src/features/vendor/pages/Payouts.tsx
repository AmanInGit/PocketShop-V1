/**
 * Vendor Payments Page
 *
 * UI is adapted from Migration_Data/src/pages/Payments.tsx.
 * We keep the rich cards, charts, filters and table from that version,
 * but wire them to the current vendor hooks (usePayments, usePaymentStats, useVendor)
 * and the supabase client used in this frontend.
 *
 * NOTE: Because Supabase is not configured in some environments yet,
 * this page focuses on structure and data wiring. Visual polish can be
 * refined after real data is available.
 */

import React, { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  IndianRupee,
  CreditCard,
  TrendingUp,
  Download,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Wallet,
  Receipt,
  Activity,
  Zap,
  X as XIcon,
  PackageX,
} from "lucide-react";

import { usePayments, usePaymentStats } from "@/features/vendor/hooks/usePayments";
import { useVendor } from "@/features/vendor/hooks/useVendor";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

const STATUS_BADGE_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  completed: "default",
  pending: "secondary",
  failed: "destructive",
  refunded: "outline",
  voided: "outline", // Unable to deliver - amber/orange styling (red reserved for cancelled)
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: "Card",
  upi: "UPI",
  wallet: "Wallet",
  cash: "Cash",
};

const COLORS = [
  "hsl(221, 83%, 40%)", // primary blue
  "hsl(142, 71%, 45%)", // success green
  "hsl(48, 96%, 53%)", // warning yellow
  "hsl(280, 65%, 60%)", // purple
  "hsl(340, 75%, 55%)", // pink
];

const PAYMENT_STATUS_CHART_COLORS: Record<string, string> = {
  completed: "hsl(142, 71%, 45%)", // green
  pending: "hsl(38, 92%, 50%)", // amber
  unable_to_deliver: "hsl(25, 95%, 53%)", // orange - distinct from red (cancelled)
  cancelled: "hsl(0, 84%, 55%)", // red - strictly for cancelled
  failed: "hsl(0, 72%, 51%)",
  refunded: "hsl(215, 16%, 47%)", // slate
};

const formatCurrency = (amount: number | null | undefined) =>
  `₹${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function Payouts() {
  const { data: payments, isLoading } = usePayments();
  const {
    data: stats,
    isLoading: statsLoading,
  } = usePaymentStats();
  const { data: vendor } = useVendor();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("7d");

  const isRevenueEligible = (payment: any) =>
    payment?.payment_status === "completed" &&
    payment?.orders?.status !== "cancelled";

  // Real-time payment updates (adapted to current query keys)
  useEffect(() => {
    if (!vendor?.id) return;

    const channel = supabase
      .channel("payment-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payments",
        },
        (payload) => {
          // Invalidate both generic and vendor-scoped queries
          queryClient.invalidateQueries({ queryKey: ["payments"] });
          queryClient.invalidateQueries({ queryKey: ["payments", vendor.id] });
          queryClient.invalidateQueries({ queryKey: ["payment-stats"] });
          queryClient.invalidateQueries({ queryKey: ["payment-stats", vendor.id] });

          if (
            payload.eventType === "UPDATE" &&
            (payload.new as any)?.payment_status === "completed"
          ) {
            toast.success("💰 Payment received!", {
              description: `₹${Number(
                (payload.new as any)?.amount || 0
              ).toLocaleString()} has been credited.`,
            });
          }
        }
      )
      .subscribe();

  return () => {
      supabase.removeChannel(channel);
    };
  }, [vendor?.id, queryClient]);

  // Calculate revenue data based on time range
  const revenueData = useMemo(() => {
    if (!payments) return [];

    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    const dataPoints = days === 7 ? 7 : days === 30 ? 30 : 12; // Weekly for 90 days

    if (days === 7 || days === 30) {
      return Array.from({ length: dataPoints }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (dataPoints - 1 - i));
        const dateStr = date.toISOString().split("T")[0];

        const dayPayments = (payments || []).filter(
          (p: any) =>
            p.created_at?.startsWith(dateStr) &&
            isRevenueEligible(p)
        );
        const revenue = dayPayments.reduce(
          (sum: number, p: any) => sum + Number(p.amount),
          0
        );

        return {
          date: format(new Date(dateStr), days === 7 ? "MMM dd" : "MMM dd"),
          revenue,
        };
      });
    } else {
      // Weekly aggregation for 90 days
      return Array.from({ length: 12 }, (_, i) => {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - (12 - i) * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const weekPayments = (payments || []).filter((p: any) => {
          const paymentDate = new Date(p.created_at);
          return (
            paymentDate >= weekStart &&
            paymentDate <= weekEnd &&
            isRevenueEligible(p)
          );
        });
        const revenue = weekPayments.reduce(
          (sum: number, p: any) => sum + Number(p.amount),
          0
        );

        return {
          date: format(weekStart, "MMM dd"),
          revenue,
        };
      });
    }
  }, [payments, timeRange]);

  // Effective status: treat cancelled orders as "Unable to deliver"
  const getEffectiveStatus = (p: any) =>
    p.orders?.status === "cancelled" ? "unable_to_deliver" : (p.payment_status || "unknown");

  // Calculate payment count by status (chart data)
  const paymentStatusData = useMemo(() => {
    if (!payments) return [];

    const statusCounts = (payments || []).reduce(
      (acc: Record<string, number>, payment: any) => {
        const status = getEffectiveStatus(payment);
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const statusLabels: Record<string, string> = {
      completed: "Completed",
      pending: "Pending",
      unable_to_deliver: "Unable to deliver",
      failed: "Failed",
      refunded: "Refunded",
    };

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: statusLabels[status] ?? status.replace(/_/g, " "),
      value: count,
      statusKey: status,
    }));
  }, [payments]);

  // Count successful payments
  const successfulPaymentsCount = useMemo(() => {
    if (!payments) return 0;
    return (payments || []).filter((p: any) => isRevenueEligible(p)).length;
  }, [payments]);

  // Filter payments by status / method / search
  const filteredPayments = useMemo(() => {
    if (!payments) return [];

    return (payments || []).filter((payment: any) => {
      // Status filter (use effective status for cancelled orders)
      const effectiveStatus = getEffectiveStatus(payment);
      const filterStatus =
        statusFilter === "voided" ? "unable_to_deliver" : statusFilter;
      if (statusFilter !== "all" && effectiveStatus !== filterStatus) {
        return false;
      }

      // Method filter
      if (methodFilter !== "all" && payment.payment_method !== methodFilter) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const orderNumber =
          payment.orders?.order_number?.toLowerCase() || "";
        const customerName =
          payment.orders?.customer_name?.toLowerCase() || "";
        const amount = payment.amount?.toString() || "";

        if (
          !orderNumber.includes(query) &&
          !customerName.includes(query) &&
          !amount.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [payments, statusFilter, methodFilter, searchQuery]);

  // Calculate growth percentage
  const revenueGrowth = useMemo(() => {
    if (!payments || revenueData.length < 7) return 0;
    const recent = revenueData
      .slice(-7)
      .reduce((sum, d) => sum + d.revenue, 0);
    const previous =
      revenueData.length >= 14
        ? revenueData
            .slice(-14, -7)
            .reduce((sum, d) => sum + d.revenue, 0)
        : revenueData
            .slice(0, Math.min(7, revenueData.length - 7))
            .reduce((sum, d) => sum + d.revenue, 0);
    if (previous === 0) return 0;
    return ((recent - previous) / previous) * 100;
  }, [revenueData, payments]);

  const getStatusBadge = (status: string) => {
    const icons: Record<string, React.ReactNode> = {
      completed: <CheckCircle className="h-3 w-3 mr-1" />,
      pending: <Clock className="h-3 w-3 mr-1" />,
      failed: <XIcon className="h-3 w-3 mr-1" />,
      refunded: <ArrowDownRight className="h-3 w-3 mr-1" />,
      voided: <PackageX className="h-3 w-3 mr-1" />,
    };
    const labels: Record<string, string> = {
      voided: "Unable to deliver",
    };
    // voided = orange/amber (red reserved for cancelled)
    const voidedClassName =
      status === "voided"
        ? "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400 capitalize gap-1"
        : "capitalize gap-1";

    return (
      <Badge
        variant={STATUS_BADGE_VARIANTS[status] || "outline"}
        className={voidedClassName}
      >
        {icons[status]}
        {labels[status] ?? status}
      </Badge>
    );
  };

  const getPaymentMethodLabel = (method: string) => {
    return PAYMENT_METHOD_LABELS[method] || method;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Enhanced Header from Migration_Data */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Payments
            </h2>
          </div>
          <p className="text-muted-foreground flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Track revenue and manage transactions in real-time
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-gradient-to-r from-primary to-primary/80"
          >
            <Sparkles className="h-4 w-4" />
            Insights
          </Button>
        </div>
      </div>

      {/* Enhanced Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <IndianRupee className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-32 mb-2" />
            ) : (
              <>
                <div className="text-3xl font-bold tracking-tight">
                  {formatCurrency(stats?.totalRevenue)}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  All-time earnings
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 hover:border-yellow-500/50 transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Payouts
            </CardTitle>
            <div className="p-2 rounded-lg bg-yellow-500/10 group-hover:bg-yellow-500/20 transition-colors">
              <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-32 mb-2" />
            ) : (
              <>
                <div className="text-3xl font-bold tracking-tight">
                  {formatCurrency(stats?.pendingPayouts)}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Awaiting settlement
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 hover:border-green-500/50 transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month
            </CardTitle>
            <div className="p-2 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-32 mb-2" />
            ) : (
              <>
                <div className="text-3xl font-bold tracking-tight flex items-center gap-2">
                  {formatCurrency(stats?.thisMonth)}
                  {revenueGrowth !== 0 && (
                    <span
                      className={cn(
                        "text-xs font-medium flex items-center gap-1",
                        revenueGrowth > 0 ? "text-green-600" : "text-red-600"
                      )}
                    >
                      {revenueGrowth > 0 ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {Math.abs(revenueGrowth).toFixed(1)}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Current month revenue
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 hover:border-accent/50 transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Successful Payments
            </CardTitle>
            <div className="p-2 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
              <CheckCircle className="h-4 w-4 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32 mb-2" />
            ) : (
              <>
                <div className="text-3xl font-bold tracking-tight">
                  {successfulPaymentsCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Completed transactions
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-2 hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Revenue Trend
                </CardTitle>
                <CardDescription className="mt-1">
                  Revenue trends over time
                </CardDescription>
              </div>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[100px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 Days</SelectItem>
                  <SelectItem value="30d">30 Days</SelectItem>
                  <SelectItem value="90d">90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="hsl(221, 83%, 40%)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(221, 83%, 40%)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="date"
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      `₹${value.toFixed(2)}`,
                      "Revenue",
                    ]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      boxShadow:
                        "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(221, 83%, 40%)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Payment Status
            </CardTitle>
            <CardDescription className="mt-1">
              Distribution by payment status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : paymentStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(Number(percent ?? 0) * 100).toFixed(0)}%`
                    }
                    outerRadius={100}
                    innerRadius={40}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {paymentStatusData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          PAYMENT_STATUS_CHART_COLORS[
                            (entry as any).statusKey || entry.name?.toLowerCase().replace(/\s+/g, "_")
                          ] || COLORS[index % COLORS.length]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      boxShadow:
                        "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No payment data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Transactions Table with filters */}
      <Card className="border-2">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Recent Transactions
              </CardTitle>
              <CardDescription className="mt-1">
                Your latest payment transactions with real-time updates
              </CardDescription>
            </div>
            {/* NOTE: Layout tweaked to keep search + both filters on a single row on desktop, */}
            {/* matching the original Migration_Data UI more closely. */}
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <div className="relative w-full sm:w-[260px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-full sm:w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="voided">Unable to deliver</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="h-9 w-full sm:w-[140px]">
                  <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="wallet">Wallet</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">
                    Date &amp; Time
                  </TableHead>
                  <TableHead className="font-semibold">Order</TableHead>
                  <TableHead className="font-semibold">Customer</TableHead>
                  <TableHead className="font-semibold">Method</TableHead>
                  <TableHead className="text-right font-semibold">
                    Amount
                  </TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-4 w-20 ml-auto" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-20" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredPayments && filteredPayments.length > 0 ? (
                  filteredPayments.map((payment: any) => (
                    <TableRow
                      key={payment.id}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      <TableCell className="font-mono text-xs">
                        <div className="flex flex-col">
                          <span>
                            {format(
                              new Date(payment.created_at),
                              "MMM dd, yyyy"
                            )}
                          </span>
                          <span className="text-muted-foreground">
                            {format(
                              new Date(payment.created_at),
                              "HH:mm"
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium flex items-center gap-2">
                          <Receipt className="h-3 w-3 text-muted-foreground" />
                          {payment.orders?.order_number || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                            {(
                              payment.orders?.customer_name ||
                              "G"
                            )[0].toUpperCase()}
                          </div>
                          <span>
                            {payment.orders?.customer_name || "Guest"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="capitalize gap-1"
                        >
                          {payment.payment_method === "card" && (
                            <CreditCard className="h-3 w-3" />
                          )}
                          {payment.payment_method === "upi" && (
                            <Wallet className="h-3 w-3" />
                          )}
                          {payment.payment_method === "wallet" && (
                            <Wallet className="h-3 w-3" />
                          )}
                          {payment.payment_method === "cash" && (
                            <IndianRupee className="h-3 w-3" />
                          )}
                          {getPaymentMethodLabel(payment.payment_method)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-bold text-lg">
                          ₹{Number(payment.amount).toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {payment.orders?.status === 'cancelled'
                          ? getStatusBadge('voided')
                          : getStatusBadge(payment.payment_status)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-12"
                    >
                      <div className="flex flex-col items-center">
                        <div className="p-4 rounded-full bg-muted mb-4">
                          <CreditCard className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <p className="text-lg font-medium text-foreground mb-1">
                          No transactions found
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {searchQuery ||
                          statusFilter !== "all" ||
                          methodFilter !== "all"
                            ? "Try adjusting your filters"
                            : "Payments will appear here once customers start ordering"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {filteredPayments && filteredPayments.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground flex items-center justify-between">
              <span>
                Showing {filteredPayments.length} of{" "}
                {payments?.length || 0} transactions
              </span>
              {filteredPayments.length < (payments?.length || 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setMethodFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

