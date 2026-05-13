<script lang="ts">
  import '../app.css';
  let { children } = $props();
</script>

<header class="site-header">
  <div class="brand">— Paraskevakis Tennis Club —</div>
  <nav>
    <a href="/">Tournaments</a>
    <a href="/players">Leaderboard</a>
    <a href="/admin">Admin</a>
  </nav>
</header>

<main class="container">
  {@render children()}
</main>
