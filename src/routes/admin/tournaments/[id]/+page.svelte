<script lang="ts">
  import { enhance } from '$app/forms';
  import BracketView from '$lib/components/BracketView.svelte';
  import MatchEditModal from '$lib/components/MatchEditModal.svelte';
  import type { Match } from '$lib/db';

  let { data } = $props();
  let editing = $state<Match | null>(null);

  let generating = $state(false);
  async function generate() {
    generating = true;
    const r = await fetch(`/api/admin/tournaments/${data.tournament!.id}/generate-bracket`, { method: 'POST' });
    if (!r.ok) {
      const t = await r.text();
      alert(`Failed: ${t}`);
    } else {
      location.reload();
    }
    generating = false;
  }

  const playersById = $derived(
    Object.fromEntries(data.tournamentPlayers.map(p => [p.player_id, { id: p.player_id, name: p.name }]))
  );

  function pName(id: string | null) {
    if (!id) return '—';
    return playersById[id]?.name ?? '?';
  }

  const statusLabel = (s: string) =>
    s === 'in_progress' ? 'In progress' : s === 'completed' ? 'Completed' : 'Setup';
  const statusPillClass = (s: string) =>
    s === 'in_progress' ? 'pill-status-progress' :
    s === 'completed' ? 'pill-status-completed' : 'pill-status-upcoming';

  const availablePlayers = $derived(
    data.allPlayers.filter(p => !data.tournamentPlayers.some(tp => tp.player_id === p.id))
  );
</script>

{#if !data.tournament}
  <div class="empty-state">
    <span class="emoji">🎾</span>
    <h3>Tournament not found</h3>
    <p><a href="/admin/tournaments">Back to tournaments</a></p>
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

  {#if data.tournament.status === 'setup'}
    <div class="setup-grid">
      <div class="card setup-card">
        <div class="setup-card-header">
          <h2>Players in tournament</h2>
          <span class="count-pill">{data.tournamentPlayers.length}</span>
        </div>
        {#if data.tournamentPlayers.length === 0}
          <p class="muted" style="margin: 16px 0 0">No players added yet.</p>
        {:else}
          <ul class="clean tp-list">
            {#each data.tournamentPlayers as p (p.player_id)}
              <li class="tp-item">
                <span class="tp-name">{p.name}</span>
                <form method="POST" action="?/removePlayer" use:enhance>
                  <input type="hidden" name="player_id" value={p.player_id} />
                  <button type="submit" class="btn-danger-ghost btn-sm">Remove</button>
                </form>
              </li>
            {/each}
          </ul>
        {/if}
      </div>

      <div class="card setup-card">
        <h2>Add player</h2>
        {#if availablePlayers.length === 0}
          <p class="muted" style="margin: 16px 0 0">All players are already in the tournament.</p>
        {:else}
          <form method="POST" action="?/addPlayer" use:enhance class="add-player-form">
            <select name="player_id" required>
              <option value="">Select a player…</option>
              {#each availablePlayers as p (p.id)}
                <option value={p.id}>{p.name}</option>
              {/each}
            </select>
            <button type="submit">Add</button>
          </form>
        {/if}
      </div>
    </div>

    <div class="generate-row">
      <button
        onclick={generate}
        disabled={generating || data.tournamentPlayers.length < 2}
        class="btn-lg generate-btn"
      >
        {generating ? 'Generating…' : '🎲 Generate bracket'}
      </button>
      {#if data.tournamentPlayers.length < 2}
        <p class="muted" style="margin: 12px 0 0">Add at least 2 players to generate a bracket.</p>
      {/if}
    </div>
  {:else}
    <div class="instruction">
      <span class="instruction-icon">✏️</span>
      Click any match to enter scores.
    </div>
    <BracketView
      matches={data.matches}
      {playersById}
      onMatchClick={(m) => { editing = m; }}
    />
  {/if}

  {#if editing}
    <MatchEditModal
      match={editing}
      bestOf={data.tournament.best_of}
      p1Name={pName(editing.player1_id)}
      p2Name={pName(editing.player2_id)}
      onClose={() => { editing = null; }}
      onSaved={() => { editing = null; location.reload(); }}
    />
  {/if}

  <p style="margin-top:32px"><a href="/admin/tournaments" class="back-link">← Back to tournaments</a></p>
{/if}

<style>
  .t-hero {
    padding: 40px 0 16px;
  }

  .t-hero-top {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 16px;
  }

  .t-title {
    font-size: clamp(2rem, 4.5vw, 3rem);
    font-weight: 900;
    letter-spacing: -0.04em;
    line-height: 1;
    margin: 0 0 12px;
  }

  .t-meta {
    color: var(--text-secondary);
    font-size: 1rem;
    margin: 0;
  }

  .setup-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 16px;
    margin: 32px 0;
  }

  .setup-card {
    padding: 24px;
  }

  .setup-card h2 {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 700;
  }

  .setup-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .count-pill {
    background: var(--accent);
    color: var(--accent-text);
    padding: 4px 12px;
    border-radius: var(--radius-pill);
    font-weight: 700;
    font-size: 0.85rem;
    font-variant-numeric: tabular-nums;
  }

  .tp-list {
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .tp-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: var(--bg-muted);
    border-radius: var(--radius-sm);
  }

  .tp-name {
    font-weight: 600;
    color: var(--text);
  }

  .add-player-form {
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .add-player-form button { width: 100%; }

  .generate-row {
    text-align: center;
    margin: 32px 0;
  }

  .generate-btn {
    font-size: 1.05rem;
    padding: 18px 40px;
  }

  .instruction {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    background: var(--bg-muted);
    border-radius: var(--radius-pill);
    color: var(--text-secondary);
    font-size: 0.9rem;
    font-weight: 500;
    margin: 16px 0 24px;
  }
  .instruction-icon { font-size: 1rem; }

  .back-link {
    color: var(--text-secondary);
    font-weight: 500;
  }
  .back-link:hover { color: var(--text); }

  @media (max-width: 768px) {
    .setup-grid { grid-template-columns: 1fr; }
  }
</style>
