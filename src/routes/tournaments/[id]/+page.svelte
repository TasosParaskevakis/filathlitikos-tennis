<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import BracketView from '$lib/components/BracketView.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import MatchEditModal from '$lib/components/MatchEditModal.svelte';
  import type { Match } from '$lib/db';
  let { data } = $props();

  let editing = $state<Match | null>(null);

  const statusLabel = (s: string) =>
    s === 'in_progress' ? 'In progress' : s === 'completed' ? 'Completed' : 'Setup';

  const statusPillClass = (s: string) =>
    s === 'in_progress' ? 'pill-status-progress' :
    s === 'completed' ? 'pill-status-completed' : 'pill-status-upcoming';

  function pName(id: string | null) {
    if (!id) return '—';
    const players = data.playersById as Record<string, { id: string; name: string }>;
    return players[id]?.name ?? '?';
  }
</script>

{#if !data.tournament}
  <div class="empty-state">
    <span class="emoji">🎾</span>
    <h3>Tournament not found</h3>
    <p>It might have been deleted. <a href="/">Back to tournaments</a></p>
  </div>
{:else}
  <section class="t-hero">
    <div class="t-hero-top">
      <span class="pill pill-category">{data.tournament.category}</span>
      <span class="pill {statusPillClass(data.tournament.status)}">{statusLabel(data.tournament.status)}</span>
    </div>
    <h1 class="t-title">{data.tournament.name}</h1>
    <p class="t-meta">Best of {data.tournament.best_of} sets</p>
  </section>

  {#if data.champion}
    <div class="card champion-banner">
      <div class="champion-banner-label">Champion</div>
      <div class="champion-banner-row">
        <Avatar player={data.champion} size="xl" />
        <span class="big-trophy">🏆</span>
        <a href="/players/{data.champion.id}" class="champion-link">{data.champion.name}</a>
      </div>
    </div>
  {/if}

  {#if data.matches.length}
    {#if data.isAdmin}
      <p class="admin-edit-hint">✏️ Click any match to enter scores.</p>
    {/if}
    <div class="bracket-wrap">
      <BracketView
        matches={data.matches}
        playersById={data.playersById}
        onMatchClick={data.isAdmin ? (m) => { editing = m; } : undefined}
      />
    </div>
  {:else}
    <div class="empty-state">
      <span class="emoji">🎯</span>
      <h3>Bracket not generated yet</h3>
      <p>The bracket will appear here once the tournament begins.</p>
    </div>
  {/if}

  {#if editing}
    <MatchEditModal
      match={editing}
      bestOf={data.tournament.best_of}
      p1Name={pName(editing.player1_id)}
      p2Name={pName(editing.player2_id)}
      onClose={() => { editing = null; }}
      onSaved={() => { editing = null; invalidateAll(); }}
    />
  {/if}
{/if}

<style>
  .t-hero {
    padding: 56px 0 24px;
  }

  .t-hero-top {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .t-title {
    font-size: clamp(2.25rem, 5vw, 3.75rem);
    font-weight: 900;
    letter-spacing: -0.04em;
    line-height: 1;
    margin: 0 0 12px;
  }

  .t-meta {
    color: var(--text-secondary);
    font-size: 1.05rem;
    margin: 0;
  }

  .champion-banner {
    background:
      linear-gradient(135deg, rgba(245, 200, 66, 0.22) 0%, rgba(0, 57, 166, 0.10) 100%),
      var(--surface);
    border: none;
    box-shadow: var(--shadow);
    padding: 32px;
    margin: 24px 0 32px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .champion-banner-label {
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-tertiary);
  }

  .champion-banner-row {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .big-trophy {
    font-size: 3.5rem;
    line-height: 1;
  }

  .champion-link {
    font-size: clamp(2rem, 4.5vw, 3rem);
    font-weight: 800;
    letter-spacing: -0.035em;
    color: var(--text);
    line-height: 1;
  }

  .champion-link:hover {
    color: var(--court);
  }

  .bracket-wrap {
    margin-top: 12px;
  }

  .admin-edit-hint {
    display: inline-block;
    margin: 0 0 16px;
    font-size: 0.88rem;
    color: var(--accent-soft-text);
    background: var(--accent-soft);
    padding: 8px 14px;
    border-radius: var(--radius-pill);
    font-weight: 600;
  }

  @media (max-width: 768px) {
    .t-hero { padding: 32px 0 16px; }
    .champion-banner { padding: 24px; }
    .champion-banner-row { gap: 12px; }
    .big-trophy { font-size: 2.5rem; }
  }
</style>
