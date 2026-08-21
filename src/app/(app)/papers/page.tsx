import Link from "next/link";
import { FileText, Plus, Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function PapersPage() {
  const session = await auth();
  const papers = session?.user
    ? await prisma.paper.findMany({
        where: { OR: [{ userId: session.user.id }, { isPreloaded: true }] },
        include: { _count: { select: { questions: true } } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Papers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Preloaded AQA papers plus anything you&apos;ve uploaded.
          </p>
        </div>
        <Link href="/papers/new">
          <Button>
            <Plus className="h-4 w-4" />
            Add a paper
          </Button>
        </Link>
      </div>

      {papers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No papers yet. Upload a past paper to get started.
            </p>
            <Link href="/papers/new">
              <Button variant="secondary" className="mt-2">
                Add a paper
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {papers.map((paper) => (
            <Link key={paper.id} href={`/papers/${paper.id}`}>
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
                    {paper.year ? ` · ${paper.year}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {paper._count.questions} question{paper._count.questions === 1 ? "" : "s"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
