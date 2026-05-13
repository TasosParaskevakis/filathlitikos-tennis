<script lang="ts">
  import { enhance } from '$app/forms';
  let { data } = $props();
  let editingId = $state<string | null>(null);
</script>

<section class="hero">
  <span class="label">Admin</span>
  <h1 class="display" style="font-size: clamp(2.5rem, 5vw, 3.5rem)">Players</h1>
  <p class="hero-subtitle">Manage the club roster.</p>
</section>

<div class="card add-card">
  <form method="POST" action="?/create" use:enhance class="add-form">
    <input name="name" placeholder="Add a new player…" required />
    <button type="submit">Add player</button>
  </form>
</div>

{#if data.players.length === 0}
  <div class="empty-state">
    <span class="emoji">🎾</span>
    <h3>No players yet</h3>
    <p>Add the first player above to get started.</p>
  </div>
{:else}
  <div class="players-list">
    {#each data.players as p (p.id)}
      <div class="player-card">
        {#if editingId === p.id}
          <form
            method="POST"
            action="?/rename"
            use:enhance={() => ({ update }) => { update(); editingId = null; }}
            class="rename-form"
          >
            <input type="hidden" name="id" value={p.id} />
            <input name="name" value={p.name} autofocus />
            <button type="submit" class="btn-sm">Save</button>
            <button type="button" onclick={() => (editingId = null)} class="btn-ghost btn-sm">Cancel</button>
          </form>
        {:else}
          <span class="player-name">{p.name}</span>
          <div class="player-actions">
            <button type="button" onclick={() => (editingId = p.id)} class="btn-ghost btn-sm">Rename</button>
            <form method="POST" action="?/delete" use:enhance style="display:inline">
              <input type="hidden" name="id" value={p.id} />
              <button
                type="submit"
                class="btn-danger-ghost btn-sm"
                onclick={(e) => { if (!confirm(`Delete ${p.name}?`)) e.preventDefault(); }}
              >Delete</button>
            </form>
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<p style="margin-top:32px"><a href="/admin" class="back-link">← Back to dashboard</a></p>

<style>
  .add-card {
    margin: 24px 0 32px;
    padding: 20px;
  }

  .add-form {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .add-form input { flex: 1; }
  .add-form button { flex-shrink: 0; }

  .players-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .player-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 20px;
    box-shadow: var(--shadow-sm);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    transition: all var(--dur) var(--ease);
  }

  .player-card:hover {
    border-color: var(--border-strong);
  }

  .player-name {
    font-weight: 600;
    font-size: 1.05rem;
    color: var(--text);
  }

  .player-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .rename-form {
    display: flex;
    gap: 8px;
    align-items: center;
    flex: 1;
  }
  .rename-form input { flex: 1; }

  .back-link {
    color: var(--text-secondary);
    font-weight: 500;
  }
  .back-link:hover { color: var(--text); }

  @media (max-width: 600px) {
    .add-form { flex-direction: column; align-items: stretch; }
    .add-form button { width: 100%; }
    .player-card { flex-direction: column; align-items: stretch; }
    .player-actions { justify-content: flex-end; }
  }
</style>
