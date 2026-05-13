import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { listTournaments, createTournament, deleteTournament, type TournamentCategory } from '$lib/db';

export const load: PageServerLoad = async ({ platform }) => {
  const tournaments = platform?.env.DB ? await listTournaments(platform.env.DB) : [];
  return { tournaments };
};

const CATEGORIES: TournamentCategory[] = ['men_pro', 'men_new', 'women_pro', 'women_new'];

export const actions: Actions = {
  create: async ({ request, platform }) => {
    const data = await request.formData();
    const name = String(data.get('name') ?? '').trim();
    const category = String(data.get('category') ?? '') as TournamentCategory;
    const best_of = Number(data.get('best_of') ?? 3);
    if (!name) return fail(400, { error: 'Name required' });
    if (!CATEGORIES.includes(category)) return fail(400, { error: 'Invalid category' });
    if (![1, 3, 5].includes(best_of)) return fail(400, { error: 'best_of must be 1, 3, or 5' });
    const t = await createTournament(platform!.env.DB, name, category, best_of);
    redirect(303, `/admin/tournaments/${t.id}`);
  },
  delete: async ({ request, platform }) => {
    const data = await request.formData();
    const id = String(data.get('id') ?? '');
    if (!id) return fail(400, { error: 'Missing id' });
    await deleteTournament(platform!.env.DB, id);
    return { ok: true };
  }
};
