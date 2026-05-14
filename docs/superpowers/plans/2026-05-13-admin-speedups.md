# Admin Speed-Ups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut admin score-entry time roughly in half by adding quick-pick score buttons, walkover support, "Save & next match" workflow, and a today's-pending count badge in the nav.

**Architecture:** Two new pure helper modules (`match-flow.ts` for "next pending match" logic, `set-fill.ts` for quick-pick fill logic) provide testable building blocks. The match modal grows three new UI sections (quick-pick palette, walkover, save-and-next button) wired to those helpers and an extended API endpoint. A new `+layout.server.ts` computes the pending-today count for admins; the layout renders a small badge.

**Tech Stack:** SvelteKit 2 + Svelte 5 + TypeScript, Cloudflare D1, Vitest. No new dependencies.

---

## File Structure

```
src/
├── lib/
│   ├── match-flow.ts         (NEW)  pure: findNextPendingMatch
│   ├── set-fill.ts           (NEW)  pure: fillNextEmptySet, clearLastFilledSet
│   └── components/
│       └── MatchEditModal.svelte    (MODIFY)  +quick-pick, +walkover, +save-and-next
├── routes/
│   ├── +layout.server.ts     (NEW)  loads pendingTodayCount when admin
│   ├── +layout.svelte        (MODIFY)  render badge
│   ├── tournaments/[id]/
│   │   └── +page.svelte      (MODIFY)  wire onSavedAndNext
│   ├── today/
│   │   └── +page.svelte      (MODIFY)  wire onSavedAndNext (day-scoped)
│   ├── admin/tournaments/[id]/
│   │   └── +page.svelte      (MODIFY)  wire onSavedAndNext
│   └── api/admin/matches/[id]/
│       └── +server.ts        (MODIFY)  accept walkover_winner_id
├── app.css                   (MODIFY)  pill-grid + badge styles
└── tests/
    ├── match-flow.test.ts    (NEW)
    └── set-fill.test.ts      (NEW)
```

**Boundary rationale:**
- Pure modules (`match-flow.ts`, `set-fill.ts`) take primitives, return primitives, no DB or framework. Unit-testable in milliseconds.
- The modal stays one component (already cohesive) but its UI grows three small focused sections, each calling a pure helper or the API.
- Layout stays simple: one new server file, one new badge in markup.

---

## Task 1: Pure helper — findNextPendingMatch (TDD)

**Files:**
- Create: `src/lib/match-flow.ts`
- Test: `tests/match-flow.test.ts`

This module identifies the next match to score after the user saves the current one. Pure function, easy to test, used by the modal callers.

- [ ] **Step 1: Write the failing tests**

Create `tests/match-flow.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { findNextPendingMatch, type FlowMatch } from '../src/lib/match-flow';

const make = (over: Partial<FlowMatch>): FlowMatch => ({
  id: 'm', round: 1, position: 0,
  player1_id: 'a', player2_id: 'b', winner_id: null,
  status: 'pending', ...over
});

describe('findNextPendingMatch', () => {
  it('returns the first pending match with both players known, sorted by (round,position)', () => {
    const matches: FlowMatch[] = [
      make({ id: 'm1', round: 1, position: 0, status: 'completed', winner_id: 'a' }),
      make({ id: 'm2', round: 1, position: 1, status: 'pending' }),
      make({ id: 'm3', round: 2, position: 0, status: 'pending' })
    ];
    expect(findNextPendingMatch(matches, 'm1')?.id).toBe('m2');
  });

  it('skips matches still waiting for a previous round (player1 or player2 null)', () => {
    const matches: FlowMatch[] = [
      make({ id: 'm1', round: 1, position: 0, status: 'completed' }),
      make({ id: 'm2', round: 2, position: 0, player1_id: null, status: 'pending' }),
      make({ id: 'm3', round: 1, position: 1, status: 'pending' })
    ];
    expect(findNextPendingMatch(matches, 'm1')?.id).toBe('m3');
  });

  it('skips the match we just saved (currentMatchId)', () => {
    const matches: FlowMatch[] = [
      make({ id: 'm1', round: 1, position: 0, status: 'pending' }),
      make({ id: 'm2', round: 1, position: 1, status: 'pending' })
    ];
    expect(findNextPendingMatch(matches, 'm1')?.id).toBe('m2');
  });

  it('sorts by round first, then position', () => {
    const matches: FlowMatch[] = [
      make({ id: 'm1', round: 2, position: 0, status: 'pending' }),
      make({ id: 'm2', round: 1, position: 5, status: 'pending' }),
      make({ id: 'm3', round: 1, position: 2, status: 'pending' })
    ];
    expect(findNextPendingMatch(matches, 'unknown')?.id).toBe('m3');
  });

  it('returns null when nothing is pending with both players known', () => {
    const matches: FlowMatch[] = [
      make({ id: 'm1', status: 'completed' }),
      make({ id: 'm2', round: 2, position: 0, player1_id: null, status: 'pending' })
    ];
    expect(findNextPendingMatch(matches, 'm1')).toBeNull();
  });

  it('returns null on empty list', () => {
    expect(findNextPendingMatch([], 'whatever')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `npm test -- match-flow`
Expected: All fail with "Cannot find module '../src/lib/match-flow'".

- [ ] **Step 3: Implement src/lib/match-flow.ts**

Create `src/lib/match-flow.ts`:

```typescript
export type FlowMatch = {
  id: string;
  round: number;
  position: number;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  status: string;
};

