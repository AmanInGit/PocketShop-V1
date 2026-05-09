import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useEffect } from 'react';
import { useVendor } from './useVendor';

export const useProducts = () => {
  const { data: vendor } = useVendor();
  const vendorIds = [vendor?.id, vendor?.user_id].filter(Boolean) as string[];
  const vendorIdKey = vendorIds.join('|');

  const query = useQuery({
    queryKey: ['products', vendor?.id],
    queryFn: async () => {
      if (!vendor?.id) throw new Error('No vendor ID');

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .in('vendor_id', vendorIds)
        .order('created_at', { ascending: false });

      if (error) {
        // If table doesn't exist, return empty array instead of throwing
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.error('products table does not exist. Please run database setup SQL files.');
          return [];
        }
        throw error;
      }
      return data || [];
    },
    enabled: vendorIds.length > 0,
    retry: false, // Don't retry on error
    refetchOnWindowFocus: true, // Refetch when returning to tab so stock stays in sync
  });

  // Set up realtime subscription for products
  useEffect(() => {
    if (vendorIds.length === 0) return;

    const channels = vendorIds.map((id) =>
      supabase
        .channel(`products-changes-${id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'products',
            filter: `vendor_id=eq.${id}`,
          },
          () => {
            query.refetch();
          }
        )
        .subscribe()
    );

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [vendorIdKey, query]);

  return query;
};

export const useProduct = (productId: string | undefined) => {
  const { data: vendor } = useVendor();
  const vendorIds = [vendor?.id, vendor?.user_id].filter(Boolean) as string[];

  return useQuery({
    queryKey: ['product', productId, vendor?.id],
    queryFn: async () => {
      if (!vendor?.id || !productId) throw new Error('No vendor ID or product ID');

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .in('vendor_id', vendorIds)
        .single();

      if (error) {
        // If table doesn't exist, return null instead of throwing
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.error('products table does not exist. Please run database setup SQL files.');
          return null;
        }
        throw error;
      }
      return data;
    },
    enabled: vendorIds.length > 0 && !!productId,
    retry: false, // Don't retry on error
  });
};
