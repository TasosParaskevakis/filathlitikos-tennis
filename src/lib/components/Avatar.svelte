<script lang="ts" module>
  // Deterministic monogram avatar — initials on a club-palette color hashed
  // from the player id (or name). Greek-aware initials.
  const PALETTE = [
    { bg: '#0039A6', fg: '#FFFFFF' }, // club blue
    { bg: '#006F37', fg: '#FFFFFF' }, // court green
    { bg: '#1E4FB8', fg: '#FFFFFF' }, // sky-blue
    { bg: '#B8860B', fg: '#FFFFFF' }, // gold
    { bg: '#CD7F32', fg: '#FFFFFF' }, // bronze
    { bg: '#3B4252', fg: '#FFFFFF' }, // slate
    { bg: '#6B2D5C', fg: '#FFFFFF' }, // plum
    { bg: '#0F766E', fg: '#FFFFFF' }, // teal
  ];

  function hashString(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h) + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  export function initialsOf(name: string | undefined): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  export function paletteFor(seed: string): { bg: string; fg: string } {
    return PALETTE[hashString(seed) % PALETTE.length];
  }
</script>

<script lang="ts">
  type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  type Props = {
    player: { id?: string; name?: string } | null | undefined;
    size?: Size;
    ring?: boolean;
  };

  let { player, size = 'sm', ring = false }: Props = $props();

  const palette = $derived(player ? paletteFor(player.id ?? player.name ?? '') : null);
  const initials = $derived(player ? initialsOf(player.name) : '');
  const ringPx = $derived(size === 'xl' ? 5 : 4);
  const style = $derived(
    palette
      ? `background:${palette.bg};color:${palette.fg};` +
        (ring ? `box-shadow:0 0 0 3px #fff,0 0 0 ${ringPx}px ${palette.bg};` : '')
      : ''
  );
</script>

{#if player}
  <span class={`avatar avatar-${size}`} {style} aria-hidden="true">{initials}</span>
{/if}
