import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
	if (!platform?.env.DB) {
		return { count: -1, error: 'No DB binding' };
	}
	const result = await platform.env.DB.prepare('SELECT COUNT(*) as c FROM players').first<{
		c: number;
	}>();
	return { count: result?.c ?? 0 };
};
