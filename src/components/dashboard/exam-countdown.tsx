"use client";

import { useState } from "react";
import { Plus, X, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ExamDateView {
  id: string;
  subject: string;
  examBoard: string;
  date: string;
  label: string | null;
}

function daysUntil(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function ExamCountdown({ initialExamDates }: { initialExamDates: ExamDateView[] }) {
  const [examDates, setExamDates] = useState(initialExamDates);
  const [adding, setAdding] = useState(false);
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState("");

  async function addExamDate(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !date) return;
    const res = await fetch("/api/exam-dates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, examBoard: "AQA", date }),
    });
    if (res.ok) {
      const data = await res.json();
      setExamDates((prev) =>
        [...prev, data.examDate].sort((a, b) => a.date.localeCompare(b.date))
      );
      setSubject("");
      setDate("");
      setAdding(false);
    }
  }

  async function remove(id: string) {
    setExamDates((prev) => prev.filter((e) => e.id !== id));
    await fetch(`/api/exam-dates/${id}`, { method: "DELETE" });
  }

  return (
    <div className="flex flex-col gap-3">
      {examDates.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground">No exam dates yet.</p>
      )}
      {examDates.map((e) => {
        const days = daysUntil(e.date);
        return (
          <div
            key={e.id}
            className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
          >
            <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{e.subject}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(e.date).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                days <= 7 ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary"
              )}
            >
              {days < 0 ? "Past" : days === 0 ? "Today" : `${days}d`}
            </span>
            <button
              onClick={() => remove(e.id)}
              aria-label="Remove"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}

      {adding ? (
        <form onSubmit={addExamDate} className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-32"
          />
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
          <Button type="submit" size="sm">
            Add
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>
            Cancel
          </Button>
        </form>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setAdding(true)} className="self-start">
          <Plus className="h-3.5 w-3.5" />
          Add exam date
        </Button>
      )}
    </div>
  );
}
