import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useEffect } from 'react';
import { useVendor } from './useVendor';
import { useQueryClient } from '@tanstack/react-query';

export const useOrders = () => {
  const { data: vendor } = useVendor();
  const queryClient = useQueryClient();
  const vendorIds = [vendor?.id, vendor?.user_id].filter(Boolean) as string[];
  const vendorIdKey = vendorIds.join('|');

  const query = useQuery({
    queryKey: ['orders', vendor?.id],
    queryFn: async () => {
      if (!vendor?.id) throw new Error('No vendor ID');

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .in('vendor_id', vendorIds)
        .order('created_at', { ascending: false });

      if (error) {
        // If table doesn't exist, return empty array instead of throwing
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.error('orders table does not exist. Please run database setup SQL files.');
          return [];
        }
        throw error;
      }
      // Webhook-first rule for card payments:
      // do not show unpaid card orders in vendor operational queues.
      return (data || []).filter((row: any) => {
        const method = String(row?.payment_method || '').toLowerCase();
        const paymentStatus = String(row?.payment_status || '').toLowerCase();
        const isCard = method === 'card';
        const isUnknownMethod = !row?.payment_method;
        const isPaidLike = paymentStatus === 'paid' || paymentStatus === 'completed';
        // Keep unpaid online/unknown orders out of vendor operational queues.
        if ((isCard || isUnknownMethod) && !isPaidLike) return false;
        return true;
      });
    },
    enabled: vendorIds.length > 0,
    retry: false, // Don't retry on error
    // Fallback refresh in case realtime events are delayed/dropped.
    refetchInterval: vendorIds.length > 0 ? 5000 : false,
  });

  // Set up realtime subscription for orders
  useEffect(() => {
    if (vendorIds.length === 0) return;

    const channels = vendorIds.map((id) =>
      supabase
        .channel(`orders-changes-${id}-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `vendor_id=eq.${id}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ['orders', vendor?.id] });
          }
        )
        .subscribe()
    );

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [vendorIdKey, vendor?.id, queryClient]);

  return query;
};

