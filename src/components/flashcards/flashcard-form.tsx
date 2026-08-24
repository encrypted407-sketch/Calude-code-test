"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export function FlashcardForm() {
  const router = useRouter();
  const [subject, setSubject] = useState("Mathematics");
  const [examBoard, setExamBoard] = useState("AQA");
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState<"equation" | "definition">("definition");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, examBoard, topic: topic || null, category, front, back }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save card.");
      router.push("/flashcards");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-1 text-2xl font-semibold">Add a flashcard</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        For an equation, write the formula in LaTeX (e.g. <code>v = u + at</code>).
      </p>
      <Card>
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" required value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="examBoard">Exam board</Label>
                <Input
                  id="examBoard"
                  required
                  value={examBoard}
                  onChange={(e) => setExamBoard(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="topic">Topic (optional)</Label>
              <Input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="category">Type</Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as "equation" | "definition")}
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="definition">Definition / key term</option>
                <option value="equation">Equation</option>
              </select>
            </div>
            <div>
              <Label htmlFor="front">Front {category === "equation" ? "(LaTeX)" : ""}</Label>
              <Textarea
                id="front"
                rows={2}
                required
                value={front}
                onChange={(e) => setFront(e.target.value)}
                placeholder={category === "equation" ? "F = ma" : "Term"}
              />
            </div>
            <div>
              <Label htmlFor="back">Back</Label>
              <Textarea
                id="back"
                rows={4}
                required
                value={back}
                onChange={(e) => setBack(e.target.value)}
                placeholder="Explanation, in your own words"
              />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={loading} className="self-start">
              {loading ? "Saving…" : "Save card"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
