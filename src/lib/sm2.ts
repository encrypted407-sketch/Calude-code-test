/**
 * SM-2 spaced repetition (the algorithm behind Anki's default scheduler).
 * Ratings map to the classic 0-5 quality scale via four buttons.
 */
export type Sm2Rating = "again" | "hard" | "good" | "easy";

const RATING_QUALITY: Record<Sm2Rating, number> = {
  again: 1,
  hard: 3,
  good: 4,
  easy: 5,
};

export interface Sm2State {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
}

export function sm2Next(state: Sm2State, rating: Sm2Rating): Sm2State & { dueDate: Date } {
  const quality = RATING_QUALITY[rating];

  let { easeFactor, intervalDays, repetitions } = state;

  if (quality < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) {
      intervalDays = 1;
    } else if (repetitions === 2) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
  }

  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + intervalDays);

  return { easeFactor, intervalDays, repetitions, dueDate };
}
