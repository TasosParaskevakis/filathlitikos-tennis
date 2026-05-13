import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, url }) => {
  // /admin itself shows the login form; everything below it requires auth
  if (!locals.isAdmin && url.pathname !== '/admin') {
    redirect(303, '/admin');
  }
  return { isAdmin: locals.isAdmin };
};
