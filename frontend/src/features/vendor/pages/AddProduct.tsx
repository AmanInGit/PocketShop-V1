/**
 * Add Product Page (Vendor)
 *
 * Adapted from Migration_Data/src/pages/AddProduct.tsx.
 * Uses the current vendor product mutations and shared ProductForm
 * component to create a new product inside the vendor dashboard.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProductForm } from "@/components/inventory/ProductForm";
import { useProductMutations } from "@/features/vendor/hooks/useProductMutations";
import { ROUTES } from "@/constants/routes";

export default function AddProduct() {
  const navigate = useNavigate();
  const { createProduct } = useProductMutations();

  const handleSubmit = async (values: any) => {
    try {
      await createProduct.mutateAsync(values);
      navigate(ROUTES.VENDOR_DASHBOARD_INVENTORY);
    } catch (error) {
      // Error toast already handled in mutation; prevent navigation on failure
      console.error('Failed to create product:', error);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in w-full max-w-6xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(ROUTES.VENDOR_DASHBOARD_INVENTORY)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Add New Product</h2>
          <p className="text-muted-foreground">
            Create a new product in your inventory
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm onSubmit={handleSubmit} isLoading={createProduct.isPending} />
        </CardContent>
      </Card>
    </div>
  );
}

