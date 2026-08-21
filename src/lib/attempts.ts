import { prisma } from "@/lib/prisma";
import { markAnswer } from "@/lib/ai";
import { computeXp, touchStreak } from "@/lib/gamification";
import { updateTopicMastery } from "@/lib/mastery";
import { nextReviewInterval } from "@/lib/requiz";
import type { Question, Paper } from "@prisma/client";

/**
 * Marks one answer against its question's mark scheme and records the full set of
 * side effects (Attempt row, XP, streak, topic mastery, requiz scheduling). Shared
 * by the single-question answer flow and the batch mock-exam submission flow.
 */
export async function markAndRecordAttempt(opts: {
  userId: string;
  question: Question & { paper: Paper };
  studentAnswerText?: string | null;
  studentAnswerImageBase64?: string | null;
}) {
  const { userId, question } = opts;

  if (!question.markSchemeText) {
    throw new Error("This question has no mark scheme, so it can't be marked yet.");
  }

  const previousAttempts = await prisma.attempt.findMany({
    where: { userId, questionId: question.id },
    orderBy: { attemptNumber: "desc" },
  });
  const previous = previousAttempts[0];

  const marking = await markAnswer({
    questionText: question.text,
    markSchemeText: question.markSchemeText,
    marksAvailable: question.marksAvailable,
    studentAnswerText: opts.studentAnswerText,
    studentAnswerImageBase64: opts.studentAnswerImageBase64,
    previousFeedback: previous?.feedback ?? null,
  });

  const xpEarned = computeXp({
    marksAwarded: marking.marksAwarded,
    marksAvailable: question.marksAvailable,
    previousMarksAwarded: previous?.marksAwarded ?? null,
  });

  const attempt = await prisma.attempt.create({
    data: {
      userId,
      questionId: question.id,
      attemptNumber: previousAttempts.length + 1,
      studentAnswerText: opts.studentAnswerText ?? null,
      studentAnswerImageUrl: opts.studentAnswerImageBase64
        ? `data:image/png;base64,${opts.studentAnswerImageBase64}`
        : null,
      marksAwarded: marking.marksAwarded,
      marksAvailable: question.marksAvailable,
      feedback: marking.feedback,
      improvementPoints: marking.improvementPoints,
      xpEarned,
    },
  });

  await prisma.user.update({ where: { id: userId }, data: { xp: { increment: xpEarned } } });
  const streakCount = await touchStreak(userId);

  if (question.topic) {
    await updateTopicMastery({
      userId,
      subject: question.paper.subject,
      topic: question.topic,
      yearRequired: question.yearRequired,
      marksAwarded: marking.marksAwarded,
      marksAvailable: question.marksAvailable,
    });
  }

  if (question.isGenerated) {
    const schedule = await prisma.reviewSchedule.findUnique({ where: { questionId: question.id } });
    if (schedule) {
      const scorePct = question.marksAvailable > 0 ? marking.marksAwarded / question.marksAvailable : 0;
      const { intervalDays, dueDate } = nextReviewInterval(schedule.intervalDays, scorePct);
      await prisma.reviewSchedule.update({
        where: { id: schedule.id },
        data: { intervalDays, dueDate, timesReviewed: { increment: 1 } },
      });
    }
  }

  return { attempt, previousAttempt: previous ?? null, xpEarned, streakCount };
}
