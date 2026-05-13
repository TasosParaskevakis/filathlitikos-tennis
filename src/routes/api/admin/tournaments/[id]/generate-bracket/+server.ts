import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  getTournament, listTournamentPlayers, clearMatches, insertMatches,
  assignTournamentSeeds, setTournamentStatus
} from '$lib/db';
import { generateMatches } from '$lib/bracket';

export const POST: RequestHandler = async ({ params, locals, platform }) => {
  if (!locals.isAdmin) error(401);
  const db = platform!.env.DB;
  const t = await getTournament(db, params.id);
  if (!t) error(404);
  if (t.status !== 'setup') error(400, 'Bracket already generated');

  const players = await listTournamentPlayers(db, params.id);
  if (players.length < 2) error(400, 'Need at least 2 players');

  const result = generateMatches(players.map(p => p.player_id));
  await clearMatches(db, params.id);
  await insertMatches(db, params.id, result.matches.map(m => ({
    round: m.round,
    position: m.position,
    player1_id: m.player1_id,
    player2_id: m.player2_id,
    winner_id: null,
    scores: null,
    status: 'pending' as const,
    scheduled_date: null
  })));
  await assignTournamentSeeds(db, params.id, result.seeds);
  await setTournamentStatus(db, params.id, 'in_progress');

  return json({ ok: true });
};
