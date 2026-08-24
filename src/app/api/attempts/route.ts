import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { markAndRecordAttempt } from "@/lib/attempts";
import { levelForXp, didLevelUp } from "@/lib/leveling";

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
  if (!question || (question.paper.userId !== session.user.id && !question.paper.isPreloaded)) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }

  const userBefore = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { xp: true },
  });

  let result;
  try {
    result = await markAndRecordAttempt({
      userId: session.user.id,
      question,
      studentAnswerText: parsed.data.studentAnswerText,
      studentAnswerImageBase64: parsed.data.studentAnswerImageBase64,
    });
  } catch (err) {
    console.error("Marking failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Couldn't mark this answer: ${message}` }, { status: 502 });
  }

  const updatedUser = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { xp: true },
  });

  return NextResponse.json({
    attempt: result.attempt,
    previousAttempt: result.previousAttempt,
    xpEarned: result.xpEarned,
    streakCount: result.streakCount,
    totalXp: updatedUser.xp,
    level: levelForXp(updatedUser.xp),
    leveledUpTo: didLevelUp(userBefore.xp, updatedUser.xp),
  });
}