/**
 * Pick the next match the admin should score after saving `currentMatchId`.
 * "Next" = pending, both players known, ordered by round then position
 * (walks the bracket left-to-right, top-to-bottom). Returns null when
 * there's nothing left.
 */
export function findNextPendingMatch<M extends FlowMatch>(
  matches: M[],
  currentMatchId: string
): M | null {
  const candidates = matches
    .filter(m => m.status === 'pending')
    .filter(m => m.player1_id !== null && m.player2_id !== null)
    .filter(m => m.id !== currentMatchId)
    .sort((a, b) => a.round - b.round || a.position - b.position);
  return candidates[0] ?? null;
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `npm test -- match-flow`
Expected: 6/6 tests pass.

- [ ] **Step 5: Commit**

```bash
cd "/Users/admin/Documents/tennis tournament"
git add src/lib/match-flow.ts tests/match-flow.test.ts
git commit -m "Add findNextPendingMatch helper for save-and-next flow"
```

---

## Task 2: Pure helper — set-fill (TDD)

**Files:**
- Create: `src/lib/set-fill.ts`
- Test: `tests/set-fill.test.ts`

Pure functions for the quick-pick palette: fill the next empty set with a tapped score, and undo the most recent fill.

- [ ] **Step 1: Write the failing tests**

Create `tests/set-fill.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { fillNextEmptySet, indexOfNextEmptySet } from '../src/lib/set-fill';

describe('indexOfNextEmptySet', () => {
  it('returns 0 when all sets are empty (0,0)', () => {
    expect(indexOfNextEmptySet([[0, 0], [0, 0], [0, 0]])).toBe(0);
  });

  it('returns 1 when set 0 is filled and rest empty', () => {
    expect(indexOfNextEmptySet([[6, 3], [0, 0], [0, 0]])).toBe(1);
  });

  it('returns 2 when set 0 and 1 are filled', () => {
    expect(indexOfNextEmptySet([[6, 3], [4, 6], [0, 0]])).toBe(2);
  });

  it('returns -1 when all sets are filled', () => {
    expect(indexOfNextEmptySet([[6, 3], [6, 4]])).toBe(-1);
  });

  it('treats a set as filled if either side is non-zero', () => {
    expect(indexOfNextEmptySet([[6, 0], [0, 0]])).toBe(1);
  });
});

describe('fillNextEmptySet', () => {
  it('fills set 0 when all empty', () => {
    const result = fillNextEmptySet([[0, 0], [0, 0], [0, 0]], [6, 3]);
    expect(result).toEqual({
      sets: [[6, 3], [0, 0], [0, 0]],
      filledIndex: 0
    });
  });

  it('fills set 1 when set 0 is filled', () => {
    const result = fillNextEmptySet([[6, 3], [0, 0], [0, 0]], [4, 6]);
    expect(result).toEqual({
      sets: [[6, 3], [4, 6], [0, 0]],
      filledIndex: 1
    });
  });

  it('returns null when all sets are already filled', () => {
    const result = fillNextEmptySet([[6, 3], [6, 4]], [7, 5]);
    expect(result).toBeNull();
  });

  it('does not mutate the input array', () => {
    const sets: Array<[number, number]> = [[0, 0], [0, 0]];
    fillNextEmptySet(sets, [6, 3]);
    expect(sets).toEqual([[0, 0], [0, 0]]);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `npm test -- set-fill`
Expected: all fail with module-not-found.

- [ ] **Step 3: Implement src/lib/set-fill.ts**

Create `src/lib/set-fill.ts`:

```typescript
export type Set = [number, number];

/**
 * Index of the first set that is still 0-0. Returns -1 if every set has at
 * least one non-zero score.
 */
export function indexOfNextEmptySet(sets: Set[]): number {
  for (let i = 0; i < sets.length; i++) {
    if (sets[i][0] === 0 && sets[i][1] === 0) return i;
  }
  return -1;
}

/**
 * Returns a new sets array with the next-empty set replaced by `score`,
 * along with the index that was filled. Returns null when no empty set is
 * available.
 */
export function fillNextEmptySet(
  sets: Set[],
  score: Set
): { sets: Set[]; filledIndex: number } | null {
  const idx = indexOfNextEmptySet(sets);
  if (idx === -1) return null;
  const next = sets.map(s => [...s] as Set);
  next[idx] = [score[0], score[1]];
  return { sets: next, filledIndex: idx };
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `npm test -- set-fill`
Expected: 9/9 tests pass.

- [ ] **Step 5: Commit**

```bash
cd "/Users/admin/Documents/tennis tournament"
git add src/lib/set-fill.ts tests/set-fill.test.ts
git commit -m "Add set-fill helpers for quick-pick palette"
```

---

## Task 3: Extend match save endpoint to accept walkover

**Files:**
- Modify: `src/routes/api/admin/matches/[id]/+server.ts`

Accept either `{scores: [...]}` (current) or `{walkover_winner_id: "p-id"}` (new) on POST. Walkover sets winner_id directly with no scores and propagates to the next round like a normal save.

- [ ] **Step 1: Read the current endpoint**

```bash
cat "src/routes/api/admin/matches/[id]/+server.ts"
```

- [ ] **Step 2: Replace the file with the extended version**

Overwrite `src/routes/api/admin/matches/[id]/+server.ts`:

```typescript
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getMatch, updateMatch, getTournament, getMatchAt, setTournamentStatus } from '$lib/db';
import { computeWinner, type Scores } from '$lib/scores';
import { nextMatchPosition } from '$lib/bracket';

type Body =
  | { scores: Scores; scheduled_date?: string | null }
  | { walkover_winner_id: string; scheduled_date?: string | null }
  | { scheduled_date: string | null };

export const POST: RequestHandler = async ({ params, request, locals, platform }) => {
  if (!locals.isAdmin) error(401);
  const db = platform!.env.DB;
  const match = await getMatch(db, params.id);
  if (!match) error(404);

  const body = (await request.json()) as Body;

  // Branch 1: walkover — set winner directly, no scores
  if ('walkover_winner_id' in body && body.walkover_winner_id) {
    const winner_id = body.walkover_winner_id;
    if (winner_id !== match.player1_id && winner_id !== match.player2_id) {
      error(400, 'walkover_winner_id must be one of the match players');
    }
    await updateMatch(db, match.id, {
      scores: null,
      winner_id,
      status: 'completed',
      ...(body.scheduled_date !== undefined ? { scheduled_date: body.scheduled_date } : {})
    });
    await advanceWinner(db, match, winner_id);
    return json({ ok: true });
  }

  // Branch 2: score save (or score + scheduled_date)
  if ('scores' in body) {
    const scores: Scores = body.scores ?? [];
    const winnerSlot = computeWinner(scores);
    const winner_id =
      winnerSlot === 1 ? match.player1_id :
      winnerSlot === 2 ? match.player2_id : null;
    await updateMatch(db, match.id, {
      scores: JSON.stringify(scores),
      winner_id,
      status: winner_id ? 'completed' : 'pending',
      ...(body.scheduled_date !== undefined ? { scheduled_date: body.scheduled_date } : {})
    });
    if (winner_id) await advanceWinner(db, match, winner_id);
    return json({ ok: true });
  }

  // Branch 3: just updating scheduled_date, no score changes
  if ('scheduled_date' in body) {
    await updateMatch(db, match.id, { scheduled_date: body.scheduled_date });
    return json({ ok: true });
  }

  error(400, 'Body must contain scores, walkover_winner_id, or scheduled_date');
};

async function advanceWinner(
  db: D1Database,
  match: { id: string; tournament_id: string; round: number; position: number },
  winner_id: string
) {
  const next = nextMatchPosition(match.round, match.position);
  const nextMatch = await getMatchAt(db, match.tournament_id, next.round, next.position);
  if (nextMatch) {
    await updateMatch(db, nextMatch.id, { [next.slot + '_id']: winner_id } as never);
  } else {
    const t = await getTournament(db, match.tournament_id);
    if (t) await setTournamentStatus(db, t.id, 'completed', winner_id);
  }
}
```

- [ ] **Step 3: Type-check**

Run: `npm run check`
Expected: 0 errors.

- [ ] **Step 4: Smoke-test the walkover branch**

Start dev server in background:
```bash
npm run dev -- --port 5173 &
```

In another terminal:
```bash
# Log in to get cookie
COOKIE=$(curl -s -X POST 'http://localhost:5173/admin?/login' -d 'password=dev-password' -i 2>&1 | grep -i 'set-cookie: tt_admin' | sed 's/.*tt_admin=\([^;]*\).*/\1/')

# Find a pending match id
npx wrangler d1 execute tennis-tournament-db-prod --local --command="SELECT id, player1_id, player2_id FROM matches WHERE status='pending' AND player1_id IS NOT NULL AND player2_id IS NOT NULL LIMIT 1" --json
```

Pick a match id and one of its player ids, then:
```bash
curl -X POST http://localhost:5173/api/admin/matches/<MATCH_ID> \
  -H "Content-Type: application/json" \
  --cookie "tt_admin=$COOKIE" \
  --data '{"walkover_winner_id":"<PLAYER_ID>"}'
```

Expected: `{"ok":true}`. Then verify in DB:
```bash
npx wrangler d1 execute tennis-tournament-db-prod --local --command="SELECT id, winner_id, scores, status FROM matches WHERE id='<MATCH_ID>'" --json
```

Expected: `winner_id` set, `scores` null, `status` 'completed'.

Stop the dev server (kill the background process).

- [ ] **Step 5: Commit**

```bash
git add "src/routes/api/admin/matches/[id]/+server.ts"
git commit -m "API: accept walkover_winner_id as alternative to scores"
```

---

## Task 4: Quick-pick palette in MatchEditModal

**Files:**
- Modify: `src/lib/components/MatchEditModal.svelte`
- Modify: `src/app.css` (small additions for `.qp-grid`, `.qp-pill`)

Add a quick-pick palette below the score inputs. Tapping a pill fills the next empty set using the helper from Task 2.

- [ ] **Step 1: Read the current modal**

```bash
cat src/lib/components/MatchEditModal.svelte
```

- [ ] **Step 2: Modify the modal — add quick-pick state + UI**

In `src/lib/components/MatchEditModal.svelte`, find the `<script>` block and ADD these imports + state near the top (after the existing imports/props):

```typescript
import { fillNextEmptySet, indexOfNextEmptySet, type Set } from '$lib/set-fill';

const QUICK_PICKS: Array<{ score: Set; label: string }> = [
  { score: [6, 0], label: '6-0' },
  { score: [6, 1], label: '6-1' },
  { score: [6, 2], label: '6-2' },
  { score: [6, 3], label: '6-3' },
  { score: [6, 4], label: '6-4' },
  { score: [7, 5], label: '7-5' },
  { score: [7, 6], label: '7-6' }
];

let lastFilledIndex = $state<number | null>(null);

function applyQuickPick(score: Set) {
  const result = fillNextEmptySet(sets, score);
  if (!result) return;
  sets = result.sets;
  lastFilledIndex = result.filledIndex;
}

function clearLast() {
  if (lastFilledIndex === null) return;
  sets[lastFilledIndex] = [0, 0];
  sets = [...sets];
  lastFilledIndex = null;
}

const nextEmptyIdx = $derived(indexOfNextEmptySet(sets));
const allSetsFilled = $derived(nextEmptyIdx === -1);
```

Then find the existing score-inputs section in the template (the table with set inputs). After it, BEFORE the buttons row at the bottom, insert this block:

```svelte
<div class="qp-section">
  <div class="qp-label">
    {#if allSetsFilled}
      All sets filled — clear one to add more.
    {:else}
      Tap to fill <strong>Set {nextEmptyIdx + 1} of {bestOf}</strong>
    {/if}
  </div>
  <div class="qp-row">
    <span class="qp-row-label">{p1Name} wins</span>
    <div class="qp-grid">
      {#each QUICK_PICKS as { score, label } (label)}
        <button
          type="button"
          class="qp-pill"
          disabled={allSetsFilled}
          onclick={() => applyQuickPick(score)}
        >{label}</button>
      {/each}
    </div>
  </div>
  <div class="qp-row">
    <span class="qp-row-label">{p2Name} wins</span>
    <div class="qp-grid">
      {#each QUICK_PICKS as { score, label } (label)}
        <button
          type="button"
          class="qp-pill"
          disabled={allSetsFilled}
          onclick={() => applyQuickPick([score[1], score[0]])}
        >{score[1]}-{score[0]}</button>
      {/each}
    </div>
  </div>
  <button
    type="button"
    class="btn-ghost btn-sm qp-clear"
    disabled={lastFilledIndex === null}
    onclick={clearLast}
  >← Clear last</button>
</div>
```

- [ ] **Step 3: Add the styles to src/app.css**

Append to `src/app.css`:

```css
/* Quick-pick palette in match modal */
.qp-section {
  margin: 18px 0 10px;
  padding: 14px;
  background: var(--bg-muted);
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.qp-label {
  font-size: 0.82rem;
  color: var(--fg2);
}
.qp-label strong {
  color: var(--fg1);
  font-weight: 700;
}
.qp-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.qp-row-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--fg2);
  min-width: 110px;
  flex-shrink: 0;
}
.qp-grid {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.qp-pill {
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  padding: 6px 12px;
  background: var(--surface);
  color: var(--fg1);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  cursor: pointer;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  transition: all var(--dur) var(--ease);
}
.qp-pill:hover:not(:disabled) {
  background: var(--accent);
  color: var(--accent-text);
  border-color: var(--accent);
}
.qp-pill:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.qp-clear {
  align-self: flex-start;
}
@media (max-width: 600px) {
  .qp-row { flex-direction: column; align-items: flex-start; gap: 6px; }
  .qp-row-label { min-width: 0; }
}
```

- [ ] **Step 4: Type-check**

Run: `npm run check`
Expected: 0 errors. Existing warnings (autofocus, state_referenced_locally) are unchanged.

- [ ] **Step 5: Manual smoke-test in browser**

```bash
npm run dev -- --port 5173 &
```

Visit http://localhost:5173/admin → log in → open a tournament with a pending match → click the match. The modal should show:
- Score inputs (existing)
- Quick-pick palette below with two rows: "P1 wins" + 7 buttons, "P2 wins" + 7 buttons
- Label says "Tap to fill Set 1 of 3"

Click `6-3` in the P1 row → set 1 inputs become 6 and 3. Label updates to "Set 2 of 3". Click `6-2` → set 2 = 6,2. Click "Clear last" → set 2 = 0,0. Click `7-5` in P2 row → set 2 = 5,7. Verify all worked.

Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/MatchEditModal.svelte src/app.css
git commit -m "Modal: quick-pick score palette"
```

---

## Task 5: Walkover section in MatchEditModal

**Files:**
- Modify: `src/lib/components/MatchEditModal.svelte`

Add a "Walkover" section with two buttons (one per player). Each saves immediately via the API endpoint extended in Task 3.

- [ ] **Step 1: Add walkover state + handler to the modal script**

In `src/lib/components/MatchEditModal.svelte`, near the existing `save()` function in the script, ADD:

```typescript
let walkoverPending = $state<string | null>(null); // player_id being saved

async function walkover(winnerPlayerId: string, winnerName: string) {
  if (!confirm(`Mark ${winnerName} as winner by walkover? Scores will be cleared.`)) return;
  walkoverPending = winnerPlayerId;
  error = null;
  const r = await fetch(`/api/admin/matches/${match.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walkover_winner_id: winnerPlayerId })
  });
  if (!r.ok) {
    error = await r.text();
    walkoverPending = null;
    return;
  }
  walkoverPending = null;
  onSaved();
}
```

- [ ] **Step 2: Add the walkover UI to the modal template**

In the modal template, AFTER the quick-pick section and BEFORE the final buttons row (Save / Cancel), insert:

```svelte
{#if match.player1_id && match.player2_id}
  <div class="wo-section">
    <div class="wo-label">Walkover (no scores played)</div>
    <div class="wo-buttons">
      <button
        type="button"
        class="btn-ghost btn-sm wo-btn"
        disabled={walkoverPending !== null}
        onclick={() => walkover(match.player1_id!, p1Name)}
      >
        {walkoverPending === match.player1_id ? 'Saving…' : `→ ${p1Name} wins`}
      </button>
      <button
        type="button"
        class="btn-ghost btn-sm wo-btn"
        disabled={walkoverPending !== null}
        onclick={() => walkover(match.player2_id!, p2Name)}
      >
        {walkoverPending === match.player2_id ? 'Saving…' : `→ ${p2Name} wins`}
      </button>
    </div>
  </div>
{/if}
```

- [ ] **Step 3: Add walkover styles to src/app.css**

Append to `src/app.css`:

```css
/* Walkover section in match modal */
.wo-section {
  margin: 12px 0;
  padding: 14px;
  background: var(--bg-muted);
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.wo-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--fg2);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.wo-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.wo-btn { flex: 1; min-width: 160px; }
```

- [ ] **Step 4: Smoke-test**

```bash
npm run dev -- --port 5173 &
```

Visit a tournament admin page. Open a pending match. The modal should now have a "Walkover (no scores played)" section with two buttons. Click one → confirm → verify the modal closes and the bracket shows that player as the winner with no scores. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/MatchEditModal.svelte src/app.css
git commit -m "Modal: walkover section (no-scores winner)"
```

---

## Task 6: Save & next button in MatchEditModal

**Files:**
- Modify: `src/lib/components/MatchEditModal.svelte`

Add a second save button. Walkover already uses the existing `onSaved` callback. The new `onSavedAndNext` callback signals to the parent that it should look for the next pending match instead of closing.

- [ ] **Step 1: Add the new callback prop + saveAndNext function**

In `src/lib/components/MatchEditModal.svelte`, modify the `Props` type to add an optional `onSavedAndNext`. Find:

```typescript
type Props = {
  match: Match;
  bestOf: number;
  p1Name: string;
  p2Name: string;
  onClose: () => void;
  onSaved: () => void;
};
```

Replace with:

```typescript
type Props = {
  match: Match;
  bestOf: number;
  p1Name: string;
  p2Name: string;
  onClose: () => void;
  onSaved: () => void;
  onSavedAndNext?: () => void;
};
```

Update the destructuring to include the new prop:

```typescript
let {
  match, bestOf, p1Name, p2Name,
  onClose, onSaved, onSavedAndNext
}: Props = $props();
```

Then ADD this function next to the existing `save()`:

```typescript
async function saveAndNext() {
  saving = true;
  error = null;
  const trimmed = sets.filter(([a, b]) => a > 0 || b > 0);
  const r = await fetch(`/api/admin/matches/${match.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scores: trimmed })
  });
  if (!r.ok) {
    error = await r.text();
    saving = false;
    return;
  }
  if (onSavedAndNext) onSavedAndNext();
  else onSaved();
}
```

ALSO update the existing `walkover()` function to use `onSavedAndNext` when available — replace `onSaved();` at the end with:

```typescript
  if (onSavedAndNext) onSavedAndNext();
  else onSaved();
```

- [ ] **Step 2: Add the "Save & next" button to the template**

Find the bottom buttons row (currently `[Save] [Cancel]`) in the modal template. REPLACE the buttons with:

```svelte
<div class="modal-actions">
  <button
    type="button"
    class="btn-ghost"
    onclick={onClose}
    disabled={saving || walkoverPending !== null}
  >Cancel</button>

  <div class="modal-actions-right">
    <button
      type="button"
      onclick={save}
      disabled={saving || walkoverPending !== null}
    >{saving ? 'Saving…' : 'Save'}</button>

    {#if onSavedAndNext}
      <button
        type="button"
        class="btn-secondary"
        onclick={saveAndNext}
        disabled={saving || walkoverPending !== null}
      >{saving ? 'Saving…' : 'Save & next →'}</button>
    {/if}
  </div>
</div>
```

- [ ] **Step 3: Add modal-actions styles to src/app.css**

Append to `src/app.css`:

```css
/* Modal action row */
.modal-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
  flex-wrap: wrap;
}
.modal-actions-right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
@media (max-width: 480px) {
  .modal-actions, .modal-actions-right {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }
  .modal-actions button { width: 100%; }
}
```

- [ ] **Step 4: Type-check**

Run: `npm run check`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/MatchEditModal.svelte src/app.css
git commit -m "Modal: 'Save & next' button + onSavedAndNext callback"
```

---

## Task 7: Wire Save & next in admin tournament page

**Files:**
- Modify: `src/routes/admin/tournaments/[id]/+page.svelte`

Pass `onSavedAndNext` to the modal. When called, find the next pending match in the tournament and update `editing` to that match. Show a toast when none left.

- [ ] **Step 1: Add toast state + helper imports**

In `src/routes/admin/tournaments/[id]/+page.svelte`, find the existing `<script>` block. ADD this import:

```typescript
import { findNextPendingMatch } from '$lib/match-flow';
```

Add toast state (next to `editing`):

```typescript
let toast = $state<string | null>(null);
function showToast(msg: string) {
  toast = msg;
  setTimeout(() => { if (toast === msg) toast = null; }, 3500);
}
```

- [ ] **Step 2: Wire onSavedAndNext into the modal call**

Find the existing `<MatchEditModal ... />` invocation. Replace it with:

```svelte
{#if editing}
  <MatchEditModal
    match={editing}
    bestOf={data.tournament.best_of}
    p1Name={pName(editing.player1_id)}
    p2Name={pName(editing.player2_id)}
    onClose={() => { editing = null; }}
    onSaved={() => { editing = null; invalidateAll(); }}
    onSavedAndNext={async () => {
      const currentId = editing!.id;
      await invalidateAll();
      const next = findNextPendingMatch(data.matches, currentId);
      if (next) {
        editing = next;
      } else {
        editing = null;
        showToast('All caught up — no more matches to score.');
      }
    }}
  />
{/if}
```

- [ ] **Step 3: Add toast UI at the bottom of the template**

After the modal block, insert:

```svelte
{#if toast}
  <div class="toast" role="status">{toast}</div>
{/if}
```

- [ ] **Step 4: Add toast styles to src/app.css**

Append to `src/app.css`:

```css
/* Bottom toast for short status messages */
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--fg1);
  color: var(--bg);
  padding: 12px 20px;
  border-radius: var(--radius-pill);
  font-weight: 600;
  font-size: 0.92rem;
  box-shadow: var(--shadow-lg);
  z-index: 12;
  animation: toastIn 200ms var(--ease);
  max-width: calc(100vw - 32px);
}
@keyframes toastIn {
  from { opacity: 0; transform: translate(-50%, 12px); }
  to   { opacity: 1; transform: translate(-50%, 0); }
}
```

- [ ] **Step 5: Smoke-test**

Start dev server. Log in as admin. Open a tournament with multiple pending matches. Click a match. Enter scores via quick-pick. Click "Save & next →" — modal should jump to the next pending match without closing. Repeat until none left → modal closes + bottom toast appears. Stop dev server.

- [ ] **Step 6: Commit**

```bash
git add "src/routes/admin/tournaments/[id]/+page.svelte" src/app.css
git commit -m "Admin tournament: wire Save & next + toast for empty queue"
```

---

## Task 8: Wire Save & next in public tournament page (admin only)

**Files:**
- Modify: `src/routes/tournaments/[id]/+page.svelte`

Same pattern as Task 7. The public page already shows the modal when `data.isAdmin`. Add the same `onSavedAndNext` wiring + toast.

- [ ] **Step 1: Repeat the changes from Task 7 in this file**

In `src/routes/tournaments/[id]/+page.svelte`, find the `<script>` block and ADD:

```typescript
import { findNextPendingMatch } from '$lib/match-flow';

let toast = $state<string | null>(null);
function showToast(msg: string) {
  toast = msg;
  setTimeout(() => { if (toast === msg) toast = null; }, 3500);
}
```

Update the `<MatchEditModal>` invocation. Find:

```svelte
<MatchEditModal
  match={editing}
  bestOf={data.tournament.best_of}
  p1Name={pName(editing.player1_id)}
  p2Name={pName(editing.player2_id)}
  onClose={() => { editing = null; }}
  onSaved={() => { editing = null; invalidateAll(); }}
/>
```

Replace with:

```svelte
<MatchEditModal
  match={editing}
  bestOf={data.tournament.best_of}
  p1Name={pName(editing.player1_id)}
  p2Name={pName(editing.player2_id)}
  onClose={() => { editing = null; }}
  onSaved={() => { editing = null; invalidateAll(); }}
  onSavedAndNext={async () => {
    const currentId = editing!.id;
    await invalidateAll();
    const next = findNextPendingMatch(data.matches, currentId);
    if (next) {
      editing = next;
    } else {
      editing = null;
      showToast('All caught up — no more matches to score.');
    }
  }}
/>
```

After the modal block (still inside the `{#if data.tournament}...{/if}`), add:

```svelte
{#if toast}
  <div class="toast" role="status">{toast}</div>
{/if}
```

(The `.toast` CSS was added in Task 7 — no app.css change needed here.)

- [ ] **Step 2: Type-check**

Run: `npm run check`
Expected: 0 errors.

- [ ] **Step 3: Smoke-test**

Open a public tournament URL (NOT /admin) while logged in as admin. Click a match → modal opens with "Save & next →" button. Save a few in a row to verify behavior. Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add "src/routes/tournaments/[id]/+page.svelte"
git commit -m "Public tournament: wire Save & next when admin"
```

---

## Task 9: Wire Save & next in /today page (admin only)

**Files:**
- Modify: `src/routes/today/+page.svelte`

Same pattern, but "next pending" walks the day's match list (not a single tournament). The page already loads `data.matches: DayMatch[]` filtered to today's date.

- [ ] **Step 1: Add the imports + state**

In `src/routes/today/+page.svelte`, find the `<script>` block. ADD:

```typescript
import { findNextPendingMatch } from '$lib/match-flow';

let toast = $state<string | null>(null);
function showToast(msg: string) {
  toast = msg;
  setTimeout(() => { if (toast === msg) toast = null; }, 3500);
}
```

- [ ] **Step 2: Wire onSavedAndNext into the modal call**

Find the existing `<MatchEditModal>` block. Replace its invocation with:

```svelte
<MatchEditModal
  match={editing}
  bestOf={editing.tournament_best_of}
  p1Name={nameFor(editing.player1_id, editing.player1_name)}
  p2Name={nameFor(editing.player2_id, editing.player2_name)}
  onClose={() => { editing = null; }}
  onSaved={() => { editing = null; invalidateAll(); }}
  onSavedAndNext={async () => {
    const currentId = editing!.id;
    await invalidateAll();
    const next = findNextPendingMatch(data.matches, currentId);
    if (next) {
      editing = next as typeof editing;
    } else {
      editing = null;
      showToast('All caught up — no more matches today.');
    }
  }}
/>
```

After the `{#if editing}` block, add:

```svelte
{#if toast}
  <div class="toast" role="status">{toast}</div>
{/if}
```

- [ ] **Step 3: Type-check**

Run: `npm run check`
Expected: 0 errors.

- [ ] **Step 4: Smoke-test**

Schedule a couple of pending matches for today (via the admin tournament page → set scheduled_date). Visit /today as admin. Click a match → modal opens with "Save & next". Save → next pending today's match opens.

- [ ] **Step 5: Commit**

```bash
git add src/routes/today/+page.svelte
git commit -m "Today page: wire Save & next when admin"
```

---

## Task 10: Today's pending count badge in nav

**Files:**
- Create: `src/routes/+layout.server.ts`
- Modify: `src/routes/+layout.svelte`
- Modify: `src/app.css`

Compute the count once per request when admin is signed in, render a small badge next to "Admin" in the nav.

- [ ] **Step 1: Create src/routes/+layout.server.ts**

Create the file:

```typescript
import type { LayoutServerLoad } from './$types';

function todayInAthens(): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Athens',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

export const load: LayoutServerLoad = async ({ locals, platform }) => {
  let pendingTodayCount = 0;
  if (locals.isAdmin && platform?.env.DB) {
    const today = todayInAthens();
    const result = await platform.env.DB.prepare(
      `SELECT COUNT(*) AS n FROM matches
       WHERE scheduled_date = ?
         AND status = 'pending'
         AND player1_id IS NOT NULL
         AND player2_id IS NOT NULL`
    ).bind(today).first<{ n: number }>();
    pendingTodayCount = result?.n ?? 0;
  }
  return { isAdmin: locals.isAdmin, pendingTodayCount };
};
```

- [ ] **Step 2: Read the badge count in +layout.svelte**

In `src/routes/+layout.svelte`, find the `<script>` block. ADD this after the existing imports:

```typescript
import { page } from '$app/stores';
let layoutData = $derived($page.data as { isAdmin?: boolean; pendingTodayCount?: number });
const pendingBadge = $derived(
  layoutData.isAdmin && layoutData.pendingTodayCount && layoutData.pendingTodayCount > 0
    ? layoutData.pendingTodayCount > 9 ? '9+' : String(layoutData.pendingTodayCount)
    : null
);
```

(If `let { children } = $props()` already exists, leave it. If `$page` is already imported earlier in the file, don't double-import.)

- [ ] **Step 3: Render the badge in the nav**

Find the nav block. Locate the existing Admin link:

```svelte
<a href="/admin" class:active={isActive('/admin')}>Admin</a>
```

Replace with:

```svelte
<a href="/admin" class:active={isActive('/admin')}>
  Admin
  {#if pendingBadge}<span class="nav-badge" title="{layoutData.pendingTodayCount} pending matches today">{pendingBadge}</span>{/if}
</a>
```

- [ ] **Step 4: Add badge styles to src/app.css**

Append to `src/app.css`:

```css
/* Pending-today badge in nav */
.nav-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  margin-left: 6px;
  border-radius: var(--radius-pill);
  background: var(--accent);
  color: var(--accent-text);
  font-size: 0.7rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  vertical-align: middle;
}
```

- [ ] **Step 5: Smoke-test**

Schedule a few pending matches for today in the admin UI. Visit any page (home, /today, /players) — the "Admin" nav link should show a small lime badge with the count. Log out → badge disappears (because layout returns 0 when not admin).

- [ ] **Step 6: Commit**

```bash
git add src/routes/+layout.server.ts src/routes/+layout.svelte src/app.css
git commit -m "Nav: today's pending count badge for admin"
```

---

## Task 11: Final integration smoke test + deploy

**Files:** none modified.

Walk through the full flow end-to-end and deploy.

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```

Expected: all tests pass, including the 6 new `match-flow` tests + 9 new `set-fill` tests (~61 total now).

- [ ] **Step 2: Type-check**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 3: Manual end-to-end smoke test**

Start dev server, log in as admin. Run through:

1. Schedule 3 pending matches in a tournament for today (via match modal → set date).
2. Verify the "Admin (3)" badge appears in the nav from any public page.
3. Open `/today` as admin → see the 3 matches.
4. Click match #1 → modal opens.
5. Quick-pick `6-3` then `6-2` → verify scores fill set 1 and set 2.
6. Click "Save & next →" → modal jumps to match #2.
7. For match #2, click walkover for one player → confirm → verify modal jumps to match #3 (because walkover honors save & next).
8. For match #3, enter custom scores manually → click "Save" (not next) → modal closes.
9. Verify the badge dropped to 0 (no badge) since all 3 matches are now completed.
10. Verify the bracket on the public tournament page shows the right winners and the next-round seats are populated.

- [ ] **Step 4: Build + deploy**

```bash
npm run build
npx wrangler pages deploy .svelte-kit/cloudflare --project-name=filathlitikos-tennis
```

Expected: deployment succeeds, prints a `*.pages.dev` URL.

- [ ] **Step 5: Verify on production**

Visit https://filathlitikos-tennis.pages.dev — log in as admin, repeat the smoke test from step 3 (steps 1, 4, 5, 6) at minimum.

- [ ] **Step 6: Push to git**

```bash
git push
```

---

## Self-Review Checklist (notes for plan author, ignore at execution time)

- [x] **Spec coverage:** Every spec section maps to a task — quick-picks (T2 + T4), save & next (T6 + T7 + T8 + T9), walkover (T3 + T5), badge (T10). API extension (T3) supports walkover. Pure helpers (T1, T2) for testable logic.
- [x] **No placeholders:** every step has either complete code, an exact command, or an exact file change.
- [x] **Type consistency:** `Set` type is `[number, number]` everywhere; `FlowMatch` defined in T1, used in T7-T9; `findNextPendingMatch` signature stable.
- [x] **File paths absolute:** all paths shown as `src/...` or quoted with the project directory when needed.
- [x] **Walkover-and-next:** intentionally fires `onSavedAndNext` if available (set in T5 by editing the existing walkover function in T6).
