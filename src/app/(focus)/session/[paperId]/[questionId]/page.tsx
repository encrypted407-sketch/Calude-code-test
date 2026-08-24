import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FocusShell } from "@/components/shell/focus-shell";
import { QuestionSession } from "@/components/session/question-session";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ paperId: string; questionId: string }>;
}) {
  const { paperId, questionId } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const paper = await prisma.paper.findFirst({
    where: { id: paperId, OR: [{ userId: session.user.id }, { isPreloaded: true }] },
    include: {
      questions: {
        where: { isGenerated: false },
        orderBy: { number: "asc" },
      },
    },
  });
  if (!paper) notFound();

  const question =
    paper.questions.find((q) => q.id === questionId) ??
    (await prisma.question.findFirst({
      where: { id: questionId, paperId: paper.id, isGenerated: true },
    }));
  if (!question) notFound();

  const attempts = await prisma.attempt.findMany({
    where: { userId: session.user.id, questionId },
    orderBy: { attemptNumber: "asc" },
  });

  const questionIndex = paper.questions.findIndex((q) => q.id === questionId);
  const isGenerated = questionIndex === -1;
  const nextQuestion = isGenerated ? null : paper.questions[questionIndex + 1] ?? null;

  return (
    <FocusShell
      current={isGenerated ? undefined : questionIndex + 1}
      total={isGenerated ? undefined : paper.questions.length}
      exitHref={isGenerated ? "/revise" : `/papers/${paper.id}`}
      wide
    >
      <QuestionSession
        paperId={paper.id}
        subject={paper.subject}
        question={{
          id: question.id,
          number: question.number,
          text: question.text,
          marksAvailable: question.marksAvailable,
          topic: question.topic,
          requiresDrawing: question.requiresDrawing,
          hasMarkScheme: Boolean(question.markSchemeText),
        }}
        initialAttempts={attempts.map((a) => ({
          id: a.id,
          attemptNumber: a.attemptNumber,
          marksAwarded: a.marksAwarded,
          marksAvailable: a.marksAvailable,
          feedback: a.feedback,
          improvementPoints: a.improvementPoints,
          studentAnswerText: a.studentAnswerText,
          studentAnswerImageUrl: a.studentAnswerImageUrl,
        }))}
        nextQuestionId={nextQuestion?.id ?? null}
        finishHref={isGenerated ? "/revise" : `/papers/${paper.id}`}
      />
    </FocusShell>
  );
}
