import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function csvEscape(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const [attempts, mastery] = await Promise.all([
    prisma.attempt.findMany({
      where: { userId: session.user.id },
      include: { question: { include: { paper: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.topicMastery.findMany({ where: { userId: session.user.id } }),
  ]);

  const lines: string[] = [];
  lines.push("# Attempts");
  lines.push(
    ["Date", "Subject", "Topic", "Paper", "Question", "Marks Awarded", "Marks Available", "Percentage"]
      .map(csvEscape)
      .join(",")
  );
  for (const a of attempts) {
    const pct = a.marksAvailable > 0 ? Math.round((a.marksAwarded / a.marksAvailable) * 100) : 0;
    lines.push(
      [
        a.createdAt.toISOString().slice(0, 10),
        a.question.paper.subject,
        a.question.topic ?? "",
        a.question.paper.title,
        a.question.number,
        a.marksAwarded,
        a.marksAvailable,
        `${pct}%`,
      ]
        .map(csvEscape)
        .join(",")
    );
  }

  lines.push("");
  lines.push("# Topic mastery");
  lines.push(["Subject", "Topic", "Year", "Mastery"].map(csvEscape).join(","));
  for (const m of mastery) {
    lines.push(
      [m.subject, m.topic, m.yearRequired ?? "", `${Math.round(m.strength * 100)}%`]
        .map(csvEscape)
        .join(",")
    );
  }

  const csv = lines.join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ascend-progress-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
