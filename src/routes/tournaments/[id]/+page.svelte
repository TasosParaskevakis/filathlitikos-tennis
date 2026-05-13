<script lang="ts">
  import BracketView from '$lib/components/BracketView.svelte';
  let { data } = $props();
  const labels: Record<string, string> = {
    men_pro: 'Men · Pro', men_new: 'Men · New',
    women_pro: 'Women · Pro', women_new: 'Women · New'
  };
</script>

{#if !data.tournament}
  <p>Tournament not found.</p>
{:else}
  <div class="label">{labels[data.tournament.category]}</div>
  <h1 style="font-style:italic">{data.tournament.name}</h1>
  <p>Best of {data.tournament.best_of} sets</p>

  {#if data.champion}
    <div class="card featured">
      <div class="label">Champion 🏆</div>
      <h2 style="margin:0"><a href="/players/{data.champion.id}">{data.champion.name}</a></h2>
    </div>
  {/if}

  {#if data.matches.length}
    <BracketView matches={data.matches} playersById={data.playersById} />
  {:else}
    <p>Bracket not generated yet.</p>
  {/if}
{/if}
