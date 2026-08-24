/** Roughly 1.5 minutes per mark, rounded to the nearest 5, matching typical A-level exam pacing. */
export function estimateMockDurationMins(totalMarks: number): number {
  const raw = totalMarks * 1.5;
  return Math.max(15, Math.round(raw / 5) * 5);
}
