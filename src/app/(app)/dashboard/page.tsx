import Link from "next/link";
import { Flame, Sparkles, Layers, TrendingUp } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { levelForXp } from "@/lib/gamification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { MasteryMap } from "@/components/dashboard/mastery-map";
import { MarksChart } from "@/components/dashboard/marks-chart";
import { ExamCountdown } from "@/components/dashboard/exam-countdown";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  const [user, mastery, recentAttempts, examDates, flashcards, flashcardProgress] =
    await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: session.user.id } }),
      prisma.topicMastery.findMany({ where: { userId: session.user.id } }),
      prisma.attempt.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "asc" },
        take: 30,
      }),
      prisma.examDate.findMany({ where: { userId: session.user.id }, orderBy: { date: "asc" } }),
      prisma.flashcard.findMany({
        where: { OR: [{ isPreloaded: true }, { createdById: session.user.id }] },
      }),
      prisma.flashcardProgress.findMany({ where: { userId: session.user.id } }),
    ]);

  const { level, xpIntoLevel, xpForNextLevel } = levelForXp(user.xp);

  const progressByCard = new Map(flashcardProgress.map((p) => [p.flashcardId, p]));
  const now = new Date();
  const dueCount = flashcards.filter((c) => {
    const p = progressByCard.get(c.id);
    return !p || p.dueDate <= now;
  }).length;

  const chartPoints = recentAttempts.map((a) => ({
    date: a.createdAt.toISOString(),
    percentage: a.marksAvailable > 0 ? (a.marksAwarded / a.marksAvailable) * 100 : 0,
  }));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Welcome back{user.name ? `, ${user.name}` : ""}</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">Level {level}</p>
              <ProgressBar value={xpIntoLevel} max={xpForNextLevel} className="mt-1.5" />
              <p className="mt-1 text-xs text-muted-foreground">
                {xpIntoLevel}/{xpForNextLevel} XP to next level
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{user.streakCount}</p>
              <p className="text-sm text-muted-foreground">day streak</p>
            </div>
          </CardContent>
        </Card>
        <Link href="/flashcards">
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-4 pt-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{dueCount}</p>
                <p className="text-sm text-muted-foreground">flashcards due</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Marks over time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MarksChart points={chartPoints} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exam countdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ExamCountdown
              initialExamDates={examDates.map((e) => ({
                id: e.id,
                subject: e.subject,
                examBoard: e.examBoard,
                date: e.date.toISOString(),
                label: e.label,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Topic mastery</CardTitle>
        </CardHeader>
        <CardContent>
          <MasteryMap rows={mastery} />
        </CardContent>
      </Card>
    </div>
  );
}
