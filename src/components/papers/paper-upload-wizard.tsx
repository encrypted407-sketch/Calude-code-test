"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Trash2, Plus, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import type { ParsedQuestion } from "@/lib/ai";

const EXAM_BOARDS = ["AQA", "Edexcel", "OCR", "WJEC/Eduqas", "Other"];
const LEVELS = ["AS", "A-Level"];

type Step = "form" | "review";

interface DraftQuestion extends ParsedQuestion {
  _key: string;
}

export function PaperUploadWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [subject, setSubject] = useState("Mathematics");
  const [examBoard, setExamBoard] = useState("AQA");
  const [level, setLevel] = useState("A-Level");
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("");
  const [paperText, setPaperText] = useState("");
  const [paperFile, setPaperFile] = useState<File | null>(null);
  const [markSchemeText, setMarkSchemeText] = useState("");
  const [markSchemeFile, setMarkSchemeFile] = useState<File | null>(null);

  const [rawPaperText, setRawPaperText] = useState("");
  const [rawMarkSchemeText, setRawMarkSchemeText] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);

  async function handleParse(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!paperText.trim() && !paperFile) {
      setError("Paste the question paper text or upload a PDF.");
      return;
    }

    setLoading(true);
    const form = new FormData();
    form.set("subject", subject);
    form.set("examBoard", examBoard);
    form.set("level", level);
    if (paperText.trim()) form.set("paperText", paperText);
    if (paperFile) form.set("paperFile", paperFile);
    if (markSchemeText.trim()) form.set("markSchemeText", markSchemeText);
    if (markSchemeFile) form.set("markSchemeFile", markSchemeFile);

    try {
      const res = await fetch("/api/papers/parse", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse the paper.");

      setRawPaperText(data.paperText);
      setRawMarkSchemeText(data.markSchemeText || "");
      setQuestions(
        (data.questions as ParsedQuestion[]).map((q, i) => ({
          ...q,
          _key: `${i}-${q.number}`,
        }))
      );
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function updateQuestion(key: string, patch: Partial<DraftQuestion>) {
    setQuestions((qs) => qs.map((q) => (q._key === key ? { ...q, ...patch } : q)));
  }

  function removeQuestion(key: string) {
    setQuestions((qs) => qs.filter((q) => q._key !== key));
  }

  function addQuestion() {
    setQuestions((qs) => [
      ...qs,
      {
        _key: `manual-${Date.now()}`,
        number: "",
        text: "",
        marksAvailable: 1,
        topic: "",
        yearRequired: null,
        requiresDrawing: false,
        markSchemeText: "",
      },
    ]);
  }

  async function handleSave() {
    setError(null);
    if (!title.trim()) {
      setError("Give this paper a title.");
      return;
    }
    if (questions.length === 0) {
      setError("Add at least one question.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/papers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          examBoard,
          level,
          title,
          year: year ? Number(year) : null,
          rawText: rawPaperText,
          markSchemeRawText: rawMarkSchemeText || null,
          questions: questions.map((q) => ({
            number: q.number,
            text: q.text,
            marksAvailable: q.marksAvailable,
            topic: q.topic,
            yearRequired: q.yearRequired,
            requiresDrawing: q.requiresDrawing,
            markSchemeText: q.markSchemeText,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save the paper.");
      router.push(`/papers/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <AnimatePresence mode="wait">
        {step === "form" ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <h1 className="mb-1 text-2xl font-semibold">Add a paper</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              Paste the question paper (and mark scheme, if you have it), or upload PDFs.
            </p>
            <form onSubmit={handleParse} className="flex flex-col gap-5">
              <Card>
                <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Mathematics"
                    />
                  </div>
                  <div>
                    <Label htmlFor="title">Paper title</Label>
                    <Input
                      id="title"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Paper 1: Pure Mathematics"
                    />
                  </div>
                  <div>
                    <Label htmlFor="examBoard">Exam board</Label>
                    <select
                      id="examBoard"
                      value={examBoard}
                      onChange={(e) => setExamBoard(e.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {EXAM_BOARDS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="level">Level</Label>
                    <select
                      id="level"
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {LEVELS.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="year">Year (optional)</Label>
                    <Input
                      id="year"
                      type="number"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      placeholder="2023"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex flex-col gap-3 pt-5">
                  <Label htmlFor="paperText">Question paper</Label>
                  <Textarea
                    id="paperText"
                    rows={8}
                    value={paperText}
                    onChange={(e) => setPaperText(e.target.value)}
                    placeholder="Paste the question paper text here…"
                  />
                  <FileDrop label="…or upload a PDF" file={paperFile} onChange={setPaperFile} />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex flex-col gap-3 pt-5">
                  <Label htmlFor="markSchemeText">Mark scheme (recommended)</Label>
                  <Textarea
                    id="markSchemeText"
                    rows={8}
                    value={markSchemeText}
                    onChange={(e) => setMarkSchemeText(e.target.value)}
                    placeholder="Paste the mark scheme text here…"
                  />
                  <FileDrop
                    label="…or upload a PDF"
                    file={markSchemeFile}
                    onChange={setMarkSchemeFile}
                  />
                </CardContent>
              </Card>

              {error && <p className="text-sm text-danger">{error}</p>}

              <Button type="submit" size="lg" disabled={loading} className="self-start">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Parsing with AI…
                  </>
                ) : (
                  "Parse questions"
                )}
              </Button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <h1 className="mb-1 text-2xl font-semibold">Review questions</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              Fix any mis-splits before saving. {questions.length} question
              {questions.length === 1 ? "" : "s"} found.
            </p>

            <div className="flex flex-col gap-4">
              {questions.map((q) => (
                <Card key={q._key}>
                  <CardContent className="flex flex-col gap-3 pt-5">
                    <div className="grid gap-3 sm:grid-cols-[6rem_1fr_6rem]">
                      <div>
                        <Label>Number</Label>
                        <Input
                          value={q.number}
                          onChange={(e) => updateQuestion(q._key, { number: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Topic</Label>
                        <Input
                          value={q.topic ?? ""}
                          onChange={(e) => updateQuestion(q._key, { topic: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Marks</Label>
                        <Input
                          type="number"
                          min={0}
                          value={q.marksAvailable}
                          onChange={(e) =>
                            updateQuestion(q._key, { marksAvailable: Number(e.target.value) })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Question text</Label>
                      <Textarea
                        rows={3}
                        value={q.text}
                        onChange={(e) => updateQuestion(q._key, { text: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Mark scheme</Label>
                      <Textarea
                        rows={2}
                        value={q.markSchemeText ?? ""}
                        onChange={(e) =>
                          updateQuestion(q._key, { markSchemeText: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={q.requiresDrawing}
                          onChange={(e) =>
                            updateQuestion(q._key, { requiresDrawing: e.target.checked })
                          }
                        />
                        Requires a drawing/graph
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        Year:
                        <select
                          value={q.yearRequired ?? ""}
                          onChange={(e) =>
                            updateQuestion(q._key, {
                              yearRequired: e.target.value
                                ? (Number(e.target.value) as 1 | 2)
                                : null,
                            })
                          }
                          className="h-8 rounded-md border border-border bg-surface px-2 text-sm"
                        >
                          <option value="">Unknown</option>
                          <option value="1">1 (AS)</option>
                          <option value="2">2</option>
                        </select>
                      </label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto text-danger hover:bg-danger/10"
                        onClick={() => removeQuestion(q._key)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button variant="outline" onClick={addQuestion} className="self-start">
                <Plus className="h-4 w-4" />
                Add question
              </Button>
            </div>

            {error && <p className="mt-4 text-sm text-danger">{error}</p>}

            <div className="mt-6 flex gap-3">
              <Button variant="secondary" onClick={() => setStep("form")} disabled={loading}>
                Back
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  "Save paper"
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FileDrop({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-muted">
      <UploadCloud className="h-4 w-4 shrink-0" />
      <span className="truncate">{file ? file.name : label}</span>
      <input
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}
