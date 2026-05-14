import type { LayoutServerLoad } from './$types';

function todayInAthens(): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Athens',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

export const load: LayoutServerLoad = async ({ locals, platform }) => {
  let pendingTodayCount = 0;
  if (locals.isAdmin && platform?.env.DB) {
    const today = todayInAthens();
    const result = await platform.env.DB.prepare(
      `SELECT COUNT(*) AS n FROM matches
       WHERE scheduled_date = ?
         AND status = 'pending'
         AND player1_id IS NOT NULL
         AND player2_id IS NOT NULL`
    ).bind(today).first<{ n: number }>();
    pendingTodayCount = result?.n ?? 0;
  }
  return { isAdmin: locals.isAdmin, pendingTodayCount };
};
