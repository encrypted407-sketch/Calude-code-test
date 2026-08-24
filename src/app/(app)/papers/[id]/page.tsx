import Link from "next/link";
import { notFound } from "next/navigation";
import { PenLine, Timer, CheckCircle2, Circle, Pencil } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function PaperDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const paper = await prisma.paper.findFirst({
    where: { id, OR: [{ userId: session.user.id }, { isPreloaded: true }] },
    include: {
      questions: {
        where: { isGenerated: false },
        orderBy: { number: "asc" },
        include: {
          attempts: {
            where: { userId: session.user.id },
            orderBy: { attemptNumber: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!paper) notFound();

  const totalMarks = paper.questions.reduce((sum, q) => sum + q.marksAvailable, 0);
  const firstUnanswered = paper.questions.find((q) => q.attempts.length === 0);
  const startQuestion = firstUnanswered ?? paper.questions[0];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">
          {paper.examBoard} · {paper.subject} · {paper.level}
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{paper.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {paper.questions.length} questions · {totalMarks} marks total
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        {startQuestion && (
          <Link href={`/session/${paper.id}/${startQuestion.id}`}>
            <Button size="lg">
              <PenLine className="h-4 w-4" />
              {firstUnanswered ? "Start answering" : "Practise again"}
            </Button>
          </Link>
        )}
        <Link href={`/mock/${paper.id}`}>
          <Button size="lg" variant="secondary">
            <Timer className="h-4 w-4" />
            Full timed mock
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {paper.questions.map((q) => {
          const best = q.attempts[0];
          return (
            <Link key={q.id} href={`/session/${paper.id}/${q.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-3 py-3">
                  {best ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      Q{q.number}
                      {q.topic ? ` · ${q.topic}` : ""}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {q.marksAvailable} mark{q.marksAvailable === 1 ? "" : "s"}
                      {q.requiresDrawing ? " · diagram expected" : ""}
                    </p>
                  </div>
                  {q.requiresDrawing && (
                    <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  {best && (
                    <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium">
                      {best.marksAwarded}/{best.marksAvailable}
                    </span>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
