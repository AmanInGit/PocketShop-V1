import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { LazyImage } from "@/components/ui/lazy-image";
import { ShoppingCart, Store, MapPin, Search, X, Plus, Minus, User, LogOut, LogIn, Sun, Moon, Receipt } from "lucide-react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { CartSummary } from "@/components/cart/CartSummary";
import { validateCartItems } from "@/schemas/checkoutSchema";
import type { CheckoutFormData } from "@/schemas/checkoutSchema";
import { ActiveOrdersWidget } from "@/components/storefront/ActiveOrdersWidget";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { formatOfferText, formatOfferShort, findOfferByCodeWithEligibility, type StructuredOffer } from "@/features/storefront/utils/offerUtils";
import { getNextReopeningText } from "@/features/storefront/utils/hoursUtils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/ThemeContext";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useActiveOrders } from "@/features/vendor/hooks/useActiveOrders";
const CUSTOMER_VIEW_AUTH_KEY = 'pocketshop_customer_view_auth';
const LAST_STOREFRONT_PATH_KEY = 'pocketshop_last_storefront_path';

function redirectToCheckout(url: string) {
  try {
    // If storefront is embedded in vendor dashboard preview iframe,
    // do NOT hijack the parent app. Open checkout in a separate tab.
    if (window.top && window.top !== window.self) {
      const popup = window.open(url, '_blank', 'noopener,noreferrer');
      if (!popup) {
        toast.error('Popup blocked. Please allow popups to continue payment.');
      }
      return;
    }
  } catch {
    // Cross-origin frame access can throw; fallback below.
  }

  try {
    window.location.assign(url);
  } catch {
    // Last resort fallback for strict browser contexts.
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

function MenuItemRow({
  product,
  getItemQuantity,
  addToCart,
  removeFromCart,
  toast,
  isDisabled = false,
  onImageClick,
}: {
  product: any;
  getItemQuantity: (id: string) => number;
  addToCart: (id: string, o: { name: string; price: number; image?: string }) => void;
  removeFromCart: (id: string) => void;
  toast: { error: (m: string) => void };
  isDisabled?: boolean;
  onImageClick?: (product: any) => void;
}) {
  const quantity = getItemQuantity(product.id);
  const isRequirementBased = product.availability_mode === "requirement";
  const isOutOfStock = isRequirementBased
    ? !product.is_available
    : (product.stock_quantity !== null && product.stock_quantity <= 0);
  const isLowStock =
    !isRequirementBased &&
    product.stock_quantity !== null &&
    product.stock_quantity > 0 &&
    product.stock_quantity <= (product.low_stock_threshold || 0);
  const maxQuantity = isRequirementBased || product.stock_quantity == null
    ? 999
    : product.stock_quantity;
  const canAddMore = quantity < maxQuantity;

  return (
    <div
      className={`flex items-start justify-between gap-3 border-b border-gray-100 dark:border-slate-700 pb-4 last:border-b-0 transition-all duration-300 ${
        isDisabled ? "opacity-60 pointer-events-none select-none grayscale-[0.5]" : ""
      }`}
    >
      <div className="flex-1 space-y-1 min-w-0">
        <div className="flex items-center gap-2">
          {product.diet_type && (
            <span
              className={`h-3 w-3 rounded-sm border flex items-center justify-center bg-white shrink-0 ${
                product.diet_type === "veg" ? "border-green-600" : "border-red-600"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-[2px] ${
                  product.diet_type === "veg" ? "bg-green-600" : "bg-red-600"
                }`}
              />
            </span>
          )}
          <p className="font-medium text-sm truncate text-foreground">{product.name}</p>
        </div>
        <p className="text-sm font-semibold text-foreground">₹{product.price}</p>
        {product.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
        )}
        {product.spicy_level && (
          <p className="text-[11px] text-orange-600 dark:text-orange-400 font-medium capitalize">
            {product.spicy_level} spicy
          </p>
        )}
        {!isOutOfStock && !isRequirementBased && product.stock_quantity != null && (
          <p className="text-[11px] text-muted-foreground">
            {product.stock_quantity} left
            {isLowStock ? " · Low stock" : ""}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        {product.image_url && (
          <div
            className={`relative h-20 w-24 overflow-hidden rounded-xl bg-muted dark:bg-slate-800 ${onImageClick ? "cursor-pointer" : ""}`}
            onClick={() => onImageClick?.(product)}
            role={onImageClick ? "button" : undefined}
            tabIndex={onImageClick ? 0 : undefined}
            onKeyDown={onImageClick ? (e) => e.key === "Enter" && onImageClick(product) : undefined}
          >
            <LazyImage
              src={product.image_url}
              alt={product.name}
              className={`h-full w-full object-cover ${isDisabled ? "brightness-90" : ""}`}
            />
            {isDisabled && (
              <div className="absolute inset-0 bg-slate-500/20 rounded-xl flex items-center justify-center">
                <span className="rounded-full bg-slate-600/90 text-white text-[10px] font-medium px-2.5 py-1 shadow-sm">
                  Closed
                </span>
              </div>
            )}
          </div>
        )}
        {!product.image_url && (isDisabled || isOutOfStock) ? (
          <Button
            variant="outline"
            className="rounded-full px-5 h-8 text-xs border-slate-300 bg-slate-50 text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400"
            disabled
          >
            {isDisabled ? "Closed" : "Out of Stock"}
          </Button>
        ) : null}
        {product.image_url && (isDisabled || isOutOfStock) ? (
          <div className="rounded-full px-4 h-7 text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600 flex items-center justify-center">
            {isDisabled ? "Closed" : "Out of Stock"}
          </div>
        ) : null}
        {!isDisabled && !isOutOfStock && (quantity > 0 ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-8 w-8"
              onClick={() => removeFromCart(product.id)}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[2.5rem] text-center">{quantity}</span>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-8 w-8"
              disabled={!canAddMore}
              onClick={() => {
                if (canAddMore) {
                  addToCart(product.id, {
                    name: product.name,
                    price: Number(product.price),
                    image: product.image_url || undefined,
                  });
                } else {
                  toast.error(`Maximum available quantity: ${maxQuantity}`);
                }
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            className="rounded-full px-6 h-8 bg-orange-500 hover:bg-orange-600 text-white text-xs"
            onClick={() =>
              addToCart(product.id, {
                name: product.name,
                price: Number(product.price),
                image: product.image_url || undefined,
              })
            }
          >
            ADD
          </Button>
        ))}
      </div>
    </div>
  );
}

function OffersCarousel({
  offers,
  isStoreClosed = false,
}: {
  offers: StructuredOffer[];
  isStoreClosed?: boolean;
}) {
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrentIndex(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  useEffect(() => {
    if (!api || offers.length <= 1) return;
    const t = setInterval(() => {
      const next = (currentIndex + 1) % offers.length;
      api.scrollTo(next);
    }, 5500);
    return () => clearInterval(t);
  }, [api, offers.length, currentIndex]);

  return (
    <div className={`mb-6 transition-opacity duration-300 ${isStoreClosed ? "opacity-70" : ""}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-lg font-bold text-foreground">Deals for you</h3>
          {isStoreClosed && (
            <p className="text-xs text-muted-foreground mt-0.5">Available when we reopen</p>
          )}
        </div>
        {!isMobile && offers.length > 1 && (
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => api?.scrollPrev()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => api?.scrollNext()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      <div className="relative">
        <Carousel
          opts={{ loop: true, align: "start" }}
          setApi={setApi}
          className="w-full"
        >
          <CarouselContent className="-ml-3 md:-ml-5">
            {offers.map((o) => (
              <CarouselItem
                key={o.id}
                className="pl-3 md:pl-5 basis-[90%] sm:basis-[75%] md:basis-[340px] lg:basis-[380px]"
              >
                <div className="flex rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 shadow-sm min-h-[88px] px-5 py-4 md:px-6 md:py-5">
                  <div className="flex items-center gap-4 w-full">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/40">
                      <span className="text-base font-bold text-orange-600 dark:text-orange-400">%</span>
                    </div>
                    <div className="flex-1 min-w-0 py-0.5">
                      <p className="font-semibold text-foreground text-sm leading-tight">
                        {formatOfferShort(o)}
                      </p>
                      {o.promo_code && (
                        <p className="mt-1 text-xs text-muted-foreground uppercase">
                          USE {o.promo_code}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </div>
  );
}

export default function PublicStorefront() {
  const { vendorId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tableSlug = searchParams.get("table");
  const isPickup = searchParams.get("pickup") === "1";
  const {
    cart,
    cartItems,
    addToCart,
    removeFromCart,
    clearCart,
    getTotalItems,
    getItemQuantity,
  } = useCart();

  const [showCheckout, setShowCheckout] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [imagePreviewProduct, setImagePreviewProduct] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [onlyVeg, setOnlyVeg] = useState(false);
  const [isRequestingBill, setIsRequestingBill] = useState(false);
  const [lastBillRequestAt, setLastBillRequestAt] = useState<number | null>(null);
  const { theme, toggleTheme } = useTheme();
  const { activeOrders, addActiveOrder } = useActiveOrders(vendorId);
  const isEmbeddedPreview = useMemo(() => {
    try {
      return window.top !== window.self;
    } catch {
      return true;
    }
  }, []);

  useEffect(() => {
    if (!vendorId) return;
    const storefrontPath = `${window.location.pathname}${window.location.search}`;
    localStorage.setItem(LAST_STOREFRONT_PATH_KEY, storefrontPath);
  }, [vendorId, searchParams]);

  // Check auth status
  const refreshCustomerAuthState = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const customerViewAuth = localStorage.getItem(CUSTOMER_VIEW_AUTH_KEY) === '1';
    if (!session || !customerViewAuth) {
      setIsAuthenticated(false);
      setUserEmail("");
      return;
    }
    const { data: customerProfile } = await supabase
      .from('customer_profiles')
      .select('email')
      .eq('user_id', session.user.id)
      .maybeSingle();
    const isCustomer = !!customerProfile;
    setIsAuthenticated(isCustomer);
    setUserEmail(customerProfile?.email || session.user.email || "");
  }, []);

  useEffect(() => {
    refreshCustomerAuthState();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refreshCustomerAuthState();
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [refreshCustomerAuthState]);

  const handleLogout = async () => {
    try {
      localStorage.setItem(CUSTOMER_VIEW_AUTH_KEY, '0');
      toast.success('Logged out from customer view');
      setIsAuthenticated(false);
      setUserEmail("");
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out');
    }
  };

  // Listen for showCart event from CustomerBottomNav (mobile)
  useEffect(() => {
    const handleShowCart = () => {
      const total = getTotalItems();
      if (total > 0) {
        setShowCheckout(true);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('showCart', handleShowCart);
    return () => window.removeEventListener('showCart', handleShowCart);
  }, []);

  // One-tap cart handoff from non-storefront pages via query param.
  useEffect(() => {
    if (searchParams.get('openCart') !== '1') return;
    const total = getTotalItems();
    if (total > 0) {
      setShowCheckout(true);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    const next = new URLSearchParams(searchParams);
    next.delete('openCart');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, getTotalItems]);

  // Fetch vendor data (with or without is_active so we can show "closed" state)
  const { data: vendor, isLoading: vendorLoading } = useQuery({
    queryKey: ['public-vendor', vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_profiles')
        .select('*')
        .eq('id', vendorId!)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!vendorId,
  });

  const isStoreClosed = !!(vendor && !vendor.is_active);

  // Resolve table slug to table_code for order (when customer scanned table QR)
  const { data: tableRecord } = useQuery({
    queryKey: ['vendor-table', vendorId, tableSlug],
    queryFn: async () => {
      if (!vendorId || !tableSlug) return null;
      const { data, error } = await (supabase as any)
        .from('vendor_tables')
        .select('table_code')
        .eq('vendor_id', vendorId!)
        .eq('table_slug', tableSlug)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!vendorId && !!tableSlug,
  });

  const tableCode = isPickup ? 'PICKUP' : ((tableRecord as { table_code?: string } | null)?.table_code ?? null);
  const paymentModes = ((vendor?.metadata as Record<string, unknown>)?.payment_modes as Record<string, unknown> | undefined) ?? {};
  const allowBillRequest = (paymentModes.allow_bill_request as boolean | undefined) ?? true;
  const allowCallWaiter = (paymentModes.allow_call_waiter as boolean | undefined) ?? false;
  const reopenText = useMemo(() => {
    if (!vendor) return null;
    const wd = vendor.working_days as string[] | undefined;
    const oh = vendor.operational_hours as Record<string, { open: string; close: string }> | undefined;
    return getNextReopeningText(wd, oh);
  }, [vendor]);

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['public-products', vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('vendor_id', vendorId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!vendorId,
  });

  const isProductOutOfStock = (p: { availability_mode?: string; is_available?: boolean; stock_quantity?: number | null }) => {
    const req = p.availability_mode === "requirement";
    return req ? !p.is_available : (p.stock_quantity != null && p.stock_quantity <= 0);
  };

  // Products filtered by search + veg only (for sidebar - keeps all categories visible)
  const productsForSidebar = useMemo(() => {
    if (!products) return [];
    return products.filter((product) => {
      if (onlyVeg) {
        const dt = (product.diet_type ?? "").toString().toLowerCase();
        if (dt && dt !== "veg") return false; // hide only if explicitly non_veg
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          product.name.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query) ||
          product.category?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [products, searchQuery, onlyVeg]);

  // Sidebar: all categories from productsForSidebar; out-of-stock products go into "Out of Stock"
  const sidebarGroups = useMemo(() => {
    const groups = productsForSidebar.reduce<Record<string, any[]>>((acc, product) => {
      const key = isProductOutOfStock(product) ? "Out of Stock" : (product.category || "Recommended");
      if (!acc[key]) acc[key] = [];
      acc[key].push(product);
      return acc;
    }, {});
    return groups;
  }, [productsForSidebar]);

  // Filter products (includes category filter for main content)
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((product) => {
      if (onlyVeg) {
        const dt = (product.diet_type ?? "").toString().toLowerCase();
        if (dt && dt !== "veg") return false; // hide only if explicitly non_veg
      }
      if (selectedCategory !== "all" && product.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          product.name.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query) ||
          product.category?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [products, selectedCategory, searchQuery, onlyVeg]);

  const offers = useMemo((): StructuredOffer[] => {
    const raw = (vendor?.metadata as Record<string, unknown>)?.offers;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((o: unknown) => o && typeof o === 'object' && 'value' in o && 'min_order' in o)
      .map((o: unknown) => ({
        id: (o as { id?: string }).id ?? crypto.randomUUID(),
        type: ((o as { type?: string }).type === 'flat' ? 'flat' : 'percentage') as 'percentage' | 'flat',
        value: Number((o as { value?: number }).value) || 0,
        max_discount: (o as { max_discount?: number }).max_discount != null ? Number((o as { max_discount: number }).max_discount) : undefined,
        min_order: Number((o as { min_order?: number }).min_order) || 0,
        promo_code: String((o as { promo_code?: string }).promo_code ?? '').trim().toUpperCase(),
      }))
      .filter((o) => o.value > 0 && o.promo_code);
  }, [vendor?.metadata]);

  const [appliedPromoCode, setAppliedPromoCode] = useState("");
  const appliedOffer = useMemo(() => {
    if (!appliedPromoCode) return null;
    const cartForEligibility = cartItems.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      price: i.price,
      name: i.name,
    }));
    return findOfferByCodeWithEligibility(
      offers,
      appliedPromoCode,
      cartForEligibility,
      products ?? []
    );
  }, [offers, appliedPromoCode, cartItems, products]);
  const discountAmount = appliedOffer?.discount ?? 0;
  const discountLabel = appliedOffer ? formatOfferText(appliedOffer.offer) : undefined;
  const nonEligibleItemNames = appliedOffer?.nonEligibleItemNames ?? [];

  const productGroups = useMemo(() => {
    const keys = Object.keys(sidebarGroups);
    const sorted = [...keys].sort((a, b) => {
      if (a === "Out of Stock") return 1;
      if (b === "Out of Stock") return -1;
      if (a === "All time favorites") return -1;
      if (b === "All time favorites") return 1;
      return a.localeCompare(b);
    });
    return { groups: sidebarGroups, categoryKeys: sorted };
  }, [sidebarGroups]);

  const handleRequestBill = async () => {
    if (!vendor?.user_id || !vendor?.id || !tableCode || tableCode === 'PICKUP' || isRequestingBill) return;

    const now = Date.now();
    if (lastBillRequestAt && now - lastBillRequestAt < 60_000) {
      toast.info('Bill request already sent. Please wait a minute.');
      return;
    }

    try {
      setIsRequestingBill(true);
      const { error } = await supabase.from('notifications').insert({
        user_id: vendor.user_id,
        vendor_id: vendor.id,
        title: 'Bill requested',
        message: `Table ${tableCode} requested the final bill.`,
        type: 'bill_request',
        is_read: false,
      });
      if (error) throw error;

      setLastBillRequestAt(now);
      toast.success('Bill request sent to restaurant staff.');
    } catch (error) {
      console.error('Failed to request bill:', error);
      toast.error('Failed to send bill request. Please try again.');
    } finally {
      setIsRequestingBill(false);
    }
  };

  const handleCallWaiter = async () => {
    if (!vendor?.user_id || !vendor?.id || !tableCode || tableCode === 'PICKUP' || isRequestingBill) return;

    try {
      setIsRequestingBill(true);
      const { error } = await supabase.from('notifications').insert({
        user_id: vendor.user_id,
        vendor_id: vendor.id,
        title: 'Waiter called',
        message: `Table ${tableCode} requested waiter assistance.`,
        type: 'call_waiter',
        is_read: false,
      });
      if (error) throw error;
      toast.success('Waiter request sent.');
    } catch (error) {
      console.error('Failed to call waiter:', error);
      toast.error('Failed to send waiter request. Please try again.');
    } finally {
      setIsRequestingBill(false);
    }
  };

  const handleCheckout = async (
    customerData: CheckoutFormData,
    paymentMethod: 'card' | 'upi' | 'wallet' | 'cash'
  ) => {
    try {
      if (!vendorId) {
        throw new Error('Storefront not found. Please refresh and try again.');
      }
      if (tableSlug && !isPickup && !tableCode) {
        throw new Error('Table is not ready yet. Please wait a moment and try again.');
      }

      // Get authenticated user if any, then resolve customer_profiles.id
      // orders.customer_id must reference customer_profiles(id), NOT auth.users(id)
      let customerProfileId: string | null = null;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const { data: profile } = await supabase
          .from('customer_profiles')
          .select('id')
          .eq('user_id', session.user.id)
          .maybeSingle();
        customerProfileId = profile?.id ?? null;
      }

      // Validate cart items
      const items = Object.entries(cart).map(([productId, quantity]) => ({
        productId,
        quantity,
      }));

      validateCartItems(items);

      // Discount only when user applied a valid promo code

      // Create order (tries Edge Function first, falls back to direct DB insertion)
      const { createOrder } = await import('@/services/orderService');

      const orderData = await createOrder({
            vendorId,
            items,
            customerName: customerData.name,
            customerPhone: customerData.phone,
            customerEmail: customerData.email || null,
            paymentMethod,
            notes: customerData.notes || null,
            customerId: customerProfileId,
            discountAmount: discountAmount > 0 ? discountAmount : undefined,
            tableCode: tableCode ?? undefined,
            tableSlug: tableSlug ?? undefined,
      }, {
        useEdgeFunction: false, // Queue logic currently lives in direct insert + DB RPC
      });

      if (!orderData.success) {
        console.error('Order creation failed:', orderData.error);
        throw new Error(orderData.error || 'Failed to create order');
      }

      const { order } = orderData;

      if (!order || !order.id) {
        console.error('Order creation returned invalid data:', orderData);
        throw new Error('Order creation failed. Please try again.');
      }

      console.log('Order created successfully, order ID:', order.id);

      // Handle card payment
      if (paymentMethod === 'card') {
        try {
        const { data: sessionData, error: sessionError } = await supabase.functions.invoke(
          'create-checkout-session',
          {
            body: {
              orderId: order.id,
              customerEmail: customerData.email,
              customerName: customerData.name,
              vendorId,
            },
          }
        );

        if (sessionError) {
            console.error('Payment session creation error:', sessionError);
            throw new Error('Failed to create payment session. Please try again.');
        }

        if (sessionData?.url) {
          redirectToCheckout(sessionData.url);
          toast.success("Redirecting to payment...");
          // Keep cart state cleanup only when checkout handoff is successful.
          clearCart();
          setShowCheckout(false);
          } else {
            throw new Error('Payment session URL not received. Please try again.');
          }
        } catch (paymentError: any) {
          console.error('Payment processing error:', paymentError);
          // Do not treat failed card session creation as successful checkout.
          toast.error(paymentError.message || 'Unable to open card payment. Please try again.');
          return;
        }
      } else {
        // For non-card payments (UPI, wallet, cash), navigate to order confirmation
        console.log('Navigating to order confirmation for order:', order.id);
        addActiveOrder({
          orderId: order.id,
          orderNumber: order.orderNumber || order.id,
          vendorId,
          vendorName: vendor?.business_name || 'Store',
          totalAmount: Number(order.totalAmount || 0),
          status: order.status || 'pending',
          createdAt: order.createdAt || new Date().toISOString(),
          paymentMethod: paymentMethod,
          paymentStatus: order.paymentStatus || 'unpaid',
        });
        clearCart();
        setShowCheckout(false);
        toast.success('Order placed successfully!');
        navigate(`/order-confirmation?orderId=${order.id}&vendorId=${vendorId}`);
      }
    } catch (error: any) {
      console.error('Checkout error in handleCheckout:', error);
      // Re-throw with more context
      throw new Error(error.message || error.error || 'Failed to process checkout. Please try again.');
    }
  };

  if (vendorLoading || productsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5] dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Invalid vendor ID - store doesn't exist
  if (!vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5] dark:bg-slate-950">
        <div className="text-center">
          <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Storefront not found</h2>
          <p className="text-muted-foreground">
            This store does not exist or the link may be incorrect
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] dark:bg-slate-950 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
      {/* Header / Hero - LinkedIn-style banner: image if set, else solid color */}
      <header
        className="relative text-white pb-6 shadow-md overflow-hidden"
        style={
          vendor.banner_url
            ? {
                backgroundImage: `url(${vendor.banner_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundColor: '#f97316',
              }
            : {
                backgroundColor:
                  (vendor.metadata as Record<string, unknown>)?.banner_color as string | undefined || '#f97316',
              }
        }
      >
        {vendor.banner_url && (
          <div className="absolute inset-0 bg-black/30" aria-hidden />
        )}
        <div className="relative z-10 max-w-5xl mx-auto px-4 pt-[max(1rem,env(safe-area-inset-top,1rem))]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {vendor.logo_url && (
                <img
                  src={vendor.logo_url}
                  alt={vendor.business_name}
                  className="h-12 w-12 rounded-full object-cover ring-2 ring-white/70"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold leading-tight">{vendor.business_name}</h1>
                {vendor.description && (
                  <p className="text-sm text-white/90">{vendor.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                title={theme === "dark" ? "Light mode" : "Dark mode"}
                className="text-white/90 hover:bg-white/20 hover:text-white"
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      title="Account"
                      className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                    >
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">My Account</p>
                        <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/customer-profile')}>
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                  onClick={() => navigate(`/customer-auth?vendorId=${vendorId}&redirect=/storefront/${vendorId}`)}
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Login
                </Button>
              )}
              {getTotalItems() > 0 && !showCheckout && (
                <Button
                  size="sm"
                  className="relative bg-white text-orange-600 hover:bg-white/90"
                  onClick={() => setShowCheckout(true)}
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Cart
                  <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center">
                    {getTotalItems()}
                  </Badge>
                </Button>
              )}
            </div>
          </div>

          {(tableCode || isPickup) && (
            <div className="mt-2">
              <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white">
                {tableCode === 'PICKUP' || isPickup ? 'Pickup order' : `Table ${tableCode}`}
              </span>
            </div>
          )}
          {vendor.address && (
            <div className="mt-3 flex items-center gap-2 text-sm text-white/90">
              <MapPin className="h-4 w-4" />
              <span>{vendor.address}</span>
            </div>
          )}
        </div>
      </header>

      {/* Closed store banner */}
      {isStoreClosed && (
        <div className="max-w-5xl mx-auto px-4 md:px-6 -mt-4 z-10">
          <div className="rounded-2xl border border-amber-200/80 dark:border-amber-500/30 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/40 px-5 py-4 flex items-center gap-4 shadow-md shadow-amber-200/20 dark:shadow-none">
            <div className="h-12 w-12 rounded-full bg-amber-100/80 dark:bg-amber-900/50 flex items-center justify-center shrink-0 ring-2 ring-amber-200/50 dark:ring-amber-500/30">
              <Clock className="h-6 w-6 text-amber-700 dark:text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-amber-900 dark:text-amber-200 truncate">
                {vendor.business_name} is currently closed
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-300 mt-0.5 font-medium">
                {reopenText ?? "Will reopen during working hours"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 md:px-6 -mt-6 py-10 space-y-6">
        {showCheckout ? (
          <>
            {isEmbeddedPreview && (
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200">
                In vendor preview mode, card payment opens Stripe in a new tab to keep your dashboard session intact.
              </div>
            )}
            <CheckoutForm
              onBack={() => {
                setShowCheckout(false);
                setAppliedPromoCode("");
              }}
              onCheckout={handleCheckout}
              discountAmount={discountAmount}
              discountLabel={discountLabel}
              nonEligibleItemNames={nonEligibleItemNames}
              appliedPromoCode={appliedPromoCode}
              onApplyPromo={setAppliedPromoCode}
              onRemovePromo={() => setAppliedPromoCode("")}
              offers={offers}
              products={products ?? []}
            />
          </>
        ) : (
          <>
            {/* Active Orders Widget */}
            <div className="mb-6">
              <ActiveOrdersWidget vendorId={vendorId!} />
            </div>

            {(allowBillRequest || allowCallWaiter) && tableCode && tableCode !== 'PICKUP' && (
              <div className="mb-6 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">Need staff help?</p>
                    <p className="text-sm text-muted-foreground">Quick requests for Table {tableCode}.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {allowCallWaiter && (
                      <Button
                        onClick={handleCallWaiter}
                        disabled={isRequestingBill}
                        className="gap-2"
                        variant="outline"
                      >
                        {isRequestingBill ? 'Sending...' : 'Call waiter'}
                      </Button>
                    )}
                    {allowBillRequest && (
                      <Button
                        onClick={handleRequestBill}
                        disabled={isRequestingBill}
                        className="gap-2"
                        variant="outline"
                      >
                        <Receipt className="h-4 w-4" />
                        {isRequestingBill ? 'Sending...' : 'Request bill'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Offers carousel - auto-sliding when vendor has offers */}
            {offers.length > 0 && (
              <OffersCarousel offers={offers} isStoreClosed={isStoreClosed} />
            )}

            {/* Search and Filters */}
            <div className="mb-6 space-y-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm dark:shadow-none dark:border dark:border-slate-800 px-4 py-5">
              <div className="relative max-w-xl">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Veg filter only - keep it minimal */}
              <div className="flex flex-wrap gap-2 pt-3">
                <Button
                  type="button"
                  variant={onlyVeg ? "default" : "outline"}
                  className={`h-9 rounded-full px-4 text-sm font-medium flex items-center gap-2 ${
                    onlyVeg ? "bg-green-600 text-white border-transparent" : "border-gray-300 text-gray-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                  onClick={() => setOnlyVeg((v) => !v)}
                >
                  <span className="h-3 w-3 rounded-sm border border-green-600 flex items-center justify-center bg-white">
                    <span className="h-2 w-2 rounded-[2px] bg-green-600" />
                  </span>
                  Veg only
                </Button>
              </div>
            </div>

            {/* Menu: Sidebar (desktop) + Content */}
            {!products || products.length === 0 ? (
              <div className="text-center py-12">
                <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No products available at the moment</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">No products found</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <>
                {/* Desktop: Sidebar + Menu (Swiggy-style) */}
                <div className="hidden md:flex gap-6">
                  <aside className="w-56 shrink-0">
                    <nav className="sticky top-4 space-y-0.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setSelectedCategory("all")}
                        className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                          selectedCategory === "all"
                            ? "bg-orange-500 text-white"
                            : "text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        All ({productsForSidebar.length})
                      </button>
                      {productGroups.categoryKeys.map((category) => {
                        const items = sidebarGroups[category] ?? [];
                        return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => setSelectedCategory(category)}
                          className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                            selectedCategory === category
                              ? "bg-orange-500 text-white"
                              : "text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          {category} ({items.length})
                        </button>
                      );
                      })}
                    </nav>
                  </aside>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`rounded-xl border bg-white dark:bg-slate-900 p-6 shadow-sm transition-colors ${
                        isStoreClosed
                          ? "border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/70"
                          : "border-gray-200 dark:border-slate-700"
                      }`}
                    >
                      <h3 className="text-xl font-bold mb-4 text-foreground">
                        {selectedCategory === "all" ? "All items" : selectedCategory}
                        {isStoreClosed && (
                          <span className="ml-2 text-sm font-normal text-muted-foreground">
                            (view only)
                          </span>
                        )}
                      </h3>
                      <div className="space-y-4">
                        {(selectedCategory === "all"
                          ? productsForSidebar
                          : (sidebarGroups[selectedCategory] ?? [])
                        ).map((product) => (
                          <MenuItemRow
                            key={product.id}
                            product={product}
                            getItemQuantity={getItemQuantity}
                            addToCart={addToCart}
                            removeFromCart={removeFromCart}
                            toast={toast}
                            isDisabled={isStoreClosed}
                            onImageClick={setImagePreviewProduct}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile: Accordion */}
                <div className={`md:hidden ${isStoreClosed ? "opacity-95" : ""}`}>
                  <Accordion
                    type="multiple"
                    defaultValue={productGroups.categoryKeys}
                    className="space-y-2"
                  >
                    {productGroups.categoryKeys.map((category) => {
                      const items = productGroups.groups[category] ?? [];
                      return (
                      <AccordionItem key={category} value={category} className="border-b border-gray-100 dark:border-slate-700 last:border-0">
                        <AccordionTrigger className="text-base font-semibold px-0 text-foreground hover:no-underline hover:text-foreground">
                          <div className="flex items-center justify-between w-full">
                            <span>{category}</span>
                            <span className="text-xs text-muted-foreground dark:text-slate-400">{items.length} items</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 px-0">
                          {items.map((product) => (
                            <MenuItemRow
                              key={product.id}
                              product={product}
                              getItemQuantity={getItemQuantity}
                              addToCart={addToCart}
                              removeFromCart={removeFromCart}
                              toast={toast}
                              isDisabled={isStoreClosed}
                              onImageClick={setImagePreviewProduct}
                            />
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    );
                    })}
                  </Accordion>
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* Floating Cart Summary */}
      {!showCheckout && (
        <CartSummary
          onCheckout={() => setShowCheckout(true)}
          discountAmount={discountAmount}
          discountLabel={discountLabel}
        />
      )}

      {!showCheckout && activeOrders.length > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-40 md:left-auto md:right-6 md:w-80">
          <button
            type="button"
            onClick={() => navigate(`/order-tracking/${activeOrders[0].orderId}`)}
            className="w-full rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-lg px-4 py-3 text-left"
          >
            <p className="text-sm font-semibold">Track your active order</p>
            <p className="text-xs opacity-90">Order #{activeOrders[0].orderNumber}</p>
          </button>
        </div>
      )}

      {/* Image preview modal */}
      <Dialog open={!!imagePreviewProduct} onOpenChange={(open) => !open && setImagePreviewProduct(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-0 bg-transparent shadow-none">
          {imagePreviewProduct && (
            <div className="rounded-xl overflow-hidden bg-background shadow-xl">
              <div className="aspect-square max-h-[85vh] w-full bg-muted">
                <img
                  src={imagePreviewProduct.image_url}
                  alt={imagePreviewProduct.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="p-4 bg-background">
                <h3 className="text-lg font-semibold">{imagePreviewProduct.name}</h3>
                <p className="text-primary font-bold mt-0.5">₹{Number(imagePreviewProduct.price).toFixed(2)}</p>
                {imagePreviewProduct.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{imagePreviewProduct.description}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

