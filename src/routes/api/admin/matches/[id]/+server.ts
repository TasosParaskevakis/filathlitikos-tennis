import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getMatch, updateMatch, getTournament, getMatchAt, setTournamentStatus } from '$lib/db';
import { computeWinner, type Scores } from '$lib/scores';
import { nextMatchPosition } from '$lib/bracket';

type Body = {
  scores?: Scores;
  scheduled_date?: string | null; // 'YYYY-MM-DD' or null to clear
};

export const POST: RequestHandler = async ({ params, request, locals, platform }) => {
  if (!locals.isAdmin) error(401);
  const db = platform!.env.DB;
  const match = await getMatch(db, params.id);
  if (!match) error(404);

  const body = (await request.json()) as Body;
  const scores: Scores = body.scores ?? [];
  const winnerSlot = computeWinner(scores);
  const winner_id =
    winnerSlot === 1 ? match.player1_id :
    winnerSlot === 2 ? match.player2_id : null;

  // Build the update payload.
  const update: Parameters<typeof updateMatch>[2] = {
    scores: JSON.stringify(scores),
    winner_id,
    status: winner_id ? 'completed' : 'pending'
  };

  // scheduled_date: only touch the column if the body explicitly includes the
  // key (allows save-without-date OR explicit clear via empty string / null).
  if ('scheduled_date' in body) {
    const d = body.scheduled_date;
    update.scheduled_date = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
  }

  await updateMatch(db, match.id, update);

  // Advance winner to the next round, if there is one
  if (winner_id) {
    const next = nextMatchPosition(match.round, match.position);
    const nextMatch = await getMatchAt(db, match.tournament_id, next.round, next.position);
    if (nextMatch) {
      await updateMatch(db, nextMatch.id, {
        [next.slot === 'player1' ? 'player1_id' : 'player2_id']: winner_id
      });
    } else {
      const t = await getTournament(db, match.tournament_id);
      if (t) await setTournamentStatus(db, t.id, 'completed', winner_id);
    }
  }

  return json({ ok: true });
};
