<script lang="ts">
  import type { Match } from '$lib/db';
  import { parseScores } from '$lib/scores';
  import { fillNextEmptySet, indexOfNextEmptySet, type Set } from '$lib/set-fill';

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
  let scheduledDate = $state<string>(match.scheduled_date ?? '');
  let saving = $state(false);
  let error = $state<string | null>(null);

  const QUICK_PICKS: Array<{ score: Set; label: string }> = [
    { score: [6, 0], label: '6-0' },
    { score: [6, 1], label: '6-1' },
    { score: [6, 2], label: '6-2' },
    { score: [6, 3], label: '6-3' },
    { score: [6, 4], label: '6-4' },
    { score: [7, 5], label: '7-5' },
    { score: [7, 6], label: '7-6' }
  ];

  let lastFilledIndex = $state<number | null>(null);

  function applyQuickPick(score: Set) {
    const result = fillNextEmptySet(sets, score);
    if (!result) return;
    sets = result.sets;
    lastFilledIndex = result.filledIndex;
  }

  function clearLast() {
    if (lastFilledIndex === null) return;
    sets[lastFilledIndex] = [0, 0];
    sets = [...sets];
    lastFilledIndex = null;
  }

  const nextEmptyIdx = $derived(indexOfNextEmptySet(sets));
  const allSetsFilled = $derived(nextEmptyIdx === -1);

  async function save() {
    saving = true;
    error = null;
    const trimmed = sets.filter(([a, b]) => a > 0 || b > 0);
    const r = await fetch(`/api/admin/matches/${match.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scores: trimmed,
        scheduled_date: scheduledDate || null
      })
    });
    if (!r.ok) {
      error = await r.text();
      saving = false;
      return;
    }
    onSaved();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="modal-backdrop" onclick={onClose} role="presentation"></div>
<div class="modal" role="dialog" aria-label="Edit match" aria-modal="true">
  <div class="modal-header">
    <span class="label">Match</span>
    <h2 class="modal-title">{p1Name} <span class="vs">vs</span> {p2Name}</h2>
  </div>

  <div class="sets-table">
    <div class="sets-header">
      <span class="player-name-cell"></span>
      <div class="set-labels">
        {#each sets as _, i}
          <span class="set-label">Set {i + 1}</span>
        {/each}
      </div>
    </div>
    <div class="sets-row">
      <span class="player-name-cell">{p1Name}</span>
      <div class="set-inputs">
        {#each sets as set, i}
          <input type="number" min="0" max="20" bind:value={sets[i][0]} class="score-input" aria-label="{p1Name} set {i + 1}" />
        {/each}
      </div>
    </div>
    <div class="sets-row">
      <span class="player-name-cell">{p2Name}</span>
      <div class="set-inputs">
        {#each sets as set, i}
          <input type="number" min="0" max="20" bind:value={sets[i][1]} class="score-input" aria-label="{p2Name} set {i + 1}" />
        {/each}
      </div>
    </div>
  </div>

  <div class="qp-section">
    <div class="qp-label">
      {#if allSetsFilled}
        All sets filled — clear one to add more.
      {:else}
        Tap to fill <strong>Set {nextEmptyIdx + 1} of {bestOf}</strong>
      {/if}
    </div>
    <div class="qp-row">
      <span class="qp-row-label">{p1Name} wins</span>
      <div class="qp-grid">
        {#each QUICK_PICKS as { score, label } (label)}
          <button
            type="button"
            class="qp-pill"
            disabled={allSetsFilled}
            onclick={() => applyQuickPick(score)}
          >{label}</button>
        {/each}
      </div>
    </div>
    <div class="qp-row">
      <span class="qp-row-label">{p2Name} wins</span>
      <div class="qp-grid">
        {#each QUICK_PICKS as { score, label } (label)}
          <button
            type="button"
            class="qp-pill"
            disabled={allSetsFilled}
            onclick={() => applyQuickPick([score[1], score[0]])}
          >{score[1]}-{score[0]}</button>
        {/each}
      </div>
    </div>
    <button
      type="button"
      class="btn-ghost btn-sm qp-clear"
      disabled={lastFilledIndex === null}
      onclick={clearLast}
    >← Clear last</button>
  </div>

  <p class="hint">Leave a set as 0–0 to mean "not played".</p>

  <div class="date-row">
    <label for="match-date" class="date-label">Scheduled date</label>
    <input
      id="match-date"
      type="date"
      bind:value={scheduledDate}
      class="date-input"
    />
    {#if scheduledDate}
      <button type="button" class="btn-ghost btn-sm" onclick={() => { scheduledDate = ''; }}>Clear</button>
    {/if}
  </div>

  {#if error}<p class="error">{error}</p>{/if}

  <div class="modal-actions">
    <button onclick={onClose} class="btn-ghost">Cancel</button>
    <button onclick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(10, 10, 10, 0.5);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 100;
    animation: backdrop-in 200ms ease-out both;
  }

  .modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--surface);
    border-radius: var(--radius-lg);
    padding: 32px;
    box-shadow: var(--shadow-lg);
    z-index: 101;
    min-width: 400px;
    max-width: min(90vw, 560px);
    animation: modal-in 220ms cubic-bezier(0.4, 0, 0.2, 1) both;
  }

  @keyframes backdrop-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes modal-in {
    from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }
    to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }

  .modal-header {
    margin-bottom: 24px;
  }

  .modal-title {
    margin: 4px 0 0;
    font-size: 1.6rem;
    font-weight: 800;
    letter-spacing: -0.025em;
  }
  .modal-title .vs {
    color: var(--text-tertiary);
    font-weight: 500;
    margin: 0 4px;
  }

  .sets-table {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: var(--bg-muted);
    padding: 20px;
    border-radius: var(--radius);
  }

  .sets-header,
  .sets-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .set-labels,
  .set-inputs {
    display: flex;
    gap: 8px;
  }

  .set-label {
    width: 60px;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-tertiary);
    text-align: center;
  }

  .player-name-cell {
    flex: 1;
    min-width: 0;
    font-weight: 600;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .score-input {
    width: 60px;
    padding: 12px 0;
    text-align: center;
    font-size: 1.25rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    background: var(--surface);
    border-radius: 10px;
  }

  /* Hide spinners */
  .score-input::-webkit-outer-spin-button,
  .score-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .score-input {
    -moz-appearance: textfield;
    appearance: textfield;
  }

  .hint {
    margin: 16px 0 0;
    font-size: 0.85rem;
    color: var(--text-tertiary);
  }

  .date-row {
    margin-top: 18px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .date-label {
    margin: 0;
    color: var(--fg2);
    font-weight: 600;
    font-size: 0.85rem;
  }
  .date-input {
    width: auto;
    flex: 1;
    min-width: 160px;
  }

  .modal-actions {
    margin-top: 24px;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .error { margin: 12px 0 0; }

  @media (max-width: 600px) {
    .modal {
      min-width: auto;
      width: calc(100vw - 24px);
      padding: 24px;
    }
    .sets-table { padding: 16px; overflow-x: auto; }
    .modal-title { font-size: 1.3rem; }
  }
</style>
