<script lang="ts">
  import MatchCard from './MatchCard.svelte';
  import type { Match } from '$lib/db';

  type Props = {
    matches: Match[];
    playersById: Record<string, { id: string; name: string }>;
    onMatchClick?: (m: Match) => void;
  };

  let { matches, playersById, onMatchClick }: Props = $props();

  const rounds = $derived(
    [...new Set(matches.map(m => m.round))].sort((a, b) => a - b)
  );
  const maxRound = $derived(rounds.length ? Math.max(...rounds) : 0);
  const labelFor = (r: number, max: number) => {
    const fromEnd = max - r;
    if (fromEnd === 0) return 'Final';
    if (fromEnd === 1) return 'Semifinals';
    if (fromEnd === 2) return 'Quarterfinals';
    return `Round ${r}`;
  };
</script>

<div class="bracket">
  {#each rounds as r (r)}
    <div class="bracket-round">
      <div class="bracket-round-label">{labelFor(r, maxRound)}</div>
      {#each matches.filter(m => m.round === r).sort((a, b) => a.position - b.position) as m (m.id)}
        <MatchCard
          match={m}
          {playersById}
          isFinal={r === maxRound}
          onClick={onMatchClick ? () => onMatchClick(m) : undefined}
        />
      {/each}
    </div>
  {/each}
</div>
