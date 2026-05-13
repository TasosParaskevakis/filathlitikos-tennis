export type Player = {
  id: string;
  name: string;
  created_at: number;
};

export type TournamentCategory = string;
export type TournamentStatus = 'setup' | 'in_progress' | 'completed';

export type Tournament = {
  id: string;
  name: string;
  category: TournamentCategory;
  best_of: number;
  status: TournamentStatus;
  champion_id: string | null;
  created_at: number;
};

export type Match = {
  id: string;
  tournament_id: string;
  round: number;
  position: number;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  scores: string | null;
  status: 'pending' | 'completed';
  scheduled_date: string | null; // 'YYYY-MM-DD'
};

export type TournamentPlayer = {
  tournament_id: string;
  player_id: string;
  seed: number;
};

function uuid(): string {
  return crypto.randomUUID();
}

// ---------- Players ----------
export async function listPlayers(db: D1Database): Promise<Player[]> {
  const r = await db.prepare('SELECT * FROM players ORDER BY name').all<Player>();
  return r.results ?? [];
}

export async function getPlayer(db: D1Database, id: string): Promise<Player | null> {
  return await db.prepare('SELECT * FROM players WHERE id = ?').bind(id).first<Player>();
}

export async function createPlayer(db: D1Database, name: string): Promise<Player> {
  const id = uuid();
  const created_at = Date.now();
  await db.prepare('INSERT INTO players (id, name, created_at) VALUES (?, ?, ?)')
    .bind(id, name, created_at).run();
  return { id, name, created_at };
}

export async function renamePlayer(db: D1Database, id: string, name: string): Promise<void> {
  await db.prepare('UPDATE players SET name = ? WHERE id = ?').bind(name, id).run();
}

export async function deletePlayer(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM players WHERE id = ?').bind(id).run();
}

// ---------- Tournaments ----------
export async function listTournaments(db: D1Database): Promise<Tournament[]> {
  const r = await db.prepare('SELECT * FROM tournaments ORDER BY created_at DESC').all<Tournament>();
  return r.results ?? [];
}

export async function getTournament(db: D1Database, id: string): Promise<Tournament | null> {
  return await db.prepare('SELECT * FROM tournaments WHERE id = ?').bind(id).first<Tournament>();
}

export async function createTournament(
  db: D1Database,
  name: string,
  category: TournamentCategory,
  best_of: number
): Promise<Tournament> {
  const id = uuid();
  const created_at = Date.now();
  await db.prepare(
    'INSERT INTO tournaments (id, name, category, best_of, status, champion_id, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?)'
  ).bind(id, name, category, best_of, 'setup', created_at).run();
  return {
    id, name, category, best_of, status: 'setup', champion_id: null, created_at
  };
}

export async function deleteTournament(db: D1Database, id: string): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM matches WHERE tournament_id = ?').bind(id),
    db.prepare('DELETE FROM tournament_players WHERE tournament_id = ?').bind(id),
    db.prepare('DELETE FROM tournaments WHERE id = ?').bind(id)
  ]);
}

export async function setTournamentStatus(
  db: D1Database, id: string, status: TournamentStatus, champion_id: string | null = null
): Promise<void> {
  await db.prepare('UPDATE tournaments SET status = ?, champion_id = ? WHERE id = ?')
    .bind(status, champion_id, id).run();
}

// ---------- Tournament players ----------
export async function listTournamentPlayers(db: D1Database, tournamentId: string): Promise<(TournamentPlayer & { name: string })[]> {
  const r = await db.prepare(
    'SELECT tp.tournament_id, tp.player_id, tp.seed, p.name FROM tournament_players tp JOIN players p ON p.id = tp.player_id WHERE tp.tournament_id = ? ORDER BY tp.seed'
  ).bind(tournamentId).all<TournamentPlayer & { name: string }>();
  return r.results ?? [];
}

export async function addTournamentPlayer(db: D1Database, tournamentId: string, playerId: string): Promise<void> {
  // Use a temporary seed of 0; real seeds assigned at bracket generation
  await db.prepare(
    'INSERT OR IGNORE INTO tournament_players (tournament_id, player_id, seed) VALUES (?, ?, 0)'
  ).bind(tournamentId, playerId).run();
}

