<script lang="ts">
  import { enhance } from '$app/forms';
  let { data } = $props();

  let generating = $state(false);
  async function generate() {
    generating = true;
    const r = await fetch(`/api/admin/tournaments/${data.tournament!.id}/generate-bracket`, { method: 'POST' });
    if (!r.ok) {
      const t = await r.text();
      alert(`Failed: ${t}`);
    } else {
      location.reload();
    }
    generating = false;
  }
</script>

{#if !data.tournament}
  <p>Tournament not found.</p>
{:else}
  <h1>{data.tournament.name}</h1>
  <p>Status: {data.tournament.status} · Best of {data.tournament.best_of}</p>

  {#if data.tournament.status === 'setup'}
    <h2>Players in tournament ({data.tournamentPlayers.length})</h2>
    <ul>
      {#each data.tournamentPlayers as p (p.player_id)}
        <li>
          {p.name}
          <form method="POST" action="?/removePlayer" use:enhance style="display:inline">
            <input type="hidden" name="player_id" value={p.player_id} />
            <button type="submit">Remove</button>
          </form>
        </li>
      {/each}
    </ul>

    <h3>Add player</h3>
    <form method="POST" action="?/addPlayer" use:enhance>
      <select name="player_id" required>
        <option value="">Select player...</option>
        {#each data.allPlayers.filter(p => !data.tournamentPlayers.some(tp => tp.player_id === p.id)) as p (p.id)}
          <option value={p.id}>{p.name}</option>
        {/each}
      </select>
      <button type="submit">Add</button>
    </form>

    <button onclick={generate} disabled={generating || data.tournamentPlayers.length < 2}>
      {generating ? 'Generating…' : '🎲 Generate bracket'}
    </button>
  {:else}
    <h2>Bracket</h2>
    <p>Click any match below to enter scores.</p>
    <ul>
      {#each data.matches as m (m.id)}
        <li>
          R{m.round} P{m.position}:
          {data.tournamentPlayers.find(p => p.player_id === m.player1_id)?.name ?? '—'}
          vs
          {data.tournamentPlayers.find(p => p.player_id === m.player2_id)?.name ?? '—'}
          {#if m.winner_id}
            → winner: {data.tournamentPlayers.find(p => p.player_id === m.winner_id)?.name}
            ({m.scores})
          {/if}
        </li>
      {/each}
    </ul>
  {/if}

  <p><a href="/admin/tournaments">← Back to tournaments</a></p>
{/if}
