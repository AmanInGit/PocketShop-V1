/**
 * Product Service
 * 
 * Handles all product-related operations
 */

import { supabase } from '@/lib/supabaseClient';

export const getProducts = async (businessId: string) => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('vendor_id', businessId)
    .eq('is_available', true)
    .order('created_at', { ascending: true });
  return { data, error };
};

export const createProduct = async (productData: {
  business_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  preparation_time?: number;
}) => {
  const payload = {
    vendor_id: productData.business_id,
    name: productData.name,
    description: productData.description,
    price: productData.price,
    category: productData.category,
    preparation_time_minutes: productData.preparation_time,
  };
  const { data, error } = await supabase
    .from('products')
    .insert([payload])
    .select()
    .single();
  return { data, error };
};

export const updateProduct = async (id: string, updates: Partial<{
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  is_available: boolean;
  preparation_time: number;
}>) => {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
};

export const subscribeToProducts = (
  businessId: string,
  callback: (payload: any) => void
) => {
  return supabase
    .channel('products')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'products',
        filter: `vendor_id=eq.${businessId}`,
      },
      callback
    )
    .subscribe();
};

