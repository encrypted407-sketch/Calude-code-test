import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sm2Next, type Sm2Rating } from "@/lib/sm2";

const reviewSchema = z.object({
  flashcardId: z.string(),
  rating: z.enum(["again", "hard", "good", "easy"]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const flashcard = await prisma.flashcard.findUnique({
    where: { id: parsed.data.flashcardId },
    select: { isPreloaded: true, createdById: true },
  });
  if (!flashcard || (flashcard.createdById !== session.user.id && !flashcard.isPreloaded)) {
    return NextResponse.json({ error: "Flashcard not found." }, { status: 404 });
  }

  const existing = await prisma.flashcardProgress.findUnique({
    where: {
      userId_flashcardId: { userId: session.user.id, flashcardId: parsed.data.flashcardId },
    },
  });

  const next = sm2Next(
    {
      easeFactor: existing?.easeFactor ?? 2.5,
      intervalDays: existing?.intervalDays ?? 0,
      repetitions: existing?.repetitions ?? 0,
    },
    parsed.data.rating as Sm2Rating
  );

  const progress = await prisma.flashcardProgress.upsert({
    where: {
      userId_flashcardId: { userId: session.user.id, flashcardId: parsed.data.flashcardId },
    },
    create: {
      userId: session.user.id,
      flashcardId: parsed.data.flashcardId,
      easeFactor: next.easeFactor,
      intervalDays: next.intervalDays,
      repetitions: next.repetitions,
      dueDate: next.dueDate,
    },
    update: {
      easeFactor: next.easeFactor,
      intervalDays: next.intervalDays,
      repetitions: next.repetitions,
      dueDate: next.dueDate,
    },
  });

  return NextResponse.json({ progress });
}
