"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GeneratePracticeButton({ hasWeakTopics }: { hasWeakTopics: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/requiz/generate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't generate practice questions.");
      if (data.created.length === 0) {
        setMessage(
          data.skipped.length > 0
            ? "You already have practice queued for your weakest topics."
            : "Answer a few more questions first so there's something to build practice from."
        );
      } else {
        router.refresh();
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button onClick={generate} disabled={loading || !hasWeakTopics} variant="secondary">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Generating…
          </>
        ) : (
          <>
            <Wand2 className="h-4 w-4" />
            Generate practice for weak topics
          </>
        )}
      </Button>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
