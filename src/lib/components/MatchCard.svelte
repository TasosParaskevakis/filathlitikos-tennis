<script lang="ts">
  import { formatScores, parseScores } from '$lib/scores';
  import type { Match } from '$lib/db';

  type Props = {
    match: Match;
    playersById: Record<string, { id: string; name: string }>;
    isFinal?: boolean;
    onClick?: () => void;
  };

  let { match, playersById, isFinal = false, onClick }: Props = $props();

  const p1 = $derived(match.player1_id ? playersById[match.player1_id]?.name ?? '?' : '—');
  const p2 = $derived(match.player2_id ? playersById[match.player2_id]?.name ?? '?' : '—');
  const formatted = $derived(formatScores(parseScores(match.scores)));
  const winnerSlot = $derived(
    match.winner_id === match.player1_id ? 1 :
    match.winner_id === match.player2_id ? 2 : null
  );

  // Build per-set scores: each entry is "p1Score" or "p2Score" for display
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
  style={onClick ? 'cursor:pointer' : ''}
>
  <div style="flex:1">
    <div class="player" class:winner={winnerSlot === 1} class:loser={winnerSlot === 2}>
      <span>{p1}{winnerSlot === 1 && isFinal ? ' 🏆' : ''}</span>
      <span class="scores">{p1SetScores}</span>
    </div>
    <div class="player" class:winner={winnerSlot === 2} class:loser={winnerSlot === 1}>
      <span>{p2}{winnerSlot === 2 && isFinal ? ' 🏆' : ''}</span>
      <span class="scores">{p2SetScores}</span>
    </div>
  </div>
</div>
