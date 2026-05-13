import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { listTournaments, createTournament, deleteTournament } from '$lib/db';

export const load: PageServerLoad = async ({ platform }) => {
  if (!platform?.env.DB) return { tournaments: [], existingCategories: [] };
  const tournaments = await listTournaments(platform.env.DB);
  // Distinct categories from existing tournaments — fuels the autocomplete
  const existingCategories = [...new Set(tournaments.map(t => t.category).filter(Boolean))].sort();
  return { tournaments, existingCategories };
};

export const actions: Actions = {
  create: async ({ request, platform }) => {
    const data = await request.formData();
    const name = String(data.get('name') ?? '').trim();
    const category = String(data.get('category') ?? '').trim();
    const best_of = Number(data.get('best_of') ?? 3);
    if (!name) return fail(400, { error: 'Tournament name required' });
    if (!category) return fail(400, { error: 'Category required' });
    if (![1, 3, 5].includes(best_of)) return fail(400, { error: 'Best of must be 1, 3, or 5' });
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
