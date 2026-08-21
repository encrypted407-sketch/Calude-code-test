"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ChevronLeft, ChevronRight, Type, PenLine, Flag, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MathText } from "@/components/ui/math-text";
import { ProgressBar } from "@/components/ui/progress";
import { DrawingCanvas, type DrawingCanvasHandle } from "@/components/canvas/drawing-canvas";
import { cn } from "@/lib/utils";

interface MockQuestion {
  id: string;
  number: string;
  text: string;
  marksAvailable: number;
  requiresDrawing: boolean;
}

interface Answer {
  text: string;
  image: string | null;
}

interface Result {
  questionId: string;
  number: string;
  marksAwarded: number;
  marksAvailable: number;
  feedback: string;
  improvementPoints: string;
}

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function MockExamSession({
  paperId,
  title,
  durationMins,
  questions,
}: {
  paperId: string;
  title: string;
  durationMins: number;
  questions: MockQuestion[];
}) {
  const router = useRouter();
  const canvasRef = useRef<DrawingCanvasHandle>(null);

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [answerMode, setAnswerMode] = useState<"text" | "drawing">(
    questions[0]?.requiresDrawing ? "drawing" : "text"
  );
  const [secondsLeft, setSecondsLeft] = useState(durationMins * 60);
  const [phase, setPhase] = useState<"exam" | "results">("exam");
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<{
    results: Result[];
    totalAwarded: number;
    totalAvailable: number;
  } | null>(null);
  const finishedRef = useRef(false);

  const question = questions[index];

  const flushCurrent = useCallback(() => {
    const textEl = document.getElementById("mock-answer-text") as HTMLTextAreaElement | null;
    const text = textEl?.value ?? answers[question.id]?.text ?? "";
    const image = canvasRef.current?.exportPng() ?? answers[question.id]?.image ?? null;
    setAnswers((prev) => ({ ...prev, [question.id]: { text, image } }));
    return { text, image };
  }, [answers, question.id]);

  const handleFinish = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    flushCurrent();
    setSubmitting(true);

    // Read the freshest answers synchronously (state update above may not have flushed yet).
    setAnswers((current) => {
      const finalAnswers = current;
      (async () => {
        try {
          const res = await fetch(`/api/mock/${paperId}/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              answers: questions.map((q) => ({
                questionId: q.id,
                studentAnswerText: finalAnswers[q.id]?.text?.trim() || null,
                studentAnswerImageBase64: finalAnswers[q.id]?.image || null,
              })),
            }),
          });
          const data = await res.json();
          if (res.ok) {
            setResults(data);
            setPhase("results");
          }
        } finally {
          setSubmitting(false);
        }
      })();
      return current;
    });
  }, [flushCurrent, paperId, questions]);

  useEffect(() => {
    if (phase !== "exam") return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          handleFinish();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, handleFinish]);

  function goTo(newIndex: number) {
    flushCurrent();
    setIndex(newIndex);
    setAnswerMode(questions[newIndex].requiresDrawing ? "drawing" : "text");
  }

  const answeredCount = useMemo(
    () => questions.filter((q) => answers[q.id]?.text?.trim() || answers[q.id]?.image).length,
    [questions, answers]
  );

  const low = secondsLeft < 5 * 60;

  if (phase === "results" && results) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-semibold">{title} — results</h1>
        <p className="mt-1 text-muted-foreground">
          {results.totalAwarded}/{results.totalAvailable} marks (
          {Math.round((results.totalAwarded / Math.max(1, results.totalAvailable)) * 100)}%)
        </p>
        <div className="mt-6 flex flex-col gap-3">
          {results.results.map((r) => (
            <Card key={r.questionId}>
              <CardContent className="flex flex-col gap-1 pt-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Question {r.number}</span>
                  <span className="text-sm font-semibold">
                    {r.marksAwarded}/{r.marksAvailable}
                  </span>
                </div>
                {r.feedback && <p className="text-sm text-muted-foreground">{r.feedback}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
        <Button className="mt-6" onClick={() => router.push(`/papers/${paperId}`)}>
          Back to paper
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-4 px-4 md:px-8">
        <div className="flex flex-1 items-center gap-3">
          <ProgressBar value={index + 1} max={questions.length} className="max-w-md" />
          <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
            {index + 1} / {questions.length}
          </span>
        </div>
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold",
            low ? "bg-danger/10 text-danger" : "bg-surface-muted text-foreground"
          )}
        >
          <Timer className="h-4 w-4" />
          {formatTime(secondsLeft)}
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 pb-16 md:px-8">
        <div className="w-full max-w-3xl py-6">
          <p className="text-sm font-medium text-muted-foreground">
            Question {question.number} · {question.marksAvailable} mark
            {question.marksAvailable === 1 ? "" : "s"}
          </p>
          <div className="mt-2 text-lg leading-relaxed">
            <MathText text={question.text} />
          </div>

          <div className="mt-6 flex flex-col gap-4">
            <div className="flex gap-1 self-start rounded-lg bg-surface-muted p-1">
              <button
                type="button"
                onClick={() => {
                  if (answerMode === "drawing") {
                    const image = canvasRef.current?.exportPng() ?? null;
                    setAnswers((prev) => ({
                      ...prev,
                      [question.id]: { text: prev[question.id]?.text ?? "", image },
                    }));
                  }
                  setAnswerMode("text");
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  answerMode === "text" ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                <Type className="h-4 w-4" /> Write
              </button>
              <button
                type="button"
                onClick={() => setAnswerMode("drawing")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  answerMode === "drawing"
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                <PenLine className="h-4 w-4" /> Draw
              </button>
            </div>

            {answerMode === "text" ? (
              <Textarea
                id="mock-answer-text"
                key={question.id}
                rows={8}
                defaultValue={answers[question.id]?.text ?? ""}
                placeholder="Write your answer, including working…"
              />
            ) : (
              <DrawingCanvas key={question.id} ref={canvasRef} />
            )}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Button variant="secondary" onClick={() => goTo(index - 1)} disabled={index === 0}>
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              {answeredCount}/{questions.length} answered
            </span>
            {index < questions.length - 1 ? (
              <Button onClick={() => goTo(index + 1)}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Marking…
                  </>
                ) : (
                  <>
                    <Flag className="h-4 w-4" /> Finish exam
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </main>

      <AnimatePresence>
        {submitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Marking your paper…</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
