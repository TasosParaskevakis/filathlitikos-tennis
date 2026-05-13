# Tennis Tournament App — Design Spec

**Date:** 2026-05-13
**Status:** Approved for implementation
**Hosting:** `tennis.paraskevakis.com` on Cloudflare Pages

## Goal

A free, hobby tennis tournament app. The owner (admin) creates tournaments, adds players, randomly generates single-elimination brackets, enters match scores, and players' statistics accumulate across all tournaments. Anyone with the URL can view brackets, leaderboard, and player profiles. Only the admin (one password) can edit.

## Tech Stack

- **Framework:** SvelteKit with `@sveltejs/adapter-cloudflare`
- **Hosting:** Cloudflare Pages (free tier)
- **Database:** Cloudflare D1 (SQLite, free tier)
- **Backend:** SvelteKit server endpoints (deployed as Cloudflare Pages Functions)
- **Auth:** Single password from `ADMIN_PASSWORD` env var; signed HTTP-only cookie (~30-day expiry) unlocks `/admin/*`
- **Cost:** $0/month within free-tier limits

## Data Model (D1 / SQLite)

```sql
CREATE TABLE players (
  id          TEXT PRIMARY KEY,        -- uuid
  name        TEXT NOT NULL UNIQUE,
  created_at  INTEGER NOT NULL         -- unix ms
);

CREATE TABLE tournaments (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  category     TEXT NOT NULL,          -- 'men_pro' | 'men_new' | 'women_pro' | 'women_new'
  best_of      INTEGER NOT NULL,       -- 1, 3, or 5
  status       TEXT NOT NULL,          -- 'setup' | 'in_progress' | 'completed'
  champion_id  TEXT,                   -- FK players.id, set when final completes
  created_at   INTEGER NOT NULL
);

CREATE TABLE tournament_players (
  tournament_id  TEXT NOT NULL,
  player_id      TEXT NOT NULL,
  seed           INTEGER NOT NULL,     -- assigned at bracket generation
  PRIMARY KEY (tournament_id, player_id)
);

CREATE TABLE matches (
  id             TEXT PRIMARY KEY,
  tournament_id  TEXT NOT NULL,
  round          INTEGER NOT NULL,     -- 1 = first round, 2 = quarters, etc.
  position       INTEGER NOT NULL,     -- 0-indexed slot within the round
  player1_id     TEXT,                 -- nullable while waiting for previous winner
  player2_id     TEXT,
  winner_id      TEXT,
  scores         TEXT,                 -- JSON, e.g. '[[6,3],[4,6],[7,5]]'
  status         TEXT NOT NULL,        -- 'pending' | 'completed'
  UNIQUE (tournament_id, round, position)
);

CREATE INDEX idx_matches_tournament ON matches(tournament_id);
CREATE INDEX idx_tournament_players_player ON tournament_players(player_id);
```

`scores` is the JSON-stringified set list — small enough to store inline, simpler than a separate sets table.

## Pages & Routes

### Public

| Route | Description |
|---|---|
| `/` | Home — tournaments grouped by status (in-progress, completed, upcoming) |
| `/tournaments/[id]` | Tournament page — bracket view + final standings |
| `/players` | Leaderboard — all players, sortable by W%, titles, matches |
| `/players/[id]` | Player profile — full stats + match history |

### Admin (cookie-gated)

| Route | Description |
|---|---|
| `/admin` | Login (if no cookie) or dashboard (if signed in) |
| `/admin/tournaments` | List + "New tournament" button |
| `/admin/tournaments/[id]` | Edit: add/remove players, "Generate bracket" button, edit matches |
| `/admin/players` | Global roster — add, rename, delete |

### API endpoints (SvelteKit `+server.ts`)

| Endpoint | Purpose |
|---|---|
| `POST /api/admin/login` | Validate password → set cookie |
| `POST /api/admin/logout` | Clear cookie |
| `POST /api/admin/players` | Create / update / delete a player |
| `POST /api/admin/tournaments` | Create / update tournament |
| `POST /api/admin/tournaments/[id]/generate-bracket` | Random shuffle → insert matches |
| `POST /api/admin/matches/[id]` | Save score; auto-advance winner to next round |

## Bracket Generation Algorithm

Inputs: `N` players in the tournament.

1. Compute `pow2 = next power of 2 ≥ N` (e.g., N=6 → 8).
2. `byes = pow2 - N` players get a free pass through round 1.
3. Shuffle the player list randomly. Assign `seed` 1..N in shuffle order.
4. The first `byes` seeds (1..byes) get a bye — they're inserted directly into round 2 (no round 1 match).
5. Remaining `N - byes` players fill round 1 matches in pairs.
6. Insert empty match rows for all later rounds (player1_id and player2_id null until winners propagate).

