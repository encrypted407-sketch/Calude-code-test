import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rewriteQuestionWithAI } from "@/lib/ai";
import { MASTERY_THRESHOLD } from "@/lib/mastery";

const MAX_PER_CALL = 3;

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const weakTopics = await prisma.topicMastery.findMany({
    where: { userId, strength: { lt: MASTERY_THRESHOLD } },
    orderBy: { strength: "asc" },
    take: MAX_PER_CALL,
  });

  const created: { id: string; paperId: string; topic: string | null }[] = [];
  const skipped: string[] = [];

  for (const weak of weakTopics) {
    const alreadyPending = await prisma.question.findFirst({
      where: {
        isGenerated: true,
        topic: weak.topic,
        paper: { userId, subject: weak.subject },
        attempts: { none: { userId } },
      },
    });
    if (alreadyPending) {
      skipped.push(weak.topic);
      continue;
    }

    const sourceAttempt = await prisma.attempt.findFirst({
      where: {
        userId,
        question: {
          topic: weak.topic,
          isGenerated: false,
          paper: { subject: weak.subject },
        },
      },
      orderBy: { createdAt: "desc" },
      include: { question: { include: { paper: true } } },
    });

    const source = sourceAttempt?.question;
    if (!source || !source.markSchemeText) {
      skipped.push(weak.topic);
      continue;
    }

    try {
      const rewritten = await rewriteQuestionWithAI({
        originalText: source.text,
        originalMarkScheme: source.markSchemeText,
        marksAvailable: source.marksAvailable,
        topic: source.topic,
        yearRequired: source.yearRequired,
        subject: source.paper.subject,
        examBoard: source.paper.examBoard,
      });

      const newQuestion = await prisma.question.create({
        data: {
          paperId: source.paperId,
          number: `${source.number} (practice)`,
          text: rewritten.text,
          marksAvailable: rewritten.marksAvailable,
          topic: source.topic,
          yearRequired: source.yearRequired,
          requiresDrawing: source.requiresDrawing,
          markSchemeText: rewritten.markSchemeText,
          isGenerated: true,
          sourceQuestionId: source.id,
        },
      });

      await prisma.reviewSchedule.create({
        data: {
          questionId: newQuestion.id,
          userId,
          intervalDays: 2,
          dueDate: new Date(),
        },
      });

      created.push({ id: newQuestion.id, paperId: source.paperId, topic: source.topic });
    } catch (err) {
      console.error("Requiz generation failed for topic", weak.topic, err);
      skipped.push(weak.topic);
    }
  }

  return NextResponse.json({ created, skipped });
}
