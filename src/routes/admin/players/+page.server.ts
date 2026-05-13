import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { listPlayers, createPlayer, renamePlayer, deletePlayer } from '$lib/db';

export const load: PageServerLoad = async ({ platform }) => {
  const players = platform?.env.DB ? await listPlayers(platform.env.DB) : [];
  return { players };
};

export const actions: Actions = {
  create: async ({ request, platform }) => {
    const data = await request.formData();
    const name = String(data.get('name') ?? '').trim();
    if (!name) return fail(400, { error: 'Name required' });
    if (!platform?.env.DB) return fail(500, { error: 'No DB' });
    try {
      await createPlayer(platform.env.DB, name);
    } catch (e) {
      return fail(400, { error: 'Duplicate name?' });
    }
    return { ok: true };
  },
  rename: async ({ request, platform }) => {
    const data = await request.formData();
    const id = String(data.get('id') ?? '');
    const name = String(data.get('name') ?? '').trim();
    if (!id || !name) return fail(400, { error: 'Missing id or name' });
    await renamePlayer(platform!.env.DB, id, name);
    return { ok: true };
  },
  delete: async ({ request, platform }) => {
    const data = await request.formData();
    const id = String(data.get('id') ?? '');
    if (!id) return fail(400, { error: 'Missing id' });
    await deletePlayer(platform!.env.DB, id);
    return { ok: true };
  }
};
