import { describe, it, expect } from 'vitest';
import { fillNextEmptySet, indexOfNextEmptySet } from '../src/lib/set-fill';

describe('indexOfNextEmptySet', () => {
  it('returns 0 when all sets are empty (0,0)', () => {
    expect(indexOfNextEmptySet([[0, 0], [0, 0], [0, 0]])).toBe(0);
  });

  it('returns 1 when set 0 is filled and rest empty', () => {
    expect(indexOfNextEmptySet([[6, 3], [0, 0], [0, 0]])).toBe(1);
  });

  it('returns 2 when set 0 and 1 are filled', () => {
    expect(indexOfNextEmptySet([[6, 3], [4, 6], [0, 0]])).toBe(2);
  });

  it('returns -1 when all sets are filled', () => {
    expect(indexOfNextEmptySet([[6, 3], [6, 4]])).toBe(-1);
  });

  it('treats a set as filled if either side is non-zero', () => {
    expect(indexOfNextEmptySet([[6, 0], [0, 0]])).toBe(1);
  });
});

describe('fillNextEmptySet', () => {
  it('fills set 0 when all empty', () => {
    const result = fillNextEmptySet([[0, 0], [0, 0], [0, 0]], [6, 3]);
    expect(result).toEqual({
      sets: [[6, 3], [0, 0], [0, 0]],
      filledIndex: 0
    });
  });

  it('fills set 1 when set 0 is filled', () => {
    const result = fillNextEmptySet([[6, 3], [0, 0], [0, 0]], [4, 6]);
    expect(result).toEqual({
      sets: [[6, 3], [4, 6], [0, 0]],
      filledIndex: 1
    });
  });

  it('returns null when all sets are already filled', () => {
    const result = fillNextEmptySet([[6, 3], [6, 4]], [7, 5]);
    expect(result).toBeNull();
  });

  it('does not mutate the input array', () => {
    const sets: Array<[number, number]> = [[0, 0], [0, 0]];
    fillNextEmptySet(sets, [6, 3]);
    expect(sets).toEqual([[0, 0], [0, 0]]);
  });
});
