import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { IndianRupee, Loader2 } from "lucide-react";

interface PaymentStatusButtonProps {
  orderId: string;
  paymentStatus: string;
  amount: number;
}

export function PaymentStatusButton({ orderId, paymentStatus, amount }: PaymentStatusButtonProps) {
  const queryClient = useQueryClient();

  const markAsPaidMutation = useMutation({
    mutationFn: async () => {
      const { error: paymentError } = await supabase
        .from('payments')
        .update({ payment_status: 'completed' })
        .eq('order_id', orderId);

      if (paymentError) throw paymentError;

      const { error: orderError } = await supabase
        .from('orders')
        .update({ payment_status: 'paid' })
        .eq('id', orderId);

      if (orderError) throw orderError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-stats'] });
      toast.success('Payment marked as received', {
        description: `₹${amount.toLocaleString()} has been recorded`,
      });
    },
    onError: (error) => {
      console.error('Error marking payment as received:', error);
      toast.error('Failed to update payment status');
    },
  });

  if (paymentStatus === 'completed') {
    return (
      <Button variant="outline" size="sm" disabled className="text-green-600">
        <IndianRupee className="h-4 w-4 mr-2" />
        Payment Received
      </Button>
    );
  }

  return (
    <Button
      variant="default"
      size="sm"
      onClick={() => markAsPaidMutation.mutate()}
      disabled={markAsPaidMutation.isPending}
    >
      {markAsPaidMutation.isPending ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <IndianRupee className="h-4 w-4 mr-2" />
      )}
      Mark as Paid
    </Button>
  );
}
