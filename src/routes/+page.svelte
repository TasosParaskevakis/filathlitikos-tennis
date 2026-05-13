<script lang="ts">
  let { data } = $props();
</script>

<h1>Players: {data.count}</h1>
<p>Admin: {data.isAdmin ? 'yes' : 'no'}</p>
