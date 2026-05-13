const ENCODER = new TextEncoder();

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', ENCODER.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, ENCODER.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

export async function signCookie(secret: string, expiresAt: number): Promise<string> {
  const payload = `${expiresAt}`;
  const sig = await hmac(secret, payload);
  return `${payload}.${sig}`;
}

export async function verifyCookie(secret: string, cookie: string | undefined): Promise<boolean> {
  if (!cookie) return false;
  const [payload, sig] = cookie.split('.');
  if (!payload || !sig) return false;
  const expected = await hmac(secret, payload);
  if (sig !== expected) return false;
  const exp = Number(payload);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  return true;
}

export const COOKIE_NAME = 'tt_admin';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
