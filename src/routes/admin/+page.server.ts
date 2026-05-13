import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { COOKIE_NAME, COOKIE_MAX_AGE, signCookie } from '$lib/auth';
import { countMatchesByDate } from '$lib/db';

function todayInAthens(): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Athens',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

export const load: PageServerLoad = async ({ locals, platform }) => {
  if (!locals.isAdmin) return { isAdmin: false, today: '', todayCount: 0 };
  const today = todayInAthens();
  const todayCount = platform?.env.DB ? await countMatchesByDate(platform.env.DB, today) : 0;
  return { isAdmin: true, today, todayCount };
};

export const actions: Actions = {
  login: async ({ request, cookies, platform }) => {
    const data = await request.formData();
    const password = String(data.get('password') ?? '');
    const expected = platform?.env.ADMIN_PASSWORD;
    if (!expected) return fail(500, { error: 'ADMIN_PASSWORD not configured' });
    if (password !== expected) return fail(401, { error: 'Wrong password' });

    const secret = platform?.env.AUTH_SECRET ?? 'dev-secret-change-me';
    const expiresAt = Date.now() + COOKIE_MAX_AGE * 1000;
    const cookie = await signCookie(secret, expiresAt);
    cookies.set(COOKIE_NAME, cookie, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: import.meta.env.PROD,
      maxAge: COOKIE_MAX_AGE
    });
    redirect(303, '/admin/tournaments');
  }
};
