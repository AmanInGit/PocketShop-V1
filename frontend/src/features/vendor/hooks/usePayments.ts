import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useVendor } from './useVendor';

export const usePayments = () => {
  const { data: vendor } = useVendor();

  return useQuery({
    queryKey: ['payments', vendor?.id],
    queryFn: async () => {
      if (!vendor?.id) throw new Error('No vendor ID');

      // First get all order IDs for this vendor
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .eq('vendor_id', vendor.id);

      if (ordersError) {
        // If table doesn't exist, return empty array instead of throwing
        if (ordersError.code === '42P01' || ordersError.message?.includes('does not exist')) {
          console.error('orders table does not exist. Please run database setup SQL files.');
          return [];
        }
        throw ordersError;
      }

      const orderIds = orders?.map(o => o.id) || [];

      if (orderIds.length === 0) return [];

      // Then get payments for those orders
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          orders (
            id,
            order_number,
            customer_name,
            created_at,
            status
          )
        `)
        .in('order_id', orderIds)
        .order('created_at', { ascending: false });

      if (error) {
        // If table doesn't exist, return empty array instead of throwing
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.error('payments table does not exist. Please run database setup SQL files.');
          return [];
        }
        throw error;
      }
      return data || [];
    },
    enabled: !!vendor?.id,
    retry: false, // Don't retry on error
  });
};

export const usePaymentStats = () => {
  const { data: vendor } = useVendor();

  return useQuery({
    queryKey: ['payment-stats', vendor?.id],
    queryFn: async () => {
      if (!vendor?.id) throw new Error('No vendor ID');

      const { data: payments, error } = await supabase
        .from('payments')
        .select('amount, payment_status, created_at, orders!inner(vendor_id, status)')
        .eq('orders.vendor_id', vendor.id);

      if (error) {
        // If table doesn't exist, return empty stats instead of throwing
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.error('payments table does not exist. Please run database setup SQL files.');
          return {
            totalRevenue: 0,
            pendingPayouts: 0,
            thisMonth: 0,
          };
        }
        throw error;
      }

      const totalRevenue = (payments || [])
        .filter(
          (p: any) =>
            p.payment_status === 'completed' &&
            p.orders?.status !== 'cancelled'
        )
        .reduce((sum, p) => sum + Number(p.amount), 0);

      // Exclude cancelled orders - they will never be paid
      const pendingPayouts = (payments || [])
        .filter(
          (p: any) =>
            p.payment_status === 'pending' &&
            p.orders?.status !== 'cancelled'
        )
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const thisMonth = (payments || [])
        .filter((p: any) => {
          const date = new Date(p.created_at);
          const now = new Date();
          return date.getMonth() === now.getMonth() && 
                 date.getFullYear() === now.getFullYear() &&
                 p.payment_status === 'completed' &&
                 p.orders?.status !== 'cancelled';
        })
        .reduce((sum, p) => sum + Number(p.amount), 0);

      return {
        totalRevenue,
        pendingPayouts,
        thisMonth,
      };
    },
    enabled: !!vendor?.id,
    retry: false, // Don't retry on error
  });
};
