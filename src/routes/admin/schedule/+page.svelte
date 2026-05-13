<script lang="ts">
  import { goto } from '$app/navigation';
  import Avatar from '$lib/components/Avatar.svelte';
  import MatchEditModal from '$lib/components/MatchEditModal.svelte';
  import { parseScores, formatScores } from '$lib/scores';
  import type { DayMatch } from '$lib/db';

  let { data } = $props();

  let editing = $state<DayMatch | null>(null);

  function setDate(d: string) {
    goto(`/admin/schedule?date=${d}`, { keepFocus: false });
  }

  function shiftDate(days: number) {
    const [y, m, d] = data.date.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + days);
    setDate(dt.toISOString().slice(0, 10));
  }

  const isToday = $derived(data.date === data.today);
  const pretty = (d: string) => {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      timeZone: 'UTC'
    });
  };
  const labels: Record<string, string> = {
    in_progress: 'In progress',
    completed: 'Completed',
    upcoming: 'Setup'
  };

  function nameFor(id: string | null, fallback: string | null) {
    if (id && fallback) return fallback;
    if (id) return '?';
    return '—';
  }
</script>

<section class="hero">
  <span class="label">Admin · Schedule</span>
  <h1 class="display" style="font-size: clamp(2.2rem, 5vw, 3.5rem); font-weight: 900; letter-spacing: -0.04em; line-height: 0.95; margin: 0 0 12px;">
    {isToday ? "Today's matches" : pretty(data.date)}
  </h1>
  <p class="hero-subtitle">{data.matches.length} match{data.matches.length === 1 ? '' : 'es'} scheduled.</p>
</section>

<div class="date-bar">
  <button type="button" class="btn-ghost btn-sm" onclick={() => shiftDate(-1)} aria-label="Previous day">←</button>
  <input
    type="date"
    value={data.date}
    onchange={(e) => setDate((e.target as HTMLInputElement).value)}
    class="date-picker"
  />
  <button type="button" class="btn-ghost btn-sm" onclick={() => shiftDate(1)} aria-label="Next day">→</button>
  {#if !isToday}
    <button type="button" class="btn-ghost btn-sm" onclick={() => setDate(data.today)}>Today</button>
  {/if}
</div>

{#if data.matches.length === 0}
  <div class="empty-state">
    <span class="emoji">🗓️</span>
    <h3>No matches scheduled for this day</h3>
    <p>Open any match from a tournament's bracket and set a "Scheduled date" — it'll show up here.</p>
  </div>
{:else}
  <div class="day-list">
    {#each data.matches as m (m.id)}
      {@const p1 = m.player1_id ? { id: m.player1_id, name: m.player1_name ?? '?' } : null}
      {@const p2 = m.player2_id ? { id: m.player2_id, name: m.player2_name ?? '?' } : null}
      {@const scores = parseScores(m.scores)}
      <button type="button" class="day-card" onclick={() => { editing = m; }}>
        <div class="day-card-top">
          <span class="pill pill-category">{m.tournament_category}</span>
          <span class="pill" class:pill-status-completed={m.status === 'completed'} class:pill-status-progress={m.status === 'pending'}>
            {m.status === 'completed' ? 'Completed' : 'Pending'}
          </span>
        </div>
        <div class="day-card-tournament">{m.tournament_name} · Best of {m.tournament_best_of}</div>
        <div class="day-card-players">
          <div class="day-player" class:winner={m.winner_id === p1?.id}>
            {#if p1}<Avatar player={p1} size="md" />{:else}<span class="avatar-placeholder"></span>{/if}
            <span class="day-player-name">{nameFor(m.player1_id, m.player1_name)}</span>
          </div>
          <div class="day-vs">vs</div>
          <div class="day-player" class:winner={m.winner_id === p2?.id}>
            {#if p2}<Avatar player={p2} size="md" />{:else}<span class="avatar-placeholder"></span>{/if}
            <span class="day-player-name">{nameFor(m.player2_id, m.player2_name)}</span>
          </div>
        </div>
        {#if scores.length}
          <div class="day-card-score">{formatScores(scores)}</div>
        {/if}
      </button>
    {/each}
  </div>
{/if}

{#if editing}
  <MatchEditModal
    match={editing}
    bestOf={editing.tournament_best_of}
    p1Name={nameFor(editing.player1_id, editing.player1_name)}
    p2Name={nameFor(editing.player2_id, editing.player2_name)}
    onClose={() => { editing = null; }}
    onSaved={() => { editing = null; goto(`/admin/schedule?date=${data.date}`, { invalidateAll: true }); }}
  />
{/if}

<p class="back"><a href="/admin">← Back to dashboard</a></p>

<style>
  .date-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 16px 0 32px;
    flex-wrap: wrap;
  }
  .date-picker {
    width: auto;
    min-width: 180px;
  }

  .day-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
    gap: 16px;
  }

  .day-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    box-shadow: var(--shadow-sm);
    transition: all var(--dur) var(--ease);
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 12px;
    cursor: pointer;
    color: var(--fg1);
    font-family: inherit;
  }
  .day-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
    border-color: var(--border-strong);
    background: var(--surface);
  }

  .day-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .day-card-tournament {
    font-size: 0.9rem;
    color: var(--fg2);
    font-weight: 500;
  }
  .day-card-players {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 1.05rem;
  }
  .day-player {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 0;
    color: var(--fg2);
    font-weight: 500;
  }
  .day-player.winner {
    color: var(--fg1);
    font-weight: 700;
  }
  .day-player-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .day-vs {
    color: var(--fg3);
    font-size: 0.85rem;
    font-weight: 600;
    flex-shrink: 0;
  }
  .day-card-score {
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    font-size: 0.95rem;
    color: var(--fg1);
    letter-spacing: 0.04em;
    border-top: 1px solid var(--border);
    padding-top: 10px;
  }

  .back {
    margin-top: 32px;
    color: var(--fg2);
  }
  .back a { color: var(--fg2); font-weight: 500; }
  .back a:hover { color: var(--fg1); }

  @media (max-width: 768px) {
    .day-list { grid-template-columns: 1fr; }
    .day-card-players { font-size: 1.1rem; flex-wrap: wrap; }
  }
</style>
