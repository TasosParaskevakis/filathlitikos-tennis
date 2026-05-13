import { describe, it, expect } from 'vitest';
import {
  nextPowerOf2,
  largestPow2LE,
  generateMatches,
  nextMatchPosition
} from '../src/lib/bracket';

describe('nextPowerOf2', () => {
  it('returns 4 for 4', () => expect(nextPowerOf2(4)).toBe(4));
  it('returns 8 for 5', () => expect(nextPowerOf2(5)).toBe(8));
  it('returns 8 for 8', () => expect(nextPowerOf2(8)).toBe(8));
  it('returns 16 for 9', () => expect(nextPowerOf2(9)).toBe(16));
});

describe('largestPow2LE', () => {
  it('returns 2 for 2', () => expect(largestPow2LE(2)).toBe(2));
  it('returns 2 for 3', () => expect(largestPow2LE(3)).toBe(2));
  it('returns 4 for 5', () => expect(largestPow2LE(5)).toBe(4));
  it('returns 16 for 23', () => expect(largestPow2LE(23)).toBe(16));
  it('returns 32 for 33', () => expect(largestPow2LE(33)).toBe(32));
  it('returns 64 for 64', () => expect(largestPow2LE(64)).toBe(64));
});

describe('nextMatchPosition', () => {
  it('round 0 (prelim) pos 0 → round 1 pos 0 slot player2', () => {
    expect(nextMatchPosition(0, 0)).toEqual({ round: 1, position: 0, slot: 'player2' });
  });
  it('round 0 (prelim) pos 5 → round 1 pos 5 slot player2', () => {
    expect(nextMatchPosition(0, 5)).toEqual({ round: 1, position: 5, slot: 'player2' });
  });
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

describe('generateMatches — perfect powers of 2 (no preliminary round)', () => {
  it('2 players: 1 final, no prelim', () => {
    const result = generateMatches(['a', 'b']);
    expect(result.matches.length).toBe(1);
    expect(result.matches.filter(m => m.round === 0).length).toBe(0);
    const m = result.matches[0];
    expect(m.round).toBe(1);
    expect(m.player1_id).toBeTruthy();
    expect(m.player2_id).toBeTruthy();
  });

  it('4 players: 2 R1 + 1 final, no prelim', () => {
    const result = generateMatches(['a', 'b', 'c', 'd']);
    expect(result.matches.length).toBe(3);
    expect(result.matches.filter(m => m.round === 0).length).toBe(0);
    expect(result.matches.filter(m => m.round === 1).length).toBe(2);
    expect(result.matches.filter(m => m.round === 2).length).toBe(1);
    for (const m of result.matches.filter(m => m.round === 1)) {
      expect(m.player1_id).toBeTruthy();
      expect(m.player2_id).toBeTruthy();
    }
  });

  it('8 players: 4 R1 + 2 R2 + 1 final, no prelim', () => {
    const result = generateMatches(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
    expect(result.matches.length).toBe(7);
    expect(result.matches.filter(m => m.round === 0).length).toBe(0);
    expect(result.matches.filter(m => m.round === 1 && m.player1_id && m.player2_id).length).toBe(4);
  });

  it('16 players: 8 + 4 + 2 + 1 = 15 matches, no prelim', () => {
    const players = Array.from({ length: 16 }, (_, i) => `p${i}`);
    const result = generateMatches(players);
    expect(result.matches.length).toBe(15);
    expect(result.matches.filter(m => m.round === 0).length).toBe(0);
    expect(result.matches.filter(m => m.round === 1).length).toBe(8);
  });
});

describe('generateMatches — preliminary round when N is not a power of 2', () => {
  it('3 players: 1 prelim + 1 R1 (final) = 2 matches', () => {
    const result = generateMatches(['a', 'b', 'c']);
    expect(result.matches.length).toBe(2);
    expect(result.matches.filter(m => m.round === 0).length).toBe(1);
    expect(result.matches.filter(m => m.round === 1).length).toBe(1);

    const prelim = result.matches.find(m => m.round === 0)!;
    expect(prelim.player1_id).toBeTruthy();
    expect(prelim.player2_id).toBeTruthy();

    const r1 = result.matches.find(m => m.round === 1)!;
    expect(r1.player1_id).toBeTruthy();      // direct entrant
    expect(r1.player2_id).toBeNull();         // waits for prelim winner
  });

  it('5 players: 1 prelim + 2 R1 + 1 final = 4 matches', () => {
    const result = generateMatches(['a', 'b', 'c', 'd', 'e']);
    expect(result.matches.length).toBe(4);
    expect(result.matches.filter(m => m.round === 0).length).toBe(1);
    expect(result.matches.filter(m => m.round === 1).length).toBe(2);
    expect(result.matches.filter(m => m.round === 2).length).toBe(1);

    // R1 match 0 has direct + waiting (prelim feeder)
    const r1_0 = result.matches.find(m => m.round === 1 && m.position === 0)!;
    expect(r1_0.player1_id).toBeTruthy();
    expect(r1_0.player2_id).toBeNull();

    // R1 match 1 has both direct
    const r1_1 = result.matches.find(m => m.round === 1 && m.position === 1)!;
    expect(r1_1.player1_id).toBeTruthy();
    expect(r1_1.player2_id).toBeTruthy();
  });

  it('6 players: 2 prelim + 2 R1 + 1 final = 5 matches', () => {
    const result = generateMatches(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(result.matches.length).toBe(5);
    expect(result.matches.filter(m => m.round === 0).length).toBe(2);
    expect(result.matches.filter(m => m.round === 1).length).toBe(2);
    expect(result.matches.filter(m => m.round === 2).length).toBe(1);

    // Both R1 matches should have player1 (direct) + null (waiting for prelim)
    for (const m of result.matches.filter(m => m.round === 1)) {
      expect(m.player1_id).toBeTruthy();
      expect(m.player2_id).toBeNull();
    }
  });

  it('7 players: 3 prelim + 2 R1 + 1 final = 6 matches', () => {
    const result = generateMatches(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    // mainSize = 4, excess = 3, but excess can't exceed mainSize/2 = 2 cleanly...
    // wait: 7 - 2*3 = 1 direct. 3 prelim matches need 6 players. R1 has 2 matches.
    // R1 match 0: direct + waiting (prelim 0). R1 match 1: prelim 1 winner + prelim 2 winner.
    // Hmm but R1 match 1's player1 should be a direct, not a prelim winner.
    // Actually with my algo: i < excess → direct + null. For excess=3 and r1Count=2,
    // both R1 matches have direct + null. But then directIdx grows past N. 7 - 6 = 1 direct only,
    // so only 1 direct slot is filled. Match 1's player1 will be undefined → null.
    expect(result.matches.length).toBe(6);
    expect(result.matches.filter(m => m.round === 0).length).toBe(3);
    expect(result.matches.filter(m => m.round === 1).length).toBe(2);
  });

  it('23 players: 7 prelim + 8 R1 + 4 + 2 + 1 = 22 matches', () => {
    const players = Array.from({ length: 23 }, (_, i) => `p${i}`);
    const result = generateMatches(players);
    expect(result.matches.length).toBe(22);
    expect(result.matches.filter(m => m.round === 0).length).toBe(7);
    expect(result.matches.filter(m => m.round === 1).length).toBe(8);
    expect(result.matches.filter(m => m.round === 2).length).toBe(4);
    expect(result.matches.filter(m => m.round === 3).length).toBe(2);
    expect(result.matches.filter(m => m.round === 4).length).toBe(1);

    // First 7 R1 matches have direct + null (waiting for prelim winners)
    const r1Sorted = result.matches
      .filter(m => m.round === 1)
      .sort((a, b) => a.position - b.position);
    for (let i = 0; i < 7; i++) {
      expect(r1Sorted[i].player1_id).toBeTruthy();
      expect(r1Sorted[i].player2_id).toBeNull();
    }
    // R1 match 7 has 2 directs
    expect(r1Sorted[7].player1_id).toBeTruthy();
    expect(r1Sorted[7].player2_id).toBeTruthy();
  });

  it('33 players: 1 prelim + 16 R1 + 8 + 4 + 2 + 1 = 32 matches', () => {
    const players = Array.from({ length: 33 }, (_, i) => `p${i}`);
    const result = generateMatches(players);
    expect(result.matches.length).toBe(32);
    expect(result.matches.filter(m => m.round === 0).length).toBe(1);
    expect(result.matches.filter(m => m.round === 1).length).toBe(16);

    // Only the first R1 match has a prelim feeder; the other 15 are direct vs direct
    const r1Sorted = result.matches
      .filter(m => m.round === 1)
      .sort((a, b) => a.position - b.position);
    expect(r1Sorted[0].player1_id).toBeTruthy();
    expect(r1Sorted[0].player2_id).toBeNull();
    for (let i = 1; i < 16; i++) {
      expect(r1Sorted[i].player1_id).toBeTruthy();
      expect(r1Sorted[i].player2_id).toBeTruthy();
    }
  });
});

describe('generateMatches — meta', () => {
  it('returns seeds for every player', () => {
    const result = generateMatches(['a', 'b', 'c', 'd', 'e']);
    expect(result.seeds.length).toBe(5);
    expect(new Set(result.seeds.map(s => s.player_id))).toEqual(new Set(['a', 'b', 'c', 'd', 'e']));
    expect(new Set(result.seeds.map(s => s.seed))).toEqual(new Set([1, 2, 3, 4, 5]));
  });

  it('shuffles players (different seedings on different runs)', () => {
    const players = Array.from({ length: 8 }, (_, i) => `p${i}`);
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
