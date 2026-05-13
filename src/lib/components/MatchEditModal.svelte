<script lang="ts">
  import type { Match } from '$lib/db';
  import { parseScores } from '$lib/scores';

  type Props = {
    match: Match;
    bestOf: number;
    p1Name: string;
    p2Name: string;
    onClose: () => void;
    onSaved: () => void;
  };
  let { match, bestOf, p1Name, p2Name, onClose, onSaved }: Props = $props();

  const initial = parseScores(match.scores);
  let sets = $state<[number, number][]>(
    Array.from({ length: bestOf }, (_, i) => initial[i] ?? [0, 0])
  );
  let saving = $state(false);
  let error = $state<string | null>(null);

  async function save() {
    saving = true;
    error = null;
    // Trim trailing all-zero sets (mark as "not played")
    const trimmed = sets.filter(([a, b]) => a > 0 || b > 0);
    const r = await fetch(`/api/admin/matches/${match.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scores: trimmed })
    });
    if (!r.ok) {
      error = await r.text();
      saving = false;
      return;
    }
    onSaved();
  }
</script>

<div class="modal-backdrop" onclick={onClose} role="presentation"></div>
<div class="modal" role="dialog" aria-label="Edit match">
  <h2>Match</h2>
  <table>
    <tbody>
      <tr>
        <td>{p1Name}</td>
        {#each sets as set, i}
          <td><input type="number" min="0" max="20" bind:value={sets[i][0]} style="width:50px" /></td>
        {/each}
      </tr>
      <tr>
        <td>{p2Name}</td>
        {#each sets as set, i}
          <td><input type="number" min="0" max="20" bind:value={sets[i][1]} style="width:50px" /></td>
        {/each}
      </tr>
    </tbody>
  </table>
  <p><small>Leave a set as 0-0 to mean "not played".</small></p>
  {#if error}<p class="error">{error}</p>{/if}
  <button onclick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
  <button onclick={onClose} style="background:transparent;color:var(--ink);border-color:var(--line)">Cancel</button>
</div>

<style>
  .modal-backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 10;
  }
  .modal {
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    background: var(--paper); border: 2px solid var(--ink); padding: 24px;
    z-index: 11; min-width: 320px;
  }
</style>
