/**
 * Order feedback – customer view for submitting feedback.
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, ChevronLeft, Loader2 } from 'lucide-react';
import { FeedbackForm } from '@/components/feedback/FeedbackForm';
import { ROUTES } from '@/constants/routes';

interface OrderInfo {
  id: string;
  vendor_id: string;
  vendor?: {
    business_name: string;
  };
}

export default function OrderFeedback() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrder() {
      if (!orderId) return;
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('id, vendor_id, vendor:vendor_profiles(business_name)')
          .eq('id', orderId)
          .single();

        if (error) throw error;
        setOrder(data as any);
      } catch (err) {
        console.error('Error fetching order for feedback:', err);
        setError('Order not found or invalid');
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrder();
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{error || 'Order not found'}</p>
            <Button onClick={() => navigate('/')} className="w-full">
              Back to home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        <FeedbackForm
          orderId={order.id}
          vendorId={order.vendor_id}
          vendorName={order.vendor?.business_name || 'the vendor'}
          onSuccess={() => {
            // After successful feedback, maybe wait a bit then go home
            setTimeout(() => navigate('/'), 2000);
          }}
        />
      </div>
    </div>
  );
}
