"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp } from "lucide-react";

/** A small, tasteful celebratory moment on level-up — not full-screen confetti spam. */
export function LevelUpCelebration({
  level,
  onDone,
}: {
  level: number | null;
  onDone: () => void;
}) {
  useEffect(() => {
    if (level == null) return;
    const timer = setTimeout(onDone, 2400);
    return () => clearTimeout(timer);
  }, [level, onDone]);

  return (
    <AnimatePresence>
      {level != null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/10 backdrop-blur-[2px]"
          onClick={onDone}
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 16, stiffness: 220 }}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface px-10 py-8 shadow-xl"
          >
            <motion.div
              initial={{ rotate: -15, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.1, type: "spring", damping: 10 }}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"
            >
              <TrendingUp className="h-7 w-7" />
            </motion.div>
            <p className="text-sm font-medium text-muted-foreground">Level up</p>
            <p className="text-3xl font-semibold">Level {level}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
