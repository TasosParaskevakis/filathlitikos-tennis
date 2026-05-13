import type { PageServerLoad } from './$types';
import { listMatchesByDate, type DayMatch } from '$lib/db';

// Athens time today as YYYY-MM-DD. Cloudflare Workers + Node both have Intl.
function todayInAthens(): string {
  const fmt = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Athens',
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
  return fmt.format(new Date()); // 'YYYY-MM-DD'
}

export const load: PageServerLoad = async ({ url, platform }) => {
  const today = todayInAthens();
  const date = url.searchParams.get('date') || today;
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today;

  const db = platform?.env.DB;
  const matches: DayMatch[] = db ? await listMatchesByDate(db, valid) : [];

  return { date: valid, today, matches };
};
