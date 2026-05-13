import type { PageServerLoad } from './$types';
import { listPlayers } from '$lib/db';
import { computePlayerStats, type PlayerStats } from '$lib/stats';

type Row = { id: string; name: string; stats: PlayerStats };

function sortRows(a: Row, b: Row) {
  if (b.stats.titles !== a.stats.titles) return b.stats.titles - a.stats.titles;
  return b.stats.winPct - a.stats.winPct;
}

export const load: PageServerLoad = async ({ platform }) => {
  const db = platform?.env.DB;
  if (!db) return { categories: [], rowsByCategory: {} as Record<string, Row[]> };

  const players = await listPlayers(db);

  // Map player_id → set of category names they've appeared in (via tournament_players → tournaments)
  const playerCategories = (await db.prepare(`
    SELECT DISTINCT tp.player_id, t.category
    FROM tournament_players tp
    JOIN tournaments t ON t.id = tp.tournament_id
  `).all<{ player_id: string; category: string }>()).results ?? [];

  const playerToCategories = new Map<string, Set<string>>();
  for (const r of playerCategories) {
    if (!r.category) continue;
    if (!playerToCategories.has(r.player_id)) playerToCategories.set(r.player_id, new Set());
    playerToCategories.get(r.player_id)!.add(r.category);
  }

  // Compute stats once per player
  const allRows: Row[] = [];
  for (const p of players) {
    allRows.push({ id: p.id, name: p.name, stats: await computePlayerStats(db, p.id) });
  }
  allRows.sort(sortRows);

  // Group by category. Players appear in every category they've competed in.
  const categorySet = new Set<string>();
  for (const cats of playerToCategories.values()) {
    for (const c of cats) categorySet.add(c);
  }
  const categories = [...categorySet].sort();

  const rowsByCategory: Record<string, Row[]> = {};
  for (const cat of categories) {
    rowsByCategory[cat] = allRows.filter(r => playerToCategories.get(r.id)?.has(cat));
  }

  // Fallback: if no categories exist yet (no tournaments), show all players under "All players"
  if (categories.length === 0 && allRows.length > 0) {
    categories.push('All players');
    rowsByCategory['All players'] = allRows;
  }

  return { categories, rowsByCategory };
};
