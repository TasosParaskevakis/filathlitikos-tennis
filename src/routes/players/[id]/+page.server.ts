import type { PageServerLoad } from './$types';
import { getPlayer, listPlayers } from '$lib/db';
import { computePlayerStats } from '$lib/stats';

type MatchHistoryRow = {
  id: string;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  scores: string | null;
  tournament_name: string;
};

export const load: PageServerLoad = async ({ params, platform }) => {
  const db = platform!.env.DB;
  const player = await getPlayer(db, params.id);
  if (!player) return { player: null, stats: null, matches: [], opponents: {} };

  const stats = await computePlayerStats(db, params.id);

  // Match history (with opponent name + tournament name)
  const matches = (await db.prepare(`
    SELECT m.id, m.player1_id, m.player2_id, m.winner_id, m.scores, t.name as tournament_name
    FROM matches m
    JOIN tournaments t ON t.id = m.tournament_id
    WHERE (m.player1_id = ? OR m.player2_id = ?) AND m.status = 'completed'
    ORDER BY t.created_at DESC, m.round DESC
  `).bind(params.id, params.id).all<MatchHistoryRow>()).results ?? [];

  // Opponent name lookup
  const allPlayers = await listPlayers(db);
  const opponents: Record<string, string> = {};
  for (const p of allPlayers) opponents[p.id] = p.name;

  return { player, stats, matches, opponents };
};
