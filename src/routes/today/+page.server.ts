import type { PageServerLoad } from './$types';
import { listMatchesByDate, type DayMatch } from '$lib/db';

function todayInAthens(): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Athens',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

export const load: PageServerLoad = async ({ url, platform }) => {
  const today = todayInAthens();
  const requested = url.searchParams.get('date') || today;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : today;

  const db = platform?.env.DB;
  const matches: DayMatch[] = db ? await listMatchesByDate(db, date) : [];

  return { date, today, matches };
};
