import { Check, Clock, ChefHat, Package, CheckCircle } from 'lucide-react';

interface OrderStatusTrackerProps {
  currentStatus: 'pending' | 'processing' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  pendingLabel?: string;
}

const statusSteps = [
  { key: 'pending', label: 'Order Placed', icon: Clock },
  { key: 'processing', label: 'Preparing', icon: ChefHat },
  { key: 'ready', label: 'Ready', icon: Package },
  { key: 'completed', label: 'Completed', icon: CheckCircle },
];

const statusOrder = ['pending', 'processing', 'ready', 'completed'];

export function OrderStatusTracker({
  currentStatus,
  pendingLabel = 'Order Placed',
}: OrderStatusTrackerProps) {
  const normalizedStatus = currentStatus === 'preparing' ? 'processing' : currentStatus;
  const currentIndex = statusOrder.indexOf(normalizedStatus);
  const isCancelled = currentStatus === 'cancelled';
  const displaySteps = statusSteps.map((step) =>
    step.key === 'pending' ? { ...step, label: pendingLabel } : step,
  );

  return (
    <div className="w-full">
      {isCancelled ? (
        <div className="text-center p-6 bg-amber-500/10 rounded-lg border border-amber-500/20">
          <p className="text-amber-700 dark:text-amber-400 font-semibold text-lg">Unable to deliver</p>
          <p className="text-sm text-muted-foreground mt-2">
            The vendor was unable to fulfill this order. Please contact them for more details.
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Progress Line */}
          <div className="absolute top-8 left-0 right-0 h-1 bg-muted">
            <div
              className="h-full bg-primary transition-all duration-500 ease-in-out"
              style={{
                width: `${(currentIndex / (statusSteps.length - 1)) * 100}%`,
              }}
            />
          </div>

          {/* Status Steps */}
          <div className="relative flex justify-between">
            {displaySteps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index <= currentIndex;
              const isCurrent = step.key === normalizedStatus;

              return (
                <div key={step.key} className="flex flex-col items-center gap-2 flex-1">
                  <div
                    className={`
                      relative z-10 w-16 h-16 rounded-full flex items-center justify-center
                      transition-all duration-300 ease-in-out
                      ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-lg scale-110'
                          : 'bg-muted text-muted-foreground'
                      }
                      ${isCurrent ? 'ring-4 ring-primary/30 animate-pulse' : ''}
                    `}
                  >
                    {isActive && index < currentIndex ? (
                      <Check className="h-8 w-8" />
                    ) : (
                      <Icon className="h-8 w-8" />
                    )}
                  </div>
                  <div className="text-center">
                    <p
                      className={`
                        text-sm font-medium transition-colors duration-300
                        ${isActive ? 'text-foreground' : 'text-muted-foreground'}
                      `}
                    >
                      {step.label}
                    </p>
                    {isCurrent && (
                      <p className="text-xs text-primary font-semibold mt-1">Current</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
