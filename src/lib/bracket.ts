export type GeneratedMatch = {
  round: number;
  position: number;
  player1_id: string | null;
  player2_id: string | null;
};

export type GeneratedSeed = {
  player_id: string;
  seed: number;
};

export type GenerationResult = {
  matches: GeneratedMatch[];
  seeds: GeneratedSeed[];
};

export type NextSlot = {
  round: number;
  position: number;
  slot: 'player1' | 'player2';
};

/** Smallest power of 2 ≥ n (used to be the bracket size). */
export function nextPowerOf2(n: number): number {
  if (n <= 1) return 1;
  return 2 ** Math.ceil(Math.log2(n));
}

/** Largest power of 2 ≤ n (the main-bracket size when N isn't a power of 2). */
export function largestPow2LE(n: number): number {
  if (n < 2) return 1;
  return 2 ** Math.floor(Math.log2(n));
}

/**
 * Where does the winner of (round, position) advance to?
 *  - Round 0 (preliminary) → round 1 match at the same position, slot player2.
 *    The corresponding R1 player1 was a direct entrant.
 *  - Round R ≥ 1 → standard binary-tree advancement: next round, position
 *    floor(p/2), slot player1 if p is even, else player2.
 */
export function nextMatchPosition(round: number, position: number): NextSlot {
  if (round === 0) {
    return { round: 1, position, slot: 'player2' };
  }
  return {
    round: round + 1,
    position: Math.floor(position / 2),
    slot: position % 2 === 0 ? 'player1' : 'player2'
  };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Generate a single-elimination bracket. When N is not a power of 2, an
 * automatic "preliminary round" (round 0) trims the field down to the next
 * lower power of 2 — every player still plays at least one match, no BYE
 * passes anywhere.
 *
 * Layout for non-power-of-2 N:
 *  - mainSize = largest power of 2 ≤ N
 *  - excess   = N - mainSize  (must be eliminated via prelim)
 *  - prelim has `excess` matches; `direct = N - 2*excess` players skip prelim
 *  - R1 has mainSize/2 matches: first `excess` of them are direct-vs-prelim-winner;
 *    the rest are direct-vs-direct.
 *  - R2..final: empty match shells, populated as winners propagate.
 */
export function generateMatches(playerIds: string[]): GenerationResult {
  if (playerIds.length < 2) {
    throw new Error('Need at least 2 players to generate a bracket');
  }

  const shuffled = shuffle(playerIds);
  const seeds: GeneratedSeed[] = shuffled.map((id, i) => ({
    player_id: id,
    seed: i + 1
  }));

  const n = shuffled.length;
  const mainSize = largestPow2LE(n);
  const excess = n - mainSize;          // players to eliminate in prelim
  const directCount = n - 2 * excess;   // players who skip prelim

  const matches: GeneratedMatch[] = [];

  // ── Round 0 (preliminary) ─────────────────────────────────────────
  // The "extra" players paired up to fight for `excess` open R1 slots.
  for (let i = 0; i < excess; i++) {
    matches.push({
      round: 0,
      position: i,
      player1_id: shuffled[directCount + 2 * i],
      player2_id: shuffled[directCount + 2 * i + 1]
    });
  }

  // ── Round 1 ──────────────────────────────────────────────────────
  // mainSize/2 matches. First `excess` of them: direct vs (prelim-winner-pending).
  // Remaining: direct vs direct.
  // For mainSize=2 there's a single R1 match (which is the final too).
  const r1Count = Math.max(1, mainSize / 2);
  let directIdx = 0;
  for (let i = 0; i < r1Count; i++) {
    if (i < excess) {
      matches.push({
        round: 1,
        position: i,
        player1_id: shuffled[directIdx++],
        player2_id: null // filled when prelim match `i` completes
      });
    } else {
      matches.push({
        round: 1,
        position: i,
        player1_id: shuffled[directIdx++] ?? null,
        player2_id: shuffled[directIdx++] ?? null
      });
    }
  }

  // ── Rounds 2..final ──────────────────────────────────────────────
  // Empty shells; populated as winners advance.
  let roundSize = Math.floor(mainSize / 4);
  let round = 2;
  while (roundSize >= 1) {
    for (let pos = 0; pos < roundSize; pos++) {
      matches.push({ round, position: pos, player1_id: null, player2_id: null });
    }
    roundSize = Math.floor(roundSize / 2);
    round++;
  }

  return { matches, seeds };
}
