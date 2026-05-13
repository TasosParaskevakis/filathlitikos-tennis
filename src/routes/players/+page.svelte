<script lang="ts">
  let { data } = $props();
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  // Podium qualifies if there are 3+ players, and at least one match has been completed.
  const ranked = $derived(
    data.rows.filter(r => r.stats.wins + r.stats.losses > 0)
  );
  const showPodium = $derived(ranked.length >= 3);
  const podium = $derived(showPodium ? ranked.slice(0, 3) : []);
</script>

<section class="hero">
  <h1 class="display">Leaderboard</h1>
  <p class="hero-subtitle">All-time player rankings.</p>
</section>

{#if data.rows.length === 0}
  <div class="empty-state">
    <span class="emoji">🏆</span>
    <h3>No players yet</h3>
    <p>Once players are added and matches are played, the leaderboard will fill up here.</p>
  </div>
{:else}
  {#if showPodium}
    <div class="podium">
      <!-- 2nd place (left) -->
      <a href="/players/{podium[1].id}" class="podium-card podium-2">
        <div class="podium-medal">🥈</div>
        <div class="podium-rank">2nd</div>
        <h2 class="podium-name">{podium[1].name}</h2>
        <div class="podium-stats">
          <span><strong>{podium[1].stats.titles}</strong> titles</span>
          <span class="dot">·</span>
          <span><strong>{pct(podium[1].stats.winPct)}</strong> win rate</span>
        </div>
      </a>
      <!-- 1st place (center, biggest) -->
      <a href="/players/{podium[0].id}" class="podium-card podium-1">
        <div class="podium-medal">🥇</div>
        <div class="podium-rank">Champion</div>
        <h2 class="podium-name">{podium[0].name}</h2>
        <div class="podium-stats">
          <span><strong>{podium[0].stats.titles}</strong> titles</span>
          <span class="dot">·</span>
          <span><strong>{pct(podium[0].stats.winPct)}</strong> win rate</span>
        </div>
      </a>
      <!-- 3rd place (right) -->
      <a href="/players/{podium[2].id}" class="podium-card podium-3">
        <div class="podium-medal">🥉</div>
        <div class="podium-rank">3rd</div>
        <h2 class="podium-name">{podium[2].name}</h2>
        <div class="podium-stats">
          <span><strong>{podium[2].stats.titles}</strong> titles</span>
          <span class="dot">·</span>
          <span><strong>{pct(podium[2].stats.winPct)}</strong> win rate</span>
        </div>
      </a>
    </div>
  {/if}

  <div class="section-header">
    <span class="label">All players</span>
    <h2>Rankings</h2>
  </div>
  <table>
    <thead>
      <tr>
        <th class="col-rank">#</th>
        <th>Player</th>
        <th>Titles</th>
        <th>W-L</th>
        <th class="col-winpct">Win %</th>
        <th>Sets</th>
        <th>Streak</th>
      </tr>
    </thead>
    <tbody>
      {#each data.rows as r, i (r.id)}
        <tr>
          <td class="num col-rank">{i + 1}</td>
          <td><a href="/players/{r.id}" class="player-cell">{r.name}</a></td>
          <td class="num">{r.stats.titles}</td>
          <td class="num">{r.stats.wins}-{r.stats.losses}</td>
          <td class="winpct-cell">
            <div class="winpct-bar" style="width: {Math.round(r.stats.winPct * 100)}%"></div>
            <span class="winpct-text">{pct(r.stats.winPct)}</span>
          </td>
          <td class="num">{r.stats.setsWon}-{r.stats.setsLost}</td>
          <td class="num">{r.stats.currentStreak}</td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}

<style>
  .podium {
    display: grid;
    grid-template-columns: 1fr 1.15fr 1fr;
    gap: 16px;
    align-items: end;
    margin: 32px 0 48px;
  }

  .podium-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 28px 20px;
    text-align: center;
    box-shadow: var(--shadow-sm);
    transition: all var(--dur) var(--ease);
    color: var(--text);
    text-decoration: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .podium-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
    color: var(--text);
  }

  .podium-medal {
    font-size: 2.5rem;
    line-height: 1;
  }

  .podium-rank {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-tertiary);
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
    color: var(--text-secondary);
    font-size: 0.88rem;
    flex-wrap: wrap;
    justify-content: center;
  }
  .podium-stats strong {
    color: var(--text);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .podium-stats .dot { color: var(--text-tertiary); }

  /* 1st place — bigger, gold accent, lifted */
  .podium-1 {
    background:
      linear-gradient(160deg, rgba(245, 200, 66, 0.20) 0%, rgba(0, 57, 166, 0.10) 100%),
      var(--surface);
    border: 2px solid var(--accent);
    box-shadow: var(--shadow-accent);
    padding: 36px 24px;
    transform: translateY(-12px);
  }
  .podium-1:hover { transform: translateY(-16px); }
  .podium-1 .podium-medal { font-size: 3.2rem; }
  .podium-1 .podium-name { font-size: 1.6rem; }
  .podium-1 .podium-rank { color: var(--accent-soft-text); }

  /* 2nd place — silver tint */
  .podium-2 {
    background:
      linear-gradient(160deg, rgba(199, 199, 204, 0.22) 0%, rgba(199, 199, 204, 0.04) 100%),
      var(--surface);
  }

  /* 3rd place — bronze tint */
  .podium-3 {
    background:
      linear-gradient(160deg, rgba(205, 127, 50, 0.18) 0%, rgba(205, 127, 50, 0.03) 100%),
      var(--surface);
  }

  .col-rank { width: 48px; color: var(--text-tertiary); }
  .col-winpct { width: 180px; }

  .player-cell {
    font-weight: 600;
    color: var(--text);
  }
  .player-cell:hover { color: var(--court); }

  .winpct-cell {
    position: relative;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    overflow: hidden;
  }
  .winpct-bar {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, rgba(0, 57, 166, 0.20) 0%, rgba(0, 57, 166, 0.05) 100%);
    z-index: 0;
    transition: width var(--dur) var(--ease);
  }
  .winpct-text {
    position: relative;
    z-index: 1;
  }

  @media (max-width: 768px) {
    .podium {
      grid-template-columns: 1fr;
      gap: 12px;
    }
    .podium-1 { transform: none; order: -1; }
    .podium-1:hover { transform: translateY(-4px); }
    .col-winpct { width: auto; }
    /* Hide some columns on narrow */
    table th:nth-child(6),
    table td:nth-child(6),
    table th:nth-child(7),
    table td:nth-child(7) { display: none; }
  }
</style>
