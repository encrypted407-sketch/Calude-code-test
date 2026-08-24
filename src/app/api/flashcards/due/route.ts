import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const [cards, progress] = await Promise.all([
    prisma.flashcard.findMany({
      where: { OR: [{ isPreloaded: true }, { createdById: session.user.id }] },
    }),
    prisma.flashcardProgress.findMany({ where: { userId: session.user.id } }),
  ]);

  const progressByCard = new Map(progress.map((p) => [p.flashcardId, p]));

  const due = cards.filter((card) => {
    const p = progressByCard.get(card.id);
    return !p || p.dueDate <= now;
  });

  return NextResponse.json({
    due: due.map((card) => ({
      id: card.id,
      subject: card.subject,
      examBoard: card.examBoard,
      topic: card.topic,
      category: card.category,
      front: card.front,
      back: card.back,
    })),
    totalCards: cards.length,
  });
}
