/**
 * Vendor Inventory Page
 *
 * Adapted from Migration_Data/src/pages/Inventory.tsx.
 * Uses the current vendor hooks (useProducts, useProductMutations) and
 * shared inventory components (ProductCard, BulkActions) to manage the
 * product catalog inside the vendor dashboard.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Search, 
  AlertCircle, 
  Package, 
  TrendingDown, 
  XCircle, 
  IndianRupee, 
  Grid3x3, 
  List, 
  Filter, 
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProducts } from "@/features/vendor/hooks/useProducts";
import { useProductMutations } from "@/features/vendor/hooks/useProductMutations";
import { useVendor } from "@/features/vendor/hooks/useVendor";
import { useToast } from "@/hooks/use-toast";
import { ProductCard } from "@/components/inventory/ProductCard";
import { BulkActions } from "@/components/inventory/BulkActions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MetricCard } from "@/components/ui/metric-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants/routes";

const DAILY_RESET_KEY = "pocketshop_vendor_daily_reset_date";

export default function Inventory() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: vendor } = useVendor();
  const { data: products, isLoading } = useProducts();
  const { deleteProduct, updateProduct, resetDailyStock } = useProductMutations();
  const [searchQuery, setSearchQuery] = useState("");
  const hasCheckedDailyReset = useRef(false);

  // Auto daily reset on first visit of the day (once per vendor per day)
  useEffect(() => {
    if (!vendor?.id || hasCheckedDailyReset.current || !products) return;
    const today = new Date().toDateString();
    const storageKey = `${DAILY_RESET_KEY}_${vendor.id}`;
    const lastReset = typeof localStorage !== "undefined" ? localStorage.getItem(storageKey) : null;
    if (lastReset === today) return;

    const hasQuantityProducts = products.some((p: any) => p.availability_mode === "quantity" && p.daily_quantity != null);
    hasCheckedDailyReset.current = true;
    if (!hasQuantityProducts) return;

    resetDailyStock.mutate(
      { silent: true },
      {
        onSuccess: () => {
          localStorage.setItem(storageKey, today);
          toast({
            title: "Inventory refreshed",
            description: "Check your inventory — it's been reset to daily quantities.",
          });
        },
      }
    );
  }, [vendor?.id, products, resetDailyStock, toast]);
  const [filterStatus, setFilterStatus] = useState<"all" | "available" | "unavailable" | "low-stock">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Calculate statistics (mirrors Migration_Data Inventory behavior).
  // NOTE: Visual details (icons, borders) can be tuned later for pixel-perfect parity.
  const stats = useMemo(() => {
    if (!products) return null;

    const totalProducts = products.length;
    const lowStockProducts = products.filter((p: any) => {
      if (p.availability_mode === 'requirement') return false;
      const threshold = p.low_stock_threshold ?? 10;
      return (p.stock_quantity ?? 0) <= threshold && (p.stock_quantity ?? 0) > 0;
    }).length;
    const outOfStockProducts = products.filter((p: any) => {
      if (p.availability_mode === 'requirement') {
        return !p.is_available;
      }
      return (p.stock_quantity ?? 0) <= 0;
    }).length;
    const totalValue = products.reduce(
      (sum: number, p: any) => sum + (p.price * p.stock_quantity),
      0
    );
    const availableProducts = products.filter((p: any) => {
      if (p.availability_mode === 'requirement') {
        return p.is_available;
      }
      return (p.stock_quantity ?? 0) > 0;
    }).length;

    return {
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      totalValue,
      availableProducts,
    };
  }, [products]);

  // Unique categories for filter
  const categories = useMemo(() => {
    if (!products) return [];
    const cats = (products as any[])
      .map((p) => p.category)
      .filter((cat): cat is string => Boolean(cat));
    return Array.from(new Set(cats));
  }, [products]);

  const filteredProducts = products?.filter((product: any) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.tags?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" || product.category === selectedCategory;
    
    const isLowStock = product.availability_mode !== 'requirement' &&
      (product.stock_quantity ?? 0) <= (product.low_stock_threshold || 10);
    
    switch (filterStatus) {
      case "available":
        return matchesSearch && matchesCategory && (
          product.availability_mode === 'requirement'
            ? product.is_available
            : (product.stock_quantity ?? 0) > 0
        );
      case "unavailable":
        return matchesSearch && matchesCategory && (
          product.availability_mode === 'requirement'
            ? !product.is_available
            : (product.stock_quantity ?? 0) <= 0
        );
      case "low-stock":
        return matchesSearch && matchesCategory && isLowStock;
      default:
        return matchesSearch && matchesCategory;
    }
  });

  const lowStockCount = products?.filter((p: any) =>
    p.availability_mode !== 'requirement' &&
    (p.stock_quantity ?? 0) <= (p.low_stock_threshold || 10)
  ).length || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inventory Management</h2>
          <p className="text-muted-foreground">
            Manage your product catalog and stock levels
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BulkActions />
          <Button onClick={() => navigate(`${ROUTES.VENDOR_DASHBOARD_INVENTORY}/add`)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Statistics Dashboard (from Migration_Data) */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Products"
            value={stats.totalProducts}
            icon={<Package className="h-4 w-4" />}
            description={`${stats.availableProducts} available`}
            isLoading={isLoading}
            className="border-l-4 border-l-blue-500"
          />
          <MetricCard
            title="Low Stock"
            value={stats.lowStockProducts}
            icon={<TrendingDown className="h-4 w-4" />}
            description="Needs attention"
            isLoading={isLoading}
            className="border-l-4 border-l-amber-500"
          />
          <MetricCard
            title="Out of Stock"
            value={stats.outOfStockProducts}
            icon={<XCircle className="h-4 w-4" />}
            description="Requires restocking"
            isLoading={isLoading}
            className="border-l-4 border-l-red-500"
          />
          <MetricCard
            title="Inventory Value"
            value={`₹${stats.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            icon={<IndianRupee className="h-4 w-4" />}
            description="Total stock value"
            isLoading={isLoading}
            className="border-l-4 border-l-green-500"
          />
        </div>
      )}

      {lowStockCount > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have {lowStockCount} product{lowStockCount > 1 ? 's' : ''} running low on stock
          </AlertDescription>
        </Alert>
      )}

      {/* Filters row: search, category filter, view toggle, status tabs */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category filter (from Migration_Data) */}
        {categories.length > 0 && (
          <div className="relative w-full lg:w-auto">
            <Filter className="pointer-events-none absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full lg:w-[200px] h-11 border pl-9 text-left">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* View mode toggle (grid / list) */}
        <div className="flex gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
            className="h-10"
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("list")}
            className="h-10"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
            <TabsList className="bg-muted/50">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="available">Available</TabsTrigger>
              <TabsTrigger value="unavailable">Unavailable</TabsTrigger>
              <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
            </TabsList>
          </Tabs>
          {(selectedCategory !== "all" || searchQuery) && (
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {selectedCategory !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  {selectedCategory}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setSelectedCategory("all")}
                  />
                </Badge>
              )}
              {searchQuery && (
                <Badge variant="secondary" className="gap-1">
                  "{searchQuery}"
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setSearchQuery("")}
                  />
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results count */}
      {!isLoading && filteredProducts && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing <strong>{filteredProducts.length}</strong> of{' '}
            <strong>{products?.length || 0}</strong> products
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-96 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filteredProducts && filteredProducts.length > 0 ? (
        <div
          className={cn(
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              : "flex flex-col gap-3"
          )}
        >
          {filteredProducts.map((product: any) => (
            <ProductCard
              key={product.id}
              product={product}
              onDelete={(id) => deleteProduct.mutate(id)}
              onToggleAvailability={
                product.availability_mode === "requirement"
                  ? (id, is_available) => updateProduct.mutate({ id, is_available })
                  : undefined
              }
              variant={viewMode}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchQuery || filterStatus !== "all"
              ? "No products found matching your criteria"
              : "No products yet. Add your first product to get started!"}
          </p>
        </div>
      )}
    </div>
  );
}

