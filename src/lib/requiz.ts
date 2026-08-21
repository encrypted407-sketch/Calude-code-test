/** Spaced-repetition intervals (days) for requizzed questions, same shape as the SM-2-style spacing described in the spec. */
const INTERVALS = [2, 5, 10];
const GOOD_SCORE_THRESHOLD = 0.7;

export function nextReviewInterval(
  currentIntervalDays: number,
  scorePct: number
): { intervalDays: number; dueDate: Date } {
  let intervalDays: number;

  if (scorePct >= GOOD_SCORE_THRESHOLD) {
    const idx = INTERVALS.indexOf(currentIntervalDays);
    const nextIdx = idx === -1 ? 1 : Math.min(idx + 1, INTERVALS.length - 1);
    intervalDays = INTERVALS[nextIdx];
  } else {
    intervalDays = INTERVALS[0];
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + intervalDays);

  return { intervalDays, dueDate };
}
