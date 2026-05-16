/**
 * ChartContainer
 *
 * Ported from Migration_Data/src/components/analytics/ChartContainer.tsx.
 * Wraps individual analytics charts with a consistent card + header UI.
 */

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";

type ChartContainerProps = {
  title: string;
  description?: string;
  badge?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  isLoading?: boolean;
  onViewFull?: () => void;
  gradient?: string;
  className?: string;
};

export function ChartContainer({
  title,
  description,
  badge,
  icon,
  actions,
  children,
  isLoading,
  onViewFull,
  gradient = "from-background via-background to-background",
  className,
}: ChartContainerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card
        className={cn(
          "group relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br",
          "shadow-[0_45px_80px_-60px_rgba(15,23,42,0.45)] transition-all duration-500 hover:-translate-y-1 hover:border-border/40 hover:shadow-[0_60px_120px_-70px_rgba(15,23,42,0.55)]",
          gradient,
          className,
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_55%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <div className="relative flex h-full flex-col gap-4 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                {icon && (
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/5 text-primary ring-1 ring-inset ring-white/10 dark:bg-primary/10 dark:text-primary-foreground">
                    {icon}
                  </span>
                )}
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    {title}
                  </h3>
                  {description && (
                    <p className="text-sm text-muted-foreground/80">
                      {description}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {badge && (
                <Badge
                  className="rounded-full border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary"
                  variant="outline"
                >
                  {badge}
                </Badge>
              )}
              {actions}
              {onViewFull && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onViewFull}
                  className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-transparent hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                  View full chart
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </motion.button>
              )}
            </div>
          </div>

          <div className="relative">
            {isLoading ? (
              <Skeleton className="h-[280px] w-full rounded-2xl" />
            ) : (
              <div className="w-full rounded-2xl border border-border/40 bg-background/80 p-3 backdrop-blur">
                {children}
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

