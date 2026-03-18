import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, X, Package, ToggleLeft, Info, Plus, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useProductMutations } from "@/features/vendor/hooks/useProductMutations";
import { useNextSku } from "@/features/vendor/hooks/useNextSku";
import { ConfirmActionDialog } from "@/components/common/ConfirmActionDialog";

const UNIT_OPTIONS = [
  "per piece",
  "per plate",
  "per bowl",
  "per 100g",
  "per kg",
  "per liter",
  "per packet",
  "per serving",
] as const;

const GST_RATE_OPTIONS = [0, 5, 12, 18, 28] as const;
const DIETARY_TAG_OPTIONS = [
  { value: "veg", label: "Veg" },
  { value: "non_veg", label: "Non-Veg" },
  { value: "egg", label: "Egg" },
  { value: "vegan", label: "Vegan" },
  { value: "gluten_free", label: "Gluten-Free" },
] as const;

const variantSchema = z.object({
  name: z.string().max(60),
  price: z.coerce.number().min(0, "Variant price must be non-negative"),
});

const addonSchema = z.object({
  name: z.string().max(60),
  price: z.coerce.number().min(0, "Add-on price must be non-negative"),
});

const productSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  price: z.coerce.number().min(0, "Price must be positive"),
  availability_mode: z.enum(["quantity", "requirement"]).default("quantity"),
  stock_quantity: z.coerce.number().int().min(0, "Stock must be non-negative"),
  daily_quantity: z.coerce.number().int().min(0).optional().nullable(),
  low_stock_threshold: z.coerce.number().int().min(0).optional(),
  category: z.string().max(50).optional(),
  subcategory: z.string().max(50).optional(),
  tags: z.string().max(200).optional(),
  dietary_tags: z.array(z.enum(["veg", "non_veg", "egg", "vegan", "gluten_free"])).optional().default([]),
  diet_type: z.enum(["veg", "non_veg"]).optional(),
  preparation_time_minutes: z.preprocess(
    (v) => (v === "" || v == null ? 15 : Number(v)),
    z.number().int().min(1, "1–120 min").max(120)
  ).default(15),
  is_available: z.boolean(),
  sku: z.string().max(50).optional(),
  unit_of_measure: z.string().max(30).optional(),
  allergens: z.string().max(200).optional(),
  ingredients: z.string().max(500).optional(),
  internal_notes: z.string().max(500).optional(),
  min_order_quantity: z.coerce.number().int().min(1).optional().default(1),
  promo_price: z.coerce.number().min(0).optional().nullable(),
  promo_valid_until: z.string().optional().nullable(),
  coupon_applicable: z.boolean().default(true),
  spicy_level: z.enum(["mild", "medium", "spicy"]).optional().nullable(),
  gst_rate: z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z.number().min(0).max(100).nullable().optional()
  ),
  packaging_charge: z.coerce.number().min(0).optional().nullable(),
  handling_charge: z.coerce.number().min(0).optional().nullable(),
  variants: z.array(variantSchema).optional().default([]),
  addons: z.array(addonSchema).optional().default([]),
  available_from: z.string().optional().nullable(),
  available_until: z.string().optional().nullable(),
  is_bestseller: z.boolean().default(false),
  is_recommended: z.boolean().default(false),
}).superRefine((data, ctx) => {
  if (data.availability_mode === "quantity") {
    if ((data.daily_quantity ?? 0) < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Daily quantity is required (e.g. 100)", path: ["daily_quantity"] });
    }
  }
  if (data.available_from && data.available_until && data.available_from >= data.available_until) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "End time must be later than start time",
      path: ["available_until"],
    });
  }
});

type ProductFormValues = {
  name: string;
  description?: string;
  price: number;
  availability_mode: "quantity" | "requirement";
  stock_quantity: number;
  daily_quantity?: number | null;
  low_stock_threshold?: number;
  category?: string;
  subcategory?: string;
  tags?: string;
  dietary_tags?: Array<"veg" | "non_veg" | "egg" | "vegan" | "gluten_free">;
  diet_type?: "veg" | "non_veg";
  preparation_time_minutes?: number;
  is_available: boolean;
  sku?: string;
  unit_of_measure?: string;
  allergens?: string;
  ingredients?: string;
  internal_notes?: string;
  min_order_quantity?: number;
  promo_price?: number | null;
  promo_valid_until?: string | null;
  coupon_applicable?: boolean;
  spicy_level?: "mild" | "medium" | "spicy" | null;
  gst_rate?: number | null;
  packaging_charge?: number | null;
  handling_charge?: number | null;
  variants?: Array<{ name: string; price: number }>;
  addons?: Array<{ name: string; price: number }>;
  available_from?: string | null;
  available_until?: string | null;
  is_bestseller?: boolean;
  is_recommended?: boolean;
};

