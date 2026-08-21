"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, PartyPopper } from "lucide-react";
import { InlineMath } from "react-katex";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FocusShell } from "@/components/shell/focus-shell";
import { cn } from "@/lib/utils";
import type { Sm2Rating } from "@/lib/sm2";

interface DueCard {
  id: string;
  subject: string;
  examBoard: string;
  topic: string | null;
  category: string;
  front: string;
  back: string;
}

const RATINGS: { key: Sm2Rating; label: string; className: string }[] = [
  { key: "again", label: "Again", className: "bg-danger/10 text-danger hover:bg-danger/20" },
  { key: "hard", label: "Hard", className: "bg-warning/10 text-warning hover:bg-warning/20" },
  { key: "good", label: "Good", className: "bg-success/10 text-success hover:bg-success/20" },
  { key: "easy", label: "Easy", className: "bg-primary/10 text-primary hover:bg-primary/20" },
];

export function FlashcardReview() {
  const [cards, setCards] = useState<DueCard[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/flashcards/due")
      .then((res) => res.json())
      .then((data) => setCards(data.due ?? []));
  }, []);

  async function rate(rating: Sm2Rating) {
    if (!cards) return;
    const card = cards[index];
    setSubmitting(true);
    try {
      await fetch("/api/flashcards/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flashcardId: card.id, rating }),
      });
    } finally {
      setSubmitting(false);
      setFlipped(false);
      setIndex((i) => i + 1);
    }
  }

  if (!cards) {
    return (
      <FocusShell exitHref="/flashcards">
        <div className="flex justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </FocusShell>
    );
  }

  if (cards.length === 0 || index >= cards.length) {
    return (
      <FocusShell exitHref="/flashcards">
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <PartyPopper className="h-10 w-10 text-primary" />
          <h1 className="text-xl font-semibold">
            {cards.length === 0 ? "Nothing due right now" : "Review complete"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {cards.length === 0
              ? "Check back later, or add your own cards."
              : `You reviewed ${cards.length} card${cards.length === 1 ? "" : "s"}.`}
          </p>
          <a href="/flashcards">
            <Button className="mt-2">Back to flashcards</Button>
          </a>
        </div>
      </FocusShell>
    );
  }

  const card = cards[index];

  return (
    <FocusShell current={index + 1} total={cards.length} exitHref="/flashcards">
      <div className="flex flex-col items-center gap-6 py-10">
        <p className="text-sm text-muted-foreground">
          {card.subject}
          {card.topic ? ` · ${card.topic}` : ""}
        </p>

        <div className="w-full" style={{ perspective: 1200 }}>
          <motion.div
            role="button"
            tabIndex={0}
            onClick={() => setFlipped((f) => !f)}
            onKeyDown={(e) => e.key === "Enter" && setFlipped((f) => !f)}
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.4 }}
            style={{ transformStyle: "preserve-3d" }}
            className="relative mx-auto h-64 w-full max-w-xl cursor-pointer"
          >
            <Card
              className="absolute inset-0 flex items-center justify-center p-6 text-center"
              style={{ backfaceVisibility: "hidden" }}
            >
              <CardContent className="flex items-center justify-center text-xl font-medium">
                {card.category === "equation" ? <InlineMath>{card.front}</InlineMath> : card.front}
              </CardContent>
            </Card>
            <Card
              className="absolute inset-0 flex items-center justify-center overflow-y-auto p-6 text-center"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <CardContent className="whitespace-pre-wrap text-base leading-relaxed">
                {card.back}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <p className="text-xs text-muted-foreground">
          {flipped ? "How well did you know it?" : "Tap the card to reveal the answer"}
        </p>

        <AnimatePresence>
          {flipped && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid w-full max-w-xl grid-cols-4 gap-2"
            >
              {RATINGS.map((r) => (
                <button
                  key={r.key}
                  disabled={submitting}
                  onClick={() => rate(r.key)}
                  className={cn(
                    "rounded-lg px-3 py-3 text-sm font-medium transition-colors disabled:opacity-50",
                    r.className
                  )}
                >
                  {r.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </FocusShell>
  );
}
