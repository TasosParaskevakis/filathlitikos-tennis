import type { PageServerLoad } from './$types';
import { listPlayers } from '$lib/db';
import {
  computeStatsFromMatches,
  type PlayerStats,
  type StatMatch,
  type StatTournament
} from '$lib/stats';

type Row = { id: string; name: string; stats: PlayerStats };

function sortRows(a: Row, b: Row) {
  if (b.stats.titles !== a.stats.titles) return b.stats.titles - a.stats.titles;
  return b.stats.winPct - a.stats.winPct;
}

export const load: PageServerLoad = async ({ platform }) => {
  const db = platform?.env.DB;
  if (!db) return { categories: [], rowsByCategory: {} as Record<string, Row[]> };

  // Fetch everything in parallel — 4 round-trips total instead of N+1.
  // For 16 players we used to do 1 + 1 + 16*2 = 34 queries; now it's 4.
  const [players, completedMatchesRes, tournamentsRes, playerCategoriesRes] = await Promise.all([
    listPlayers(db),
    db.prepare(`
      SELECT tournament_id, player1_id, player2_id, winner_id, scores, status
      FROM matches WHERE status = 'completed'
    `).all<StatMatch>(),
    db.prepare(`SELECT id, champion_id FROM tournaments`).all<StatTournament>(),
    db.prepare(`
      SELECT DISTINCT tp.player_id, t.category
      FROM tournament_players tp
      JOIN tournaments t ON t.id = tp.tournament_id
    `).all<{ player_id: string; category: string }>()
  ]);

  const allMatches = completedMatchesRes.results ?? [];
  const allTournaments = tournamentsRes.results ?? [];
  const playerCategories = playerCategoriesRes.results ?? [];

  const playerToCategories = new Map<string, Set<string>>();
  for (const r of playerCategories) {
    if (!r.category) continue;
    if (!playerToCategories.has(r.player_id)) playerToCategories.set(r.player_id, new Set());
    playerToCategories.get(r.player_id)!.add(r.category);
  }

  // Compute stats per player from in-memory data (no extra DB queries).
  const allRows: Row[] = players.map((p) => ({
    id: p.id,
    name: p.name,
    stats: computeStatsFromMatches(p.id, allMatches, allTournaments)
  }));
  allRows.sort(sortRows);

  const categorySet = new Set<string>();
  for (const cats of playerToCategories.values()) {
    for (const c of cats) categorySet.add(c);
  }
  const categories = [...categorySet].sort();

  const rowsByCategory: Record<string, Row[]> = {};
  for (const cat of categories) {
    rowsByCategory[cat] = allRows.filter((r) => playerToCategories.get(r.id)?.has(cat));
  }

  if (categories.length === 0 && allRows.length > 0) {
    categories.push('All players');
    rowsByCategory['All players'] = allRows;
  }

  return { categories, rowsByCategory };
};
