<script lang="ts">
  let { data } = $props();

  const roundLabel = (current: number, total: number) => {
    if (!total) return 'In progress';
    const fromEnd = total - current;
    if (fromEnd === 0) return 'Final';
    if (fromEnd === 1) return 'Semifinals';
    if (fromEnd === 2) return 'Quarterfinals';
    return `Round ${current} of ${total}`;
  };

  const hasAny = $derived(
    data.inProgress.length > 0 || data.completed.length > 0 || data.upcoming.length > 0
  );
</script>

<section class="hero">
  <h1 class="display">Φιλαθλητικός Tennis</h1>
  <p class="hero-subtitle">Tournaments, brackets, and stats for the club.</p>
</section>

{#if !hasAny}
  <div class="empty-state">
    <span class="emoji">🎾</span>
    <h3>No tournaments yet</h3>
    <p>The bracket boards are clean. <a href="/admin">Sign in as admin</a> to create the first tournament.</p>
  </div>
{/if}

{#if data.inProgress.length}
  <div class="section-header">
    <span class="label">Live</span>
    <h2>In progress</h2>
  </div>
  <div class="grid">
    {#each data.inProgress as t (t.id)}
      <a href="/tournaments/{t.id}" class="card t-card">
        <div class="t-card-top">
          <span class="pill pill-category">{t.category}</span>
          <span class="pill pill-status-progress">In progress</span>
        </div>
        <h3 class="t-card-title">{t.name}</h3>
        <div class="t-card-meta">
          <span>Best of {t.best_of}</span>
          <span class="dot">·</span>
          <span>{roundLabel(t.currentRound, t.totalRounds)}</span>
        </div>
      </a>
    {/each}
  </div>
{/if}

{#if data.completed.length}
  <div class="section-header">
    <span class="label">Champions</span>
    <h2>Completed</h2>
  </div>
  <div class="grid">
    {#each data.completed as t (t.id)}
      <a href="/tournaments/{t.id}" class="card t-card">
        <div class="t-card-top">
          <span class="pill pill-category">{t.category}</span>
          <span class="pill pill-status-completed">Completed</span>
        </div>
        <h3 class="t-card-title">{t.name}</h3>
        {#if t.champion}
          <div class="champion-row">
            <span class="trophy">🏆</span>
            <div class="champion-info">
              <span class="champion-label">Champion</span>
              <span class="champion-name">{t.champion.name}</span>
            </div>
          </div>
        {:else}
          <div class="t-card-meta"><span>Best of {t.best_of}</span></div>
        {/if}
      </a>
    {/each}
  </div>
{/if}

{#if data.upcoming.length}
  <div class="section-header">
    <span class="label">Coming up</span>
    <h2>Upcoming</h2>
  </div>
  <div class="grid">
    {#each data.upcoming as t (t.id)}
      <div class="card t-card">
        <div class="t-card-top">
          <span class="pill pill-category">{t.category}</span>
          <span class="pill pill-status-upcoming">Upcoming</span>
        </div>
        <h3 class="t-card-title">{t.name}</h3>
        <div class="t-card-meta">
          <span>Best of {t.best_of}</span>
          <span class="dot">·</span>
          <span>Bracket not generated</span>
        </div>
      </div>
    {/each}
  </div>
{/if}

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .t-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    text-decoration: none;
  }

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
    color: var(--text);
  }

  .t-card-meta {
    display: flex;
    gap: 8px;
    align-items: center;
    color: var(--text-secondary);
    font-size: 0.9rem;
    font-weight: 500;
  }

  .t-card-meta .dot { color: var(--text-tertiary); }

  .champion-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 4px;
    padding: 12px 16px;
    background: linear-gradient(135deg, rgba(245, 200, 66, 0.18) 0%, rgba(245, 200, 66, 0.03) 100%);
    border-radius: var(--radius-sm);
  }

  .trophy {
    font-size: 1.6rem;
    line-height: 1;
  }

  .champion-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .champion-label {
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-tertiary);
  }

  .champion-name {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 768px) {
    .grid { grid-template-columns: 1fr; }
    .t-card-title { font-size: 1.2rem; }
  }
</style>
