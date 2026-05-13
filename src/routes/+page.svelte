<script lang="ts">
  let { data } = $props();
  const labels: Record<string, string> = {
    men_pro: 'Men · Pro',
    men_new: 'Men · New',
    women_pro: 'Women · Pro',
    women_new: 'Women · New'
  };
</script>

<h1>Tournaments</h1>

{#if data.inProgress.length}
  <h2>In Progress</h2>
  {#each data.inProgress as t (t.id)}
    <div class="card">
      <div class="label">{labels[t.category]}</div>
      <h3><a href="/tournaments/{t.id}">{t.name}</a></h3>
      <small>Best of {t.best_of}</small>
    </div>
  {/each}
{/if}

{#if data.completed.length}
  <h2>Completed</h2>
  {#each data.completed as t (t.id)}
    <div class="card">
      <div class="label">{labels[t.category]}</div>
      <h3><a href="/tournaments/{t.id}">{t.name}</a></h3>
    </div>
  {/each}
{/if}

{#if data.upcoming.length}
  <h2>Upcoming</h2>
  {#each data.upcoming as t (t.id)}
    <div class="card">
      <div class="label">{labels[t.category]}</div>
      <h3>{t.name}</h3>
      <small>Bracket not yet generated</small>
    </div>
  {/each}
{/if}

{#if !data.inProgress.length && !data.completed.length && !data.upcoming.length}
  <p>No tournaments yet. <a href="/admin">Sign in as admin</a> to create one.</p>
{/if}
