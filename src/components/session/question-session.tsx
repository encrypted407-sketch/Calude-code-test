"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, PenLine, Type, RotateCcw, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MathText } from "@/components/ui/math-text";
import { DrawingCanvas, type DrawingCanvasHandle } from "@/components/canvas/drawing-canvas";
import { FormulaSheetToggle } from "@/components/session/formula-sheet";
import { LevelUpCelebration } from "@/components/ui/level-up-celebration";
import { levelForXp } from "@/lib/leveling";
import { cn } from "@/lib/utils";

interface AttemptView {
  id: string;
  attemptNumber: number;
  marksAwarded: number;
  marksAvailable: number;
  feedback: string;
  improvementPoints: string;
  studentAnswerText: string | null;
  studentAnswerImageUrl: string | null;
}

interface QuestionView {
  id: string;
  number: string;
  text: string;
  marksAvailable: number;
  topic: string | null;
  requiresDrawing: boolean;
  hasMarkScheme: boolean;
}

export function QuestionSession({
  paperId,
  subject,
  question,
  initialAttempts,
  nextQuestionId,
  finishHref,
}: {
  paperId: string;
  subject: string;
  question: QuestionView;
  initialAttempts: AttemptView[];
  nextQuestionId: string | null;
  finishHref?: string;
}) {
  const router = useRouter();
  const canvasRef = useRef<DrawingCanvasHandle>(null);

  const [attempts, setAttempts] = useState<AttemptView[]>(initialAttempts);
  const [mode, setMode] = useState<"answer" | "result">(
    initialAttempts.length > 0 ? "result" : "answer"
  );
  const [answerMode, setAnswerMode] = useState<"text" | "drawing">(
    question.requiresDrawing ? "drawing" : "text"
  );
  const [answerText, setAnswerText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastXp, setLastXp] = useState<number | null>(null);
  const [levelUpTo, setLevelUpTo] = useState<number | null>(null);

  const latest = attempts[attempts.length - 1] ?? null;
  const previous = attempts.length > 1 ? attempts[attempts.length - 2] : null;

  async function handleSubmit() {
    setError(null);
    const imageBase64 = answerMode === "drawing" ? canvasRef.current?.exportPng() ?? null : null;

    if (!answerText.trim() && !imageBase64) {
      setError("Write an answer or draw one before submitting.");
      return;
    }
    if (!question.hasMarkScheme) {
      setError("This question doesn't have a mark scheme yet, so it can't be marked.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          studentAnswerText: answerText.trim() || null,
          studentAnswerImageBase64: imageBase64,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Marking failed.");

      setAttempts((prev) => [
        ...prev,
        {
          id: data.attempt.id,
          attemptNumber: data.attempt.attemptNumber,
          marksAwarded: data.attempt.marksAwarded,
          marksAvailable: data.attempt.marksAvailable,
          feedback: data.attempt.feedback,
          improvementPoints: data.attempt.improvementPoints,
          studentAnswerText: data.attempt.studentAnswerText,
          studentAnswerImageUrl: data.attempt.studentAnswerImageUrl,
        },
      ]);
      setLastXp(data.xpEarned);
      const previousLevel = levelForXp(data.totalXp - data.xpEarned).level;
      const newLevel = levelForXp(data.totalXp).level;
      if (newLevel > previousLevel) setLevelUpTo(newLevel);
      setMode("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  function tryAgain() {
    setAnswerText("");
    canvasRef.current?.clear();
    setMode("answer");
    setError(null);
  }

  function goNext() {
    if (nextQuestionId) {
      router.push(`/session/${paperId}/${nextQuestionId}`);
    } else {
      router.push(finishHref ?? `/papers/${paperId}`);
    }
  }

  return (
    <div className="flex flex-col gap-6 py-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-10">
      <LevelUpCelebration level={levelUpTo} onDone={() => setLevelUpTo(null)} />
      <div className="lg:sticky lg:top-6">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">
            Question {question.number}
            {question.topic ? ` · ${question.topic}` : ""} · {question.marksAvailable} mark
            {question.marksAvailable === 1 ? "" : "s"}
          </p>
          <FormulaSheetToggle subject={subject} />
        </div>
        <div className="mt-2 text-lg leading-relaxed">
          <MathText text={question.text} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {mode === "answer" ? (
          <motion.div
            key="answer"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col gap-4"
          >
            <div className="flex gap-1 self-start rounded-lg bg-surface-muted p-1">
              <ModeButton
                active={answerMode === "text"}
                onClick={() => setAnswerMode("text")}
                icon={<Type className="h-4 w-4" />}
                label="Write"
              />
              <ModeButton
                active={answerMode === "drawing"}
                onClick={() => setAnswerMode("drawing")}
                icon={<PenLine className="h-4 w-4" />}
                label="Draw"
              />
            </div>

            {answerMode === "text" ? (
              <Textarea
                rows={8}
                autoFocus
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="Write your answer, including working…"
              />
            ) : (
              <DrawingCanvas ref={canvasRef} />
            )}

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button size="lg" onClick={handleSubmit} disabled={submitting} className="self-start">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Marking…
                </>
              ) : (
                "Submit for marking"
              )}
            </Button>
          </motion.div>
        ) : (
          latest && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex flex-col gap-4"
            >
              <Card>
                <CardContent className="flex flex-col gap-4 pt-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-semibold">
                        {latest.marksAwarded}
                        <span className="text-lg text-muted-foreground">
                          /{latest.marksAvailable}
                        </span>
                      </span>
                      {previous && (
                        <span
                          className={cn(
                            "text-sm font-medium",
                            latest.marksAwarded > previous.marksAwarded
                              ? "text-success"
                              : "text-muted-foreground"
                          )}
                        >
                          {latest.marksAwarded > previous.marksAwarded ? "+" : ""}
                          {latest.marksAwarded - previous.marksAwarded} vs. attempt{" "}
                          {previous.attemptNumber}
                        </span>
                      )}
                    </div>
                    {lastXp != null && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
                      >
                        <Sparkles className="h-3.5 w-3.5" />+{lastXp} XP
                      </motion.span>
                    )}
                  </div>

                  <div>
                    <h4 className="mb-1 text-sm font-semibold">Feedback</h4>
                    <p className="whitespace-pre-wrap text-sm text-foreground/90">
                      {latest.feedback}
                    </p>
                  </div>
                  <div>
                    <h4 className="mb-1 text-sm font-semibold">To improve</h4>
                    <p className="whitespace-pre-wrap text-sm text-foreground/90">
                      {latest.improvementPoints}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {previous && (
                <Card className="border-dashed">
                  <CardContent className="pt-5">
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Attempt {previous.attemptNumber}: {previous.marksAwarded}/
                      {previous.marksAvailable}
                    </p>
                    <p className="text-xs text-muted-foreground">{previous.feedback}</p>
                  </CardContent>
                </Card>
              )}

              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={tryAgain}>
                  <RotateCcw className="h-4 w-4" />
                  Try again with this in mind
                </Button>
                <Button onClick={goNext}>
                  {nextQuestionId ? "Next question" : "Finish paper"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
