/**
 * Vendor Storefront Page
 *
 * UI is adapted from Migration_Data/src/pages/Storefront.tsx.
 * We keep the richer dashboard-style layout (hero, stats, QR section,
 * settings form, and live preview iframe) but wire it to the current
 * vendor hooks (`useVendor`, `useStorefront`, `useProducts`, `useOrders`).
 *
 * Migration notes:
 * - Stats (products/orders/revenue) are derived from `useProducts` +
 *   `useOrders` so they stay in sync with the rest of the dashboard.
 * - QR code generation + storefront link use `useStorefront`, which writes
 *   to `vendor_profiles.qr_code_url` and reuses the current Supabase model.
 * - The live preview iframe points at `/storefront/:vendorId`, which is the
 *   same route the customer-facing storefront will use in Phase 4.
 * - If Supabase tables are not created/seeded yet, the preview area will
 *   render the shell UI but with no products; this is expected until DB
 *   setup is completed in later migration phases.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  QrCode,
  ExternalLink,
  Download,
  Copy,
  RefreshCw,
  Share2,
  Store,
  Package,
  ShoppingBag,
  TrendingUp,
  Eye,
  Mail,
  Phone,
  CheckCircle2,
  Sparkles,
  Globe,
  Settings,
} from "lucide-react";
import { useStorefront } from "@/features/vendor/hooks/useStorefront";
import { ROUTES } from "@/constants/routes";
import { useVendor } from "@/features/vendor/hooks/useVendor";
import { useProducts } from "@/features/vendor/hooks/useProducts";
import { useOrders } from "@/features/vendor/hooks/useOrders";
import { useVendorTables } from "@/features/vendor/hooks/useVendorTables";
import { useVendorStatusContext } from '@/features/vendor/context/VendorStatusContext';
import { TableQRCard } from "@/features/vendor/components/TableQRCard";
import { motion } from "framer-motion";
import QRCode from "qrcode";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { LucideIcon } from "lucide-react";

const STAT_CARD_STYLES = {
  blue: {
    light: "from-blue-50 to-blue-100/50 dark:from-blue-950/60 dark:to-blue-900/40",
    text: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-500/10 dark:bg-blue-500/20",
    icon: "text-blue-600 dark:text-blue-400",
  },
  indigo: {
    light: "from-indigo-50 to-indigo-100/50 dark:from-indigo-950/60 dark:to-indigo-900/40",
    text: "text-indigo-600 dark:text-indigo-400",
    iconBg: "bg-indigo-500/10 dark:bg-indigo-500/20",
    icon: "text-indigo-600 dark:text-indigo-400",
  },
  emerald: {
    light: "from-emerald-50 to-emerald-100/50 dark:from-emerald-950/60 dark:to-emerald-900/40",
    text: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    icon: "text-emerald-600 dark:text-emerald-400",
  },
  purple: {
    light: "from-purple-50 to-purple-100/50 dark:from-purple-950/60 dark:to-purple-900/40",
    text: "text-purple-600 dark:text-purple-400",
    iconBg: "bg-purple-500/10 dark:bg-purple-500/20",
    icon: "text-purple-600 dark:text-purple-400",
  },
} as const;

function StatCard({
  delay,
  icon: Icon,
  label,
  value,
  subText,
  colorScheme,
}: {
  delay: number;
  icon: LucideIcon;
  label: string;
  value: string;
  subText: string;
  colorScheme: keyof typeof STAT_CARD_STYLES;
}) {
  const styles = STAT_CARD_STYLES[colorScheme];
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 300, damping: 24 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="h-full"
    >
      <motion.div
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="h-full"
      >
        <Card
          className={`h-full border-0 bg-gradient-to-br ${styles.light} shadow-lg transition-shadow duration-300 hover:shadow-xl dark:border dark:border-white/5`}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-sm font-medium text-muted-foreground">
                  {label}
                </p>
                <p className={`text-3xl font-bold tabular-nums ${styles.text}`}>
                  {value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{subText}</p>
              </div>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: delay + 0.1 }}
                className={`rounded-xl p-3 ${styles.iconBg}`}
              >
                <Icon className={`h-8 w-8 ${styles.icon}`} />
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

export default function Storefront() {
  const { data: vendor, isLoading: vendorLoading } = useVendor();
  const { isOnline } = useVendorStatusContext();
  const { data: products } = useProducts();
  const { data: orders } = useOrders();
  const { updateQRCode, isUpdatingQRCode } = useStorefront();
  const {
    tables,
    tableConfig,
    vendorId,
    isLoading: tablesLoading,
    saveLayout,
    isSavingLayout,
  } = useVendorTables();

  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("mobile");
  const tableActivityMap = useMemo(() => {
    const map: Record<string, { activeCount: number; queueCount: number }> = {};
    for (const order of orders || []) {
      const tableCode = (order as any).table_code as string | null;
      if (!tableCode || tableCode === 'PICKUP') continue;
      if (!map[tableCode]) {
        map[tableCode] = { activeCount: 0, queueCount: 0 };
      }
      const status = String((order as any).status || '').toLowerCase();
      if (status === 'completed' || status === 'cancelled') continue;

      const kitchenState = String((order as any).kitchen_state || '').toLowerCase();
      // Backward compatible: if kitchen_state is missing for older rows,
      // treat non-completed/non-cancelled orders as active for storefront urgency.
      if (kitchenState === 'active' || !kitchenState) map[tableCode].activeCount += 1;
      if (kitchenState === 'queued') map[tableCode].queueCount += 1;
    }
    return map;
  }, [orders]);

  // Calculate statistics (mirrors Migration_Data Storefront behavior).
  const stats = useMemo(() => {
    const totalProducts = products?.length || 0;
    const availableProducts =
      products?.filter(
        (p: any) =>
          p.is_available && (p.stock_quantity === null || p.stock_quantity > 0),
      ).length || 0;
    const totalOrders = orders?.length || 0;
    const totalRevenue =
      orders?.reduce(
        (sum: number, order: any) =>
          sum + (Number(order.total_amount) || 0),
        0,
      ) || 0;
    const pendingOrders =
      orders?.filter((o: any) =>
        ["pending", "processing", "preparing"].includes(String(o.status || '').toLowerCase()),
      ).length || 0;

    return {
      totalProducts,
      availableProducts,
      totalOrders,
      totalRevenue,
      pendingOrders,
    };
  }, [products, orders]);

  useEffect(() => {
    if (vendor && (vendor as any).qr_code_url) {
      setQrCodeUrl((vendor as any).qr_code_url);
    }
  }, [vendor]);

  const handleGenerateQRCode = async () => {
    if (!vendor?.id) return;
    try {
      const result = await updateQRCode(vendor.id);
      if ((result as any)?.qr_code_url) {
        setQrCodeUrl((result as any).qr_code_url);
      }
    } catch (error) {
      // Error toast is already handled inside useStorefront
      console.error("Error generating QR code:", error);
    }
  };

  const handleDownloadQRCode = () => {
    if (!qrCodeUrl) return;

    const link = document.createElement("a");
    link.href = qrCodeUrl;
    link.download = `${vendor?.business_name || "storefront"}-qr-code.png`;
    link.click();
  };

  const storefrontUrl = vendor?.id
    ? `${window.location.origin}/storefront/${vendor.id}?pickup=1`
    : "";

  const handleCopyStorefrontLink = () => {
    if (!storefrontUrl) return;
    navigator.clipboard.writeText(storefrontUrl);
  };

  const handleShare = async () => {
    if (!storefrontUrl || !vendor) return;

    const shareData = {
      title: vendor.business_name || "My Storefront",
      text: `Check out ${vendor.business_name || "my storefront"}!`,
      url: storefrontUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        navigator.clipboard.writeText(storefrontUrl);
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handlePreview = () => {
    if (!vendor?.id) return;
    window.open(`/storefront/${vendor.id}`, "_blank");
  };

  const handleDownloadTableQR = async (tableSlug: string, tableCode: string) => {
    const url = `${window.location.origin}/storefront/${vendorId}?table=${tableSlug}`;
    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 400, margin: 2 });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `table-${tableCode}.png`;
      a.click();
    } catch (e) {
      console.error("Failed to generate QR", e);
    }
  };

  const handleDownloadAllTableQRs = async () => {
    if (!vendorId) return;
    for (const t of tables) {
      await handleDownloadTableQR(t.table_slug, t.table_code);
      await new Promise((r) => setTimeout(r, 300));
    }
  };

  if (vendorLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 pb-8"
    >
      {/* Blue banner – Storefront Info */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-6 text-white shadow-2xl dark:from-primary/95 dark:via-primary/90 dark:to-primary/80 sm:p-8"
      >
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/20 backdrop-blur-sm">
                {vendor?.logo_url ? (
                  <img
                    src={vendor.logo_url}
                    alt={vendor.business_name || "Shop logo"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Store className="h-8 w-8 text-white" />
                )}
              </div>
              <div>
                <h1 className="mb-1 text-2xl font-bold sm:text-3xl">
                  {vendor?.business_name || "Storefront"}
                </h1>
                <p className="text-white/90">
                  {vendor?.address || "Manage your digital storefront"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className="flex items-center gap-2 rounded-2xl border-white/30 bg-white/20 px-4 py-2 text-white backdrop-blur-sm"
                title={isOnline ? "Store is online" : "Store is offline"}
              >
                <Sparkles className="h-4 w-4" />
                {isOnline ? "Online" : "Offline"}
              </Badge>
              <Button asChild variant="secondary" size="sm" className="border-white/30 bg-white/20 text-white hover:bg-white/30">
                <Link
                  to={ROUTES.VENDOR_DASHBOARD_SETTINGS}
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Edit in Settings
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 border-t border-white/20 pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {vendor?.description && (
              <div className="flex items-start gap-2">
                <Globe className="mt-0.5 h-4 w-4 shrink-0 text-white/80" />
                <span className="line-clamp-2 text-white/90">{vendor.description}</span>
              </div>
            )}
            {vendor?.mobile_number && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-white/80" />
                <span className="text-white/90">{vendor.mobile_number}</span>
              </div>
            )}
            {vendor?.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-white/80" />
                <span className="truncate text-white/90">{vendor.email}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          delay={0.1}
          icon={Package}
          label="Total Products"
          value={String(stats.totalProducts)}
          subText={`${stats.availableProducts} available`}
          colorScheme="blue"
        />
        <StatCard
          delay={0.2}
          icon={ShoppingBag}
          label="Total Orders"
          value={String(stats.totalOrders)}
          subText={`${stats.pendingOrders} pending`}
          colorScheme="indigo"
        />
        <StatCard
          delay={0.3}
          icon={TrendingUp}
          label="Total Revenue"
          value={`₹${stats.totalRevenue.toLocaleString()}`}
          subText="All time"
          colorScheme="emerald"
        />
        <StatCard
          delay={0.4}
          icon={Eye}
          label="Storefront Views"
          value="-"
          subText="Coming soon"
          colorScheme="purple"
        />
      </div>

      {/* Pickup QR (left) | Tables & layout view (right) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 300, damping: 24 }}
          whileHover={{ scale: 1.01 }}
          className="transition-transform duration-200"
        >
          <Card className="overflow-hidden border-0 shadow-xl transition-all duration-300 hover:shadow-2xl dark:border dark:border-white/10 dark:bg-card">
            <CardHeader className="border-b bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 dark:border-white/5">
              <CardTitle className="flex items-center gap-2 text-xl">
                <QrCode className="h-5 w-5 text-primary" />
                Pickup QR Code
              </CardTitle>
              <CardDescription>
                For walk-in pickup. Place at counter — can be regenerated if needed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {/* Big QR on top */}
              <div className="flex justify-center rounded-2xl border-2 border-dashed border-primary/20 bg-muted/30 p-6 dark:border-primary/30 dark:bg-muted/20">
                {qrCodeUrl ? (
                  <motion.img
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    src={qrCodeUrl}
                    alt="Pickup QR Code"
                    className="h-56 w-56 rounded-xl bg-white p-3 shadow-lg dark:bg-white"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <QrCode className="h-24 w-24 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">QR Code will appear here</p>
                  </div>
                )}
              </div>
              {/* Options and link below */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Storefront link</p>
                <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2 dark:bg-muted/30 dark:border-white/10">
                  <p className="min-w-0 flex-1 truncate font-mono text-sm" title={storefrontUrl}>
                    {storefrontUrl}
                  </p>
                  <Button variant="outline" size="icon" onClick={handleCopyStorefrontLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleShare}>Share Link</DropdownMenuItem>
                      <DropdownMenuItem onClick={handleCopyStorefrontLink}>Copy Link</DropdownMenuItem>
                      <DropdownMenuItem onClick={handlePreview}>Open Preview</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={handleDownloadQRCode} disabled={!qrCodeUrl}>
                    <Download className="mr-2 h-4 w-4" /> Download
                  </Button>
                  <Button variant="outline" onClick={handlePreview}>
                    <ExternalLink className="mr-2 h-4 w-4" /> Preview
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleGenerateQRCode}
                    disabled={isUpdatingQRCode}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isUpdatingQRCode ? "animate-spin" : ""}`} />
                    {isUpdatingQRCode ? "Generating…" : "Regenerate Pickup QR"}
                  </Button>
                </div>
                {vendor && (
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Storefront is live
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tables & layout – floor plan view (edit layout = drag only; add/remove tables in Settings) */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, type: "spring", stiffness: 300, damping: 24 }}
          whileHover={{ scale: 1.01 }}
          className="transition-transform duration-200"
        >
          {tablesLoading ? (
            <Card className="border-0 shadow-xl">
              <CardContent className="flex items-center justify-center py-24">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </CardContent>
            </Card>
          ) : (
            <TableQRCard
              tables={tables}
              tableConfig={tableConfig}
              vendorId={vendorId}
              tableActivityMap={tableActivityMap}
              onDownloadTable={handleDownloadTableQR}
              onDownloadAll={handleDownloadAllTableQRs}
              onSaveLayout={saveLayout}
              isSavingLayout={isSavingLayout}
              settingsUrl={`${ROUTES.VENDOR_DASHBOARD_SETTINGS}?tab=layout`}
            />
          )}
        </motion.div>
      </div>

      {/* Preview Section - Enhanced */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, type: "spring", stiffness: 300, damping: 24 }}
      >
        <Card className="overflow-hidden border-0 shadow-xl transition-shadow duration-300 hover:shadow-2xl dark:border dark:border-white/10 dark:bg-card">
          <CardHeader className="border-b bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 dark:border-white/5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Eye className="h-6 w-6 text-primary" />
                  Live Preview
                </CardTitle>
                <CardDescription className="mt-1">
                  See how your storefront looks to customers
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-full bg-muted/60 p-1 dark:bg-muted/40">
                  <Button
                    type="button"
                    variant={previewMode === "mobile" ? "default" : "ghost"}
                    size="sm"
                    className={`h-8 rounded-full px-3 text-xs ${
                      previewMode === "mobile" ? "" : "bg-transparent"
                    }`}
                    onClick={() => setPreviewMode("mobile")}
                  >
                    Mobile
                  </Button>
                  <Button
                    type="button"
                    variant={previewMode === "desktop" ? "default" : "ghost"}
                    size="sm"
                    className={`h-8 rounded-full px-3 text-xs ${
                      previewMode === "desktop" ? "" : "bg-transparent"
                    }`}
                    onClick={() => setPreviewMode("desktop")}
                  >
                    Desktop
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={handlePreview}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in New Tab
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {vendor?.id ? (
              previewMode === "desktop" ? (
                <div className="relative aspect-video overflow-hidden rounded-xl border-2 border-dashed border-primary/20 bg-gradient-to-br from-muted/50 to-muted">
                  <iframe
                    src={`/storefront/${vendor.id}`}
                    className="h-full w-full rounded-lg border-0"
                    title="Storefront Preview Desktop"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <div className="relative w-[390px] max-w-full aspect-[9/19.5] rounded-[2rem] border border-border bg-black/90 shadow-2xl">
                    <div className="absolute inset-2 rounded-[1.6rem] overflow-hidden bg-white">
                      <iframe
                        src={`/storefront/${vendor.id}`}
                        className="h-full w-full border-0"
                        title="Storefront Preview Mobile"
                      />
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="relative aspect-video overflow-hidden rounded-xl border-2 border-dashed border-primary/20 bg-gradient-to-br from-muted/50 to-muted">
                <div className="flex h-full flex-col items-center justify-center gap-4">
                  <Store className="h-16 w-16 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Preview will appear here
                  </p>
                  <Button variant="outline" onClick={handlePreview}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Live Preview
                  </Button>
                </div>
              </div>
            )}
            <div className="mt-4 flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span>Live</span>
              </div>
              <span>•</span>
              <span>Updated in real-time</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

