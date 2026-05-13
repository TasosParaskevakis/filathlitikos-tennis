<script lang="ts">
  import { enhance } from '$app/forms';
  let { data } = $props();
</script>

<h1>Players</h1>

<form method="POST" action="?/create" use:enhance>
  <input name="name" placeholder="New player name" required />
  <button type="submit">Add</button>
</form>

<ul>
  {#each data.players as p (p.id)}
    <li>
      <span>{p.name}</span>
      <form method="POST" action="?/rename" use:enhance style="display:inline">
        <input type="hidden" name="id" value={p.id} />
        <input name="name" value={p.name} />
        <button type="submit">Rename</button>
      </form>
      <form method="POST" action="?/delete" use:enhance style="display:inline">
        <input type="hidden" name="id" value={p.id} />
        <button type="submit">Delete</button>
      </form>
    </li>
  {/each}
</ul>

<p><a href="/admin">← Back to dashboard</a></p>
