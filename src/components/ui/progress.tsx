"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  max = 100,
  className,
  barClassName,
}: {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-muted", className)}>
      <motion.div
        className={cn("h-full rounded-full bg-primary", barClassName)}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
    </div>
  );
}
