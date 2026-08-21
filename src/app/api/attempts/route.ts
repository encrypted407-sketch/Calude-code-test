import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { markAnswer } from "@/lib/ai";
import { computeXp, touchStreak, levelForXp } from "@/lib/gamification";
import { updateTopicMastery } from "@/lib/mastery";

const attemptSchema = z
  .object({
    questionId: z.string(),
    studentAnswerText: z.string().nullable().optional(),
    studentAnswerImageBase64: z.string().nullable().optional(),
  })
  .refine((d) => (d.studentAnswerText?.trim() || d.studentAnswerImageBase64), {
    message: "Provide a written answer or a drawing.",
  });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = attemptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  const question = await prisma.question.findUnique({
    where: { id: parsed.data.questionId },
    include: { paper: true },
  });
  if (!question) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }
  if (!question.markSchemeText) {
    return NextResponse.json(
      { error: "This question has no mark scheme, so it can't be marked yet." },
      { status: 422 }
    );
  }

  const previousAttempts = await prisma.attempt.findMany({
    where: { userId: session.user.id, questionId: question.id },
    orderBy: { attemptNumber: "desc" },
  });
  const previous = previousAttempts[0];

  let marking;
  try {
    marking = await markAnswer({
      questionText: question.text,
      markSchemeText: question.markSchemeText,
      marksAvailable: question.marksAvailable,
      studentAnswerText: parsed.data.studentAnswerText,
      studentAnswerImageBase64: parsed.data.studentAnswerImageBase64,
      previousFeedback: previous?.feedback ?? null,
    });
  } catch (err) {
    console.error("Marking failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Couldn't mark this answer: ${message}` }, { status: 502 });
  }

  const xpEarned = computeXp({
    marksAwarded: marking.marksAwarded,
    marksAvailable: question.marksAvailable,
    previousMarksAwarded: previous?.marksAwarded ?? null,
  });

  const attempt = await prisma.attempt.create({
    data: {
      userId: session.user.id,
      questionId: question.id,
      attemptNumber: previousAttempts.length + 1,
      studentAnswerText: parsed.data.studentAnswerText ?? null,
      studentAnswerImageUrl: parsed.data.studentAnswerImageBase64
        ? `data:image/png;base64,${parsed.data.studentAnswerImageBase64}`
        : null,
      marksAwarded: marking.marksAwarded,
      marksAvailable: question.marksAvailable,
      feedback: marking.feedback,
      improvementPoints: marking.improvementPoints,
      xpEarned,
    },
  });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { xp: { increment: xpEarned } },
  });
  const newStreak = await touchStreak(session.user.id);

  if (question.topic) {
    await updateTopicMastery({
      userId: session.user.id,
      subject: question.paper.subject,
      topic: question.topic,
      yearRequired: question.yearRequired,
      marksAwarded: marking.marksAwarded,
      marksAvailable: question.marksAvailable,
    });
  }

  const updatedUser = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { xp: true },
  });

  return NextResponse.json({
    attempt,
    previousAttempt: previous ?? null,
    xpEarned,
    streakCount: newStreak,
    totalXp: updatedUser.xp,
    level: levelForXp(updatedUser.xp),
  });
}
