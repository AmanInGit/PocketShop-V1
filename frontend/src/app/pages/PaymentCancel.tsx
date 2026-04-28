import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';
import { ROUTES } from '@/constants/routes';

export default function PaymentCancel() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const orderId = params.get('orderId');

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-6 w-6 text-amber-600" />
            Payment cancelled
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Your card payment was cancelled or did not complete. No paid confirmation was received.
          </p>
          <div className="flex flex-col gap-2">
            {orderId && (
              <Button onClick={() => navigate(`/order-tracking/${orderId}`)}>
                Check this order
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate(ROUTES.SHOPS)}>
              Try checkout again
            </Button>
            <Button variant="ghost" onClick={() => navigate(ROUTES.HOME)}>
              Back to home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
