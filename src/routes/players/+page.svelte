<script lang="ts">
  import Avatar from '$lib/components/Avatar.svelte';

  let { data } = $props();
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  let activeCategory = $state(data.categories[0] ?? '');

  const rows = $derived(data.rowsByCategory[activeCategory] ?? []);
  const ranked = $derived(rows.filter(r => r.stats.wins + r.stats.losses > 0));
  const showPodium = $derived(ranked.length >= 1);
  const podium = $derived(ranked.slice(0, 3));
</script>

<section class="hero">
  <h1 class="display" style="font-size: clamp(2.5rem, 6vw, 4.5rem); font-weight: 900; letter-spacing: -0.04em; line-height: 0.95; margin: 0 0 16px;">
    Leaderboard
  </h1>
  <p class="hero-subtitle">All-time player rankings.</p>
</section>

{#if data.categories.length === 0}
  <div class="empty-state">
    <span class="emoji">🎾</span>
    <h3>No players yet</h3>
    <p>Once players are added and matches are played, the leaderboard will fill up here.</p>
  </div>
{:else}
  <div class="segmented" role="tablist" aria-label="Category">
    {#each data.categories as cat (cat)}
      <button
        type="button"
        role="tab"
        aria-selected={cat === activeCategory}
        class="segmented-item"
        class:active={cat === activeCategory}
        onclick={() => { activeCategory = cat; }}
      >
        {cat}
        <span class="segmented-count">{data.rowsByCategory[cat].length}</span>
      </button>
    {/each}
  </div>

  {#if showPodium}
    <div class="podium" class:podium-narrow={podium.length < 3}>
      {#if podium.length >= 2}
        <a class="podium-card podium-2" href="/players/{podium[1].id}">
          <Avatar player={podium[1]} size="lg" />
          <div class="podium-medal">🥈</div>
          <div class="podium-rank">2nd</div>
          <h2 class="podium-name">{podium[1].name}</h2>
          <div class="podium-stats">
            <span><strong>{podium[1].stats.titles}</strong> titles</span>
            <span class="dot">·</span>
            <span><strong>{pct(podium[1].stats.winPct)}</strong> win rate</span>
          </div>
        </a>
      {/if}
      <a class="podium-card podium-1" href="/players/{podium[0].id}">
        <Avatar player={podium[0]} size="xl" />
        <div class="podium-medal">🥇</div>
        <div class="podium-rank">Champion</div>
        <h2 class="podium-name">{podium[0].name}</h2>
        <div class="podium-stats">
          <span><strong>{podium[0].stats.titles}</strong> titles</span>
          <span class="dot">·</span>
          <span><strong>{pct(podium[0].stats.winPct)}</strong> win rate</span>
        </div>
      </a>
      {#if podium.length >= 3}
        <a class="podium-card podium-3" href="/players/{podium[2].id}">
          <Avatar player={podium[2]} size="lg" />
          <div class="podium-medal">🥉</div>
          <div class="podium-rank">3rd</div>
          <h2 class="podium-name">{podium[2].name}</h2>
          <div class="podium-stats">
            <span><strong>{podium[2].stats.titles}</strong> titles</span>
            <span class="dot">·</span>
            <span><strong>{pct(podium[2].stats.winPct)}</strong> win rate</span>
          </div>
        </a>
      {/if}
    </div>
  {/if}

  <div class="section-header">
    <span class="label">{activeCategory}</span>
    <h2>Rankings</h2>
  </div>

  {#if rows.length === 0}
    <div class="empty-state">
      <span class="emoji">🎾</span>
      <h3>No players in this category yet</h3>
      <p>Once players are added and matches are played, the leaderboard will fill up here.</p>
    </div>
  {:else}
    <!-- Desktop / tablet: full table -->
    <table class="leaderboard-table hide-on-mobile">
      <thead>
        <tr>
          <th class="col-rank">#</th>
          <th>Player</th>
          <th>Titles</th>
          <th>W-L</th>
          <th class="col-winpct">Win %</th>
          <th class="col-sets">Sets</th>
          <th class="col-streak">Streak</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as r, i (r.id)}
          <tr class="clickable" onclick={() => window.location.assign(`/players/${r.id}`)}>
            <td class="num col-rank">{i + 1}</td>
            <td>
              <span class="player-cell-wrap">
                <Avatar player={r} size="sm" />
                <a href="/players/{r.id}" class="player-cell" onclick={(e) => e.stopPropagation()}>{r.name}</a>
              </span>
            </td>
            <td class="num">{r.stats.titles}</td>
            <td class="num">{r.stats.wins}-{r.stats.losses}</td>
            <td class="winpct-cell">
              <div class="winpct-bar" style="width: {Math.round(r.stats.winPct * 100)}%"></div>
              <span class="winpct-text">{pct(r.stats.winPct)}</span>
            </td>
            <td class="num col-sets">{r.stats.setsWon}-{r.stats.setsLost}</td>
            <td class="num col-streak">{r.stats.currentStreak}</td>
          </tr>
        {/each}
      </tbody>
    </table>

    <!-- Mobile: card list (each row → single tappable card) -->
    <div class="lb-cards hide-on-desktop">
      {#each rows as r, i (r.id)}
        <a href="/players/{r.id}" class="lb-card">
          <div class="lb-rank">#{i + 1}</div>
          <Avatar player={r} size="md" />
          <div class="lb-card-main">
            <div class="lb-card-name">{r.name}</div>
            <div class="lb-card-stats">
              {#if r.stats.titles > 0}
                <span><strong>{r.stats.titles}</strong> {r.stats.titles === 1 ? 'title' : 'titles'}</span>
                <span class="dot">·</span>
              {/if}
              <span><strong>{pct(r.stats.winPct)}</strong> win rate</span>
              {#if r.stats.currentStreak > 0}
                <span class="dot">·</span>
                <span>🔥 {r.stats.currentStreak}</span>
              {/if}
            </div>
            <div class="lb-card-bar">
              <div class="lb-card-bar-fill" style="width: {Math.round(r.stats.winPct * 100)}%"></div>
            </div>
          </div>
          <div class="lb-card-wl">{r.stats.wins}–{r.stats.losses}</div>
        </a>
      {/each}
    </div>
  {/if}
{/if}

<style>
  .podium {
    display: grid;
    grid-template-columns: 1fr 1.15fr 1fr;
    gap: 16px;
    align-items: end;
    margin: 32px 0 48px;
    max-width: 900px;
    margin-left: auto;
    margin-right: auto;
  }
  .podium.podium-narrow {
    grid-template-columns: minmax(280px, 480px);
    justify-content: center;
  }
  .podium.podium-narrow:has(.podium-2) {
    grid-template-columns: minmax(220px, 1fr) minmax(260px, 1.15fr);
  }
  .podium-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 28px 20px;
    text-align: center;
    box-shadow: var(--shadow-sm);
    transition: all var(--dur) var(--ease);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    text-decoration: none;
    color: var(--fg1);
  }
  .podium-card :global(.avatar) { margin-bottom: 4px; }
  .podium-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
    color: var(--fg1);
  }
  .podium-medal { font-size: 2.5rem; line-height: 1; }
  .podium-rank {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--fg3);
    margin-bottom: 4px;
  }
  .podium-name {
    margin: 0;
    font-size: 1.3rem;
    font-weight: 800;
    letter-spacing: -0.025em;
  }
  .podium-stats {
    display: flex;
    gap: 8px;
    align-items: center;
    color: var(--fg2);
    font-size: 0.88rem;
    flex-wrap: wrap;
    justify-content: center;
  }
  .podium-stats strong {
    color: var(--fg1);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .podium-stats .dot { color: var(--fg3); }

  .podium-1 {
    background: linear-gradient(160deg, rgba(245, 200, 66, 0.20) 0%, rgba(0, 57, 166, 0.10) 100%), var(--surface);
    border: 2px solid var(--accent);
    box-shadow: var(--shadow-accent);
    padding: 36px 24px;
    transform: translateY(-12px);
  }
  .podium-1:hover { transform: translateY(-16px); }
  .podium-1 .podium-medal { font-size: 3.2rem; }
  .podium-1 .podium-name { font-size: 1.6rem; }
  .podium-1 .podium-rank { color: var(--accent-soft-text); }
  .podium-2 { background: linear-gradient(160deg, rgba(199, 199, 204, 0.22) 0%, rgba(199, 199, 204, 0.04) 100%), var(--surface); }
  .podium-3 { background: linear-gradient(160deg, rgba(205, 127, 50, 0.18) 0%, rgba(205, 127, 50, 0.03) 100%), var(--surface); }

  /* Visibility helpers — !important so they always win against per-element
     display rules like `.lb-cards { display: flex }` regardless of cascade
     order. Without this the cards leak through on desktop. */
  .hide-on-desktop { display: none !important; }
  @media (max-width: 768px) {
    .hide-on-mobile  { display: none !important; }
    .hide-on-desktop { display: revert !important; }

    .podium {
      grid-template-columns: 1fr;
      align-items: stretch;
    }
    .podium-1 { transform: none; order: -1; }
    .podium-1:hover { transform: translateY(-4px); }
  }

  /* Mobile leaderboard cards */
  .lb-cards {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .lb-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px 16px;
    box-shadow: var(--shadow-sm);
    transition: all var(--dur) var(--ease);
    text-decoration: none;
    color: var(--fg1);
    display: grid;
    grid-template-columns: 32px auto 1fr auto;
    gap: 12px;
    align-items: center;
  }
  .lb-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow);
    border-color: var(--border-strong);
    color: var(--fg1);
  }
  .lb-rank {
    font-size: 1.05rem;
    font-weight: 800;
    color: var(--fg3);
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
  .lb-card-main { min-width: 0; }
  .lb-card-name {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--fg1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.25;
  }
  .lb-card-stats {
    margin-top: 4px;
    font-size: 0.82rem;
    color: var(--fg2);
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .lb-card-stats strong {
    color: var(--fg1);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .lb-card-stats .dot { color: var(--fg3); }
  .lb-card-bar {
    margin-top: 8px;
    height: 4px;
    background: var(--bg-muted);
    border-radius: 2px;
    overflow: hidden;
  }
  .lb-card-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent) 0%, rgba(0, 57, 166, 0.6) 100%);
    transition: width var(--dur) var(--ease);
  }
  .lb-card-wl {
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--fg1);
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
  }
</style>
