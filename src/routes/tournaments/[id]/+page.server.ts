import type { PageServerLoad } from './$types';
import { getTournament, listMatches, listTournamentPlayers, getPlayer } from '$lib/db';

export const load: PageServerLoad = async ({ params, platform, locals }) => {
  const db = platform!.env.DB;
  const tournament = await getTournament(db, params.id);
  if (!tournament) {
    return { tournament: null, matches: [], playersById: {}, champion: null, isAdmin: locals.isAdmin };
  }
  const [matches, players] = await Promise.all([
    listMatches(db, params.id),
    listTournamentPlayers(db, params.id)
  ]);
  const playersById: Record<string, { id: string; name: string }> = {};
  for (const p of players) playersById[p.player_id] = { id: p.player_id, name: p.name };

  const champion = tournament.champion_id ? await getPlayer(db, tournament.champion_id) : null;
  return { tournament, matches, playersById, champion, isAdmin: locals.isAdmin };
};
