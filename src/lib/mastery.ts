import { prisma } from "@/lib/prisma";

const MASTERY_THRESHOLD = 0.55;
/** Weight given to the newest attempt vs. accumulated history — higher reacts faster. */
const SMOOTHING = 0.4;

export async function updateTopicMastery(opts: {
  userId: string;
  subject: string;
  topic: string;
  yearRequired: number | null;
  marksAwarded: number;
  marksAvailable: number;
}) {
  if (opts.marksAvailable <= 0) return;
  const score = opts.marksAwarded / opts.marksAvailable;

  const existing = await prisma.topicMastery.findUnique({
    where: { userId_subject_topic: { userId: opts.userId, subject: opts.subject, topic: opts.topic } },
  });

  const newStrength = existing ? existing.strength * (1 - SMOOTHING) + score * SMOOTHING : score;

  await prisma.topicMastery.upsert({
    where: { userId_subject_topic: { userId: opts.userId, subject: opts.subject, topic: opts.topic } },
    create: {
      userId: opts.userId,
      subject: opts.subject,
      topic: opts.topic,
      yearRequired: opts.yearRequired,
      strength: newStrength,
      lastSeen: new Date(),
    },
    update: {
      strength: newStrength,
      yearRequired: opts.yearRequired ?? existing?.yearRequired ?? null,
      lastSeen: new Date(),
    },
  });
}

export function isWeakTopic(strength: number): boolean {
  return strength < MASTERY_THRESHOLD;
}

export { MASTERY_THRESHOLD };
