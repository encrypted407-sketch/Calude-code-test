import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { markAndRecordAttempt } from "@/lib/attempts";

const submitSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      studentAnswerText: z.string().nullable().optional(),
      studentAnswerImageBase64: z.string().nullable().optional(),
    })
  ),
});

export async function POST(req: Request, { params }: { params: Promise<{ paperId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { paperId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  const paper = await prisma.paper.findFirst({
    where: { id: paperId, OR: [{ userId: session.user.id }, { isPreloaded: true }] },
    include: { questions: { where: { isGenerated: false } } },
  });
  if (!paper) {
    return NextResponse.json({ error: "Paper not found." }, { status: 404 });
  }

  const answersByQuestion = new Map(parsed.data.answers.map((a) => [a.questionId, a]));

  const results: {
    questionId: string;
    number: string;
    marksAwarded: number;
    marksAvailable: number;
    feedback: string;
    improvementPoints: string;
  }[] = [];
  let totalXp = 0;

  for (const question of paper.questions) {
    const answer = answersByQuestion.get(question.id);
    const hasAnswer = Boolean(answer?.studentAnswerText?.trim() || answer?.studentAnswerImageBase64);

    if (!hasAnswer) {
      results.push({
        questionId: question.id,
        number: question.number,
        marksAwarded: 0,
        marksAvailable: question.marksAvailable,
        feedback: "No answer submitted.",
        improvementPoints: "Make sure to attempt every question, even a partial answer can pick up marks.",
      });
      continue;
    }

    try {
      const { attempt, xpEarned } = await markAndRecordAttempt({
        userId: session.user.id,
        question: { ...question, paper },
        studentAnswerText: answer?.studentAnswerText,
        studentAnswerImageBase64: answer?.studentAnswerImageBase64,
      });
      totalXp += xpEarned;
      results.push({
        questionId: question.id,
        number: question.number,
        marksAwarded: attempt.marksAwarded,
        marksAvailable: attempt.marksAvailable,
        feedback: attempt.feedback,
        improvementPoints: attempt.improvementPoints,
      });
    } catch (err) {
      console.error("Mock marking failed for question", question.id, err);
      const message = err instanceof Error ? err.message : "Unknown error";
      results.push({
        questionId: question.id,
        number: question.number,
        marksAwarded: 0,
        marksAvailable: question.marksAvailable,
        feedback: `Couldn't mark this question automatically: ${message}`,
        improvementPoints: "",
      });
    }
  }

  const totalAwarded = results.reduce((s, r) => s + r.marksAwarded, 0);
  const totalAvailable = results.reduce((s, r) => s + r.marksAvailable, 0);

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { xp: true },
  });

  return NextResponse.json({
    results,
    totalAwarded,
    totalAvailable,
    totalXp,
    userTotalXp: user.xp,
  });
}
