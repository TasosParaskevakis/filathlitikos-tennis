import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
  getTournament, listPlayers, listTournamentPlayers,
  addTournamentPlayer, removeTournamentPlayer, listMatches
} from '$lib/db';

export const load: PageServerLoad = async ({ params, platform }) => {
  const db = platform!.env.DB;
  const tournament = await getTournament(db, params.id);
  if (!tournament) return { tournament: null, allPlayers: [], tournamentPlayers: [], matches: [] };
  const [allPlayers, tournamentPlayers, matches] = await Promise.all([
    listPlayers(db),
    listTournamentPlayers(db, params.id),
    listMatches(db, params.id)
  ]);
  return { tournament, allPlayers, tournamentPlayers, matches };
};

export const actions: Actions = {
  addPlayer: async ({ request, params, platform }) => {
    const data = await request.formData();
    const playerId = String(data.get('player_id') ?? '');
    if (!playerId) return fail(400, { error: 'Missing player_id' });
    await addTournamentPlayer(platform!.env.DB, params.id, playerId);
    return { ok: true };
  },
  removePlayer: async ({ request, params, platform }) => {
    const data = await request.formData();
    const playerId = String(data.get('player_id') ?? '');
    if (!playerId) return fail(400, { error: 'Missing player_id' });
    await removeTournamentPlayer(platform!.env.DB, params.id, playerId);
    return { ok: true };
  }
};
