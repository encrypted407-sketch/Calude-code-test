import Link from "next/link";
import { Layers, Plus, Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function FlashcardsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const [cards, progress] = await Promise.all([
    prisma.flashcard.findMany({
      where: { OR: [{ isPreloaded: true }, { createdById: session.user.id }] },
    }),
    prisma.flashcardProgress.findMany({ where: { userId: session.user.id } }),
  ]);

  const progressByCard = new Map(progress.map((p) => [p.flashcardId, p]));
  const now = new Date();
  const dueCount = cards.filter((c) => {
    const p = progressByCard.get(c.id);
    return !p || p.dueDate <= now;
  }).length;

  const bySubject = new Map<string, number>();
  for (const c of cards) {
    bySubject.set(c.subject, (bySubject.get(c.subject) ?? 0) + 1);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Flashcards</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Equations and key terms, spaced out with SM-2.
          </p>
        </div>
        <Link href="/flashcards/new">
          <Button variant="secondary">
            <Plus className="h-4 w-4" />
            Add card
          </Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <p className="text-3xl font-semibold">{dueCount}</p>
          <p className="text-sm text-muted-foreground">
            card{dueCount === 1 ? "" : "s"} due for review today
          </p>
          <Link href="/flashcards/review">
            <Button size="lg" disabled={dueCount === 0} className="mt-2">
              Start review
            </Button>
          </Link>
        </CardContent>
      </Card>

      {cards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <Layers className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No flashcards yet. Preloaded decks appear here after seeding, or add your own.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from(bySubject.entries()).map(([subject, count]) => (
            <Card key={subject}>
              <CardContent className="flex items-center justify-between py-4">
                <span className="font-medium">{subject}</span>
                <span className="text-sm text-muted-foreground">
                  {count} card{count === 1 ? "" : "s"}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
