<script lang="ts">
  import { enhance } from '$app/forms';
  let { data, form } = $props();
</script>

{#if data.isAdmin}
  <section class="hero">
    <span class="label">Admin</span>
    <h1 class="display" style="font-size: clamp(2.5rem, 5vw, 3.5rem)">Dashboard</h1>
    <p class="hero-subtitle">Manage tournaments, players, and brackets.</p>
  </section>

  <div class="admin-grid">
    <a href="/admin/schedule" class="card admin-tile admin-tile-today">
      <div class="admin-tile-icon">🗓️</div>
      <h3>
        Today's matches
        {#if data.todayCount > 0}<span class="today-badge">{data.todayCount}</span>{/if}
      </h3>
      <p>{data.todayCount === 0 ? 'No matches scheduled for today.' : `${data.todayCount} match${data.todayCount === 1 ? '' : 'es'} scheduled — open to enter scores.`}</p>
    </a>
    <a href="/admin/tournaments" class="card admin-tile">
      <div class="admin-tile-icon">🏆</div>
      <h3>Tournaments</h3>
      <p>Create new tournaments, manage brackets, and record scores.</p>
    </a>
    <a href="/admin/players" class="card admin-tile">
      <div class="admin-tile-icon">🎾</div>
      <h3>Players</h3>
      <p>Add new players, rename, or remove from the club roster.</p>
    </a>
  </div>

  <form method="POST" action="/api/admin/logout" class="logout-form">
    <button type="submit" class="btn-ghost">Log out</button>
  </form>
{:else}
  <div class="login-wrap">
    <div class="card login-card">
      <div class="login-icon">🔒</div>
      <h1 class="login-title">Sign in</h1>
      <p class="login-subtitle">Enter the admin password to manage the club.</p>

      <form method="POST" action="?/login" use:enhance class="login-form">
        <div>
          <label for="password">Password</label>
          <input id="password" type="password" name="password" required autofocus />
        </div>
        <button type="submit">Sign in</button>
        {#if form?.error}<p class="error">{form.error}</p>{/if}
      </form>
    </div>
  </div>
{/if}

<style>
  .login-wrap {
    display: flex;
    min-height: 60vh;
    align-items: center;
    justify-content: center;
    padding: 24px 0;
  }

  .login-card {
    max-width: 400px;
    width: 100%;
    box-shadow: var(--shadow-lg);
    border-radius: var(--radius-lg);
    padding: 40px;
    text-align: center;
  }

  .login-icon {
    font-size: 2.4rem;
    margin-bottom: 12px;
  }

  .login-title {
    font-size: 2rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin: 0 0 8px;
  }

  .login-subtitle {
    color: var(--text-secondary);
    margin: 0 0 28px;
  }

  .login-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
    text-align: left;
  }

  .login-form button {
    width: 100%;
    padding: 14px 24px;
    font-size: 1rem;
  }

  .admin-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin: 24px 0;
  }
  .admin-tile-today {
    border-color: var(--accent);
    background: linear-gradient(135deg, rgba(0, 57, 166, 0.06) 0%, var(--surface) 60%);
  }
  .today-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--accent);
    color: var(--accent-text);
    border-radius: var(--radius-pill);
    padding: 2px 10px;
    font-size: 0.85rem;
    font-weight: 800;
    margin-left: 8px;
    vertical-align: middle;
    line-height: 1.4;
  }

  .admin-tile {
    display: flex;
    flex-direction: column;
    gap: 8px;
    text-decoration: none;
    color: var(--text);
  }

  .admin-tile-icon {
    font-size: 2rem;
    margin-bottom: 4px;
  }

  .admin-tile h3 {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .admin-tile p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.95rem;
  }

  .logout-form {
    margin-top: 24px;
  }

  @media (max-width: 900px) {
    .admin-grid { grid-template-columns: repeat(2, 1fr); }
    .admin-tile-today { grid-column: 1 / -1; }
  }
  @media (max-width: 600px) {
    .admin-grid { grid-template-columns: 1fr; }
    .admin-tile-today { grid-column: auto; }
    .login-card { padding: 32px 24px; }
  }
</style>
