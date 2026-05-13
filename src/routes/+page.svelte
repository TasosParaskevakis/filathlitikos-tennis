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

<section class="hero court-hero">
  <div class="court-hero-bg" style="background-image: url('/tennis-field.jpg')"></div>
  <div class="court-hero-overlay"></div>
  <div class="court-hero-content">
    <span class="court-hero-eyebrow">Καλλιθέα · Μοσχάτο · Ταύρος · est. 1991</span>
    <h1 class="display court-hero-title">Φιλαθλητικός Tennis</h1>
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
  .court-hero {
    position: relative;
    padding: 0;
    margin: 0 -32px 48px;
    border-radius: 0;
    overflow: hidden;
    height: clamp(360px, 52vh, 540px);
    display: flex;
    align-items: flex-end;
    isolation: isolate;
  }

  .court-hero-bg {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center 60%;
    transform: scale(1.04);
    transition: transform 800ms var(--ease);
    z-index: 0;
  }
  .court-hero:hover .court-hero-bg { transform: scale(1.07); }

  .court-hero-overlay {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(180deg, rgba(0, 25, 75, 0.05) 0%, rgba(0, 25, 75, 0.55) 60%, rgba(0, 20, 60, 0.85) 100%),
      linear-gradient(135deg, rgba(0, 57, 166, 0.25) 0%, transparent 60%);
    z-index: 1;
  }

  .court-hero-content {
    position: relative;
    z-index: 2;
    padding: 48px clamp(24px, 5vw, 56px);
    color: #fff;
    width: 100%;
  }

  .court-hero-eyebrow {
    display: inline-block;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.85);
    background: rgba(255, 255, 255, 0.10);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    padding: 6px 14px;
    border-radius: var(--radius-pill);
    margin-bottom: 18px;
    border: 1px solid rgba(255, 255, 255, 0.18);
  }

  .court-hero-title {
    color: #fff;
    margin: 0 0 12px;
    font-size: clamp(2.5rem, 6vw, 4.5rem);
    font-weight: 900;
    letter-spacing: -0.045em;
    line-height: 0.95;
    text-shadow: 0 2px 24px rgba(0, 0, 0, 0.25);
  }

  .court-hero-subtitle {
    color: rgba(255, 255, 255, 0.92);
    font-size: clamp(1rem, 1.6vw, 1.25rem);
    margin: 0;
    max-width: 560px;
    text-shadow: 0 1px 8px rgba(0, 0, 0, 0.3);
  }

  @media (max-width: 768px) {
    .court-hero {
      margin: 0 -20px 32px;
      height: clamp(320px, 50vh, 420px);
    }
    .court-hero-content { padding: 32px 24px; }
  }

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
