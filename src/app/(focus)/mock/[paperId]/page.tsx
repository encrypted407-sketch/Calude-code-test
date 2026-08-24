import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { estimateMockDurationMins } from "@/lib/mock";
import { MockExamSession } from "@/components/mock/mock-exam-session";

export default async function MockExamPage({
  params,
}: {
  params: Promise<{ paperId: string }>;
}) {
  const { paperId } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const paper = await prisma.paper.findFirst({
    where: { id: paperId, OR: [{ userId: session.user.id }, { isPreloaded: true }] },
    include: {
      questions: { where: { isGenerated: false }, orderBy: { number: "asc" } },
    },
  });
  if (!paper || paper.questions.length === 0) notFound();

  const totalMarks = paper.questions.reduce((s, q) => s + q.marksAvailable, 0);

  return (
    <MockExamSession
      paperId={paper.id}
      title={paper.title}
      durationMins={estimateMockDurationMins(totalMarks)}
      questions={paper.questions.map((q) => ({
        id: q.id,
        number: q.number,
        text: q.text,
        marksAvailable: q.marksAvailable,
        requiresDrawing: q.requiresDrawing,
      }))}
    />
  );
}
