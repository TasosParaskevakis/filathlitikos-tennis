<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';

  let { children } = $props();
  let menuOpen = $state(false);

  let layoutData = $derived($page.data as { isAdmin?: boolean; pendingTodayCount?: number });
  const pendingBadge = $derived(
    layoutData.isAdmin && layoutData.pendingTodayCount && layoutData.pendingTodayCount > 0
      ? layoutData.pendingTodayCount > 9 ? '9+' : String(layoutData.pendingTodayCount)
      : null
  );

  const isActive = (path: string) => {
    const p = $page.url.pathname;
    if (path === '/') return p === '/' || p.startsWith('/tournaments');
    if (path === '/players') return p === '/players' || p.startsWith('/players/');
    return p === path || p.startsWith(path + '/');
  };

  // Close menu on route change
  let lastPath = $state($page.url.pathname);
  $effect(() => {
    if ($page.url.pathname !== lastPath) {
      lastPath = $page.url.pathname;
      menuOpen = false;
    }
  });

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Escape') menuOpen = false;
  }
</script>

<svelte:window on:keydown={handleKey} />

<header class="site-header" class:menu-open={menuOpen}>
  <div class="site-header-inner">
    <a href="/" class="brand" aria-label="Φιλαθλητικός Tennis Club" onclick={() => { menuOpen = false; }}>
      <img src="/logo.png" alt="Φιλαθλητικός" class="brand-logo" width="72" height="72" />
    </a>

    <button
      type="button"
      class="burger"
      class:open={menuOpen}
      onclick={() => { menuOpen = !menuOpen; }}
      aria-label="Toggle menu"
      aria-expanded={menuOpen}
      aria-controls="primary-nav"
    >
      <span></span><span></span><span></span>
    </button>

    <nav id="primary-nav" class:open={menuOpen}>
      <a href="/" class:active={isActive('/')}>Tournaments</a>
      <a href="/today" class:active={isActive('/today')}>Today</a>
      <a href="/players" class:active={isActive('/players')}>Leaderboard</a>
      <a href="/admin" class:active={isActive('/admin')}>
        Admin
        {#if pendingBadge}<span class="nav-badge" title="{layoutData.pendingTodayCount} pending matches today">{pendingBadge}</span>{/if}
      </a>
    </nav>
  </div>

  {#if menuOpen}
    <button
      type="button"
      class="menu-backdrop"
      onclick={() => { menuOpen = false; }}
      aria-label="Close menu"
    ></button>
  {/if}
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

<style>
  .burger {
    display: none;
    background: transparent;
    border: none;
    padding: 0;
    width: 44px;
    height: 44px;
    cursor: pointer;
    position: relative;
    border-radius: 50%;
    transition: background var(--dur) var(--ease);
    box-shadow: none;
  }
  .burger:hover {
    background: var(--bg-muted);
    box-shadow: none;
  }
  .burger:active { transform: none; }
  .burger span {
    position: absolute;
    left: 11px;
    width: 22px;
    height: 2px;
    background: var(--fg1);
    border-radius: 2px;
    transition: transform 220ms var(--ease), opacity 180ms var(--ease), top 220ms var(--ease);
  }
  .burger span:nth-child(1) { top: 16px; }
  .burger span:nth-child(2) { top: 21px; }
  .burger span:nth-child(3) { top: 26px; }
  .burger.open span:nth-child(1) { top: 21px; transform: rotate(45deg); }
  .burger.open span:nth-child(2) { opacity: 0; }
  .burger.open span:nth-child(3) { top: 21px; transform: rotate(-45deg); }

  .menu-backdrop {
    display: none;
    position: fixed;
    inset: 0;
    top: 0;
    background: transparent;
    border: none;
    padding: 0;
    z-index: 40;
    cursor: default;
    box-shadow: none;
  }
  .menu-backdrop:hover { background: transparent; box-shadow: none; }

  @media (max-width: 768px) {
    .burger { display: block; }
    .menu-backdrop { display: block; }

    :global(.site-header nav) {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      flex-direction: column;
      gap: 4px;
      padding: 8px 16px 16px;
      background: rgba(255, 255, 255, 0.96);
      backdrop-filter: saturate(180%) blur(20px);
      -webkit-backdrop-filter: saturate(180%) blur(20px);
      border-bottom: 1px solid var(--border);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
      transform: translateY(-8px);
      opacity: 0;
      pointer-events: none;
      transition: transform 220ms var(--ease), opacity 180ms var(--ease);
    }
    :global(.site-header nav.open) {
      transform: translateY(0);
      opacity: 1;
      pointer-events: auto;
    }
    :global(.site-header nav a) {
      padding: 14px 16px !important;
      font-size: 1.05rem !important;
      border-radius: 12px;
      font-weight: 600 !important;
    }
  }
</style>
