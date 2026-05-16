export const CHART_COLORS = {
  revenue: "hsl(221, 83%, 40%)",
  orders: "hsl(142, 71%, 45%)",
  accent: "hsl(142, 71%, 45%)",
  primary: "hsl(221, 83%, 40%)",
  warning: "hsl(48, 96%, 53%)",
  destructive: "hsl(0, 84%, 60%)",
  processing: "hsl(199, 89%, 48%)",
  ready: "hsl(142, 71%, 45%)",
  muted: "hsl(0, 0%, 65%)",
} as const;

export const PIE_COLORS = [
  "hsl(221, 83%, 40%)",
  "hsl(142, 71%, 45%)",
  "hsl(199, 89%, 48%)",
  "hsl(48, 96%, 53%)",
  "hsl(280, 60%, 50%)",
  "hsl(0, 0%, 65%)",
];

export const STATUS_CHART_COLORS: Record<string, string> = {
  NEW: CHART_COLORS.warning,
  IN_PROGRESS: CHART_COLORS.processing,
  READY: CHART_COLORS.ready,
  COMPLETED: CHART_COLORS.orders,
  CANCELLED: CHART_COLORS.destructive,
};

export const STATUS_LABELS: Record<string, string> = {
  NEW: "Pending",
  IN_PROGRESS: "In progress",
  READY: "Ready",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const tooltipContentStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "12px",
  boxShadow: "0 12px 32px -12px rgba(15,23,42,0.22)",
};
