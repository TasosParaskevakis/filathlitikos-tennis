import { describe, it, expect } from 'vitest';
import { computeStatsFromMatches, type StatMatch } from '../src/lib/stats';

const tournaments = [
  { id: 't1', champion_id: 'p1' },
  { id: 't2', champion_id: 'p2' }
];

const matches: StatMatch[] = [
  // t1: p1 beats p2 in final
  { tournament_id: 't1', player1_id: 'p1', player2_id: 'p2', winner_id: 'p1', scores: '[[6,3],[6,2]]', status: 'completed' },
  // t2: p2 beats p1 in semi, p2 beats p3 in final
  { tournament_id: 't2', player1_id: 'p1', player2_id: 'p2', winner_id: 'p2', scores: '[[3,6],[4,6]]', status: 'completed' },
  { tournament_id: 't2', player1_id: 'p2', player2_id: 'p3', winner_id: 'p2', scores: '[[6,4],[6,4]]', status: 'completed' }
];

describe('computeStatsFromMatches', () => {
  it('counts matches W-L', () => {
    const s = computeStatsFromMatches('p1', matches, tournaments);
    expect(s.wins).toBe(1);
    expect(s.losses).toBe(1);
    expect(s.winPct).toBeCloseTo(0.5);
  });

  it('counts titles', () => {
    expect(computeStatsFromMatches('p1', matches, tournaments).titles).toBe(1);
    expect(computeStatsFromMatches('p2', matches, tournaments).titles).toBe(1);
    expect(computeStatsFromMatches('p3', matches, tournaments).titles).toBe(0);
  });

  it('counts sets W-L', () => {
    // p1: in t1 won 6-3 and 6-2 → 2 sets won. In t2 lost 3-6 and 4-6 → 0 sets won, 2 sets lost
    const s = computeStatsFromMatches('p1', matches, tournaments);
    expect(s.setsWon).toBe(2);
    expect(s.setsLost).toBe(2);
  });

  it('counts games W-L', () => {
    // p1 games: t1 6+6=12 won, 3+2=5 lost; t2 3+4=7 won, 6+6=12 lost
    const s = computeStatsFromMatches('p1', matches, tournaments);
    expect(s.gamesWon).toBe(19);
    expect(s.gamesLost).toBe(17);
  });

  it('computes head-to-head', () => {
    const s = computeStatsFromMatches('p1', matches, tournaments);
    expect(s.headToHead.p2).toEqual({ wins: 1, losses: 1 });
  });

  it('counts current streak (last result onward)', () => {
    const s = computeStatsFromMatches('p2', matches, tournaments);
    // p2's matches in array order: lost (t1), won (t2 vs p1), won (t2 vs p3) → current streak = 2
    expect(s.currentStreak).toBe(2);
    expect(s.longestStreak).toBe(2);
  });

  it('counts tournaments played', () => {
    expect(computeStatsFromMatches('p1', matches, tournaments).tournamentsPlayed).toBe(2);
    expect(computeStatsFromMatches('p3', matches, tournaments).tournamentsPlayed).toBe(1);
  });
});
