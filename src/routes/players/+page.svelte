<script lang="ts">
  let { data } = $props();
  const pct = (n: number) => `${Math.round(n * 100)}%`;
</script>

<h1>Leaderboard</h1>

{#if data.rows.length === 0}
  <p>No players yet.</p>
{:else}
  <table>
    <thead>
      <tr>
        <th>Player</th>
        <th>Titles</th>
        <th>W-L</th>
        <th>Win%</th>
        <th>Sets</th>
        <th>Streak</th>
      </tr>
    </thead>
    <tbody>
      {#each data.rows as r (r.id)}
        <tr>
          <td><a href="/players/{r.id}">{r.name}</a></td>
          <td>{r.stats.titles}</td>
          <td>{r.stats.wins}-{r.stats.losses}</td>
          <td>{pct(r.stats.winPct)}</td>
          <td>{r.stats.setsWon}-{r.stats.setsLost}</td>
          <td>{r.stats.currentStreak}</td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}
