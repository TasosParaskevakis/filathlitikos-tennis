import type { PageServerLoad } from './$types';
import { listTournaments, listMatches, getPlayer } from '$lib/db';

export const load: PageServerLoad = async ({ platform }) => {
  const db = platform?.env.DB;
  if (!db) {
    return { inProgress: [], completed: [], upcoming: [] };
  }
  const all = await listTournaments(db);

  const inProgressRaw = all.filter(t => t.status === 'in_progress');
  const completedRaw = all.filter(t => t.status === 'completed');
  const upcoming = all.filter(t => t.status === 'setup');

  // For in-progress: compute "Round X of Y" so we can show progress.
  const inProgress = await Promise.all(inProgressRaw.map(async t => {
    const matches = await listMatches(db, t.id);
    const totalRounds = matches.length
      ? Math.max(...matches.map(m => m.round))
      : 0;
    // Current round = lowest round that still has any incomplete match.
    const incomplete = matches.filter(m => m.status !== 'completed');
    const currentRound = incomplete.length
      ? Math.min(...incomplete.map(m => m.round))
      : totalRounds;
    return { ...t, currentRound, totalRounds };
  }));

  // For completed: also fetch champion name + id for badge.
  const completed = await Promise.all(completedRaw.map(async t => {
    const champion = t.champion_id ? await getPlayer(db, t.champion_id) : null;
    return { ...t, champion };
  }));

  return { inProgress, completed, upcoming };
};
