export type Set = [number, number];

/**
 * Index of the first set that is still 0-0. Returns -1 if every set has at
 * least one non-zero score.
 */
export function indexOfNextEmptySet(sets: Set[]): number {
  for (let i = 0; i < sets.length; i++) {
    if (sets[i][0] === 0 && sets[i][1] === 0) return i;
  }
  return -1;
}

/**
 * Returns a new sets array with the next-empty set replaced by `score`,
 * along with the index that was filled. Returns null when no empty set is
 * available.
 */
export function fillNextEmptySet(
  sets: Set[],
  score: Set
): { sets: Set[]; filledIndex: number } | null {
  const idx = indexOfNextEmptySet(sets);
  if (idx === -1) return null;
  const next = sets.map(s => [...s] as Set);
  next[idx] = [score[0], score[1]];
  return { sets: next, filledIndex: idx };
}
