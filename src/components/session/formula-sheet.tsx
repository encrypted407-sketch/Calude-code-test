"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, Loader2 } from "lucide-react";
import { InlineMath } from "react-katex";
import { Button } from "@/components/ui/button";

interface FormulaCard {
  id: string;
  topic: string | null;
  front: string;
  back: string;
}

export function FormulaSheetToggle({ subject }: { subject: string }) {
  const [open, setOpen] = useState(false);
  const [cards, setCards] = useState<FormulaCard[] | null>(null);

  useEffect(() => {
    if (!open || cards) return;
    fetch(`/api/flashcards?subject=${encodeURIComponent(subject)}&category=equation`)
      .then((res) => res.json())
      .then((data) => setCards(data.cards ?? []));
  }, [open, cards, subject]);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <BookOpen className="h-3.5 w-3.5" />
        Formula sheet
      </Button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-foreground/20"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-border bg-surface p-5 shadow-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold">Formula sheet · {subject}</h2>
                <button
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {!cards ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : cards.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No equations saved for {subject} yet.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {cards.map((c) => (
                      <div key={c.id} className="rounded-lg border border-border p-3">
                        {c.topic && (
                          <p className="mb-1 text-xs font-medium text-muted-foreground">
                            {c.topic}
                          </p>
                        )}
                        <div className="text-base">
                          <InlineMath>{c.front}</InlineMath>
                        </div>
                        <p className="mt-1.5 text-xs text-muted-foreground">{c.back}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
