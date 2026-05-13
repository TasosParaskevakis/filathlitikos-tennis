export type SetScore = [number, number];   // [player1Games, player2Games]
export type Scores = SetScore[];

export function parseScores(raw: string | null | undefined): Scores {
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed as Scores;
	} catch {
		return [];
	}
}

export function computeWinner(scores: Scores): 1 | 2 | null {
	if (scores.length === 0) return null;
	let p1Sets = 0;
	let p2Sets = 0;
	for (const [a, b] of scores) {
		if (a > b) p1Sets++;
		else if (b > a) p2Sets++;
	}
	if (p1Sets > p2Sets) return 1;
	if (p2Sets > p1Sets) return 2;
	return null;
}

export function formatScores(scores: Scores): string {
	return scores.map(([a, b]) => `${a}-${b}`).join(', ');
}
