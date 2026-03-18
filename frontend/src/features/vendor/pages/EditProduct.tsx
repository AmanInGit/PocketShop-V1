/**
 * Edit Product Page (Vendor)
 *
 * Adapted from Migration_Data/src/pages/EditProduct.tsx.
 * Uses the current vendor product hooks and shared ProductForm component
 * to edit an existing product inside the vendor dashboard.
 */

import React from 'react';
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ProductForm } from "@/components/inventory/ProductForm";
import { useProduct } from "@/features/vendor/hooks/useProducts";
import { useProductMutations } from "@/features/vendor/hooks/useProductMutations";
import { ROUTES } from "@/constants/routes";

export default function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: product, isLoading } = useProduct(id);
  const { updateProduct } = useProductMutations();

  const handleSubmit = async (values: any) => {
    await updateProduct.mutateAsync({ id, ...values });
    navigate(ROUTES.VENDOR_DASHBOARD_INVENTORY);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Product not found</p>
        <Button onClick={() => navigate(ROUTES.VENDOR_DASHBOARD_INVENTORY)} className="mt-4">
          Back to Inventory
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in w-full max-w-6xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(ROUTES.VENDOR_DASHBOARD_INVENTORY)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Edit Product</h2>
          <p className="text-muted-foreground">
            Update product information
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm 
            onSubmit={handleSubmit} 
            defaultValues={{
              name: product.name,
              description: product.description ?? "",
              price: Number(product.price),
              availability_mode: product.availability_mode ?? "quantity",
              stock_quantity: product.stock_quantity ?? 0,
              daily_quantity: product.daily_quantity ?? 100,
              low_stock_threshold: product.low_stock_threshold ?? 10,
              category: product.category ?? "",
              subcategory: product.subcategory ?? "",
              tags: product.tags ?? "",
              dietary_tags: product.dietary_tags ?? [],
              sku: product.sku ?? "",
              unit_of_measure: product.unit_of_measure ?? "per piece",
              allergens: product.allergens ?? "",
              ingredients: product.ingredients ?? "",
              internal_notes: product.internal_notes ?? "",
              min_order_quantity: product.min_order_quantity ?? 1,
              promo_price: product.promo_price ?? null,
              promo_valid_until: product.promo_valid_until ?? null,
              coupon_applicable: product.coupon_applicable ?? true,
              gst_rate: product.gst_rate ?? null,
              packaging_charge: product.packaging_charge ?? 0,
              handling_charge: product.handling_charge ?? 0,
              variants: product.variants ?? [],
              addons: product.addons ?? [],
              available_from: product.available_from ?? null,
              available_until: product.available_until ?? null,
              is_bestseller: product.is_bestseller ?? false,
              is_recommended: product.is_recommended ?? false,
              preparation_time_minutes: product.preparation_time_minutes ?? 15,
              spicy_level: product.spicy_level ?? null,
              is_available: product.is_available ?? true,
              image_url: product.image_url,
            }}
            isLoading={updateProduct.isPending} 
          />
        </CardContent>
      </Card>
    </div>
  );
}

