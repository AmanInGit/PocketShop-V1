import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, MessageSquare, User, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

interface Feedback {
  id: string;
  order_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  order?: {
    customer_name: string;
  };
}

interface RealtimeFeedbackProps {
  vendorId: string;
}

export function RealtimeFeedback({ vendorId }: RealtimeFeedbackProps) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchInitialFeedback() {
      try {
        const { data, error } = await supabase
          .from('order_feedback')
          .select('*, order:orders(customer_name)')
          .eq('vendor_id', vendorId)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        setFeedbacks(data || []);
      } catch (err) {
        console.error('Error fetching feedback:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchInitialFeedback();

    const channel = supabase
      .channel(`vendor-feedback-${vendorId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_feedback',
          filter: `vendor_id=eq.${vendorId}`,
        },
        async (payload) => {
          // Fetch the full feedback with order details for the new record
          const { data, error } = await supabase
            .from('order_feedback')
            .select('*, order:orders(customer_name)')
            .eq('id', payload.new.id)
            .single();

          if (!error && data) {
            setFeedbacks((prev) => [data, ...prev].slice(0, 20));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vendorId]);

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-xl border border-dashed">
        <div className="flex flex-col items-center gap-2">
          <Clock className="h-8 w-8 animate-pulse text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading feedback...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto pr-2 space-y-4"
        style={{ maxHeight: '450px' }}
      >
        <AnimatePresence initial={false}>
          {feedbacks.length === 0 ? (
            <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No feedback yet.</p>
            </div>
          ) : (
            feedbacks.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="rounded-xl border border-border/50 bg-background/50 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        {item.order?.customer_name || 'Anonymous Customer'}
                      </div>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < item.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </div>
                </div>
                {item.comment && (
                  <p className="mt-3 text-sm text-muted-foreground italic leading-relaxed">
                    "{item.comment}"
                  </p>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
