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

  // A player slot in round 2+ is a "bye" slot when the previous round
  // doesn't have the match that would have fed it. (Each round-N match at
  // position p is fed by round-(N-1) matches at positions 2p and 2p+1.)
  const byeSlots = $derived.by(() => {
    const set = new Set<string>(); // `${matchId}:1` or `${matchId}:2`
    const positionsByRound = new Map<number, Set<number>>();
    for (const m of matches) {
      if (!positionsByRound.has(m.round)) positionsByRound.set(m.round, new Set());
      positionsByRound.get(m.round)!.add(m.position);
    }
    for (const m of matches) {
      const prevPositions = positionsByRound.get(m.round - 1);
      if (!prevPositions) continue; // round 1 has no feeder
      if (!prevPositions.has(2 * m.position)) set.add(`${m.id}:1`);
      if (!prevPositions.has(2 * m.position + 1)) set.add(`${m.id}:2`);
    }
    // If BOTH slots in the same match got a bye, neither is really "advancing
    // for free against an opponent" — they're just both having their first
    // match here. Drop the BYE marker so the UI doesn't double-label it.
    for (const m of matches) {
      if (set.has(`${m.id}:1`) && set.has(`${m.id}:2`)) {
        set.delete(`${m.id}:1`);
        set.delete(`${m.id}:2`);
      }
    }
    return set;
  });
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
          byeSlot1={byeSlots.has(`${m.id}:1`)}
          byeSlot2={byeSlots.has(`${m.id}:2`)}
          onClick={onMatchClick ? () => onMatchClick(m) : undefined}
        />
      {/each}
    </div>
  {/each}
</div>
