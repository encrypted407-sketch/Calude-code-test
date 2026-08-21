import { cn } from "@/lib/utils";

interface MasteryRow {
  subject: string;
  topic: string;
  yearRequired: number | null;
  strength: number;
}

function strengthColor(strength: number) {
  if (strength < 0.4) return "bg-danger/10 text-danger border-danger/20";
  if (strength < 0.7) return "bg-warning/10 text-warning border-warning/20";
  return "bg-success/10 text-success border-success/20";
}

export function MasteryMap({ rows }: { rows: MasteryRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Answer some questions to start building your topic mastery map.
      </p>
    );
  }

  const bySubject = new Map<string, MasteryRow[]>();
  for (const row of rows) {
    const list = bySubject.get(row.subject) ?? [];
    list.push(row);
    bySubject.set(row.subject, list);
  }

  return (
    <div className="flex flex-col gap-5">
      {Array.from(bySubject.entries()).map(([subject, topics]) => (
        <div key={subject}>
          <h4 className="mb-2 text-sm font-semibold">{subject}</h4>
          <div className="flex flex-wrap gap-2">
            {topics
              .sort((a, b) => a.strength - b.strength)
              .map((t) => (
                <span
                  key={t.topic}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                    strengthColor(t.strength)
                  )}
                  title={`${Math.round(t.strength * 100)}% mastery`}
                >
                  {t.topic}
                  {t.yearRequired && (
                    <span className="opacity-60">Y{t.yearRequired}</span>
                  )}
                </span>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
