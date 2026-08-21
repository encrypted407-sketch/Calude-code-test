import Link from "next/link";
import { Timer, Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { estimateMockDurationMins } from "@/lib/mock";

export default async function MockExamsPage() {
  const session = await auth();
  const papers = session?.user
    ? await prisma.paper.findMany({
        where: { OR: [{ userId: session.user.id }, { isPreloaded: true }] },
        include: {
          questions: { where: { isGenerated: false }, select: { marksAvailable: true } },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const eligible = papers.filter((p) => p.questions.length > 0);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Mock exams</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Full timed conditions: the whole paper, a countdown clock, marked as a batch at the
          end.
        </p>
      </div>

      {eligible.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <Timer className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Add a paper first, then start a timed mock here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {eligible.map((paper) => {
            const totalMarks = paper.questions.reduce((s, q) => s + q.marksAvailable, 0);
            const mins = estimateMockDurationMins(totalMarks);
            return (
              <Link key={paper.id} href={`/mock/${paper.id}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardContent className="flex flex-col gap-2 pt-5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium leading-snug">{paper.title}</h3>
                      {paper.isPreloaded && (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                          <Sparkles className="h-3 w-3" />
                          Preloaded
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {paper.examBoard} · {paper.subject} · {paper.level}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Timer className="h-3.5 w-3.5" />
                      {mins} minutes · {totalMarks} marks · {paper.questions.length} questions
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
