<script lang="ts">
  import { enhance } from '$app/forms';
  let { data, form } = $props();
</script>

{#if data.isAdmin}
  <h1>Admin dashboard</h1>
  <ul>
    <li><a href="/admin/tournaments">Tournaments</a></li>
    <li><a href="/admin/players">Players</a></li>
  </ul>
  <form method="POST" action="/api/admin/logout">
    <button type="submit">Log out</button>
  </form>
{:else}
  <h1>Admin login</h1>
  <form method="POST" action="?/login" use:enhance>
    <label>
      Password
      <input type="password" name="password" required />
    </label>
    <button type="submit">Log in</button>
    {#if form?.error}<p style="color:red">{form.error}</p>{/if}
  </form>
{/if}
