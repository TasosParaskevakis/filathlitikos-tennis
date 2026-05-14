import { describe, it, expect } from 'vitest';
import { findNextPendingMatch, type FlowMatch } from '../src/lib/match-flow';

const make = (over: Partial<FlowMatch>): FlowMatch => ({
  id: 'm', round: 1, position: 0,
  player1_id: 'a', player2_id: 'b', winner_id: null,
  status: 'pending', ...over
});

describe('findNextPendingMatch', () => {
  it('returns the first pending match with both players known, sorted by (round,position)', () => {
    const matches: FlowMatch[] = [
      make({ id: 'm1', round: 1, position: 0, status: 'completed', winner_id: 'a' }),
      make({ id: 'm2', round: 1, position: 1, status: 'pending' }),
      make({ id: 'm3', round: 2, position: 0, status: 'pending' })
    ];
    expect(findNextPendingMatch(matches, 'm1')?.id).toBe('m2');
  });

  it('skips matches still waiting for a previous round (player1 or player2 null)', () => {
    const matches: FlowMatch[] = [
      make({ id: 'm1', round: 1, position: 0, status: 'completed' }),
      make({ id: 'm2', round: 2, position: 0, player1_id: null, status: 'pending' }),
      make({ id: 'm3', round: 1, position: 1, status: 'pending' })
    ];
    expect(findNextPendingMatch(matches, 'm1')?.id).toBe('m3');
  });

  it('skips the match we just saved (currentMatchId)', () => {
    const matches: FlowMatch[] = [
      make({ id: 'm1', round: 1, position: 0, status: 'pending' }),
      make({ id: 'm2', round: 1, position: 1, status: 'pending' })
    ];
    expect(findNextPendingMatch(matches, 'm1')?.id).toBe('m2');
  });

  it('sorts by round first, then position', () => {
    const matches: FlowMatch[] = [
      make({ id: 'm1', round: 2, position: 0, status: 'pending' }),
      make({ id: 'm2', round: 1, position: 5, status: 'pending' }),
      make({ id: 'm3', round: 1, position: 2, status: 'pending' })
    ];
    expect(findNextPendingMatch(matches, 'unknown')?.id).toBe('m3');
  });

  it('returns null when nothing is pending with both players known', () => {
    const matches: FlowMatch[] = [
      make({ id: 'm1', status: 'completed' }),
      make({ id: 'm2', round: 2, position: 0, player1_id: null, status: 'pending' })
    ];
    expect(findNextPendingMatch(matches, 'm1')).toBeNull();
  });

  it('returns null on empty list', () => {
    expect(findNextPendingMatch([], 'whatever')).toBeNull();
  });
});
