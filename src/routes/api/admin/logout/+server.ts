import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { COOKIE_NAME } from '$lib/auth';

export const POST: RequestHandler = ({ cookies }) => {
  cookies.delete(COOKIE_NAME, { path: '/' });
  redirect(303, '/admin');
};
