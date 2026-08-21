import Link from "next/link";
import { RotateCcw, Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MASTERY_THRESHOLD } from "@/lib/mastery";
import { Card, CardContent } from "@/components/ui/card";
import { GeneratePracticeButton } from "@/components/revise/generate-practice-button";

export default async function RevisePage() {
  const session = await auth();
  if (!session?.user) return null;

  const [weakTopics, due] = await Promise.all([
    prisma.topicMastery.findMany({
      where: { userId: session.user.id, strength: { lt: MASTERY_THRESHOLD } },
      orderBy: { strength: "asc" },
    }),
    prisma.reviewSchedule.findMany({
      where: { userId: session.user.id, dueDate: { lte: new Date() } },
      include: { question: { include: { paper: true } } },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Revise weak topics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reworded questions on topics you&apos;ve struggled with, spaced out so they stick.
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-4 pt-5">
          <div>
            <h3 className="mb-2 text-sm font-semibold">Weakest topics</h3>
            {weakTopics.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No weak topics right now — nice work.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {weakTopics.map((t) => (
                  <span
                    key={t.id}
                    className="rounded-full bg-danger/10 px-3 py-1 text-xs font-medium text-danger"
                  >
                    {t.topic} · {Math.round(t.strength * 100)}%
                  </span>
                ))}
              </div>
            )}
          </div>
          <GeneratePracticeButton hasWeakTopics={weakTopics.length > 0} />
        </CardContent>
      </Card>

      <h3 className="mb-3 text-sm font-semibold">
        Due now ({due.length})
      </h3>
      {due.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <RotateCcw className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nothing due for review right now.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {due.map((d) => (
            <Link key={d.id} href={`/session/${d.question.paperId}/${d.questionId}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-3 py-3">
                  <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {d.question.paper.subject}
                      {d.question.topic ? ` · ${d.question.topic}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {d.question.marksAvailable} mark{d.question.marksAvailable === 1 ? "" : "s"}
                      {d.timesReviewed > 0 ? ` · reviewed ${d.timesReviewed}x` : " · new"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
