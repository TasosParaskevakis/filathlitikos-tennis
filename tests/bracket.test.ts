import { describe, it, expect } from 'vitest';
import { nextPowerOf2, generateMatches, nextMatchPosition } from '../src/lib/bracket';

describe('nextPowerOf2', () => {
  it('returns 4 for 4', () => expect(nextPowerOf2(4)).toBe(4));
  it('returns 8 for 5', () => expect(nextPowerOf2(5)).toBe(8));
  it('returns 8 for 8', () => expect(nextPowerOf2(8)).toBe(8));
  it('returns 16 for 9', () => expect(nextPowerOf2(9)).toBe(16));
});

describe('nextMatchPosition', () => {
  it('round 1 pos 0 → round 2 pos 0 slot player1', () => {
    expect(nextMatchPosition(1, 0)).toEqual({ round: 2, position: 0, slot: 'player1' });
  });
  it('round 1 pos 1 → round 2 pos 0 slot player2', () => {
    expect(nextMatchPosition(1, 1)).toEqual({ round: 2, position: 0, slot: 'player2' });
  });
  it('round 1 pos 2 → round 2 pos 1 slot player1', () => {
    expect(nextMatchPosition(1, 2)).toEqual({ round: 2, position: 1, slot: 'player1' });
  });
  it('round 2 pos 1 → round 3 pos 0 slot player2', () => {
    expect(nextMatchPosition(2, 1)).toEqual({ round: 3, position: 0, slot: 'player2' });
  });
});

describe('generateMatches', () => {
  it('2 players: single match, no later rounds', () => {
    const result = generateMatches(['a', 'b']);
    expect(result.matches.length).toBe(1);
    const m = result.matches[0];
    expect(m.round).toBe(1);
    expect(m.player1_id).toBeTruthy();
    expect(m.player2_id).toBeTruthy();
  });

  it('3 players: 1 bye → 1 r1 match + 1 final', () => {
    const result = generateMatches(['a', 'b', 'c']);
    expect(result.matches.length).toBe(2);
    expect(result.matches.filter(m => m.round === 1).length).toBe(1);
    expect(result.matches.filter(m => m.round === 2).length).toBe(1);
    // Final has the bye player as player1 + null player2 (will be set when r1 winner advances)
    const final = result.matches.find(m => m.round === 2)!;
    expect(final.player1_id).toBeTruthy();
    expect(final.player2_id).toBeNull();
  });

  it('4 players: 2 round-1 matches, 1 final, no byes', () => {
    const players = ['a', 'b', 'c', 'd'];
    const result = generateMatches(players);
    expect(result.matches.filter(m => m.round === 1).length).toBe(2);
    expect(result.matches.filter(m => m.round === 2).length).toBe(1);
    expect(result.matches.length).toBe(3);
    for (const m of result.matches.filter(m => m.round === 1)) {
      expect(m.player1_id).toBeTruthy();
      expect(m.player2_id).toBeTruthy();
    }
    const final = result.matches.find(m => m.round === 2)!;
    expect(final.player1_id).toBeNull();
    expect(final.player2_id).toBeNull();
  });

  it('5 players: 3 byes (one r2 match has 2 byes meeting)', () => {
    const result = generateMatches(['a', 'b', 'c', 'd', 'e']);
    // pow2=8, byes=3 → 1 r1 match + 2 r2 + 1 r3 = 4 total
    expect(result.matches.length).toBe(4);
    expect(result.matches.filter(m => m.round === 1).length).toBe(1);
    expect(result.matches.filter(m => m.round === 2).length).toBe(2);
    expect(result.matches.filter(m => m.round === 3).length).toBe(1);
    // R2 has 4 player slots total; 3 are byes, 1 is null (waiting for r1 winner)
    const r2Filled = result.matches
      .filter(m => m.round === 2)
      .flatMap(m => [m.player1_id, m.player2_id])
      .filter(Boolean).length;
    expect(r2Filled).toBe(3);
  });

  it('6 players: 2 byes spread across r2 matches', () => {
    const result = generateMatches(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(result.matches.filter(m => m.round === 1).length).toBe(2);
    expect(result.matches.filter(m => m.round === 2).length).toBe(2);
    expect(result.matches.filter(m => m.round === 3).length).toBe(1);
    // Each r2 match has exactly one bye player (player1) and one null (player2 waiting for r1)
    for (const m of result.matches.filter(m => m.round === 2)) {
      const filled = [m.player1_id, m.player2_id].filter(Boolean);
      expect(filled.length).toBe(1);
    }
  });

  it('8 players: 4 + 2 + 1 = 7 matches, no byes', () => {
    const players = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const result = generateMatches(players);
    expect(result.matches.length).toBe(7);
    expect(result.matches.filter(m => m.round === 1 && m.player1_id && m.player2_id).length).toBe(4);
  });

  it('returns seeds for every player', () => {
    const players = ['a', 'b', 'c', 'd', 'e'];
    const result = generateMatches(players);
    expect(result.seeds.length).toBe(5);
    expect(new Set(result.seeds.map(s => s.player_id))).toEqual(new Set(players));
    expect(new Set(result.seeds.map(s => s.seed))).toEqual(new Set([1, 2, 3, 4, 5]));
  });

  it('shuffles players (different seedings on different runs)', () => {
    const players = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const orderings = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const r = generateMatches(players);
      const order = r.seeds.sort((x, y) => x.seed - y.seed).map(s => s.player_id).join(',');
      orderings.add(order);
    }
    expect(orderings.size).toBeGreaterThan(1);
  });

  it('throws on fewer than 2 players', () => {
    expect(() => generateMatches(['a'])).toThrow();
  });
});
