import type { PageServerLoad } from './$types';
import { listTournaments } from '$lib/db';

export const load: PageServerLoad = async ({ platform }) => {
  const all = platform?.env.DB ? await listTournaments(platform.env.DB) : [];
  return {
    inProgress: all.filter(t => t.status === 'in_progress'),
    completed: all.filter(t => t.status === 'completed'),
    upcoming: all.filter(t => t.status === 'setup')
  };
};
