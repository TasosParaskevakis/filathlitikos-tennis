<script lang="ts">
  import { formatScores, parseScores } from '$lib/scores';
  let { data } = $props();
  const pct = (n: number) => `${Math.round(n * 100)}%`;
</script>

{#if !data.player || !data.stats}
  <div class="empty-state">
    <span class="emoji">🎾</span>
    <h3>Player not found</h3>
    <p><a href="/players">Back to leaderboard</a></p>
  </div>
{:else}
  <section class="p-hero">
    <span class="label">Player</span>
    <h1 class="p-name">{data.player.name}</h1>
  </section>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon">🏆</div>
      <div class="stat-value">{data.stats.titles}</div>
      <div class="stat-label">Titles</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">📈</div>
      <div class="stat-value">{pct(data.stats.winPct)}</div>
      <div class="stat-label">Win rate</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">🎾</div>
      <div class="stat-value">{data.stats.wins}<span class="stat-sub">-{data.stats.losses}</span></div>
      <div class="stat-label">Match record</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">{data.stats.currentStreak > 0 ? '🔥' : '⏸️'}</div>
      <div class="stat-value">{data.stats.currentStreak}</div>
      <div class="stat-label">Current streak</div>
    </div>
  </div>

  <div class="card career-detail">
    <div class="career-row">
      <span class="career-label">Tournaments played</span>
      <span class="career-value">{data.stats.tournamentsPlayed}</span>
    </div>
    <div class="career-row">
      <span class="career-label">Sets won — lost</span>
      <span class="career-value">{data.stats.setsWon} — {data.stats.setsLost}</span>
    </div>
    <div class="career-row">
      <span class="career-label">Games won — lost</span>
      <span class="career-value">{data.stats.gamesWon} — {data.stats.gamesLost}</span>
    </div>
    <div class="career-row">
      <span class="career-label">Longest streak</span>
      <span class="career-value">{data.stats.longestStreak}</span>
    </div>
  </div>

  <div class="section-header">
    <span class="label">Rivalries</span>
    <h2>Head-to-head</h2>
  </div>
  {#if Object.keys(data.stats.headToHead).length === 0}
    <div class="empty-state">
      <span class="emoji">🤝</span>
      <h3>No matches played yet</h3>
      <p>When this player hits the court, you'll see their rivalry record here.</p>
    </div>
  {:else}
    <table>
      <thead>
        <tr>
          <th>Opponent</th>
          <th>Record</th>
          <th>Result</th>
        </tr>
      </thead>
      <tbody>
        {#each Object.entries(data.stats.headToHead) as [oppId, h] (oppId)}
          {@const total = h.wins + h.losses}
          {@const winRate = total ? h.wins / total : 0}
          <tr>
            <td><a href="/players/{oppId}" class="player-cell">{data.opponents[oppId] ?? '?'}</a></td>
            <td class="num">{h.wins}-{h.losses}</td>
            <td>
              {#if h.wins > h.losses}
                <span class="pill pill-win">Leads {pct(winRate)}</span>
              {:else if h.losses > h.wins}
                <span class="pill pill-loss">Trails {pct(winRate)}</span>
              {:else}
                <span class="pill">Even</span>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}

  <div class="section-header">
    <span class="label">Recent</span>
    <h2>Match history</h2>
  </div>
  {#if data.matches.length === 0}
    <div class="empty-state">
      <span class="emoji">🎾</span>
      <h3>No matches played yet</h3>
      <p>When they hit the court, you'll see them here.</p>
    </div>
  {:else}
    <div class="match-history">
      {#each data.matches as m (m.id)}
        {@const isP1 = m.player1_id === data.player.id}
        {@const oppId = isP1 ? m.player2_id : m.player1_id}
        {@const won = m.winner_id === data.player.id}
        <div class="history-card">
          <span class="pill" class:pill-win={won} class:pill-loss={!won}>
            {won ? 'Win' : 'Loss'}
          </span>
          <div class="history-main">
            <div class="history-vs">
              vs <a href="/players/{oppId}" class="opp-link">{oppId ? (data.opponents[oppId] ?? '?') : '?'}</a>
            </div>
            <div class="history-tournament">{m.tournament_name}</div>
          </div>
          <div class="history-score">{formatScores(parseScores(m.scores))}</div>
        </div>
      {/each}
    </div>
  {/if}
{/if}

<style>
  .p-hero {
    padding: 56px 0 24px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .p-name {
    font-size: clamp(2.5rem, 6vw, 4.5rem);
    font-weight: 900;
    letter-spacing: -0.04em;
    line-height: 0.95;
    margin: 0;
  }

  .stat-value .stat-sub {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--text-tertiary);
    margin-left: 2px;
  }

  .career-detail {
    padding: 8px 24px;
    margin-bottom: 32px;
  }

  .career-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 0;
    border-bottom: 1px solid var(--border);
  }
  .career-row:last-child { border-bottom: none; }

  .career-label {
    color: var(--text-secondary);
    font-size: 0.9rem;
    font-weight: 500;
  }

  .career-value {
    font-weight: 700;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }

  .player-cell {
    font-weight: 600;
    color: var(--text);
  }
  .player-cell:hover { color: var(--court); }

  .match-history {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .history-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 14px 18px;
    display: flex;
    align-items: center;
    gap: 16px;
    box-shadow: var(--shadow-sm);
    transition: all var(--dur) var(--ease);
  }

  .history-card:hover {
    transform: translateX(2px);
    border-color: var(--border-strong);
  }

  .history-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .history-vs {
    font-weight: 600;
    color: var(--text);
  }

  .opp-link {
    color: var(--text);
    font-weight: 700;
  }
  .opp-link:hover { color: var(--court); }

  .history-tournament {
    font-size: 0.82rem;
    color: var(--text-tertiary);
  }

  .history-score {
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    font-size: 1rem;
    color: var(--text);
    letter-spacing: 0.02em;
    flex-shrink: 0;
  }

  @media (max-width: 768px) {
    .p-hero { padding: 32px 0 16px; }
    .history-card { gap: 12px; padding: 12px 14px; }
    .history-score { font-size: 0.9rem; }
  }
</style>
