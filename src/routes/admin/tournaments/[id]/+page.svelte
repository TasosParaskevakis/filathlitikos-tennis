<script lang="ts">
  import { enhance } from '$app/forms';
  import BracketView from '$lib/components/BracketView.svelte';
  import MatchEditModal from '$lib/components/MatchEditModal.svelte';
  import type { Match } from '$lib/db';

  let { data } = $props();
  let editing = $state<Match | null>(null);

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

  const playersById = $derived(
    Object.fromEntries(data.tournamentPlayers.map(p => [p.player_id, { id: p.player_id, name: p.name }]))
  );

  function pName(id: string | null) {
    if (!id) return '—';
    return playersById[id]?.name ?? '?';
  }
</script>

{#if !data.tournament}
  <p>Tournament not found.</p>
{:else}
  <h1 style="font-style:italic">{data.tournament.name}</h1>
  <p>Status: {data.tournament.status} · Best of {data.tournament.best_of}</p>

  {#if data.tournament.status === 'setup'}
    <h2>Players ({data.tournamentPlayers.length})</h2>
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
        <option value="">Select…</option>
        {#each data.allPlayers.filter(p => !data.tournamentPlayers.some(tp => tp.player_id === p.id)) as p (p.id)}
          <option value={p.id}>{p.name}</option>
        {/each}
      </select>
      <button type="submit">Add</button>
    </form>

    <p style="margin-top:24px">
      <button onclick={generate} disabled={generating || data.tournamentPlayers.length < 2}>
        {generating ? 'Generating…' : '🎲 Generate bracket'}
      </button>
    </p>
  {:else}
    <p><small>Click any match to enter scores.</small></p>
    <BracketView
      matches={data.matches}
      {playersById}
      onMatchClick={(m) => { editing = m; }}
    />
  {/if}

  {#if editing}
    <MatchEditModal
      match={editing}
      bestOf={data.tournament.best_of}
      p1Name={pName(editing.player1_id)}
      p2Name={pName(editing.player2_id)}
      onClose={() => { editing = null; }}
      onSaved={() => { editing = null; location.reload(); }}
    />
  {/if}

  <p><a href="/admin/tournaments">← Back</a></p>
{/if}
