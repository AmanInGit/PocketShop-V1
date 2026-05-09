import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

const feedbackSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().max(500, 'Comment must be less than 500 characters').optional(),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

interface FeedbackFormProps {
  orderId: string;
  vendorId: string;
  vendorName: string;
  onSuccess: () => void;
}

export function FeedbackForm({ orderId, vendorId, vendorName, onSuccess }: FeedbackFormProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
  });

  const handleRatingClick = (value: number) => {
    setRating(value);
    setValue('rating', value);
  };

  const onSubmit = async (data: FeedbackFormData) => {
    if (!data.rating) {
      toast.error('Please select a rating');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('order_feedback').insert({
        order_id: orderId,
        vendor_id: vendorId,
        rating: data.rating,
        comment: data.comment || null,
      });

      if (error) {
        // Check if feedback already exists
        if (error.code === '23505') {
          toast.error('You have already submitted feedback for this order');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Thank you for your feedback!');
      onSuccess();
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>How was your experience?</CardTitle>
        <p className="text-sm text-muted-foreground">
          Share your feedback about {vendorName}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Star Rating */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleRatingClick(value)}
                  onMouseEnter={() => setHoveredRating(value)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-10 w-10 ${
                      value <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            {errors.rating && (
              <p className="text-sm text-destructive">{errors.rating.message}</p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label htmlFor="comment" className="text-sm font-medium">
              Additional Comments (Optional)
            </label>
            <Textarea
              id="comment"
              {...register('comment')}
              placeholder="Tell us more about your experience..."
              rows={4}
              disabled={isSubmitting}
              className={errors.comment ? 'border-destructive' : ''}
            />
            {errors.comment && (
              <p className="text-sm text-destructive">{errors.comment.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isSubmitting || rating === 0}>
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