export async function removeTournamentPlayer(db: D1Database, tournamentId: string, playerId: string): Promise<void> {
  await db.prepare('DELETE FROM tournament_players WHERE tournament_id = ? AND player_id = ?')
    .bind(tournamentId, playerId).run();
}

// ---------- Matches ----------
export async function listMatches(db: D1Database, tournamentId: string): Promise<Match[]> {
  const r = await db.prepare('SELECT * FROM matches WHERE tournament_id = ? ORDER BY round, position').bind(tournamentId).all<Match>();
  return r.results ?? [];
}

export async function getMatch(db: D1Database, id: string): Promise<Match | null> {
  return await db.prepare('SELECT * FROM matches WHERE id = ?').bind(id).first<Match>();
}

export async function getMatchAt(
  db: D1Database, tournamentId: string, round: number, position: number
): Promise<Match | null> {
  return await db.prepare(
    'SELECT * FROM matches WHERE tournament_id = ? AND round = ? AND position = ?'
  ).bind(tournamentId, round, position).first<Match>();
}

export async function insertMatches(db: D1Database, tournamentId: string, matches: Omit<Match, 'id' | 'tournament_id'>[]): Promise<void> {
  const stmts = matches.map(m =>
    db.prepare(
      'INSERT INTO matches (id, tournament_id, round, position, player1_id, player2_id, winner_id, scores, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(uuid(), tournamentId, m.round, m.position, m.player1_id, m.player2_id, m.winner_id, m.scores, m.status)
  );
  await db.batch(stmts);
}

export async function assignTournamentSeeds(
  db: D1Database, tournamentId: string, seeds: { player_id: string; seed: number }[]
): Promise<void> {
  const stmts = seeds.map(s =>
    db.prepare('UPDATE tournament_players SET seed = ? WHERE tournament_id = ? AND player_id = ?')
      .bind(s.seed, tournamentId, s.player_id)
  );
  await db.batch(stmts);
}

export async function clearMatches(db: D1Database, tournamentId: string): Promise<void> {
  await db.prepare('DELETE FROM matches WHERE tournament_id = ?').bind(tournamentId).run();
}

export async function updateMatch(
  db: D1Database, id: string,
  fields: Partial<Pick<Match, 'player1_id' | 'player2_id' | 'winner_id' | 'scores' | 'status' | 'scheduled_date'>>
): Promise<void> {
  const sets: string[] = [];
  const values: (string | null)[] = [];
  for (const [k, v] of Object.entries(fields)) {
    sets.push(`${k} = ?`);
    values.push(v as string | null);
  }
  if (sets.length === 0) return;
  values.push(id);
  await db.prepare(`UPDATE matches SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();
}

// ---------- Schedule ----------
export type DayMatch = Match & {
  tournament_name: string;
  tournament_category: string;
  tournament_best_of: number;
  player1_name: string | null;
  player2_name: string | null;
};

export async function listMatchesByDate(db: D1Database, date: string): Promise<DayMatch[]> {
  const r = await db.prepare(`
    SELECT
      m.*,
      t.name as tournament_name,
      t.category as tournament_category,
      t.best_of as tournament_best_of,
      p1.name as player1_name,
      p2.name as player2_name
    FROM matches m
    JOIN tournaments t ON t.id = m.tournament_id
    LEFT JOIN players p1 ON p1.id = m.player1_id
    LEFT JOIN players p2 ON p2.id = m.player2_id
    WHERE m.scheduled_date = ?
    ORDER BY m.status ASC, t.name ASC, m.round ASC, m.position ASC
  `).bind(date).all<DayMatch>();
  return r.results ?? [];
}

export async function countMatchesByDate(db: D1Database, date: string): Promise<number> {
  const r = await db.prepare('SELECT COUNT(*) as n FROM matches WHERE scheduled_date = ?').bind(date).first<{ n: number }>();
  return r?.n ?? 0;
}
