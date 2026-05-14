# Admin Speed-Ups — Design Spec

**Date:** 2026-05-13
**Status:** Approved for implementation
**Goal:** Cut the time per match score entry by ~half so a club admin can comfortably enter 30+ matches in a tournament day.

## Why

The user runs a real Greek tennis club and will run tournaments with 30–50 players. Each tournament produces ~30+ matches over a weekend, and the admin enters every score by hand. The current modal works but takes ~10 seconds per match (open modal → type 4–6 numbers → click save → find next match → click). This spec adds four independent accelerators that compound:

- **Quick-pick score buttons** cut typing
- **Save & next** removes the "find next match" step
- **Walkover button** handles no-shows in one tap
- **Today's pending badge** keeps the admin oriented from any page

## Features

### 1. Quick-pick score buttons

In the match score modal, render two rows of pill buttons below the score inputs:

```
P1 wins:  [6-0] [6-1] [6-2] [6-3] [6-4] [7-5] [7-6]
P2 wins:  [0-6] [1-6] [2-6] [3-6] [4-6] [5-7] [6-7]
```

**Behavior:**
- Tapping a button fills the **next empty set's two inputs**. "Empty" = both inputs are 0 (the default).
- Above the buttons, a small label: `"Filling Set N of M"` — N is the next-empty-set index (1-indexed), M is `best_of`.
- A `[← Clear last]` ghost button reverts the most recent fill (resets that set's inputs back to 0/0). Disabled when no set is filled yet.
- After all `best_of` sets are filled, the buttons become disabled (still rendered, opacity 0.5).
- The user can still type custom numbers directly — the buttons are an accelerator, not a replacement.
- The 14 buttons are arranged compactly: each pill ~50px wide, 28px tall, 4px gap, wraps to multiple lines on narrow screens.

**Why these scores:** in tennis, set scores almost always end 6-x (where x = 0-4) or 7-5 / 7-6. Anything else (e.g., 6-7 retired, super-tiebreak) needs custom typing — fine for the long tail.

### 2. Save & next match

The modal's footer changes from one save button to two:

```
[ Cancel ]                [ Save ]   [ Save & next → ]
```

- **Save** — current behavior: POST scores, close modal.
- **Save & next** — POST scores, then immediately load the next pending match in the same tournament into the same modal. The modal stays open; only the player names + score state are replaced.

**"Next pending" definition** (computed client-side from the tournament's match list):

1. Filter to `status === 'pending'`
2. Filter to matches where both `player1_id` and `player2_id` are non-null (skip ones still waiting for a previous round's winner)
3. Skip the match we just saved
4. Sort by `(round, position)` ascending — so we walk the bracket left-to-right, top-to-bottom
5. The first match in the resulting list is "next"

**When there's no next match:**
- Modal closes
- Toast appears at the bottom: "All caught up — no more matches to score."

**State transition:**
- Save & next ALSO calls `invalidateAll()` so the underlying bracket view refreshes (new winners propagate)
- The match list passed to the modal must come from the freshly-invalidated data (otherwise the previous match still appears as pending)

### 3. Walkover button

Below the score inputs, a small section:

```
─────────────────────────────────
 Walkover (no scores played)
 [ → Νίκος wins by walkover ]
 [ → Κωνσταντίνος wins by walkover ]
```

- Two buttons, one per player. Each shows the player's name.
- Tapping a button opens a confirmation: `"Mark [name] as winner by walkover? Scores will be cleared."` (uses native `confirm()` for simplicity)
- On confirm: POST to the match endpoint with `{ walkover_winner_id: <player_id> }`. Server sets `winner_id`, leaves `scores = NULL`, sets `status = 'completed'`, and propagates winner to the next round (existing logic).
- After the walkover save: respects the same flow as a normal save — closes the modal OR jumps to next pending if the user clicked "Save & next" previously? **Decision:** Walkover always behaves like "Save & next" (since the admin is in fast-entry mode). If they don't want to advance, they close the modal manually.
- Walkover wins/losses count as normal in stats (W-L record, win %). This matches ITF/ATP convention.

**API contract change:**
The `POST /api/admin/matches/[id]` endpoint accepts EITHER body shape:

```jsonc
// Normal save
{ "scores": [[6,3],[6,2]] }

// Walkover save
{ "walkover_winner_id": "p-nikos" }
```

If `walkover_winner_id` is present and is one of `match.player1_id` or `match.player2_id`, the endpoint sets `winner_id = walkover_winner_id`, `scores = null`, `status = 'completed'`, and propagates. If neither key is recognized or both are present, return 400.

### 4. Today's pending badge

In the global site header, when the user is admin AND there's at least one pending match scheduled today, render a count badge next to the "Admin" nav link:

```
Tournaments  Today  Leaderboard  Admin ●3
```

The `●3` is a small circle (16-18px diameter) with white text on the lime accent color, positioned to the right of the "Admin" text.

**Computation:** in a new `src/routes/+layout.server.ts` (created if it doesn't exist), if `locals.isAdmin && platform.env.DB`, run:

```sql
SELECT COUNT(*) AS n FROM matches
WHERE scheduled_date = ?              -- today in Athens timezone, YYYY-MM-DD
  AND status = 'pending'
  AND player1_id IS NOT NULL
  AND player2_id IS NOT NULL
```

Pass the count down to the layout via `event.locals.pendingTodayCount` (or as part of the layout's load return). Layout reads it and conditionally renders the badge.

**When count is 0:** no badge rendered (avoid visual noise).

**When count >9:** show `9+` (avoid breaking layout).

## Non-goals

These are deliberately NOT in scope:

- Live updates to the badge (the page would need a refresh; we're not adding WebSockets/SSE)
- Quick-pick buttons for unusual scores (super-tiebreak, retired)
- Bulk score entry across many matches in one form
- Score validation (warning if score isn't valid tennis — that's another feature)
- Voice or barcode input
- Walkover variants (retired, default, no-show distinction) — single "walkover" suffices

## Files to touch

| File | Change |
|---|---|
| `src/lib/components/MatchEditModal.svelte` | Add quick-pick buttons row, walkover section, "Save & next" button, internal "fill next empty set" logic |
| `src/routes/api/admin/matches/[id]/+server.ts` | Accept `walkover_winner_id` body alternative |
| `src/routes/admin/tournaments/[id]/+page.svelte` | Pass full match list to modal; on `onSavedAndNext`, find next pending and update `editing` |
| `src/routes/tournaments/[id]/+page.svelte` | Same pattern as above for inline-admin edit |
| `src/routes/today/+page.svelte` | Same pattern (next-pending walks the day's matches, not the tournament's) |
| `src/routes/+layout.server.ts` (new file) | Compute `pendingTodayCount` for admins, expose to layout |
| `src/routes/+layout.svelte` | Render the badge next to "Admin" link |
| `src/app.css` | Pill grid styles for quick-picks, badge styles |

No DB migration. No new packages.

## Testing

- **Bracket / scores logic** (already covered by existing `tests/scores.test.ts`, `tests/bracket.test.ts`) — unchanged.
- **Quick-pick fill logic** — small unit test if extracted to a helper, otherwise manual smoke test:
  - Empty modal, click `6-3` → set 1 = `6, 3`
  - Click `6-2` → set 2 = `6, 2`
  - Click `7-6` → set 3 = `7, 6`
  - Click "Clear last" → set 3 = `0, 0`
  - Manually edit set 2 to `4, 6`, click `7-5` → set 3 = `7, 5` (new value goes to next still-empty)
- **Save & next** — manual smoke: open a match in a tournament with multiple pending matches, click Save & next, verify next match opens; reach end, verify toast and close.
- **Walkover** — manual smoke: open match, click walkover for P1, confirm, verify P1 is winner with no scores in the bracket; verify next-round slot has P1.
- **Badge** — manual smoke: schedule a match for today, log in as admin, see count = 1; enter score, refresh, see count drop.

## Rollout

Single deploy. No feature flag. Can revert per-feature easily by removing the relevant UI elements (data shape unchanged).
