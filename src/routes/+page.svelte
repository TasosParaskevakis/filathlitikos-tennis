<script lang="ts">
  let { data } = $props();
</script>

<h1>Players: {data.count}</h1>
{#if data.error}<p style="color:red">{data.error}</p>{/if}
