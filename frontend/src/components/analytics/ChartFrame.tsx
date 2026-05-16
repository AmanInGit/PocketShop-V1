import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ChartFrameProps = {
  children: ReactNode;
  height?: number;
  className?: string;
};

export function ChartFrame({ children, height = 280, className }: ChartFrameProps) {
  return (
    <div className={cn("w-full shrink-0", className)} style={{ height }}>
      {children}
    </div>
  );
}
