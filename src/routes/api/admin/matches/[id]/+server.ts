import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getMatch, updateMatch, getTournament, getMatchAt, setTournamentStatus, type Match } from '$lib/db';
import { computeWinner, type Scores } from '$lib/scores';
import { nextMatchPosition } from '$lib/bracket';

type Body =
  | { scores: Scores; scheduled_date?: string | null }
  | { walkover_winner_id: string; scheduled_date?: string | null }
  | { scheduled_date: string | null };

function normalizeDate(d: string | null | undefined): string | null {
  if (d == null) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

export const POST: RequestHandler = async ({ params, request, locals, platform }) => {
  if (!locals.isAdmin) error(401);
  const db = platform!.env.DB;
  const match = await getMatch(db, params.id);
  if (!match) error(404);

  const body = (await request.json()) as Body;

  // Branch 1: walkover — set winner directly, no scores
  if ('walkover_winner_id' in body && body.walkover_winner_id) {
    const winner_id = body.walkover_winner_id;
    if (winner_id !== match.player1_id && winner_id !== match.player2_id) {
      error(400, 'walkover_winner_id must be one of the match players');
    }
    await updateMatch(db, match.id, {
      scores: null,
      winner_id,
      status: 'completed',
      ...('scheduled_date' in body ? { scheduled_date: normalizeDate(body.scheduled_date) } : {})
    });
    await advanceWinner(db, match, winner_id);
    return json({ ok: true });
  }

  // Branch 2: score save (or score + scheduled_date)
  if ('scores' in body) {
    const scores: Scores = body.scores ?? [];
    const winnerSlot = computeWinner(scores);
    const winner_id =
      winnerSlot === 1 ? match.player1_id :
      winnerSlot === 2 ? match.player2_id : null;
    await updateMatch(db, match.id, {
      scores: JSON.stringify(scores),
      winner_id,
      status: winner_id ? 'completed' : 'pending',
      ...('scheduled_date' in body ? { scheduled_date: normalizeDate(body.scheduled_date) } : {})
    });
    if (winner_id) await advanceWinner(db, match, winner_id);
    return json({ ok: true });
  }

  // Branch 3: just updating scheduled_date
  if ('scheduled_date' in body) {
    await updateMatch(db, match.id, { scheduled_date: normalizeDate(body.scheduled_date) });
    return json({ ok: true });
  }

  error(400, 'Body must contain scores, walkover_winner_id, or scheduled_date');
};

async function advanceWinner(
  db: D1Database,
  match: Match,
  winner_id: string
) {
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
