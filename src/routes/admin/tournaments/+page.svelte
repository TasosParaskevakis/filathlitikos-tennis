<script lang="ts">
  import { enhance } from '$app/forms';
  let { data } = $props();
  const statusLabel = (s: string) =>
    s === 'in_progress' ? 'In progress' : s === 'completed' ? 'Completed' : 'Setup';
  const statusPillClass = (s: string) =>
    s === 'in_progress' ? 'pill-status-progress' :
    s === 'completed' ? 'pill-status-completed' : 'pill-status-upcoming';
</script>

<section class="hero">
  <span class="label">Admin</span>
  <h1 class="display" style="font-size: clamp(2.5rem, 5vw, 3.5rem)">Tournaments</h1>
  <p class="hero-subtitle">Create new tournaments and manage existing brackets.</p>
</section>

<details class="new-tournament">
  <summary>
    <span class="plus">+</span>
    <span>New tournament</span>
  </summary>
  <div class="card new-card">
    <form method="POST" action="?/create" use:enhance class="new-form">
      <div class="field">
        <label for="t-name">Name</label>
        <input id="t-name" name="name" placeholder="e.g. Spring Open 2026" required />
      </div>
      <div class="field-row">
        <div class="field">
          <label for="t-cat">Category</label>
          <input
            id="t-cat"
            name="category"
            list="existing-categories"
            placeholder="e.g. Men Pro, Women New, Mixed Doubles"
            autocomplete="off"
            required
          />
          <datalist id="existing-categories">
            {#each data.existingCategories as c (c)}
              <option value={c}></option>
            {/each}
          </datalist>
          <small class="field-hint">Type any name. Existing categories autocomplete.</small>
        </div>
        <div class="field">
          <label for="t-bo">Best of</label>
          <select id="t-bo" name="best_of">
            <option value="1">1 set</option>
            <option value="3" selected>3 sets</option>
            <option value="5">5 sets</option>
          </select>
        </div>
      </div>
      <button type="submit" class="btn-lg">Create tournament</button>
    </form>
  </div>
</details>

{#if data.tournaments.length === 0}
  <div class="empty-state">
    <span class="emoji">🏆</span>
    <h3>No tournaments yet</h3>
    <p>Click "New tournament" above to create the first one.</p>
  </div>
{:else}
  <div class="grid">
    {#each data.tournaments as t (t.id)}
      <div class="card t-card">
        <a href="/admin/tournaments/{t.id}" class="t-card-body">
          <div class="t-card-top">
            <span class="pill pill-category">{t.category}</span>
            <span class="pill {statusPillClass(t.status)}">{statusLabel(t.status)}</span>
          </div>
          <h3 class="t-card-title">{t.name}</h3>
          <div class="t-card-meta">Best of {t.best_of}</div>
        </a>
        <form method="POST" action="?/delete" use:enhance class="delete-row">
          <input type="hidden" name="id" value={t.id} />
          <button
            type="submit"
            class="btn-danger-ghost btn-sm"
            onclick={(e) => { if (!confirm('Delete tournament?')) e.preventDefault(); }}
          >Delete</button>
        </form>
      </div>
    {/each}
  </div>
{/if}

<p style="margin-top:32px"><a href="/admin" class="back-link">← Back to dashboard</a></p>

<style>
  .new-tournament {
    margin: 16px 0 32px;
  }

  .new-tournament > summary {
    list-style: none;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 12px 24px;
    border-radius: var(--radius-pill);
    background: var(--text);
    color: var(--bg);
    font-weight: 700;
    font-size: 0.9rem;
    transition: all var(--dur) var(--ease);
    user-select: none;
  }
  .new-tournament > summary:hover {
    background: #1F1F1F;
    box-shadow: var(--shadow);
  }
  .new-tournament > summary::-webkit-details-marker { display: none; }
  .new-tournament > summary .plus {
    font-size: 1.2rem;
    line-height: 1;
    font-weight: 800;
  }
  .new-tournament[open] > summary .plus { transform: rotate(45deg); }
  .new-tournament > summary .plus { transition: transform var(--dur) var(--ease); }

  .new-card {
    margin-top: 16px;
    padding: 28px;
    box-shadow: var(--shadow);
  }

  .new-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .field { display: flex; flex-direction: column; }
  .field-hint {
    margin-top: 6px;
    color: var(--text-tertiary);
    font-size: 0.8rem;
  }
  .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

  .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .t-card {
    display: flex;
    flex-direction: column;
    padding: 0;
    overflow: hidden;
  }

  .t-card-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 24px 24px 16px;
    text-decoration: none;
    color: var(--text);
    transition: background var(--dur) var(--ease);
  }
  .t-card-body:hover { background: var(--bg-muted); color: var(--text); }

  .t-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .t-card-title {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 700;
    letter-spacing: -0.025em;
  }

  .t-card-meta {
    color: var(--text-secondary);
    font-size: 0.9rem;
    font-weight: 500;
  }

  .delete-row {
    padding: 12px 20px;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: flex-end;
    background: var(--bg-muted);
  }

  .back-link {
    color: var(--text-secondary);
    font-weight: 500;
  }
  .back-link:hover { color: var(--text); }

  @media (max-width: 768px) {
    .grid { grid-template-columns: 1fr; }
    .field-row { grid-template-columns: 1fr; }
  }
</style>
