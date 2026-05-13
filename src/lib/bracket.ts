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

export function nextPowerOf2(n: number): number {
  if (n <= 1) return 1;
  return 2 ** Math.ceil(Math.log2(n));
}

export function nextMatchPosition(round: number, position: number): NextSlot {
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
  const pow2 = nextPowerOf2(n);
  const byes = pow2 - n;

  // Special case: 2 players → single match, no later rounds
  if (pow2 === 2) {
    return {
      matches: [{ round: 1, position: 0, player1_id: shuffled[0], player2_id: shuffled[1] }],
      seeds
    };
  }

  // Build empty rounds 2..final
  const matches: GeneratedMatch[] = [];
  let roundSize = pow2 / 4;
  let round = 2;
  while (roundSize >= 1) {
    for (let pos = 0; pos < roundSize; pos++) {
      matches.push({ round, position: pos, player1_id: null, player2_id: null });
    }
    roundSize /= 2;
    round++;
  }

  // Place bye players directly into round-2 slots, spread evenly:
  //   First pass: fill player1 of each r2 match in order (one bye per match).
  //   Second pass: if byes remain, fill player2 of each r2 match in order.
  // This matches standard bracket convention — byes only meet other byes when forced
  // (i.e., when byes > number of r2 matches).
  const r2Matches = matches.filter(m => m.round === 2);
  const slotsNeedingR1Feeder: { r2Pos: number; slot: 'player1_id' | 'player2_id' }[] = [];
  let byeIdx = 0;
  for (let p = 0; p < r2Matches.length; p++) {
    if (byeIdx < byes) {
      r2Matches[p].player1_id = shuffled[byeIdx++];
    } else {
      slotsNeedingR1Feeder.push({ r2Pos: p, slot: 'player1_id' });
    }
  }
  for (let p = 0; p < r2Matches.length; p++) {
    if (byeIdx < byes) {
      r2Matches[p].player2_id = shuffled[byeIdx++];
    } else {
      slotsNeedingR1Feeder.push({ r2Pos: p, slot: 'player2_id' });
    }
  }

  // Each remaining r2 slot needs an r1 winner. Compute the r1 match position that
  // feeds it: r1 pos 2*r2Pos feeds player1, r1 pos 2*r2Pos+1 feeds player2.
  const r1Positions = slotsNeedingR1Feeder
    .map(({ r2Pos, slot }) => 2 * r2Pos + (slot === 'player2_id' ? 1 : 0))
    .sort((a, b) => a - b);

  // Pair the play players (those without byes) into r1 matches in r1-position order.
  const playPlayers = shuffled.slice(byes);
  let pi = 0;
  for (const r1Pos of r1Positions) {
    matches.push({
      round: 1,
      position: r1Pos,
      player1_id: playPlayers[pi++] ?? null,
      player2_id: playPlayers[pi++] ?? null
    });
  }

  return { matches, seeds };
}
