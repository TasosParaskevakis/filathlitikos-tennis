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

<section class="court-hero">
  <div class="court-hero-bg" style="background-image: url('/tennis-field.jpg')"></div>
  <div class="court-hero-overlay"></div>
  <img src="/logo.png" alt="" class="court-hero-crest" />
  <div class="court-hero-content">
    <span class="court-hero-eyebrow">Καλλιθέα · Μοσχάτο · Ταύρος · est. 1991</span>
    <h1 class="court-hero-title">Φιλαθλητικός Tennis</h1>
    <p class="court-hero-subtitle">Tournaments, brackets, and stats for the club.</p>
  </div>
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
      <a href="/tournaments/{t.id}" class="card interactive t-card">
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
      <a href="/tournaments/{t.id}" class="card interactive t-card">
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
    grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
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
    color: var(--fg1);
  }

  .t-card-meta {
    display: flex;
    gap: 8px;
    align-items: center;
    color: var(--fg2);
    font-size: 0.9rem;
    font-weight: 500;
  }

  .t-card-meta .dot { color: var(--fg3); }

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
    color: var(--fg3);
  }

  .champion-name {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--fg1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 768px) {
    .grid { grid-template-columns: 1fr; }
    .t-card-title { font-size: 1.2rem; }
  }
</style>
