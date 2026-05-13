import type { Handle } from '@sveltejs/kit';
import { COOKIE_NAME, verifyCookie } from '$lib/auth';

// Dev-only: pull bindings from wrangler.toml so vite dev gets a real platform.
// Dynamic import + import.meta.env.DEV guard ensures wrangler/miniflare are
// tree-shaken out of the production worker bundle.
let cachedPlatform: { env: unknown; ctx: unknown; caches: unknown; cf: unknown } | null = null;
async function devPlatform() {
  if (!cachedPlatform) {
    const { getPlatformProxy } = await import('wrangler');
    cachedPlatform = await getPlatformProxy();
  }
  return cachedPlatform;
}

export const handle: Handle = async ({ event, resolve }) => {
  if (!event.platform && import.meta.env.DEV) {
    const p = await devPlatform();
    event.platform = {
      env: p.env,
      context: p.ctx,
      caches: p.caches,
      cf: p.cf
    } as unknown as App.Platform;
  }

  const secret = event.platform?.env.AUTH_SECRET ?? 'dev-secret-change-me';
  const cookie = event.cookies.get(COOKIE_NAME);
  event.locals.isAdmin = await verifyCookie(secret, cookie);

  return resolve(event);
};
