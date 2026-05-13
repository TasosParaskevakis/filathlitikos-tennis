<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';

  let { children } = $props();

  const isActive = (path: string) => {
    const p = $page.url.pathname;
    if (path === '/') return p === '/' || p.startsWith('/tournaments');
    if (path === '/players') return p === '/players' || p.startsWith('/players/');
    return p === path || p.startsWith(path + '/');
  };
</script>

<header class="site-header">
  <div class="site-header-inner">
    <a href="/" class="brand" aria-label="Φιλαθλητικός Tennis Club">
      <img src="/logo.png" alt="Φιλαθλητικός" class="brand-logo" width="72" height="72" />
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

<footer class="site-footer">
  <div class="site-footer-inner">
    <span class="site-footer-text">
      Made with <span class="heart" aria-label="love">♥</span> by
      <a href="https://github.com/TasosParaskevakis" target="_blank" rel="noopener noreferrer">Tasos Paraskevakis</a>
    </span>
  </div>
</footer>
