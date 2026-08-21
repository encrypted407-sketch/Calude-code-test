import { prisma } from "@/lib/prisma";

/** XP scales with marks awarded, plus a bonus for improving over the previous attempt. */
export function computeXp(opts: {
  marksAwarded: number;
  marksAvailable: number;
  previousMarksAwarded?: number | null;
}): number {
  const base = opts.marksAwarded * 10;
  const accuracyBonus = opts.marksAvailable > 0 && opts.marksAwarded === opts.marksAvailable ? 15 : 0;

  let improvementBonus = 0;
  if (opts.previousMarksAwarded != null && opts.marksAwarded > opts.previousMarksAwarded) {
    improvementBonus = (opts.marksAwarded - opts.previousMarksAwarded) * 8;
  }

  return Math.max(base + accuracyBonus + improvementBonus, opts.marksAwarded > 0 ? 5 : 2);
}

export function levelForXp(xp: number): { level: number; xpIntoLevel: number; xpForNextLevel: number } {
  // Each level needs progressively more XP: level n requires 100 * n XP to clear.
  let level = 1;
  let remaining = xp;
  let threshold = 100;
  while (remaining >= threshold) {
    remaining -= threshold;
    level += 1;
    threshold = 100 * level;
  }
  return { level, xpIntoLevel: remaining, xpForNextLevel: threshold };
}

/** Updates streak/lastActiveDate for a user's first activity of the day. Returns the new streak count. */
export async function touchStreak(userId: string): Promise<number> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const today = startOfDay(new Date());
  const last = user.lastActiveDate ? startOfDay(user.lastActiveDate) : null;

  if (last && last.getTime() === today.getTime()) {
    return user.streakCount; // already active today
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const newStreak = last && last.getTime() === yesterday.getTime() ? user.streakCount + 1 : 1;

  await prisma.user.update({
    where: { id: userId },
    data: { streakCount: newStreak, lastActiveDate: new Date() },
  });

  return newStreak;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
