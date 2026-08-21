import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface TopicRow {
  topic: string;
  yearRequired: number | null;
  strength: number | null;
}

function strengthClasses(strength: number | null) {
  if (strength == null) return "bg-surface-muted text-muted-foreground";
  if (strength < 0.4) return "bg-danger/10 text-danger";
  if (strength < 0.7) return "bg-warning/10 text-warning";
  return "bg-success/10 text-success";
}

export default async function ChecklistPage() {
  const session = await auth();
  if (!session?.user) return null;

  const [questions, mastery] = await Promise.all([
    prisma.question.findMany({
      where: {
        isGenerated: false,
        topic: { not: null },
        paper: { OR: [{ userId: session.user.id }, { isPreloaded: true }] },
      },
      select: { topic: true, yearRequired: true, paper: { select: { subject: true } } },
    }),
    prisma.topicMastery.findMany({ where: { userId: session.user.id } }),
  ]);

  const strengthByKey = new Map(mastery.map((m) => [`${m.subject}::${m.topic}`, m.strength]));

  const bySubject = new Map<string, Map<string, TopicRow>>();
  for (const q of questions) {
    if (!q.topic) continue;
    const subject = q.paper.subject;
    const topics = bySubject.get(subject) ?? new Map<string, TopicRow>();
    if (!topics.has(q.topic)) {
      topics.set(q.topic, {
        topic: q.topic,
        yearRequired: q.yearRequired,
        strength: strengthByKey.get(`${subject}::${q.topic}`) ?? null,
      });
    }
    bySubject.set(subject, topics);
  }

  const subjects = Array.from(bySubject.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Topic checklist</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Coverage and confidence across every topic in your papers, at a glance.
        </p>
      </div>

      {subjects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Add a paper to start building your checklist.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {subjects.map(([subject, topics]) => {
            const rows = Array.from(topics.values()).sort((a, b) => {
              if (a.yearRequired !== b.yearRequired) return (a.yearRequired ?? 0) - (b.yearRequired ?? 0);
              return a.topic.localeCompare(b.topic);
            });
            const covered = rows.filter((r) => r.strength != null).length;

            return (
              <Card key={subject}>
                <CardContent className="pt-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{subject}</h3>
                    <span className="text-xs text-muted-foreground">
                      {covered}/{rows.length} attempted
                    </span>
                  </div>
                  <ProgressBar value={covered} max={rows.length} className="mb-4" />
                  <div className="flex flex-col divide-y divide-border">
                    {rows.map((r) => (
                      <div key={r.topic} className="flex items-center gap-3 py-2">
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {r.topic}
                          {r.yearRequired && (
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              Y{r.yearRequired}
                            </span>
                          )}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                            strengthClasses(r.strength)
                          )}
                        >
                          {r.strength == null ? "Not started" : `${Math.round(r.strength * 100)}%`}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
