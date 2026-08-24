import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await prisma.reviewSchedule.findMany({
    where: { userId: session.user.id, dueDate: { lte: new Date() } },
    include: { question: { include: { paper: true } } },
    orderBy: { dueDate: "asc" },
  });

  return NextResponse.json({
    due: due.map((d) => ({
      scheduleId: d.id,
      questionId: d.questionId,
      paperId: d.question.paperId,
      subject: d.question.paper.subject,
      topic: d.question.topic,
      marksAvailable: d.question.marksAvailable,
      timesReviewed: d.timesReviewed,
    })),
  });
}
