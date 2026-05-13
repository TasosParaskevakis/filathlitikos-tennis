import { parseScores } from './scores';
import type { Match, Tournament } from './db';

export type StatMatch = Pick<Match, 'tournament_id' | 'player1_id' | 'player2_id' | 'winner_id' | 'scores' | 'status'>;
export type StatTournament = Pick<Tournament, 'id' | 'champion_id'>;

export type PlayerStats = {
  tournamentsPlayed: number;
  titles: number;
  wins: number;
  losses: number;
  winPct: number;          // 0..1
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  currentStreak: number;
  longestStreak: number;
  headToHead: Record<string, { wins: number; losses: number }>;
};

export function computeStatsFromMatches(
  playerId: string,
  matches: StatMatch[],
  tournaments: StatTournament[]
): PlayerStats {
  const completed = matches.filter(m => m.status === 'completed');
  const playerMatches = completed.filter(
    m => m.player1_id === playerId || m.player2_id === playerId
  );

  let wins = 0, losses = 0;
  let setsWon = 0, setsLost = 0;
  let gamesWon = 0, gamesLost = 0;
  const headToHead: Record<string, { wins: number; losses: number }> = {};
  let currentStreak = 0;
  let longestStreak = 0;
  let runningStreak = 0;

  for (const m of playerMatches) {
    const opponent = m.player1_id === playerId ? m.player2_id : m.player1_id;
    const isP1 = m.player1_id === playerId;
    const won = m.winner_id === playerId;
    if (won) {
      wins++;
      runningStreak++;
      longestStreak = Math.max(longestStreak, runningStreak);
    } else {
      losses++;
      runningStreak = 0;
    }
    currentStreak = runningStreak;

    if (opponent) {
      headToHead[opponent] ??= { wins: 0, losses: 0 };
      if (won) headToHead[opponent].wins++;
      else headToHead[opponent].losses++;
    }

    const scores = parseScores(m.scores);
    for (const [a, b] of scores) {
      const myGames = isP1 ? a : b;
      const oppGames = isP1 ? b : a;
      gamesWon += myGames;
      gamesLost += oppGames;
      if (myGames > oppGames) setsWon++;
      else if (oppGames > myGames) setsLost++;
    }
  }

  const tournamentsPlayed = new Set(playerMatches.map(m => m.tournament_id)).size;
  const titles = tournaments.filter(t => t.champion_id === playerId).length;
  const totalMatches = wins + losses;
  const winPct = totalMatches === 0 ? 0 : wins / totalMatches;

  return {
    tournamentsPlayed, titles, wins, losses, winPct,
    setsWon, setsLost, gamesWon, gamesLost,
    currentStreak, longestStreak, headToHead
  };
}

// Convenience function that pulls the data from D1 first
export async function computePlayerStats(db: D1Database, playerId: string): Promise<PlayerStats> {
  const matches = (await db.prepare(
    'SELECT tournament_id, player1_id, player2_id, winner_id, scores, status FROM matches WHERE (player1_id = ? OR player2_id = ?) AND status = ?'
  ).bind(playerId, playerId, 'completed').all<StatMatch>()).results ?? [];
  const tournaments = (await db.prepare(
    'SELECT id, champion_id FROM tournaments'
  ).all<StatTournament>()).results ?? [];
  return computeStatsFromMatches(playerId, matches, tournaments);
}