interface ProductFormProps {
  defaultValues?: ProductFormValues & { image_url?: string };
  onSubmit: (values: ProductFormValues & { image_url?: string }) => void;
  isLoading?: boolean;
}

export const ProductForm = ({ defaultValues, onSubmit, isLoading }: ProductFormProps) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(defaultValues?.image_url || null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [pendingValues, setPendingValues] = useState<ProductFormValues | null>(null);
  const { uploadImage } = useProductMutations();
  const isNewProduct = !defaultValues;
  const { data: nextSku } = useNextSku(isNewProduct);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: defaultValues ?? {
      name: "",
      description: "",
      price: 0,
      availability_mode: "quantity",
      stock_quantity: 0,
      daily_quantity: 100,
      low_stock_threshold: 10,
      category: "",
      subcategory: "",
      tags: "",
      dietary_tags: [],
      diet_type: "veg",
      preparation_time_minutes: 15,
      is_available: true,
      sku: "",
      unit_of_measure: "per piece",
      allergens: "",
      ingredients: "",
      internal_notes: "",
      min_order_quantity: 1,
      promo_price: null,
      promo_valid_until: null,
      coupon_applicable: true,
      spicy_level: null,
      gst_rate: 5,
      packaging_charge: 0,
      handling_charge: 0,
      variants: [],
      addons: [],
      available_from: null,
      available_until: null,
      is_bestseller: false,
      is_recommended: false,
    },
  });

  const availabilityMode = form.watch("availability_mode") ?? "quantity";

  const dietaryTags = form.watch("dietary_tags") ?? [];
  const variants = form.watch("variants") ?? [];
  const addons = form.watch("addons") ?? [];

  useEffect(() => {
    if (isNewProduct && nextSku) {
      form.setValue("sku", nextSku);
    }
  }, [isNewProduct, nextSku, form]);

  const LabelWithInfo = ({ label, info }: { label: string; info: string }) => (
    <div className="flex items-center gap-1.5">
      <FormLabel>{label}</FormLabel>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            aria-label="More info"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[280px]">
          <p className="text-sm">{info}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleDietaryTag = (tag: "veg" | "non_veg" | "egg" | "vegan" | "gluten_free") => {
    const current = form.getValues("dietary_tags") ?? [];
    if (current.includes(tag)) {
      form.setValue("dietary_tags", current.filter((t) => t !== tag), { shouldValidate: true });
      return;
    }
    form.setValue("dietary_tags", [...current, tag], { shouldValidate: true });
  };

  const addVariant = () => {
    const current = form.getValues("variants") ?? [];
    form.setValue("variants", [...current, { name: "", price: 0 }], { shouldValidate: true });
  };

  const removeVariant = (index: number) => {
    const current = form.getValues("variants") ?? [];
    form.setValue("variants", current.filter((_, i) => i !== index), { shouldValidate: true });
  };

  const updateVariant = (index: number, patch: { name?: string; price?: number }) => {
    const current = form.getValues("variants") ?? [];
    const next = current.map((variant, i) => (i === index ? { ...variant, ...patch } : variant));
    form.setValue("variants", next, { shouldValidate: true });
  };

  const addAddon = () => {
    const current = form.getValues("addons") ?? [];
    form.setValue("addons", [...current, { name: "", price: 0 }], { shouldValidate: true });
  };

  const removeAddon = (index: number) => {
    const current = form.getValues("addons") ?? [];
    form.setValue("addons", current.filter((_, i) => i !== index), { shouldValidate: true });
  };

  const updateAddon = (index: number, patch: { name?: string; price?: number }) => {
    const current = form.getValues("addons") ?? [];
    const next = current.map((addon, i) => (i === index ? { ...addon, ...patch } : addon));
    form.setValue("addons", next, { shouldValidate: true });
  };

  const persistProduct = async (values: ProductFormValues) => {
    let image_url = defaultValues?.image_url;

    if (imageFile) {
      const uploadedUrl = await uploadImage.mutateAsync(imageFile);
      image_url = uploadedUrl;
    }

    const normalizedVariants = (values.variants ?? [])
      .map((variant) => ({ name: variant.name.trim(), price: Number(variant.price ?? 0) }))
      .filter((variant) => variant.name.length > 0);
    const normalizedAddons = (values.addons ?? [])
      .map((addon) => ({ name: addon.name.trim(), price: Number(addon.price ?? 0) }))
      .filter((addon) => addon.name.length > 0);

    const dietaryTagsValue = values.dietary_tags ?? [];
    const dietTypeFromTags =
      dietaryTagsValue.includes("non_veg") || dietaryTagsValue.includes("egg") ? "non_veg" : "veg";

    const payload = {
      ...values,
      variants: normalizedVariants,
      addons: normalizedAddons,
      diet_type: values.diet_type ?? dietTypeFromTags,
      image_url,
    };
    if (values.availability_mode === "requirement") {
      payload.stock_quantity = 0;
      payload.daily_quantity = null;
      payload.low_stock_threshold = undefined;
    }
    onSubmit(payload);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => {
          setPendingValues(values);
          setShowSaveConfirm(true);
        })}
        className="space-y-6 w-full"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_minmax(360px,1fr)] gap-6 w-full min-w-0">
          {/* LEFT: Main / Essential */}
          <div className="space-y-6 min-w-0">
            <div className="rounded-lg border bg-card p-4 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Main</h3>
              {/* Product Image - full row */}
              <div className="w-full">
                <FormLabel>Product Image</FormLabel>
                <div className="mt-2 w-full">
                  {imagePreview ? (
                    <div className="relative w-full aspect-[16/10] max-h-56 rounded-lg overflow-hidden bg-muted">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={() => { setImageFile(null); setImagePreview(null); }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full aspect-[16/10] max-h-56 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Click to upload image</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                    </label>
                  )}
                </div>
              </div>
              {/* Form fields */}
              <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter product name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Short product description" className="w-full min-w-0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price (₹)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <LabelWithInfo label="Category (optional)" info="Cuisine or type (e.g. Fastfood, North Indian)" />
                          <FormControl>
                            <Input placeholder="e.g., Fastfood, North Indian" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="subcategory"
                      render={({ field }) => (
                        <FormItem>
                          <LabelWithInfo label="Subcategory (optional)" info="Refines category (e.g. Category: Main Course, Subcategory: North Indian)" />
                          <FormControl>
                            <Input placeholder="e.g., North Indian" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="dietary_tags"
                    render={() => (
                      <FormItem>
                        <LabelWithInfo label="Dietary Tags" info="Choose one or more: Veg, Non‑Veg, Egg, Vegan, Gluten-Free." />
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {DIETARY_TAG_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => toggleDietaryTag(option.value)}
                              className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                                dietaryTags.includes(option.value)
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border hover:bg-muted"
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <LabelWithInfo label="Tags (optional)" info="Labels/badges (comma-separated)" />
                        <FormControl>
                          <Input placeholder="e.g., Bestseller, All time favorites" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>
            </div>
          </div>

          {/* RIGHT: Availability, Optional (accordions) */}
          <div className="space-y-4 min-w-0">
            <div className="rounded-lg border bg-card p-4 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Availability & Sale</h3>
          <FormField
            control={form.control}
            name="availability_mode"
            render={({ field }) => (
              <FormItem>
                <LabelWithInfo
                  label="Availability Type"
                  info="Quantity = track stock (e.g. 100 plates/day). Requirement = simple in/out toggle (e.g. Thali)."
                />
                <FormControl>
                  <div className="mt-2 flex gap-3">
                    <Button
                      type="button"
                      variant={field.value === "quantity" ? "default" : "outline"}
                      className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
                      onClick={() => field.onChange("quantity")}
                    >
                      <Package className="h-4 w-4" />
                      Quantity-based
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === "requirement" ? "default" : "outline"}
                      className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
                      onClick={() => field.onChange("requirement")}
                    >
                      <ToggleLeft className="h-4 w-4" />
                      Requirement-based
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {availabilityMode === "quantity" && (
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="daily_quantity"
                render={({ field }) => (
                  <FormItem>
                    <LabelWithInfo label="Daily Quantity" info="Max available per day (resets daily)" />
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="100"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stock_quantity"
                render={({ field }) => (
                  <FormItem>
                    <LabelWithInfo label="Current Stock" info="Current quantity available" />
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="low_stock_threshold"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <LabelWithInfo label="Low Stock Alert" info="Alert when stock falls below this value" />
                    <FormControl>
                      <Input type="number" placeholder="10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          <FormField
            control={form.control}
            name="is_available"
            render={({ field }) => (
              <FormItem className={`flex items-center justify-between rounded-lg border p-4 ${
                availabilityMode === "requirement"
                  ? "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20"
                  : ""
              }`}>
                <div className="flex items-center gap-1.5">
                  <FormLabel className="text-base">
                    {availabilityMode === "requirement"
                      ? "In stock / Out of stock"
                      : "Available for Sale"}
                  </FormLabel>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring" aria-label="More info">
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[280px]">
                      <p className="text-sm">
                        {availabilityMode === "requirement"
                          ? "Toggle when this item is available or unavailable. No quantity to track."
                          : "Customers can see and order this product."}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="coupon_applicable"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20 p-4">
                <div className="flex items-center gap-1.5">
                  <FormLabel className="text-base">Coupon / Discount applicable</FormLabel>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring" aria-label="More info">
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[280px]">
                      <p className="text-sm">Can vendor coupons be applied to this item? If No, customer will see it at checkout.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="rounded-lg border p-4 space-y-4">
            <h4 className="text-sm font-semibold">Pricing, Taxes & Charges</h4>
            <FormField
              control={form.control}
              name="gst_rate"
              render={({ field }) => (
                <FormItem>
                  <LabelWithInfo label="GST / Tax Rate" info="Applies GST/tax percentage for this item." />
                  <Select
                    value={field.value == null ? "none" : String(field.value)}
                    onValueChange={(value) => field.onChange(value === "none" ? null : Number(value))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tax rate" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No tax</SelectItem>
                      {GST_RATE_OPTIONS.map((rate) => (
                        <SelectItem key={rate} value={String(rate)}>
                          {rate}% GST
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="packaging_charge"
                render={({ field }) => (
                  <FormItem>
                    <LabelWithInfo label="Packaging Charge (₹)" info="Extra packaging charge per item." />
                    <FormControl>
                      <Input type="number" step="0.01" min={0} placeholder="0.00" {...field} value={field.value ?? 0} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="handling_charge"
                render={({ field }) => (
                  <FormItem>
                    <LabelWithInfo label="Handling Charge (₹)" info="Extra handling charge per item." />
                    <FormControl>
                      <Input type="number" step="0.01" min={0} placeholder="0.00" {...field} value={field.value ?? 0} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-4">
            <h4 className="text-sm font-semibold">Merchandising</h4>
            <FormField
              control={form.control}
              name="is_bestseller"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="text-base">Mark as Bestseller</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_recommended"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="text-base">Mark as Recommended</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
            </div>

            {/* Optional sections - collapsible */}
            <Accordion type="multiple" defaultValue={[]} className="rounded-lg border">
          <AccordionItem value="details">
            <AccordionTrigger className="px-4">Optional details (SKU, Diet, Prep time, etc.)</AccordionTrigger>
            <AccordionContent className="px-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <LabelWithInfo label="SKU / Product Code" info="Auto-generated in sequence (PROD-1, PROD-2…). Released when product is deleted." />
                      <FormControl>
                        <Input
                          placeholder={nextSku ?? "Generating…"}
                          readOnly
                          className="bg-muted"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unit_of_measure"
                  render={({ field }) => (
                    <FormItem>
                      <LabelWithInfo label="Unit of Measure" info="How it's sold" />
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? "per piece"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {UNIT_OPTIONS.map((u) => (
                            <SelectItem key={u} value={u}>
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="diet_type"
                render={({ field }) => (
                  <FormItem>
                    <LabelWithInfo label="Diet type" info="Select whether this item is vegetarian or non‑vegetarian." />
                    <FormControl>
                      <div className="flex gap-3">
                        <Button type="button" variant={field.value === "veg" || !field.value ? "default" : "outline"} className="gap-2 rounded-full px-4 py-2 text-sm" onClick={() => field.onChange("veg")}>
                          <span className="h-3 w-3 rounded-full border border-green-600 flex items-center justify-center"><span className="h-2 w-2 rounded-full bg-green-600" /></span>
                          Veg
                        </Button>
                        <Button type="button" variant={field.value === "non_veg" ? "default" : "outline"} className="gap-2 rounded-full px-4 py-2 text-sm" onClick={() => field.onChange("non_veg")}>
                          <span className="h-3 w-3 rounded-full border border-red-600 flex items-center justify-center"><span className="h-2 w-2 rounded-full bg-red-600" /></span>
                          Non‑veg
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="preparation_time_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <LabelWithInfo label="Preparation Time (minutes)" info="Estimated time to prepare (1–120 min). Used for order timers." />
                      <FormControl>
                        <Input type="number" min={1} max={120} placeholder="15" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="min_order_quantity"
                  render={({ field }) => (
                    <FormItem>
                      <LabelWithInfo label="Min Order Qty" info="Minimum quantity per order" />
                      <FormControl>
                        <Input type="number" min={1} placeholder="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="spicy_level"
                render={({ field }) => (
                  <FormItem>
                    <LabelWithInfo label="Spice level (optional)" info="Helpful indicator for customers." />
                    <Select
                      value={field.value ?? "none"}
                      onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select spice level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Not set</SelectItem>
                        <SelectItem value="mild">Mild</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="spicy">Spicy</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="menu-options">
            <AccordionTrigger className="px-4">Variants, Add-ons & Time-specific menu</AccordionTrigger>
            <AccordionContent className="px-4 space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <LabelWithInfo
                    label="Variants"
                    info="Add size/portion options with separate prices (e.g. Half Plate, Full Plate)."
                  />
                  <Button type="button" size="sm" variant="outline" onClick={addVariant}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Variant
                  </Button>
                </div>
                {variants.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No variants added.</p>
                ) : (
                  <div className="space-y-2">
                    {variants.map((variant, index) => (
                      <div key={`variant-${index}`} className="grid grid-cols-[1fr_130px_auto] gap-2">
                        <Input
                          placeholder="Variant name (e.g. Half Plate)"
                          value={variant.name}
                          onChange={(e) => updateVariant(index, { name: e.target.value })}
                        />
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          placeholder="Price"
                          value={variant.price}
                          onChange={(e) => updateVariant(index, { price: Number(e.target.value) })}
                        />
                        <Button type="button" size="icon" variant="ghost" onClick={() => removeVariant(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <LabelWithInfo
                    label="Add-ons"
                    info='Add optional extras customers can select with checkboxes (e.g. "Extra Cheese +₹20").'
                  />
                  <Button type="button" size="sm" variant="outline" onClick={addAddon}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Add-on
                  </Button>
                </div>
                {addons.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No add-ons added.</p>
                ) : (
                  <div className="space-y-2">
                    {addons.map((addon, index) => (
                      <div key={`addon-${index}`} className="grid grid-cols-[20px_1fr_130px_auto] items-center gap-2">
                        <Checkbox checked disabled aria-label="Customer can select this add-on" />
                        <Input
                          placeholder="Add-on name"
                          value={addon.name}
                          onChange={(e) => updateAddon(index, { name: e.target.value })}
                        />
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          placeholder="Price"
                          value={addon.price}
                          onChange={(e) => updateAddon(index, { price: Number(e.target.value) })}
                        />
                        <Button type="button" size="icon" variant="ghost" onClick={() => removeAddon(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="available_from"
                  render={({ field }) => (
                    <FormItem>
                      <LabelWithInfo label="Visible From (optional)" info="Start time to show this item to customers." />
                      <FormControl>
                        <Input type="time" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="available_until"
                  render={({ field }) => (
                    <FormItem>
                      <LabelWithInfo label="Visible Until (optional)" info="End time to hide this item from customers." />
                      <FormControl>
                        <Input type="time" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="variants"
                render={() => (
                  <FormItem>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="addons"
                render={() => (
                  <FormItem>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="allergens">
            <AccordionTrigger className="px-4">Allergens & ingredients (optional)</AccordionTrigger>
            <AccordionContent className="px-4 space-y-4">
              <FormField
                control={form.control}
                name="allergens"
                render={({ field }) => (
                  <FormItem>
                    <LabelWithInfo label="Allergens" info="Comma-separated allergens (e.g. Nuts, Dairy, Gluten)." />
                    <FormControl>
                      <Textarea placeholder="Nuts, Dairy, Gluten" className="min-h-[80px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ingredients"
                render={({ field }) => (
                  <FormItem>
                    <LabelWithInfo label="Ingredients" info="Visible ingredient list shown to customers." />
                    <FormControl>
                      <Textarea placeholder="List ingredients..." className="min-h-[100px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </AccordionContent>
          </AccordionItem>
            </Accordion>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Product"}
        </Button>
      </form>
      <ConfirmActionDialog
        open={showSaveConfirm}
        onOpenChange={setShowSaveConfirm}
        onConfirm={async () => {
          if (!pendingValues) return;
          setShowSaveConfirm(false);
          await persistProduct(pendingValues);
          setPendingValues(null);
        }}
        title="Save changes?"
        description="Do you want to save these product changes?"
        confirmLabel="Yes, save"
        isConfirming={!!isLoading}
      />
    </Form>
  );
};
