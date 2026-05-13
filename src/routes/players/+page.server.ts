import type { PageServerLoad } from './$types';
import { listPlayers } from '$lib/db';
import { computePlayerStats, type PlayerStats } from '$lib/stats';

export const load: PageServerLoad = async ({ platform }) => {
  const db = platform?.env.DB;
  if (!db) return { rows: [] };
  const players = await listPlayers(db);
  const rows: { id: string; name: string; stats: PlayerStats }[] = [];
  for (const p of players) {
    rows.push({ id: p.id, name: p.name, stats: await computePlayerStats(db, p.id) });
  }
  rows.sort((a, b) => {
    if (b.stats.titles !== a.stats.titles) return b.stats.titles - a.stats.titles;
    return b.stats.winPct - a.stats.winPct;
  });
  return { rows };
};
