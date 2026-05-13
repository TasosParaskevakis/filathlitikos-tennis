<script lang="ts">
  import { enhance } from '$app/forms';
  let { data } = $props();
</script>

<h1>Tournaments</h1>

<details>
  <summary>+ New tournament</summary>
  <form method="POST" action="?/create" use:enhance>
    <label>Name <input name="name" required /></label>
    <label>Category
      <select name="category" required>
        <option value="men_pro">Men Pro</option>
        <option value="men_new">Men New</option>
        <option value="women_pro">Women Pro</option>
        <option value="women_new">Women New</option>
      </select>
    </label>
    <label>Best of
      <select name="best_of">
        <option value="1">1 set</option>
        <option value="3" selected>3 sets</option>
        <option value="5">5 sets</option>
      </select>
    </label>
    <button type="submit">Create</button>
  </form>
</details>

<ul>
  {#each data.tournaments as t (t.id)}
    <li>
      <a href="/admin/tournaments/{t.id}">{t.name}</a>
      <small>({t.category}, best of {t.best_of}) — {t.status}</small>
      <form method="POST" action="?/delete" use:enhance style="display:inline">
        <input type="hidden" name="id" value={t.id} />
        <button type="submit" onclick={(e) => { if (!confirm('Delete tournament?')) e.preventDefault(); }}>Delete</button>
      </form>
    </li>
  {/each}
</ul>

<p><a href="/admin">← Back to dashboard</a></p>