Bracket position math: winner of `(round=R, position=P)` advances into `(round=R+1, position=floor(P/2))` as `player1_id` if `P` is even, `player2_id` if `P` is odd.

**Tournament status transitions:**
- `setup` (default at creation) → `in_progress` when "Generate bracket" is clicked
- `in_progress` → `completed` when the final match's `winner_id` is set (also sets `champion_id`)
- The admin cannot regenerate a bracket once status is `in_progress` (would invalidate existing matches). To redo a bracket, admin must delete and recreate the tournament.

## Match Score Entry

Admin clicks a match → modal opens with N inputs (one per set, where N = `best_of`).

- Each set input is a pair of integers (e.g., `6` and `3`).
- Standard tennis: a set is won by the player who reaches 6 games with a 2-game margin (or wins a tiebreak at 6-6 → 7-6).
- We don't enforce these rules — admin types whatever scores actually happened.
- Winner is auto-computed: whoever won more sets wins the match. If sets tie (e.g., best-of-3, 1-1, no third set entered), winner remains unset.
- Saving advances winner to the next round (updates `player1_id`/`player2_id` of the next match).
- If the match is the final, set `tournaments.champion_id` and `tournaments.status = 'completed'`.

## Statistics (computed live, no cached tables)

Per player, queried from `matches` + `tournaments`:

- **Tournaments played** — count distinct `tournament_id` from `tournament_players`
- **Titles won** — count tournaments where `champion_id = player_id`
- **Match record (W-L)** — wins where `winner_id = player_id` vs. losses where they appeared in a completed match but didn't win
- **Win %** — wins / (wins + losses)
- **Sets W-L** — sum across all completed matches by parsing `scores` JSON
- **Games W-L** — same, summing game counts within each set
- **Current streak** — consecutive recent wins (resets at first loss)
- **Longest streak** — best-ever consecutive wins
- **Head-to-head** — for any opponent, W-L record between the two players

Leaderboard sortable by all of the above.

## Visual Style: Tennis Classic

Wimbledon-inspired aesthetic.

- **Palette:** cream paper background (`#fef9e7`), dark green accents (`#1a3d1a`), muted gold for labels (`#7d6608`), white card surfaces with thin dark-green borders
- **Typography:** serif headlines (Playfair Display or Georgia fallback), system sans-serif for body
- **Layout:** centered, generous whitespace, narrow content column on desktop (max ~960px)
- **Champion treatment:** small 🏆 next to winner names; final-round match has heavier border + gold accent
- **Mobile-first:** all pages must look right on phone — bracket scrolls horizontally, player cards stack vertically

## Non-Goals (out of scope, explicitly)

- Doubles matches (singles only)
- Other formats (round-robin, groups + knockout) — single elimination only
- Player photos / avatars
- Email or push notifications
- Chat / comments / social features
- Multiple admin accounts or per-tournament permissions
- Editing match dates/times (matches happen "whenever")
- I18n / translations

## Repo Layout

```
tennis-tournament/
├── src/
│   ├── routes/                  # SvelteKit pages + +server.ts endpoints
│   │   ├── +page.svelte         # public home
│   │   ├── tournaments/[id]/
│   │   ├── players/
│   │   ├── admin/
│   │   └── api/
│   ├── lib/
│   │   ├── db.ts                # D1 query helpers
│   │   ├── bracket.ts           # bracket generation + advancement logic
│   │   ├── stats.ts             # stat computation queries
│   │   ├── auth.ts              # cookie sign/verify
│   │   └── components/          # shared Svelte components (BracketView, MatchCard, etc.)
│   └── app.css                  # global theme
├── migrations/
│   └── 0001_initial.sql
├── wrangler.toml                # Cloudflare config (D1 binding, env)
├── svelte.config.js
└── package.json
```

## Deployment

1. Push to GitHub.
2. Connect repo to Cloudflare Pages.
3. Bind D1 database in Cloudflare dashboard.
4. Set `ADMIN_PASSWORD` env var.
5. Configure custom domain `tennis.paraskevakis.com`.
6. Cloudflare auto-deploys on every push to `main`.

## Open Questions / Future Iteration

These are deliberately punted; can be added once v1 is live and used:

- Should you be able to "undo" a bracket generation? (For now: no — admin can manually re-set match results)
- Should completed tournaments be archivable / hideable? (For now: shown in their own section on home)
- Should there be an "edit match notes" field? (For now: scores only)
