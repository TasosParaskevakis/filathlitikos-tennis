<script lang="ts">
  import { formatScores, parseScores } from '$lib/scores';
  let { data } = $props();
  const pct = (n: number) => `${Math.round(n * 100)}%`;
</script>

{#if !data.player || !data.stats}
  <p>Player not found.</p>
{:else}
  <h1 style="font-style:italic">{data.player.name}</h1>

  <div class="card">
    <h3>Career</h3>
    <ul>
      <li>Titles: {data.stats.titles}</li>
      <li>Tournaments played: {data.stats.tournamentsPlayed}</li>
      <li>Match record: {data.stats.wins}-{data.stats.losses} ({pct(data.stats.winPct)})</li>
      <li>Sets won/lost: {data.stats.setsWon}-{data.stats.setsLost}</li>
      <li>Games won/lost: {data.stats.gamesWon}-{data.stats.gamesLost}</li>
      <li>Current streak: {data.stats.currentStreak} · Longest: {data.stats.longestStreak}</li>
    </ul>
  </div>

  <h2>Head-to-head</h2>
  {#if Object.keys(data.stats.headToHead).length === 0}
    <p>No matches played yet.</p>
  {:else}
    <table>
      <thead><tr><th>Opponent</th><th>W-L</th></tr></thead>
      <tbody>
        {#each Object.entries(data.stats.headToHead) as [oppId, h] (oppId)}
          <tr>
            <td><a href="/players/{oppId}">{data.opponents[oppId] ?? '?'}</a></td>
            <td>{h.wins}-{h.losses}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}

  <h2>Match history</h2>
  {#if data.matches.length === 0}
    <p>No matches yet.</p>
  {:else}
    <ul>
      {#each data.matches as m (m.id)}
        {@const isP1 = m.player1_id === data.player.id}
        {@const oppId = isP1 ? m.player2_id : m.player1_id}
        {@const won = m.winner_id === data.player.id}
        <li>
          <strong>{won ? 'W' : 'L'}</strong>
          vs <a href="/players/{oppId}">{oppId ? (data.opponents[oppId] ?? '?') : '?'}</a>
          — {formatScores(parseScores(m.scores))}
          <small>({m.tournament_name})</small>
        </li>
      {/each}
    </ul>
  {/if}
{/if}
