import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getMatch, updateMatch, getTournament, getMatchAt, setTournamentStatus } from '$lib/db';
import { computeWinner, type Scores } from '$lib/scores';
import { nextMatchPosition } from '$lib/bracket';

export const POST: RequestHandler = async ({ params, request, locals, platform }) => {
  if (!locals.isAdmin) error(401);
  const db = platform!.env.DB;
  const match = await getMatch(db, params.id);
  if (!match) error(404);

  const body = await request.json() as { scores: Scores };
  const scores: Scores = body.scores ?? [];
  const winnerSlot = computeWinner(scores);
  const winner_id = winnerSlot === 1 ? match.player1_id : winnerSlot === 2 ? match.player2_id : null;

  await updateMatch(db, match.id, {
    scores: JSON.stringify(scores),
    winner_id,
    status: winner_id ? 'completed' : 'pending'
  });

  // Advance winner to the next round, if there is one
  if (winner_id) {
    const next = nextMatchPosition(match.round, match.position);
    const nextMatch = await getMatchAt(db, match.tournament_id, next.round, next.position);
    if (nextMatch) {
      await updateMatch(db, nextMatch.id, {
        [next.slot === 'player1' ? 'player1_id' : 'player2_id']: winner_id
      });
    } else {
      // No next match → this WAS the final → tournament complete
      const t = await getTournament(db, match.tournament_id);
      if (t) await setTournamentStatus(db, t.id, 'completed', winner_id);
    }
  }

  return json({ ok: true });
};
