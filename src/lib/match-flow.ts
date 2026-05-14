export type FlowMatch = {
  id: string;
  round: number;
  position: number;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  status: string;
};

/**
 * Pick the next match the admin should score after saving `currentMatchId`.
 * "Next" = pending, both players known, ordered by round then position
 * (walks the bracket left-to-right, top-to-bottom). Returns null when
 * there's nothing left.
 */
export function findNextPendingMatch<M extends FlowMatch>(
  matches: M[],
  currentMatchId: string
): M | null {
  const candidates = matches
    .filter(m => m.status === 'pending')
    .filter(m => m.player1_id !== null && m.player2_id !== null)
    .filter(m => m.id !== currentMatchId)
    .sort((a, b) => a.round - b.round || a.position - b.position);
  return candidates[0] ?? null;
}
