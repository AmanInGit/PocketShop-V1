import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { useVendor } from './useVendor';
import { getVendorId } from '@/features/common/utils/storage';

export const useProductMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: vendor } = useVendor();

  const createProduct = useMutation({
    mutationFn: async (productData: {
      name: string;
      description?: string;
      price: number;
      availability_mode?: "quantity" | "requirement";
      stock_quantity: number;
      daily_quantity?: number | null;
      low_stock_threshold?: number;
      category?: string;
      tags?: string;
      subcategory?: string;
      dietary_tags?: string[];
      sku?: string;
      unit_of_measure?: string;
      allergens?: string;
      ingredients?: string;
      internal_notes?: string;
      min_order_quantity?: number;
      promo_price?: number | null;
      promo_valid_until?: string | null;
      coupon_applicable?: boolean;
      gst_rate?: number | null;
      packaging_charge?: number | null;
      handling_charge?: number | null;
      variants?: Array<{ name: string; price: number }>;
      addons?: Array<{ name: string; price: number }>;
      available_from?: string | null;
      available_until?: string | null;
      is_bestseller?: boolean;
      is_recommended?: boolean;
      image_url?: string;
      preparation_time_minutes?: number;
      spicy_level?: "mild" | "medium" | "spicy" | null;
      is_available: boolean;
    }) => {
      let vendorId = vendor?.id;
      if (!vendorId) {
        vendorId = await getVendorId();
      }
      if (!vendorId) throw new Error('No vendor ID');

      const { data, error } = await supabase
        .from('products')
        .insert([{ ...productData, vendor_id: vendorId }])
        .select()
        .single();

      if (error) throw error;
      return { product: data, vendorId };
    },
    onSuccess: async ({ product, vendorId }) => {
      // Optimistically update cache for immediate feedback
      queryClient.setQueryData<any[]>(['products', vendorId], (old) => {
        if (!old) return product ? [product] : [];
        // Avoid duplicates if cache already contains product
        if (product && !old.some((item) => item.id === product.id)) {
          return [product, ...old];
        }
        return old;
      });

      // Invalidate related queries to ensure data consistency across app
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: ({ queryKey }) => Array.isArray(queryKey) && queryKey[0] === 'products',
        }),
        queryClient.invalidateQueries({
          predicate: ({ queryKey }) => Array.isArray(queryKey) && queryKey[0] === 'public-products',
        }),
      ]).catch(console.error);

      toast({
        title: 'Success',
        description: 'Product created successfully',
      });
    },
    onError: (error: any) => {
      const message =
        error?.code === '42P01'
          ? 'Products table not found in Supabase. Please run the database migrations.'
          : error?.message || 'Failed to create product';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
      console.error('createProduct error:', error);
    },
  });

  const updateProduct = useMutation({
    mutationFn: async ({
      id,
      ...productData
    }: {
      id: string;
      name?: string;
      description?: string;
      price?: number;
      availability_mode?: "quantity" | "requirement";
      stock_quantity?: number;
      daily_quantity?: number | null;
      low_stock_threshold?: number;
      category?: string;
      tags?: string;
      subcategory?: string;
      dietary_tags?: string[];
      sku?: string;
      unit_of_measure?: string;
      allergens?: string;
      ingredients?: string;
      internal_notes?: string;
      min_order_quantity?: number;
      promo_price?: number | null;
      promo_valid_until?: string | null;
      coupon_applicable?: boolean;
      gst_rate?: number | null;
      packaging_charge?: number | null;
      handling_charge?: number | null;
      variants?: Array<{ name: string; price: number }>;
      addons?: Array<{ name: string; price: number }>;
      available_from?: string | null;
      available_until?: string | null;
      is_bestseller?: boolean;
      is_recommended?: boolean;
      image_url?: string;
      preparation_time_minutes?: number;
      spicy_level?: "mild" | "medium" | "spicy" | null;
      is_available?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Success',
        description: 'Product updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update product',
        variant: 'destructive',
      });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Success',
        description: 'Product deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete product',
        variant: 'destructive',
      });
    },
  });

  const uploadImage = useMutation({
    mutationFn: async (file: File) => {
      if (!vendor?.id) throw new Error('No vendor ID');
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${vendor.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      return data.publicUrl;
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload image',
        variant: 'destructive',
      });
    },
  });

  const resetDailyStock = useMutation({
    mutationFn: async (opts?: { silent?: boolean }) => {
      if (!vendor?.id) throw new Error('No vendor ID');
      const { data: quantityProducts, error: fetchError } = await supabase
        .from('products')
        .select('id, daily_quantity')
        .eq('vendor_id', vendor.id)
        .eq('availability_mode', 'quantity')
        .not('daily_quantity', 'is', null);

      if (fetchError) throw fetchError;
      if (!quantityProducts?.length) return { count: 0 };

      for (const p of quantityProducts) {
        const { error } = await supabase
          .from('products')
          .update({ stock_quantity: p.daily_quantity ?? 0 })
          .eq('id', p.id);
        if (error) throw error;
      }
      return { count: quantityProducts.length };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      if (!variables?.silent) {
        toast({
          title: 'Daily stock reset',
          description: data.count > 0 ? `Reset ${data.count} product(s) to daily quantity` : 'No quantity-based products to reset',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset daily stock',
        variant: 'destructive',
      });
    },
  });

  return {
    createProduct,
    updateProduct,
    deleteProduct,
    uploadImage,
    resetDailyStock,
  };
};

