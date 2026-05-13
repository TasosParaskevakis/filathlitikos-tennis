<script lang="ts">
  import { parseScores } from '$lib/scores';
  import type { Match } from '$lib/db';
  import Avatar from './Avatar.svelte';

  type Props = {
    match: Match;
    playersById: Record<string, { id: string; name: string }>;
    isFinal?: boolean;
    byeSlot1?: boolean;
    byeSlot2?: boolean;
    onClick?: () => void;
  };

  let {
    match, playersById, isFinal = false,
    byeSlot1 = false, byeSlot2 = false, onClick
  }: Props = $props();

  const p1 = $derived(match.player1_id ? playersById[match.player1_id] : null);
  const p2 = $derived(match.player2_id ? playersById[match.player2_id] : null);
  const p1Name = $derived(p1 ? p1.name : (match.player1_id ? '?' : '—'));
  const p2Name = $derived(p2 ? p2.name : (match.player2_id ? '?' : '—'));
  const winnerSlot = $derived(
    match.winner_id === match.player1_id ? 1 :
    match.winner_id === match.player2_id ? 2 : null
  );

  const setScores = $derived(parseScores(match.scores));
  const p1SetScores = $derived(setScores.map(s => s[0]).join(' '));
  const p2SetScores = $derived(setScores.map(s => s[1]).join(' '));
</script>

<div
  class="match"
  class:final-match={isFinal}
  role={onClick ? 'button' : undefined}
  tabindex={onClick ? 0 : undefined}
  onclick={onClick}
  onkeydown={onClick ? (e) => { if (e.key === 'Enter') onClick(); } : undefined}
>
  <div
    class="player"
    class:winner={winnerSlot === 1}
    class:loser={winnerSlot === 2}
    class:champion={winnerSlot === 1 && isFinal}
  >
    <span class="player-name">
      {#if p1}
        <Avatar player={p1} size="sm" />
      {:else}
        <span class="avatar-placeholder"></span>
      {/if}
      <span class="name-text">{p1Name}{winnerSlot === 1 && isFinal ? ' 🏆' : ''}</span>
      {#if byeSlot1 && p1}<span class="bye-tag" title="Πέρασε απευθείας — δεν έπαιξε προηγούμενο γύρο">BYE</span>{/if}
    </span>
    <span class="scores">{p1SetScores}</span>
  </div>
  <div
    class="player"
    class:winner={winnerSlot === 2}
    class:loser={winnerSlot === 1}
    class:champion={winnerSlot === 2 && isFinal}
  >
    <span class="player-name">
      {#if p2}
        <Avatar player={p2} size="sm" />
      {:else}
        <span class="avatar-placeholder"></span>
      {/if}
      <span class="name-text">{p2Name}{winnerSlot === 2 && isFinal ? ' 🏆' : ''}</span>
      {#if byeSlot2 && p2}<span class="bye-tag" title="Πέρασε απευθείας — δεν έπαιξε προηγούμενο γύρο">BYE</span>{/if}
    </span>
    <span class="scores">{p2SetScores}</span>
  </div>
</div>

<style>
  .bye-tag {
    display: inline-block;
    padding: 2px 7px;
    margin-left: 6px;
    background: var(--accent-soft);
    color: var(--accent-soft-text);
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    border-radius: 9999px;
    line-height: 1.2;
    flex-shrink: 0;
  }
</style>
