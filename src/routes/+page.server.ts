import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, locals }) => {
  if (!platform?.env.DB) return { count: -1, isAdmin: locals.isAdmin };
  const r = await platform.env.DB.prepare('SELECT COUNT(*) as c FROM players').first<{ c: number }>();
  return { count: r?.c ?? 0, isAdmin: locals.isAdmin };
};
