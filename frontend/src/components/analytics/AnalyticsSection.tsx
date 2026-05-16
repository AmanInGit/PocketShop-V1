import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type AnalyticsSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function AnalyticsSection({
  title,
  description,
  children,
  className,
}: AnalyticsSectionProps) {
  return (
    <section className={cn("space-y-5", className)}>
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className="flex flex-col gap-1 border-l-2 border-primary/50 pl-4"
      >
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </motion.div>
      {children}
    </section>
  );
}
