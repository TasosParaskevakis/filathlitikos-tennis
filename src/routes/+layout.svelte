<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';

  let { children } = $props();

  const isActive = (path: string) => {
    const p = $page.url.pathname;
    if (path === '/') return p === '/' || p.startsWith('/tournaments');
    return p === path || p.startsWith(path + '/');
  };
</script>

<header class="site-header">
  <div class="site-header-inner">
    <a href="/" class="brand">
      <span class="brand-dot"></span>
      Paraskevakis Tennis
    </a>
    <nav>
      <a href="/" class:active={isActive('/')}>Tournaments</a>
      <a href="/players" class:active={isActive('/players')}>Leaderboard</a>
      <a href="/admin" class:active={isActive('/admin')}>Admin</a>
    </nav>
  </div>
</header>

<main class="container">
  {@render children()}
</main>
