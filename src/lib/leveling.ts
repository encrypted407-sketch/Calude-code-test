/** Pure XP/level math — no server-only imports, safe to use from client components. */
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
