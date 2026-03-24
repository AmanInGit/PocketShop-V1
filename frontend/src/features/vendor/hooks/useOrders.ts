import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useEffect } from 'react';
import { useVendor } from './useVendor';
import { useQueryClient } from '@tanstack/react-query';

export const useOrders = () => {
  const { data: vendor } = useVendor();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['orders', vendor?.id],
    queryFn: async () => {
      if (!vendor?.id) throw new Error('No vendor ID');

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('vendor_id', vendor.id)
        .order('created_at', { ascending: false });

      if (error) {
        // If table doesn't exist, return empty array instead of throwing
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.error('orders table does not exist. Please run database setup SQL files.');
          return [];
        }
        throw error;
      }
      return data || [];
    },
    enabled: !!vendor?.id,
    retry: false, // Don't retry on error
    // Fallback refresh in case realtime events are delayed/dropped.
    refetchInterval: vendor?.id ? 5000 : false,
  });

  // Set up realtime subscription for orders
  useEffect(() => {
    if (!vendor?.id) return;

    const channelName = `orders-changes-${vendor.id}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `vendor_id=eq.${vendor.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['orders', vendor.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vendor?.id, queryClient]);

  return query;
};

