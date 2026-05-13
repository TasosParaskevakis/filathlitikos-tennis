import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { COOKIE_NAME, COOKIE_MAX_AGE, signCookie } from '$lib/auth';

export const load: PageServerLoad = ({ locals }) => {
  return { isAdmin: locals.isAdmin };
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
