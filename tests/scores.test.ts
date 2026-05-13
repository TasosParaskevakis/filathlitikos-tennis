import { describe, it, expect } from 'vitest';
import { parseScores, computeWinner, formatScores } from '../src/lib/scores';

describe('parseScores', () => {
	it('parses valid JSON sets', () => {
		expect(parseScores('[[6,3],[6,2]]')).toEqual([[6, 3], [6, 2]]);
	});

	it('returns empty array for null', () => {
		expect(parseScores(null)).toEqual([]);
	});

	it('returns empty array for empty string', () => {
		expect(parseScores('')).toEqual([]);
	});
});

describe('computeWinner', () => {
	it('returns 1 if player 1 wins more sets', () => {
		// p1 wins 6-3, 6-2 → 2 sets to 0
		expect(computeWinner([[6, 3], [6, 2]])).toBe(1);
	});

	it('returns 2 if player 2 wins more sets', () => {
		expect(computeWinner([[3, 6], [2, 6]])).toBe(2);
	});

	it('returns null if sets are tied', () => {
		expect(computeWinner([[6, 3], [3, 6]])).toBe(null);
	});

	it('returns null for empty input', () => {
		expect(computeWinner([])).toBe(null);
	});

	it('handles best-of-5 with mixed results', () => {
		// p1: 6-3, 4-6, 6-1, 4-6, 7-5  → 3 sets to 2
		expect(computeWinner([[6, 3], [4, 6], [6, 1], [4, 6], [7, 5]])).toBe(1);
	});
});

describe('formatScores', () => {
	it('formats sets as "6-3, 6-2"', () => {
		expect(formatScores([[6, 3], [6, 2]])).toBe('6-3, 6-2');
	});

	it('returns empty string for empty input', () => {
		expect(formatScores([])).toBe('');
	});
});
