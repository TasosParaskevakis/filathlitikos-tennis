# Tennis Tournament Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a free, hobby tennis tournament app deployed at `tennis.paraskevakis.com` — admin manages tournaments and matches, public sees brackets, leaderboards, and per-player statistics.

**Architecture:** SvelteKit single-app (frontend + server endpoints) deployed to Cloudflare Pages, backed by Cloudflare D1 (SQLite). Single admin password gates `/admin/*` via signed cookie. Pure-logic modules (bracket, scores, stats) are unit-tested; UI is smoke-tested manually.

**Tech Stack:** SvelteKit 2 + TypeScript + Svelte 5, `@sveltejs/adapter-cloudflare`, Cloudflare D1, Vitest for unit tests, Cloudflare Pages for hosting, Wrangler CLI for D1 migrations and local dev.

---

## File Structure

```
tennis-tournament/
├── package.json
├── svelte.config.js
├── vite.config.ts
├── tsconfig.json
├── wrangler.toml                       # Cloudflare config (D1 binding)
├── .gitignore
├── migrations/
│   └── 0001_initial.sql                # All tables
├── src/
│   ├── app.html
│   ├── app.css                         # Tennis Classic global theme
│   ├── app.d.ts                        # Locals + Platform types
│   ├── hooks.server.ts                 # parse admin cookie → locals.isAdmin
│   ├── lib/
│   │   ├── db.ts                       # D1 wrappers + row types
│   │   ├── auth.ts                     # cookie sign/verify (HMAC)
│   │   ├── bracket.ts                  # generation + advancement (PURE)
│   │   ├── scores.ts                   # parse + winner computation (PURE)
│   │   ├── stats.ts                    # stats SQL queries
│   │   └── components/
│   │       ├── BracketView.svelte      # full bracket render
│   │       ├── MatchCard.svelte        # one match cell
│   │       ├── MatchEditModal.svelte   # admin score-entry modal
│   │       └── StatTable.svelte        # leaderboard table
│   └── routes/
│       ├── +layout.svelte              # global header + Tennis Classic frame
│       ├── +page.svelte                # public home
│       ├── +page.server.ts
│       ├── tournaments/[id]/
│       │   ├── +page.svelte
│       │   └── +page.server.ts
│       ├── players/
│       │   ├── +page.svelte            # leaderboard
│       │   ├── +page.server.ts
│       │   └── [id]/
│       │       ├── +page.svelte        # player profile
│       │       └── +page.server.ts
│       ├── admin/
│       │   ├── +layout.server.ts       # auth guard for all admin routes
│       │   ├── +page.svelte            # login OR dashboard
│       │   ├── +page.server.ts         # login form action
│       │   ├── tournaments/
│       │   │   ├── +page.svelte        # list + create
│       │   │   ├── +page.server.ts
│       │   │   └── [id]/
│       │   │       ├── +page.svelte    # edit (players, bracket, matches)
│       │   │       └── +page.server.ts
│       │   └── players/
│       │       ├── +page.svelte
│       │       └── +page.server.ts
│       └── api/admin/
│           ├── logout/+server.ts
│           ├── tournaments/[id]/generate-bracket/+server.ts
│           └── matches/[id]/+server.ts
└── tests/
    ├── bracket.test.ts
    ├── scores.test.ts
    └── stats.test.ts
```

**Boundary rationale:**
- Pure modules (`bracket.ts`, `scores.ts`) take primitive inputs, return primitives — no DB or framework dependencies. Trivially testable.
- `db.ts` is the ONLY module that touches D1 directly. Routes call it through typed functions.
- Routes are thin: load data via `db.ts`, format for UI. No business logic.
- Components are presentational; admin actions go through SvelteKit form actions or `/api/admin/*` endpoints.

---

## Task 1: Scaffold SvelteKit + Cloudflare project

**Files:**
- Create: entire project scaffold via `sv create`
- Modify: `package.json`, `svelte.config.js`, `.gitignore`

- [ ] **Step 1: Run the SvelteKit scaffolder in current directory**

The current directory `/Users/admin/Documents/tennis tournament` has only `docs/` and `.gitignore`. Initialize SvelteKit non-interactively:

```bash
cd "/Users/admin/Documents/tennis tournament"
npx sv@latest create . \
  --template minimal \
  --types ts \
  --no-add-ons \
  --install npm
```

If `sv` prompts about non-empty directory, accept (it preserves `docs/` and `.gitignore`).

Expected: creates `package.json`, `src/`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`, etc.

- [ ] **Step 2: Replace adapter with Cloudflare adapter**

```bash
npm uninstall @sveltejs/adapter-auto
npm install -D @sveltejs/adapter-cloudflare wrangler
```

- [ ] **Step 3: Update svelte.config.js**

Replace the contents of `svelte.config.js` with:

```javascript
import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter()
  }
};

export default config;
```

- [ ] **Step 4: Append entries to .gitignore**

Append these lines to existing `.gitignore`:

```
node_modules/
.svelte-kit/
.wrangler/
build/
.env
.dev.vars
```

(Keep the existing `.superpowers/` entry.)

- [ ] **Step 5: Verify dev server boots**

```bash
npm run dev -- --port 5173
```

Expected: starts without errors, prints "Local: http://localhost:5173". Hit Ctrl+C to stop.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Scaffold SvelteKit project with Cloudflare adapter"
```

---

## Task 2: Add Vitest for unit testing

**Files:**
- Modify: `package.json`, `vite.config.ts`

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest @vitest/ui
```

- [ ] **Step 2: Add test scripts to package.json**

Edit `package.json` "scripts" object — ADD these two entries (keep existing scripts):

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Configure Vitest in vite.config.ts**

Open `vite.config.ts`. The default content looks like:

```typescript
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()]
});
```

Add a `test` block:

```typescript
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['tests/**/*.test.ts']
  }
});
```

- [ ] **Step 4: Smoke-test Vitest with a trivial test**

Create `tests/smoke.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm test`
Expected: 1 test passes.

- [ ] **Step 5: Delete the smoke test**

```bash
rm tests/smoke.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add Vitest config"
```

---

## Task 3: Score parsing & winner computation (PURE — TDD)

**Files:**
- Create: `src/lib/scores.ts`
- Test: `tests/scores.test.ts`

This module parses score JSON like `[[6,3],[6,2]]` and computes the match winner from set scores. No DB, no framework.

- [ ] **Step 1: Write failing tests**

Create `tests/scores.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseScores, computeWinner, formatScores } from '../src/lib/scores';

describe('parseScores', () => {
  it('parses valid JSON sets', () => {
    expect(parseScores('[[6,3],[6,2]]')).toEqual([[6, 3], [6, 2]]);
  });

  it('returns empty array for null', () => {
    expect(parseScores(null)).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseScores('')).toEqual([]);
  });
});

describe('computeWinner', () => {
  it('returns 1 if player 1 wins more sets', () => {
    // p1 wins 6-3, 6-2 → 2 sets to 0
    expect(computeWinner([[6, 3], [6, 2]])).toBe(1);
  });

  it('returns 2 if player 2 wins more sets', () => {
    expect(computeWinner([[3, 6], [2, 6]])).toBe(2);
  });

  it('returns null if sets are tied', () => {
    expect(computeWinner([[6, 3], [3, 6]])).toBe(null);
  });

  it('returns null for empty input', () => {
    expect(computeWinner([])).toBe(null);
  });

  it('handles best-of-5 with mixed results', () => {
    // p1: 6-3, 4-6, 6-1, 4-6, 7-5  → 3 sets to 2
    expect(computeWinner([[6, 3], [4, 6], [6, 1], [4, 6], [7, 5]])).toBe(1);
  });
});

describe('formatScores', () => {
  it('formats sets as "6-3, 6-2"', () => {
    expect(formatScores([[6, 3], [6, 2]])).toBe('6-3, 6-2');
  });

  it('returns empty string for empty input', () => {
    expect(formatScores([])).toBe('');
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `npm test`
Expected: all fail with "Cannot find module '../src/lib/scores'".

- [ ] **Step 3: Implement src/lib/scores.ts**

Create `src/lib/scores.ts`:

```typescript
export type SetScore = [number, number];   // [player1Games, player2Games]
export type Scores = SetScore[];

export function parseScores(raw: string | null | undefined): Scores {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Scores;
  } catch {
    return [];
  }
}

export function computeWinner(scores: Scores): 1 | 2 | null {
  if (scores.length === 0) return null;
  let p1Sets = 0;
  let p2Sets = 0;
  for (const [a, b] of scores) {
    if (a > b) p1Sets++;
    else if (b > a) p2Sets++;
  }
  if (p1Sets > p2Sets) return 1;
  if (p2Sets > p1Sets) return 2;
  return null;
}

export function formatScores(scores: Scores): string {
  return scores.map(([a, b]) => `${a}-${b}`).join(', ');
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `npm test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add score parsing and winner computation"
```

---

## Task 4: Bracket generation algorithm (PURE — TDD)

**Files:**
- Create: `src/lib/bracket.ts`
- Test: `tests/bracket.test.ts`

This module computes the initial match list given a player count, and computes the next-round position from a current-round position.

- [ ] **Step 1: Write failing tests**

Create `tests/bracket.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { nextPowerOf2, generateMatches, nextMatchPosition } from '../src/lib/bracket';

describe('nextPowerOf2', () => {
  it('returns 4 for 4', () => expect(nextPowerOf2(4)).toBe(4));
  it('returns 8 for 5', () => expect(nextPowerOf2(5)).toBe(8));
  it('returns 8 for 8', () => expect(nextPowerOf2(8)).toBe(8));
  it('returns 16 for 9', () => expect(nextPowerOf2(9)).toBe(16));
});

describe('nextMatchPosition', () => {
  it('round 1 pos 0 → round 2 pos 0 slot player1', () => {
    expect(nextMatchPosition(1, 0)).toEqual({ round: 2, position: 0, slot: 'player1' });
  });
  it('round 1 pos 1 → round 2 pos 0 slot player2', () => {
    expect(nextMatchPosition(1, 1)).toEqual({ round: 2, position: 0, slot: 'player2' });
  });
  it('round 1 pos 2 → round 2 pos 1 slot player1', () => {
    expect(nextMatchPosition(1, 2)).toEqual({ round: 2, position: 1, slot: 'player1' });
  });
  it('round 2 pos 1 → round 3 pos 0 slot player2', () => {
    expect(nextMatchPosition(2, 1)).toEqual({ round: 3, position: 0, slot: 'player2' });
  });
});

describe('generateMatches', () => {
  it('2 players: single match, no later rounds', () => {
    const result = generateMatches(['a', 'b']);
    expect(result.matches.length).toBe(1);
    const m = result.matches[0];
    expect(m.round).toBe(1);
    expect(m.player1_id).toBeTruthy();
    expect(m.player2_id).toBeTruthy();
  });

  it('3 players: 1 bye → 1 r1 match + 1 final', () => {
    const result = generateMatches(['a', 'b', 'c']);
    expect(result.matches.length).toBe(2);
    expect(result.matches.filter(m => m.round === 1).length).toBe(1);
    expect(result.matches.filter(m => m.round === 2).length).toBe(1);
    // Final has the bye player as player1 + null player2 (will be set when r1 winner advances)
    const final = result.matches.find(m => m.round === 2)!;
    expect(final.player1_id).toBeTruthy();
    expect(final.player2_id).toBeNull();
  });

  it('4 players: 2 round-1 matches, 1 final, no byes', () => {
    const players = ['a', 'b', 'c', 'd'];
    const result = generateMatches(players);
    expect(result.matches.filter(m => m.round === 1).length).toBe(2);
    expect(result.matches.filter(m => m.round === 2).length).toBe(1);
    expect(result.matches.length).toBe(3);
    for (const m of result.matches.filter(m => m.round === 1)) {
      expect(m.player1_id).toBeTruthy();
      expect(m.player2_id).toBeTruthy();
    }
    const final = result.matches.find(m => m.round === 2)!;
    expect(final.player1_id).toBeNull();
    expect(final.player2_id).toBeNull();
  });

  it('5 players: 3 byes (one r2 match has 2 byes meeting)', () => {
    const result = generateMatches(['a', 'b', 'c', 'd', 'e']);
    // pow2=8, byes=3 → 1 r1 match + 2 r2 + 1 r3 = 4 total
    expect(result.matches.length).toBe(4);
    expect(result.matches.filter(m => m.round === 1).length).toBe(1);
    expect(result.matches.filter(m => m.round === 2).length).toBe(2);
    expect(result.matches.filter(m => m.round === 3).length).toBe(1);
    // R2 has 4 player slots total; 3 are byes, 1 is null (waiting for r1 winner)
    const r2Filled = result.matches
      .filter(m => m.round === 2)
      .flatMap(m => [m.player1_id, m.player2_id])
      .filter(Boolean).length;
    expect(r2Filled).toBe(3);
  });

  it('6 players: 2 byes spread across r2 matches', () => {
    const result = generateMatches(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(result.matches.filter(m => m.round === 1).length).toBe(2);
    expect(result.matches.filter(m => m.round === 2).length).toBe(2);
    expect(result.matches.filter(m => m.round === 3).length).toBe(1);
    // Each r2 match has exactly one bye player (player1) and one null (player2 waiting for r1)
    for (const m of result.matches.filter(m => m.round === 2)) {
      const filled = [m.player1_id, m.player2_id].filter(Boolean);
      expect(filled.length).toBe(1);
    }
  });

  it('8 players: 4 + 2 + 1 = 7 matches, no byes', () => {
    const players = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const result = generateMatches(players);
    expect(result.matches.length).toBe(7);
    expect(result.matches.filter(m => m.round === 1 && m.player1_id && m.player2_id).length).toBe(4);
  });

  it('returns seeds for every player', () => {
    const players = ['a', 'b', 'c', 'd', 'e'];
    const result = generateMatches(players);
    expect(result.seeds.length).toBe(5);
    expect(new Set(result.seeds.map(s => s.player_id))).toEqual(new Set(players));
    expect(new Set(result.seeds.map(s => s.seed))).toEqual(new Set([1, 2, 3, 4, 5]));
  });

  it('shuffles players (different seedings on different runs)', () => {
    // Run many times — order should vary
    const players = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const orderings = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const r = generateMatches(players);
      const order = r.seeds.sort((x, y) => x.seed - y.seed).map(s => s.player_id).join(',');
      orderings.add(order);
    }
    // 30 random shuffles of 8 items — extremely unlikely to all be identical
    expect(orderings.size).toBeGreaterThan(1);
  });

  it('throws on fewer than 2 players', () => {
    expect(() => generateMatches(['a'])).toThrow();
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `npm test`
Expected: all bracket tests fail with module-not-found.

- [ ] **Step 3: Implement src/lib/bracket.ts**

Create `src/lib/bracket.ts`:

```typescript
export type GeneratedMatch = {
  round: number;
  position: number;
  player1_id: string | null;
  player2_id: string | null;
};

export type GeneratedSeed = {
  player_id: string;
  seed: number;
};

export type GenerationResult = {
  matches: GeneratedMatch[];
  seeds: GeneratedSeed[];
};

export type NextSlot = {
  round: number;
  position: number;
  slot: 'player1' | 'player2';
};

export function nextPowerOf2(n: number): number {
  if (n <= 1) return 1;
  return 2 ** Math.ceil(Math.log2(n));
}

export function nextMatchPosition(round: number, position: number): NextSlot {
  return {
    round: round + 1,
    position: Math.floor(position / 2),
    slot: position % 2 === 0 ? 'player1' : 'player2'
  };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateMatches(playerIds: string[]): GenerationResult {
  if (playerIds.length < 2) {
    throw new Error('Need at least 2 players to generate a bracket');
  }

  const shuffled = shuffle(playerIds);
  const seeds: GeneratedSeed[] = shuffled.map((id, i) => ({
    player_id: id,
    seed: i + 1
  }));

  const n = shuffled.length;
  const pow2 = nextPowerOf2(n);
  const byes = pow2 - n;

  // Special case: 2 players → single match, no later rounds
  if (pow2 === 2) {
    return {
      matches: [{ round: 1, position: 0, player1_id: shuffled[0], player2_id: shuffled[1] }],
      seeds
    };
  }

  // Build empty rounds 2..final
  const matches: GeneratedMatch[] = [];
  let roundSize = pow2 / 4;
  let round = 2;
  while (roundSize >= 1) {
    for (let pos = 0; pos < roundSize; pos++) {
      matches.push({ round, position: pos, player1_id: null, player2_id: null });
    }
    roundSize /= 2;
    round++;
  }

  // Place bye players directly into round-2 slots, spread evenly:
  //   First pass: fill player1 of each r2 match in order (one bye per match).
  //   Second pass: if byes remain, fill player2 of each r2 match in order.
  // This matches standard bracket convention — byes only meet other byes when forced
  // (i.e., when byes > number of r2 matches).
  const r2Matches = matches.filter(m => m.round === 2);
  const slotsNeedingR1Feeder: { r2Pos: number; slot: 'player1_id' | 'player2_id' }[] = [];
  let byeIdx = 0;
  for (let p = 0; p < r2Matches.length; p++) {
    if (byeIdx < byes) {
      r2Matches[p].player1_id = shuffled[byeIdx++];
    } else {
      slotsNeedingR1Feeder.push({ r2Pos: p, slot: 'player1_id' });
    }
  }
  for (let p = 0; p < r2Matches.length; p++) {
    if (byeIdx < byes) {
      r2Matches[p].player2_id = shuffled[byeIdx++];
    } else {
      slotsNeedingR1Feeder.push({ r2Pos: p, slot: 'player2_id' });
    }
  }

  // Each remaining r2 slot needs an r1 winner. Compute the r1 match position that
  // feeds it: r1 pos 2*r2Pos feeds player1, r1 pos 2*r2Pos+1 feeds player2.
  const r1Positions = slotsNeedingR1Feeder
    .map(({ r2Pos, slot }) => 2 * r2Pos + (slot === 'player2_id' ? 1 : 0))
    .sort((a, b) => a - b);

  // Pair the play players (those without byes) into r1 matches in r1-position order.
  const playPlayers = shuffled.slice(byes);
  let pi = 0;
  for (const r1Pos of r1Positions) {
    matches.push({
      round: 1,
      position: r1Pos,
      player1_id: playPlayers[pi++] ?? null,
      player2_id: playPlayers[pi++] ?? null
    });
  }

  return { matches, seeds };
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `npm test`
Expected: all bracket tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add bracket generation and advancement"
```

---

## Task 5: Initial D1 migration + wrangler config

**Files:**
- Create: `wrangler.toml`, `migrations/0001_initial.sql`

- [ ] **Step 1: Create wrangler.toml**

Create `wrangler.toml`:

```toml
name = "tennis-tournament"
compatibility_date = "2024-09-23"
pages_build_output_dir = ".svelte-kit/cloudflare"

[[d1_databases]]
binding = "DB"
database_name = "tennis-tournament-db"
database_id = "PLACEHOLDER_REPLACE_AFTER_CREATE"
```

- [ ] **Step 2: Create the migration file**

Create `migrations/0001_initial.sql`:

```sql
CREATE TABLE players (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  created_at  INTEGER NOT NULL
);

CREATE TABLE tournaments (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  category     TEXT NOT NULL,
  best_of      INTEGER NOT NULL,
  status       TEXT NOT NULL,
  champion_id  TEXT,
  created_at   INTEGER NOT NULL
);

CREATE TABLE tournament_players (
  tournament_id  TEXT NOT NULL,
  player_id      TEXT NOT NULL,
  seed           INTEGER NOT NULL,
  PRIMARY KEY (tournament_id, player_id)
);

CREATE TABLE matches (
  id             TEXT PRIMARY KEY,
  tournament_id  TEXT NOT NULL,
  round          INTEGER NOT NULL,
  position       INTEGER NOT NULL,
  player1_id     TEXT,
  player2_id     TEXT,
  winner_id      TEXT,
  scores         TEXT,
  status         TEXT NOT NULL,
  UNIQUE (tournament_id, round, position)
);

CREATE INDEX idx_matches_tournament ON matches(tournament_id);
CREATE INDEX idx_tournament_players_player ON tournament_players(player_id);
```

- [ ] **Step 3: Create the local D1 database**

```bash
npx wrangler d1 create tennis-tournament-db
```

Expected output includes a `database_id`. Copy it.

- [ ] **Step 4: Update wrangler.toml with the real database_id**

Replace `PLACEHOLDER_REPLACE_AFTER_CREATE` in `wrangler.toml` with the ID from Step 3.

- [ ] **Step 5: Apply the migration locally**

```bash
npx wrangler d1 execute tennis-tournament-db --local --file=migrations/0001_initial.sql
```

Expected: "🌀 Executing on local database tennis-tournament-db..." and "✅ executed".

- [ ] **Step 6: Verify tables were created**

```bash
npx wrangler d1 execute tennis-tournament-db --local --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

Expected: lists `matches`, `players`, `tournament_players`, `tournaments`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Add D1 migration and Wrangler config"
```

---

## Task 6: Wire D1 into local SvelteKit dev

**Files:**
- Modify: `vite.config.ts`, `src/app.d.ts`

This makes `event.platform.env.DB` work in `vite dev` (not just in deployed `wrangler pages dev`).

- [ ] **Step 1: Install the wrangler vite plugin pieces**

The Cloudflare adapter exposes `getPlatformProxy()` from wrangler. No extra install — it's already a wrangler dependency.

- [ ] **Step 2: Update vite.config.ts to expose D1 in dev**

Edit `vite.config.ts`:

```typescript
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { getPlatformProxy } from 'wrangler';

const platform = await getPlatformProxy();

export default defineConfig({
  plugins: [
    sveltekit(),
    {
      name: 'cf-platform',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          (req as any).cfPlatform = platform;
          next();
        });
      }
    }
  ],
  test: {
    include: ['tests/**/*.test.ts']
  }
});
```

Then create `src/hooks.server.ts`:

```typescript
import type { Handle } from '@sveltejs/kit';
import { getPlatformProxy } from 'wrangler';

let cachedPlatform: Awaited<ReturnType<typeof getPlatformProxy>> | null = null;

async function devPlatform() {
  if (!cachedPlatform) cachedPlatform = await getPlatformProxy();
  return cachedPlatform;
}

export const handle: Handle = async ({ event, resolve }) => {
  if (!event.platform && import.meta.env.DEV) {
    const p = await devPlatform();
    event.platform = { env: p.env, context: p.ctx, caches: p.caches, cf: p.cf } as App.Platform;
  }
  return resolve(event);
};
```

- [ ] **Step 3: Update src/app.d.ts**

Replace the contents of `src/app.d.ts`:

```typescript
declare global {
  namespace App {
    interface Locals {
      isAdmin: boolean;
    }
    interface Platform {
      env: {
        DB: D1Database;
        ADMIN_PASSWORD?: string;
        AUTH_SECRET?: string;
      };
      context: {
        waitUntil(promise: Promise<unknown>): void;
      };
      caches: CacheStorage & { default: Cache };
    }
  }
}

export {};
```

- [ ] **Step 4: Install Cloudflare types**

```bash
npm install -D @cloudflare/workers-types
```

Then edit `tsconfig.json` "compilerOptions" — add `"types": ["@cloudflare/workers-types"]`. Example final shape:

```json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "types": ["@cloudflare/workers-types"],
    "allowJs": true,
    "checkJs": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "strict": true,
    "moduleResolution": "bundler"
  }
}
```

- [ ] **Step 5: Smoke-test by adding a temporary route**

Create `src/routes/+page.server.ts`:

```typescript
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
  if (!platform?.env.DB) {
    return { count: -1, error: 'No DB binding' };
  }
  const result = await platform.env.DB.prepare('SELECT COUNT(*) as c FROM players').first<{ c: number }>();
  return { count: result?.c ?? 0 };
};
```

Update `src/routes/+page.svelte` to:

```svelte
<script lang="ts">
  let { data } = $props();
</script>

<h1>Players: {data.count}</h1>
{#if data.error}<p style="color:red">{data.error}</p>{/if}
```

Run `npm run dev`, visit http://localhost:5173, expect: "Players: 0" (no error).
Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Wire D1 binding into SvelteKit dev"
```

---

## Task 7: D1 query helpers

**Files:**
- Create: `src/lib/db.ts`

A typed wrapper module so route code never writes raw SQL.

- [ ] **Step 1: Implement src/lib/db.ts**

Create `src/lib/db.ts`:

```typescript
export type Player = {
  id: string;
  name: string;
  created_at: number;
};

export type TournamentCategory = 'men_pro' | 'men_new' | 'women_pro' | 'women_new';
export type TournamentStatus = 'setup' | 'in_progress' | 'completed';

export type Tournament = {
  id: string;
  name: string;
  category: TournamentCategory;
  best_of: number;
  status: TournamentStatus;
  champion_id: string | null;
  created_at: number;
};

export type Match = {
  id: string;
  tournament_id: string;
  round: number;
  position: number;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  scores: string | null;
  status: 'pending' | 'completed';
};

export type TournamentPlayer = {
  tournament_id: string;
  player_id: string;
  seed: number;
};

function uuid(): string {
  return crypto.randomUUID();
}

// ---------- Players ----------
export async function listPlayers(db: D1Database): Promise<Player[]> {
  const r = await db.prepare('SELECT * FROM players ORDER BY name').all<Player>();
  return r.results ?? [];
}

export async function getPlayer(db: D1Database, id: string): Promise<Player | null> {
  return await db.prepare('SELECT * FROM players WHERE id = ?').bind(id).first<Player>();
}

export async function createPlayer(db: D1Database, name: string): Promise<Player> {
  const id = uuid();
  const created_at = Date.now();
  await db.prepare('INSERT INTO players (id, name, created_at) VALUES (?, ?, ?)')
    .bind(id, name, created_at).run();
  return { id, name, created_at };
}

export async function renamePlayer(db: D1Database, id: string, name: string): Promise<void> {
  await db.prepare('UPDATE players SET name = ? WHERE id = ?').bind(name, id).run();
}

export async function deletePlayer(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM players WHERE id = ?').bind(id).run();
}

// ---------- Tournaments ----------
export async function listTournaments(db: D1Database): Promise<Tournament[]> {
  const r = await db.prepare('SELECT * FROM tournaments ORDER BY created_at DESC').all<Tournament>();
  return r.results ?? [];
}

export async function getTournament(db: D1Database, id: string): Promise<Tournament | null> {
  return await db.prepare('SELECT * FROM tournaments WHERE id = ?').bind(id).first<Tournament>();
}

export async function createTournament(
  db: D1Database,
  name: string,
  category: TournamentCategory,
  best_of: number
): Promise<Tournament> {
  const id = uuid();
  const created_at = Date.now();
  await db.prepare(
    'INSERT INTO tournaments (id, name, category, best_of, status, champion_id, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?)'
  ).bind(id, name, category, best_of, 'setup', created_at).run();
  return {
    id, name, category, best_of, status: 'setup', champion_id: null, created_at
  };
}

export async function deleteTournament(db: D1Database, id: string): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM matches WHERE tournament_id = ?').bind(id),
    db.prepare('DELETE FROM tournament_players WHERE tournament_id = ?').bind(id),
    db.prepare('DELETE FROM tournaments WHERE id = ?').bind(id)
  ]);
}

export async function setTournamentStatus(
  db: D1Database, id: string, status: TournamentStatus, champion_id: string | null = null
): Promise<void> {
  await db.prepare('UPDATE tournaments SET status = ?, champion_id = ? WHERE id = ?')
    .bind(status, champion_id, id).run();
}

// ---------- Tournament players ----------
export async function listTournamentPlayers(db: D1Database, tournamentId: string): Promise<(TournamentPlayer & { name: string })[]> {
  const r = await db.prepare(
    'SELECT tp.tournament_id, tp.player_id, tp.seed, p.name FROM tournament_players tp JOIN players p ON p.id = tp.player_id WHERE tp.tournament_id = ? ORDER BY tp.seed'
  ).bind(tournamentId).all<TournamentPlayer & { name: string }>();
  return r.results ?? [];
}

export async function addTournamentPlayer(db: D1Database, tournamentId: string, playerId: string): Promise<void> {
  // Use a temporary seed of 0; real seeds assigned at bracket generation
  await db.prepare(
    'INSERT OR IGNORE INTO tournament_players (tournament_id, player_id, seed) VALUES (?, ?, 0)'
  ).bind(tournamentId, playerId).run();
}

export async function removeTournamentPlayer(db: D1Database, tournamentId: string, playerId: string): Promise<void> {
  await db.prepare('DELETE FROM tournament_players WHERE tournament_id = ? AND player_id = ?')
    .bind(tournamentId, playerId).run();
}

// ---------- Matches ----------
export async function listMatches(db: D1Database, tournamentId: string): Promise<Match[]> {
  const r = await db.prepare('SELECT * FROM matches WHERE tournament_id = ? ORDER BY round, position').bind(tournamentId).all<Match>();
  return r.results ?? [];
}

export async function getMatch(db: D1Database, id: string): Promise<Match | null> {
  return await db.prepare('SELECT * FROM matches WHERE id = ?').bind(id).first<Match>();
}

export async function getMatchAt(
  db: D1Database, tournamentId: string, round: number, position: number
): Promise<Match | null> {
  return await db.prepare(
    'SELECT * FROM matches WHERE tournament_id = ? AND round = ? AND position = ?'
  ).bind(tournamentId, round, position).first<Match>();
}

export async function insertMatches(db: D1Database, tournamentId: string, matches: Omit<Match, 'id' | 'tournament_id'>[]): Promise<void> {
  const stmts = matches.map(m =>
    db.prepare(
      'INSERT INTO matches (id, tournament_id, round, position, player1_id, player2_id, winner_id, scores, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(uuid(), tournamentId, m.round, m.position, m.player1_id, m.player2_id, m.winner_id, m.scores, m.status)
  );
  await db.batch(stmts);
}

export async function assignTournamentSeeds(
  db: D1Database, tournamentId: string, seeds: { player_id: string; seed: number }[]
): Promise<void> {
  const stmts = seeds.map(s =>
    db.prepare('UPDATE tournament_players SET seed = ? WHERE tournament_id = ? AND player_id = ?')
      .bind(s.seed, tournamentId, s.player_id)
  );
  await db.batch(stmts);
}

export async function clearMatches(db: D1Database, tournamentId: string): Promise<void> {
  await db.prepare('DELETE FROM matches WHERE tournament_id = ?').bind(tournamentId).run();
}

export async function updateMatch(
  db: D1Database, id: string,
  fields: Partial<Pick<Match, 'player1_id' | 'player2_id' | 'winner_id' | 'scores' | 'status'>>
): Promise<void> {
  const sets: string[] = [];
  const values: (string | null)[] = [];
  for (const [k, v] of Object.entries(fields)) {
    sets.push(`${k} = ?`);
    values.push(v as string | null);
  }
  if (sets.length === 0) return;
  values.push(id);
  await db.prepare(`UPDATE matches SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();
}
```

- [ ] **Step 2: Sanity-check via the temporary home page**

Run `npm run dev`. The home page from Task 6 calls `db.prepare(...)`. Visit http://localhost:5173 — expect "Players: 0". Stop the server.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "Add D1 query helpers"
```

---

## Task 8: Cookie-based admin auth

**Files:**
- Create: `src/lib/auth.ts`
- Modify: `src/hooks.server.ts`

Sign cookies with HMAC-SHA256 using `AUTH_SECRET` env var. Store no session in DB — cookie payload contains `{exp}` and signature.

- [ ] **Step 1: Implement src/lib/auth.ts**

Create `src/lib/auth.ts`:

```typescript
const ENCODER = new TextEncoder();

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', ENCODER.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, ENCODER.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

export async function signCookie(secret: string, expiresAt: number): Promise<string> {
  const payload = `${expiresAt}`;
  const sig = await hmac(secret, payload);
  return `${payload}.${sig}`;
}

export async function verifyCookie(secret: string, cookie: string | undefined): Promise<boolean> {
  if (!cookie) return false;
  const [payload, sig] = cookie.split('.');
  if (!payload || !sig) return false;
  const expected = await hmac(secret, payload);
  if (sig !== expected) return false;
  const exp = Number(payload);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  return true;
}

export const COOKIE_NAME = 'tt_admin';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
```

- [ ] **Step 2: Update src/hooks.server.ts to set locals.isAdmin**

Replace `src/hooks.server.ts`:

```typescript
import type { Handle } from '@sveltejs/kit';
import { getPlatformProxy } from 'wrangler';
import { COOKIE_NAME, verifyCookie } from '$lib/auth';

let cachedPlatform: Awaited<ReturnType<typeof getPlatformProxy>> | null = null;

async function devPlatform() {
  if (!cachedPlatform) cachedPlatform = await getPlatformProxy();
  return cachedPlatform;
}

export const handle: Handle = async ({ event, resolve }) => {
  if (!event.platform && import.meta.env.DEV) {
    const p = await devPlatform();
    event.platform = { env: p.env, context: p.ctx, caches: p.caches, cf: p.cf } as App.Platform;
  }

  const secret = event.platform?.env.AUTH_SECRET ?? 'dev-secret-change-me';
  const cookie = event.cookies.get(COOKIE_NAME);
  event.locals.isAdmin = await verifyCookie(secret, cookie);

  return resolve(event);
};
```

- [ ] **Step 3: Create .dev.vars for local secrets**

Create `.dev.vars` (gitignored):

```
ADMIN_PASSWORD=dev-password
AUTH_SECRET=dev-secret-change-me-later
```

- [ ] **Step 4: Smoke-test by reading isAdmin in the home loader**

Replace `src/routes/+page.server.ts`:

```typescript
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, locals }) => {
  if (!platform?.env.DB) return { count: -1, isAdmin: locals.isAdmin };
  const r = await platform.env.DB.prepare('SELECT COUNT(*) as c FROM players').first<{ c: number }>();
  return { count: r?.c ?? 0, isAdmin: locals.isAdmin };
};
```

Update `src/routes/+page.svelte`:

```svelte
<script lang="ts">
  let { data } = $props();
</script>

<h1>Players: {data.count}</h1>
<p>Admin: {data.isAdmin ? 'yes' : 'no'}</p>
```

Run `npm run dev`, visit http://localhost:5173 — expect "Admin: no". Stop the server.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add HMAC cookie auth helpers"
```

---

## Task 9: Admin login page + auth guard

**Files:**
- Create: `src/routes/admin/+page.svelte`, `src/routes/admin/+page.server.ts`, `src/routes/admin/+layout.server.ts`, `src/routes/api/admin/logout/+server.ts`

- [ ] **Step 1: Create src/routes/admin/+layout.server.ts**

```typescript
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, url }) => {
  // /admin itself shows the login form; everything below it requires auth
  if (!locals.isAdmin && url.pathname !== '/admin') {
    redirect(303, '/admin');
  }
  return { isAdmin: locals.isAdmin };
};
```

- [ ] **Step 2: Create src/routes/admin/+page.server.ts**

```typescript
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { COOKIE_NAME, COOKIE_MAX_AGE, signCookie } from '$lib/auth';

export const load: PageServerLoad = ({ locals }) => {
  return { isAdmin: locals.isAdmin };
};

export const actions: Actions = {
  login: async ({ request, cookies, platform }) => {
    const data = await request.formData();
    const password = String(data.get('password') ?? '');
    const expected = platform?.env.ADMIN_PASSWORD;
    if (!expected) return fail(500, { error: 'ADMIN_PASSWORD not configured' });
    if (password !== expected) return fail(401, { error: 'Wrong password' });

    const secret = platform?.env.AUTH_SECRET ?? 'dev-secret-change-me';
    const expiresAt = Date.now() + COOKIE_MAX_AGE * 1000;
    const cookie = await signCookie(secret, expiresAt);
    cookies.set(COOKIE_NAME, cookie, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: COOKIE_MAX_AGE
    });
    redirect(303, '/admin/tournaments');
  }
};
```

- [ ] **Step 3: Create src/routes/admin/+page.svelte**

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  let { data, form } = $props();
</script>

{#if data.isAdmin}
  <h1>Admin dashboard</h1>
  <ul>
    <li><a href="/admin/tournaments">Tournaments</a></li>
    <li><a href="/admin/players">Players</a></li>
  </ul>
  <form method="POST" action="/api/admin/logout">
    <button type="submit">Log out</button>
  </form>
{:else}
  <h1>Admin login</h1>
  <form method="POST" action="?/login" use:enhance>
    <label>
      Password
      <input type="password" name="password" required />
    </label>
    <button type="submit">Log in</button>
    {#if form?.error}<p style="color:red">{form.error}</p>{/if}
  </form>
{/if}
```

- [ ] **Step 4: Create src/routes/api/admin/logout/+server.ts**

```typescript
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { COOKIE_NAME } from '$lib/auth';

export const POST: RequestHandler = ({ cookies }) => {
  cookies.delete(COOKIE_NAME, { path: '/' });
  redirect(303, '/admin');
};
```

- [ ] **Step 5: Smoke-test login flow**

Run `npm run dev`. Visit http://localhost:5173/admin — expect login form. Enter wrong password → "Wrong password". Enter `dev-password` → redirect to `/admin/tournaments` (will 404 since not built yet — that's fine, the redirect proves login worked). Stop server.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add admin login and auth guard"
```

---

## Task 10: Admin players page (CRUD)

**Files:**
- Create: `src/routes/admin/players/+page.svelte`, `src/routes/admin/players/+page.server.ts`

- [ ] **Step 1: Create src/routes/admin/players/+page.server.ts**

```typescript
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { listPlayers, createPlayer, renamePlayer, deletePlayer } from '$lib/db';

export const load: PageServerLoad = async ({ platform }) => {
  const players = platform?.env.DB ? await listPlayers(platform.env.DB) : [];
  return { players };
};

export const actions: Actions = {
  create: async ({ request, platform }) => {
    const data = await request.formData();
    const name = String(data.get('name') ?? '').trim();
    if (!name) return fail(400, { error: 'Name required' });
    if (!platform?.env.DB) return fail(500, { error: 'No DB' });
    try {
      await createPlayer(platform.env.DB, name);
    } catch (e) {
      return fail(400, { error: 'Duplicate name?' });
    }
    return { ok: true };
  },
  rename: async ({ request, platform }) => {
    const data = await request.formData();
    const id = String(data.get('id') ?? '');
    const name = String(data.get('name') ?? '').trim();
    if (!id || !name) return fail(400, { error: 'Missing id or name' });
    await renamePlayer(platform!.env.DB, id, name);
    return { ok: true };
  },
  delete: async ({ request, platform }) => {
    const data = await request.formData();
    const id = String(data.get('id') ?? '');
    if (!id) return fail(400, { error: 'Missing id' });
    await deletePlayer(platform!.env.DB, id);
    return { ok: true };
  }
};
```

- [ ] **Step 2: Create src/routes/admin/players/+page.svelte**

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  let { data } = $props();
</script>

<h1>Players</h1>

<form method="POST" action="?/create" use:enhance>
  <input name="name" placeholder="New player name" required />
  <button type="submit">Add</button>
</form>

<ul>
  {#each data.players as p (p.id)}
    <li>
      <span>{p.name}</span>
      <form method="POST" action="?/rename" use:enhance style="display:inline">
        <input type="hidden" name="id" value={p.id} />
        <input name="name" value={p.name} />
        <button type="submit">Rename</button>
      </form>
      <form method="POST" action="?/delete" use:enhance style="display:inline">
        <input type="hidden" name="id" value={p.id} />
        <button type="submit">Delete</button>
      </form>
    </li>
  {/each}
</ul>

<p><a href="/admin">← Back to dashboard</a></p>
```

- [ ] **Step 3: Smoke-test CRUD**

Run `npm run dev`. Log into /admin, navigate to /admin/players. Add "Anna", "Beth", "Cara". Rename "Cara" → "Carol". Delete "Beth". Refresh — should show Anna, Carol. Stop server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add admin players page (CRUD)"
```

---

## Task 11: Admin tournaments list + create

**Files:**
- Create: `src/routes/admin/tournaments/+page.svelte`, `src/routes/admin/tournaments/+page.server.ts`

- [ ] **Step 1: Create src/routes/admin/tournaments/+page.server.ts**

```typescript
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { listTournaments, createTournament, deleteTournament, type TournamentCategory } from '$lib/db';

export const load: PageServerLoad = async ({ platform }) => {
  const tournaments = platform?.env.DB ? await listTournaments(platform.env.DB) : [];
  return { tournaments };
};

const CATEGORIES: TournamentCategory[] = ['men_pro', 'men_new', 'women_pro', 'women_new'];

export const actions: Actions = {
  create: async ({ request, platform }) => {
    const data = await request.formData();
    const name = String(data.get('name') ?? '').trim();
    const category = String(data.get('category') ?? '') as TournamentCategory;
    const best_of = Number(data.get('best_of') ?? 3);
    if (!name) return fail(400, { error: 'Name required' });
    if (!CATEGORIES.includes(category)) return fail(400, { error: 'Invalid category' });
    if (![1, 3, 5].includes(best_of)) return fail(400, { error: 'best_of must be 1, 3, or 5' });
    const t = await createTournament(platform!.env.DB, name, category, best_of);
    redirect(303, `/admin/tournaments/${t.id}`);
  },
  delete: async ({ request, platform }) => {
    const data = await request.formData();
    const id = String(data.get('id') ?? '');
    if (!id) return fail(400, { error: 'Missing id' });
    await deleteTournament(platform!.env.DB, id);
    return { ok: true };
  }
};
```

- [ ] **Step 2: Create src/routes/admin/tournaments/+page.svelte**

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  let { data } = $props();
</script>

<h1>Tournaments</h1>

<details>
  <summary>+ New tournament</summary>
  <form method="POST" action="?/create" use:enhance>
    <label>Name <input name="name" required /></label>
    <label>Category
      <select name="category" required>
        <option value="men_pro">Men Pro</option>
        <option value="men_new">Men New</option>
        <option value="women_pro">Women Pro</option>
        <option value="women_new">Women New</option>
      </select>
    </label>
    <label>Best of
      <select name="best_of">
        <option value="1">1 set</option>
        <option value="3" selected>3 sets</option>
        <option value="5">5 sets</option>
      </select>
    </label>
    <button type="submit">Create</button>
  </form>
</details>

<ul>
  {#each data.tournaments as t (t.id)}
    <li>
      <a href="/admin/tournaments/{t.id}">{t.name}</a>
      <small>({t.category}, best of {t.best_of}) — {t.status}</small>
      <form method="POST" action="?/delete" use:enhance style="display:inline">
        <input type="hidden" name="id" value={t.id} />
        <button type="submit" onclick="return confirm('Delete tournament?')">Delete</button>
      </form>
    </li>
  {/each}
</ul>

<p><a href="/admin">← Back to dashboard</a></p>
```

- [ ] **Step 3: Smoke-test**

Run `npm run dev`. Log in. Go to /admin/tournaments. Create "Spring 2026" Men Pro best-of-3. Should redirect to /admin/tournaments/[id] (which 404s — fine for now).

Go back to /admin/tournaments — see "Spring 2026" listed. Delete it. Stop server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add admin tournaments list + create"
```

---

## Task 12: Admin tournament edit page (players + bracket gen)

**Files:**
- Create: `src/routes/admin/tournaments/[id]/+page.svelte`, `src/routes/admin/tournaments/[id]/+page.server.ts`, `src/routes/api/admin/tournaments/[id]/generate-bracket/+server.ts`

- [ ] **Step 1: Create the bracket-generation endpoint**

Create `src/routes/api/admin/tournaments/[id]/generate-bracket/+server.ts`:

```typescript
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  getTournament, listTournamentPlayers, clearMatches, insertMatches,
  assignTournamentSeeds, setTournamentStatus
} from '$lib/db';
import { generateMatches } from '$lib/bracket';

export const POST: RequestHandler = async ({ params, locals, platform }) => {
  if (!locals.isAdmin) error(401);
  const db = platform!.env.DB;
  const t = await getTournament(db, params.id);
  if (!t) error(404);
  if (t.status !== 'setup') error(400, 'Bracket already generated');

  const players = await listTournamentPlayers(db, params.id);
  if (players.length < 2) error(400, 'Need at least 2 players');

  const result = generateMatches(players.map(p => p.player_id));
  await clearMatches(db, params.id);
  await insertMatches(db, params.id, result.matches.map(m => ({
    round: m.round,
    position: m.position,
    player1_id: m.player1_id,
    player2_id: m.player2_id,
    winner_id: null,
    scores: null,
    status: 'pending' as const
  })));
  await assignTournamentSeeds(db, params.id, result.seeds);
  await setTournamentStatus(db, params.id, 'in_progress');

  return json({ ok: true });
};
```

- [ ] **Step 2: Create src/routes/admin/tournaments/[id]/+page.server.ts**

```typescript
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
  getTournament, listPlayers, listTournamentPlayers,
  addTournamentPlayer, removeTournamentPlayer, listMatches
} from '$lib/db';

export const load: PageServerLoad = async ({ params, platform }) => {
  const db = platform!.env.DB;
  const tournament = await getTournament(db, params.id);
  if (!tournament) return { tournament: null, allPlayers: [], tournamentPlayers: [], matches: [] };
  const [allPlayers, tournamentPlayers, matches] = await Promise.all([
    listPlayers(db),
    listTournamentPlayers(db, params.id),
    listMatches(db, params.id)
  ]);
  return { tournament, allPlayers, tournamentPlayers, matches };
};

export const actions: Actions = {
  addPlayer: async ({ request, params, platform }) => {
    const data = await request.formData();
    const playerId = String(data.get('player_id') ?? '');
    if (!playerId) return fail(400, { error: 'Missing player_id' });
    await addTournamentPlayer(platform!.env.DB, params.id, playerId);
    return { ok: true };
  },
  removePlayer: async ({ request, params, platform }) => {
    const data = await request.formData();
    const playerId = String(data.get('player_id') ?? '');
    if (!playerId) return fail(400, { error: 'Missing player_id' });
    await removeTournamentPlayer(platform!.env.DB, params.id, playerId);
    return { ok: true };
  }
};
```

- [ ] **Step 3: Create src/routes/admin/tournaments/[id]/+page.svelte**

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  let { data } = $props();

  let generating = $state(false);
  async function generate() {
    generating = true;
    const r = await fetch(`/api/admin/tournaments/${data.tournament!.id}/generate-bracket`, { method: 'POST' });
    if (!r.ok) {
      const t = await r.text();
      alert(`Failed: ${t}`);
    } else {
      location.reload();
    }
    generating = false;
  }
</script>

{#if !data.tournament}
  <p>Tournament not found.</p>
{:else}
  <h1>{data.tournament.name}</h1>
  <p>Status: {data.tournament.status} · Best of {data.tournament.best_of}</p>

  {#if data.tournament.status === 'setup'}
    <h2>Players in tournament ({data.tournamentPlayers.length})</h2>
    <ul>
      {#each data.tournamentPlayers as p (p.player_id)}
        <li>
          {p.name}
          <form method="POST" action="?/removePlayer" use:enhance style="display:inline">
            <input type="hidden" name="player_id" value={p.player_id} />
            <button type="submit">Remove</button>
          </form>
        </li>
      {/each}
    </ul>

    <h3>Add player</h3>
    <form method="POST" action="?/addPlayer" use:enhance>
      <select name="player_id" required>
        <option value="">Select player...</option>
        {#each data.allPlayers.filter(p => !data.tournamentPlayers.some(tp => tp.player_id === p.id)) as p (p.id)}
          <option value={p.id}>{p.name}</option>
        {/each}
      </select>
      <button type="submit">Add</button>
    </form>

    <button onclick={generate} disabled={generating || data.tournamentPlayers.length < 2}>
      {generating ? 'Generating…' : '🎲 Generate bracket'}
    </button>
  {:else}
    <h2>Bracket</h2>
    <p>Click any match below to enter scores.</p>
    <ul>
      {#each data.matches as m (m.id)}
        <li>
          R{m.round} P{m.position}:
          {data.tournamentPlayers.find(p => p.player_id === m.player1_id)?.name ?? '—'}
          vs
          {data.tournamentPlayers.find(p => p.player_id === m.player2_id)?.name ?? '—'}
          {#if m.winner_id}
            → winner: {data.tournamentPlayers.find(p => p.player_id === m.winner_id)?.name}
            ({m.scores})
          {/if}
        </li>
      {/each}
    </ul>
  {/if}

  <p><a href="/admin/tournaments">← Back to tournaments</a></p>
{/if}
```

This is intentionally bare-bones. We'll prettify with the BracketView component in a later task.

- [ ] **Step 4: Smoke-test bracket generation**

Run `npm run dev`. Log in. Make sure 4+ players exist in /admin/players. Create a tournament. Add 4 players. Click "Generate bracket" — should reload showing 3 matches (2 round-1, 1 final). Stop server.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add admin tournament edit + bracket generation"
```

---

## Task 13: Match score save endpoint + auto-advance

**Files:**
- Create: `src/routes/api/admin/matches/[id]/+server.ts`

- [ ] **Step 1: Implement the endpoint**

Create `src/routes/api/admin/matches/[id]/+server.ts`:

```typescript
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getMatch, updateMatch, getTournament, getMatchAt, setTournamentStatus } from '$lib/db';
import { computeWinner, type Scores } from '$lib/scores';
import { nextMatchPosition } from '$lib/bracket';

export const POST: RequestHandler = async ({ params, request, locals, platform }) => {
  if (!locals.isAdmin) error(401);
  const db = platform!.env.DB;
  const match = await getMatch(db, params.id);
  if (!match) error(404);

  const body = await request.json() as { scores: Scores };
  const scores: Scores = body.scores ?? [];
  const winnerSlot = computeWinner(scores);
  const winner_id = winnerSlot === 1 ? match.player1_id : winnerSlot === 2 ? match.player2_id : null;

  await updateMatch(db, match.id, {
    scores: JSON.stringify(scores),
    winner_id,
    status: winner_id ? 'completed' : 'pending'
  });

  // Advance winner to the next round, if there is one
  if (winner_id) {
    const next = nextMatchPosition(match.round, match.position);
    const nextMatch = await getMatchAt(db, match.tournament_id, next.round, next.position);
    if (nextMatch) {
      await updateMatch(db, nextMatch.id, {
        [next.slot]: winner_id
      });
    } else {
      // No next match → this WAS the final → tournament complete
      const t = await getTournament(db, match.tournament_id);
      if (t) await setTournamentStatus(db, t.id, 'completed', winner_id);
    }
  }

  return json({ ok: true });
};
```

- [ ] **Step 2: Smoke-test via curl**

Run `npm run dev`. From the previous task there's a tournament with matches. Get a round-1 match ID from the admin page. From a separate terminal:

```bash
curl -X POST http://localhost:5173/api/admin/matches/<MATCH_ID> \
  -H "Content-Type: application/json" \
  --cookie "tt_admin=<copy from browser dev tools>" \
  --data '{"scores":[[6,3],[6,2]]}'
```

Expected: `{"ok":true}`. Refresh the admin tournament page — winner should be set; the next round-2 match should now have the winner as one of its players.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "Add match score save endpoint with auto-advance"
```

---

## Task 14: Stats computation module

**Files:**
- Create: `src/lib/stats.ts`
- Test: `tests/stats.test.ts`

This module reads matches from D1 and computes per-player aggregates. Tests use a minimal in-memory shim of `D1Database` instead of standing up a real DB.

- [ ] **Step 1: Write failing tests**

Create `tests/stats.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { computeStatsFromMatches, type StatMatch } from '../src/lib/stats';

const tournaments = [
  { id: 't1', champion_id: 'p1' },
  { id: 't2', champion_id: 'p2' }
];

const matches: StatMatch[] = [
  // t1: p1 beats p2 in final
  { tournament_id: 't1', player1_id: 'p1', player2_id: 'p2', winner_id: 'p1', scores: '[[6,3],[6,2]]', status: 'completed' },
  // t2: p2 beats p1 in semi, p2 beats p3 in final
  { tournament_id: 't2', player1_id: 'p1', player2_id: 'p2', winner_id: 'p2', scores: '[[3,6],[4,6]]', status: 'completed' },
  { tournament_id: 't2', player1_id: 'p2', player2_id: 'p3', winner_id: 'p2', scores: '[[6,4],[6,4]]', status: 'completed' }
];

describe('computeStatsFromMatches', () => {
  it('counts matches W-L', () => {
    const s = computeStatsFromMatches('p1', matches, tournaments);
    expect(s.wins).toBe(1);
    expect(s.losses).toBe(1);
    expect(s.winPct).toBeCloseTo(0.5);
  });

  it('counts titles', () => {
    expect(computeStatsFromMatches('p1', matches, tournaments).titles).toBe(1);
    expect(computeStatsFromMatches('p2', matches, tournaments).titles).toBe(1);
    expect(computeStatsFromMatches('p3', matches, tournaments).titles).toBe(0);
  });

  it('counts sets W-L', () => {
    // p1: in t1 won 6-3 and 6-2 → 2 sets won. In t2 lost 3-6 and 4-6 → 0 sets won, 2 sets lost
    const s = computeStatsFromMatches('p1', matches, tournaments);
    expect(s.setsWon).toBe(2);
    expect(s.setsLost).toBe(2);
  });

  it('counts games W-L', () => {
    // p1 games: t1 6+6=12 won, 3+2=5 lost; t2 3+4=7 won, 6+6=12 lost
    const s = computeStatsFromMatches('p1', matches, tournaments);
    expect(s.gamesWon).toBe(19);
    expect(s.gamesLost).toBe(17);
  });

  it('computes head-to-head', () => {
    const s = computeStatsFromMatches('p1', matches, tournaments);
    expect(s.headToHead.p2).toEqual({ wins: 1, losses: 1 });
  });

  it('counts current streak (last result onward)', () => {
    const s = computeStatsFromMatches('p2', matches, tournaments);
    // p2 last results in array order: won t1 final? NO — p2 LOST t1. Then in t2 won twice.
    // Streak depends on order; matches array is "completed in order" per test.
    // p2's matches in order: lost (t1), won (t2 vs p1), won (t2 vs p3) → current streak = 2
    expect(s.currentStreak).toBe(2);
    expect(s.longestStreak).toBe(2);
  });

  it('counts tournaments played', () => {
    expect(computeStatsFromMatches('p1', matches, tournaments).tournamentsPlayed).toBe(2);
    expect(computeStatsFromMatches('p3', matches, tournaments).tournamentsPlayed).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `npm test`
Expected: stats tests fail with module-not-found.

- [ ] **Step 3: Implement src/lib/stats.ts**

Create `src/lib/stats.ts`:

```typescript
import { parseScores } from './scores';
import type { Match, Tournament } from './db';

export type StatMatch = Pick<Match, 'tournament_id' | 'player1_id' | 'player2_id' | 'winner_id' | 'scores' | 'status'>;
export type StatTournament = Pick<Tournament, 'id' | 'champion_id'>;

export type PlayerStats = {
  tournamentsPlayed: number;
  titles: number;
  wins: number;
  losses: number;
  winPct: number;          // 0..1
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  currentStreak: number;
  longestStreak: number;
  headToHead: Record<string, { wins: number; losses: number }>;
};

export function computeStatsFromMatches(
  playerId: string,
  matches: StatMatch[],
  tournaments: StatTournament[]
): PlayerStats {
  const completed = matches.filter(m => m.status === 'completed');
  const playerMatches = completed.filter(
    m => m.player1_id === playerId || m.player2_id === playerId
  );

  let wins = 0, losses = 0;
  let setsWon = 0, setsLost = 0;
  let gamesWon = 0, gamesLost = 0;
  const headToHead: Record<string, { wins: number; losses: number }> = {};
  let currentStreak = 0;
  let longestStreak = 0;
  let runningStreak = 0;

  for (const m of playerMatches) {
    const opponent = m.player1_id === playerId ? m.player2_id : m.player1_id;
    const isP1 = m.player1_id === playerId;
    const won = m.winner_id === playerId;
    if (won) {
      wins++;
      runningStreak++;
      longestStreak = Math.max(longestStreak, runningStreak);
    } else {
      losses++;
      runningStreak = 0;
    }
    currentStreak = runningStreak;

    if (opponent) {
      headToHead[opponent] ??= { wins: 0, losses: 0 };
      if (won) headToHead[opponent].wins++;
      else headToHead[opponent].losses++;
    }

    const scores = parseScores(m.scores);
    for (const [a, b] of scores) {
      const myGames = isP1 ? a : b;
      const oppGames = isP1 ? b : a;
      gamesWon += myGames;
      gamesLost += oppGames;
      if (myGames > oppGames) setsWon++;
      else if (oppGames > myGames) setsLost++;
    }
  }

  const tournamentsPlayed = new Set(playerMatches.map(m => m.tournament_id)).size;
  const titles = tournaments.filter(t => t.champion_id === playerId).length;
  const totalMatches = wins + losses;
  const winPct = totalMatches === 0 ? 0 : wins / totalMatches;

  return {
    tournamentsPlayed, titles, wins, losses, winPct,
    setsWon, setsLost, gamesWon, gamesLost,
    currentStreak, longestStreak, headToHead
  };
}

// Convenience function that pulls the data from D1 first
export async function computePlayerStats(db: D1Database, playerId: string): Promise<PlayerStats> {
  const matches = (await db.prepare(
    'SELECT tournament_id, player1_id, player2_id, winner_id, scores, status FROM matches WHERE (player1_id = ? OR player2_id = ?) AND status = ?'
  ).bind(playerId, playerId, 'completed').all<StatMatch>()).results ?? [];
  const tournaments = (await db.prepare(
    'SELECT id, champion_id FROM tournaments'
  ).all<StatTournament>()).results ?? [];
  return computeStatsFromMatches(playerId, matches, tournaments);
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `npm test`
Expected: all stats tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add stats computation"
```

---

## Task 15: Tennis Classic global theme

**Files:**
- Modify: `src/app.css`, `src/routes/+layout.svelte`
- Create: `src/app.html` (modify if exists)

- [ ] **Step 1: Replace src/app.css with the Tennis Classic theme**

Open `src/app.css` (created by `sv create`). Replace its contents:

```css
:root {
  --paper: #fef9e7;
  --ink: #1a3d1a;
  --ink-soft: #2d5a2d;
  --gold: #7d6608;
  --muted: #6b6b5a;
  --line: #d4d0b8;
  --card: #ffffff;
  --error: #b91c1c;
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 16px;
  line-height: 1.5;
}

h1, h2, h3 {
  font-family: "Playfair Display", Georgia, "Times New Roman", serif;
  color: var(--ink);
  margin: 0 0 0.5em 0;
}

h1 { font-size: 2rem; font-weight: 700; }
h2 { font-size: 1.5rem; font-weight: 700; }
h3 { font-size: 1.2rem; font-weight: 600; }

a { color: var(--ink); text-decoration: underline; }
a:hover { color: var(--gold); }

.container {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 16px;
}

.site-header {
  border-bottom: 3px double var(--ink);
  padding: 16px 0;
  margin-bottom: 24px;
  text-align: center;
}

.site-header .brand {
  font-family: "Playfair Display", Georgia, serif;
  font-size: 1.5rem;
  font-style: italic;
  font-weight: 700;
  letter-spacing: 1px;
}

.site-header nav {
  margin-top: 8px;
  font-size: 0.9rem;
}

.site-header nav a {
  margin: 0 8px;
  text-decoration: none;
  color: var(--ink-soft);
  letter-spacing: 1px;
  text-transform: uppercase;
  font-size: 0.75rem;
}

.site-header nav a:hover { color: var(--gold); }

.label {
  font-size: 0.75rem;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--gold);
}

.card {
  background: var(--card);
  border: 1px solid var(--line);
  padding: 16px;
  margin-bottom: 12px;
}

.card.featured {
  border: 2px solid var(--ink);
  background: linear-gradient(180deg, var(--card) 0%, #fffbe6 100%);
}

button {
  font-family: inherit;
  font-size: 0.9rem;
  padding: 6px 14px;
  background: var(--ink);
  color: var(--paper);
  border: 1px solid var(--ink);
  cursor: pointer;
}

button:hover { background: var(--ink-soft); }
button:disabled { opacity: 0.5; cursor: not-allowed; }

input, select {
  font-family: inherit;
  font-size: 1rem;
  padding: 6px 8px;
  background: var(--card);
  border: 1px solid var(--line);
  color: var(--ink);
}

input:focus, select:focus {
  outline: 2px solid var(--gold);
  outline-offset: -1px;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: var(--card);
}

th, td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--line);
  text-align: left;
}

th {
  font-family: "Playfair Display", Georgia, serif;
  font-weight: 600;
  background: var(--paper);
}

.match {
  background: var(--card);
  border: 1px solid var(--line);
  padding: 10px 14px;
  margin-bottom: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.match.final-match {
  border: 2px solid var(--ink);
  background: #fffbe6;
}

.match .player {
  display: flex;
  justify-content: space-between;
  flex: 1;
  gap: 8px;
}

.match .player.winner { font-weight: 700; }
.match .player.loser { color: var(--muted); }

.match .scores {
  font-family: Georgia, serif;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
}

.bracket {
  display: flex;
  gap: 24px;
  overflow-x: auto;
  padding-bottom: 12px;
}

.bracket-round {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 12px;
  min-width: 180px;
}

.bracket-round-label {
  font-size: 0.7rem;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--gold);
  text-align: center;
  margin-bottom: 8px;
}

.error {
  color: var(--error);
}

@media (max-width: 600px) {
  h1 { font-size: 1.5rem; }
  .container { padding: 16px 12px; }
}
```

- [ ] **Step 2: Create src/routes/+layout.svelte**

```svelte
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
```

- [ ] **Step 3: Verify CSS loads**

Run `npm run dev`, visit http://localhost:5173 — page should now have cream background, serif heading, centered layout. Stop server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add Tennis Classic theme and global layout"
```

---

## Task 16: Public home page (tournaments grouped by status)

**Files:**
- Replace: `src/routes/+page.svelte`, `src/routes/+page.server.ts`

- [ ] **Step 1: Replace src/routes/+page.server.ts**

```typescript
import type { PageServerLoad } from './$types';
import { listTournaments } from '$lib/db';

export const load: PageServerLoad = async ({ platform }) => {
  const all = platform?.env.DB ? await listTournaments(platform.env.DB) : [];
  return {
    inProgress: all.filter(t => t.status === 'in_progress'),
    completed: all.filter(t => t.status === 'completed'),
    upcoming: all.filter(t => t.status === 'setup')
  };
};
```

- [ ] **Step 2: Replace src/routes/+page.svelte**

```svelte
<script lang="ts">
  let { data } = $props();
  const labels: Record<string, string> = {
    men_pro: 'Men · Pro',
    men_new: 'Men · New',
    women_pro: 'Women · Pro',
    women_new: 'Women · New'
  };
</script>

<h1>Tournaments</h1>

{#if data.inProgress.length}
  <h2>In Progress</h2>
  {#each data.inProgress as t (t.id)}
    <div class="card">
      <div class="label">{labels[t.category]}</div>
      <h3><a href="/tournaments/{t.id}">{t.name}</a></h3>
      <small>Best of {t.best_of}</small>
    </div>
  {/each}
{/if}

{#if data.completed.length}
  <h2>Completed</h2>
  {#each data.completed as t (t.id)}
    <div class="card">
      <div class="label">{labels[t.category]}</div>
      <h3><a href="/tournaments/{t.id}">{t.name}</a></h3>
    </div>
  {/each}
{/if}

{#if data.upcoming.length}
  <h2>Upcoming</h2>
  {#each data.upcoming as t (t.id)}
    <div class="card">
      <div class="label">{labels[t.category]}</div>
      <h3>{t.name}</h3>
      <small>Bracket not yet generated</small>
    </div>
  {/each}
{/if}

{#if !data.inProgress.length && !data.completed.length && !data.upcoming.length}
  <p>No tournaments yet. <a href="/admin">Sign in as admin</a> to create one.</p>
{/if}
```

- [ ] **Step 3: Smoke-test**

Run `npm run dev`. Visit http://localhost:5173. Should see your existing tournament(s) categorized. Stop server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add public home page"
```

---

## Task 17: BracketView and MatchCard components

**Files:**
- Create: `src/lib/components/BracketView.svelte`, `src/lib/components/MatchCard.svelte`

- [ ] **Step 1: Create src/lib/components/MatchCard.svelte**

```svelte
<script lang="ts">
  import { formatScores, parseScores } from '$lib/scores';
  import type { Match } from '$lib/db';

  type Props = {
    match: Match;
    playersById: Record<string, { id: string; name: string }>;
    isFinal?: boolean;
    onClick?: () => void;
  };

  let { match, playersById, isFinal = false, onClick }: Props = $props();

  const p1 = $derived(match.player1_id ? playersById[match.player1_id]?.name ?? '?' : '—');
  const p2 = $derived(match.player2_id ? playersById[match.player2_id]?.name ?? '?' : '—');
  const formatted = $derived(formatScores(parseScores(match.scores)));
  const winnerSlot = $derived(
    match.winner_id === match.player1_id ? 1 :
    match.winner_id === match.player2_id ? 2 : null
  );
</script>

<div
  class="match"
  class:final-match={isFinal}
  role={onClick ? 'button' : undefined}
  tabindex={onClick ? 0 : undefined}
  onclick={onClick}
  onkeydown={onClick ? (e) => { if (e.key === 'Enter') onClick(); } : undefined}
  style={onClick ? 'cursor:pointer' : ''}
>
  <div style="flex:1">
    <div class="player" class:winner={winnerSlot === 1} class:loser={winnerSlot === 2}>
      <span>{p1}{winnerSlot === 1 && isFinal ? ' 🏆' : ''}</span>
      <span class="scores">{formatted.split(', ').map(s => s.split('-')[0]).join(' ')}</span>
    </div>
    <div class="player" class:winner={winnerSlot === 2} class:loser={winnerSlot === 1}>
      <span>{p2}{winnerSlot === 2 && isFinal ? ' 🏆' : ''}</span>
      <span class="scores">{formatted.split(', ').map(s => s.split('-')[1]).join(' ')}</span>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Create src/lib/components/BracketView.svelte**

```svelte
<script lang="ts">
  import MatchCard from './MatchCard.svelte';
  import type { Match } from '$lib/db';

  type Props = {
    matches: Match[];
    playersById: Record<string, { id: string; name: string }>;
    onMatchClick?: (m: Match) => void;
  };

  let { matches, playersById, onMatchClick }: Props = $props();

  const rounds = $derived(
    [...new Set(matches.map(m => m.round))].sort((a, b) => a - b)
  );
  const maxRound = $derived(Math.max(...rounds));
  const labelFor = (r: number, max: number) => {
    const fromEnd = max - r;
    if (fromEnd === 0) return 'Final';
    if (fromEnd === 1) return 'Semifinals';
    if (fromEnd === 2) return 'Quarterfinals';
    return `Round ${r}`;
  };
</script>

<div class="bracket">
  {#each rounds as r (r)}
    <div class="bracket-round">
      <div class="bracket-round-label">{labelFor(r, maxRound)}</div>
      {#each matches.filter(m => m.round === r).sort((a, b) => a.position - b.position) as m (m.id)}
        <MatchCard
          match={m}
          {playersById}
          isFinal={r === maxRound}
          onClick={onMatchClick ? () => onMatchClick(m) : undefined}
        />
      {/each}
    </div>
  {/each}
</div>
```

- [ ] **Step 3: Commit (no smoke test yet — used in next task)**

```bash
git add -A
git commit -m "Add BracketView and MatchCard components"
```

---

## Task 18: Public tournament page

**Files:**
- Create: `src/routes/tournaments/[id]/+page.svelte`, `src/routes/tournaments/[id]/+page.server.ts`

- [ ] **Step 1: Create src/routes/tournaments/[id]/+page.server.ts**

```typescript
import type { PageServerLoad } from './$types';
import { getTournament, listMatches, listTournamentPlayers, getPlayer } from '$lib/db';

export const load: PageServerLoad = async ({ params, platform }) => {
  const db = platform!.env.DB;
  const tournament = await getTournament(db, params.id);
  if (!tournament) return { tournament: null, matches: [], playersById: {}, champion: null };
  const [matches, players] = await Promise.all([
    listMatches(db, params.id),
    listTournamentPlayers(db, params.id)
  ]);
  const playersById: Record<string, { id: string; name: string }> = {};
  for (const p of players) playersById[p.player_id] = { id: p.player_id, name: p.name };

  const champion = tournament.champion_id ? await getPlayer(db, tournament.champion_id) : null;
  return { tournament, matches, playersById, champion };
};
```

- [ ] **Step 2: Create src/routes/tournaments/[id]/+page.svelte**

```svelte
<script lang="ts">
  import BracketView from '$lib/components/BracketView.svelte';
  let { data } = $props();
  const labels: Record<string, string> = {
    men_pro: 'Men · Pro', men_new: 'Men · New',
    women_pro: 'Women · Pro', women_new: 'Women · New'
  };
</script>

{#if !data.tournament}
  <p>Tournament not found.</p>
{:else}
  <div class="label">{labels[data.tournament.category]}</div>
  <h1 style="font-style:italic">{data.tournament.name}</h1>
  <p>Best of {data.tournament.best_of} sets</p>

  {#if data.champion}
    <div class="card featured">
      <div class="label">Champion 🏆</div>
      <h2 style="margin:0"><a href="/players/{data.champion.id}">{data.champion.name}</a></h2>
    </div>
  {/if}

  {#if data.matches.length}
    <BracketView matches={data.matches} playersById={data.playersById} />
  {:else}
    <p>Bracket not generated yet.</p>
  {/if}
{/if}
```

- [ ] **Step 3: Smoke-test**

Run `npm run dev`. Visit a tournament page — should see the full bracket in the Tennis Classic style. Stop server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add public tournament page with bracket view"
```

---

## Task 19: Players leaderboard

**Files:**
- Create: `src/routes/players/+page.svelte`, `src/routes/players/+page.server.ts`

- [ ] **Step 1: Create src/routes/players/+page.server.ts**

```typescript
import type { PageServerLoad } from './$types';
import { listPlayers } from '$lib/db';
import { computePlayerStats, type PlayerStats } from '$lib/stats';

export const load: PageServerLoad = async ({ platform }) => {
  const db = platform?.env.DB;
  if (!db) return { rows: [] };
  const players = await listPlayers(db);
  const rows: { id: string; name: string; stats: PlayerStats }[] = [];
  for (const p of players) {
    rows.push({ id: p.id, name: p.name, stats: await computePlayerStats(db, p.id) });
  }
  rows.sort((a, b) => {
    if (b.stats.titles !== a.stats.titles) return b.stats.titles - a.stats.titles;
    return b.stats.winPct - a.stats.winPct;
  });
  return { rows };
};
```

- [ ] **Step 2: Create src/routes/players/+page.svelte**

```svelte
<script lang="ts">
  let { data } = $props();
  const pct = (n: number) => `${Math.round(n * 100)}%`;
</script>

<h1>Leaderboard</h1>

{#if data.rows.length === 0}
  <p>No players yet.</p>
{:else}
  <table>
    <thead>
      <tr>
        <th>Player</th>
        <th>Titles</th>
        <th>W-L</th>
        <th>Win%</th>
        <th>Sets</th>
        <th>Streak</th>
      </tr>
    </thead>
    <tbody>
      {#each data.rows as r (r.id)}
        <tr>
          <td><a href="/players/{r.id}">{r.name}</a></td>
          <td>{r.stats.titles}</td>
          <td>{r.stats.wins}-{r.stats.losses}</td>
          <td>{pct(r.stats.winPct)}</td>
          <td>{r.stats.setsWon}-{r.stats.setsLost}</td>
          <td>{r.stats.currentStreak}</td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}
```

- [ ] **Step 3: Smoke-test**

Visit /players — should list players with their stats. Stop server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add players leaderboard"
```

---

## Task 20: Player profile page

**Files:**
- Create: `src/routes/players/[id]/+page.svelte`, `src/routes/players/[id]/+page.server.ts`

- [ ] **Step 1: Create src/routes/players/[id]/+page.server.ts**

```typescript
import type { PageServerLoad } from './$types';
import { getPlayer, listPlayers } from '$lib/db';
import { computePlayerStats } from '$lib/stats';

export const load: PageServerLoad = async ({ params, platform }) => {
  const db = platform!.env.DB;
  const player = await getPlayer(db, params.id);
  if (!player) return { player: null, stats: null, matches: [], opponents: {} };

  const stats = await computePlayerStats(db, params.id);

  // Match history (with opponent name + tournament name)
  const matches = (await db.prepare(`
    SELECT m.*, t.name as tournament_name
    FROM matches m
    JOIN tournaments t ON t.id = m.tournament_id
    WHERE (m.player1_id = ? OR m.player2_id = ?) AND m.status = 'completed'
    ORDER BY t.created_at DESC, m.round DESC
  `).bind(params.id, params.id).all<any>()).results ?? [];

  // Opponent name lookup
  const allPlayers = await listPlayers(db);
  const opponents: Record<string, string> = {};
  for (const p of allPlayers) opponents[p.id] = p.name;

  return { player, stats, matches, opponents };
};
```

- [ ] **Step 2: Create src/routes/players/[id]/+page.svelte**

```svelte
<script lang="ts">
  import { formatScores, parseScores } from '$lib/scores';
  let { data } = $props();
  const pct = (n: number) => `${Math.round(n * 100)}%`;
</script>

{#if !data.player || !data.stats}
  <p>Player not found.</p>
{:else}
  <h1 style="font-style:italic">{data.player.name}</h1>

  <div class="card">
    <h3>Career</h3>
    <ul>
      <li>Titles: {data.stats.titles}</li>
      <li>Tournaments played: {data.stats.tournamentsPlayed}</li>
      <li>Match record: {data.stats.wins}-{data.stats.losses} ({pct(data.stats.winPct)})</li>
      <li>Sets won/lost: {data.stats.setsWon}-{data.stats.setsLost}</li>
      <li>Games won/lost: {data.stats.gamesWon}-{data.stats.gamesLost}</li>
      <li>Current streak: {data.stats.currentStreak} · Longest: {data.stats.longestStreak}</li>
    </ul>
  </div>

  <h2>Head-to-head</h2>
  {#if Object.keys(data.stats.headToHead).length === 0}
    <p>No matches played yet.</p>
  {:else}
    <table>
      <thead><tr><th>Opponent</th><th>W-L</th></tr></thead>
      <tbody>
        {#each Object.entries(data.stats.headToHead) as [oppId, h] (oppId)}
          <tr>
            <td><a href="/players/{oppId}">{data.opponents[oppId] ?? '?'}</a></td>
            <td>{h.wins}-{h.losses}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}

  <h2>Match history</h2>
  <ul>
    {#each data.matches as m (m.id)}
      {@const isP1 = m.player1_id === data.player.id}
      {@const oppId = isP1 ? m.player2_id : m.player1_id}
      {@const won = m.winner_id === data.player.id}
      <li>
        <strong>{won ? 'W' : 'L'}</strong>
        vs <a href="/players/{oppId}">{data.opponents[oppId] ?? '?'}</a>
        — {formatScores(parseScores(m.scores))}
        <small>({m.tournament_name})</small>
      </li>
    {/each}
  </ul>
{/if}
```

- [ ] **Step 3: Smoke-test**

Click a player from the leaderboard — see their profile with full stats and history. Stop server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add player profile page"
```

---

## Task 21: Admin match-edit modal

**Files:**
- Create: `src/lib/components/MatchEditModal.svelte`
- Modify: `src/routes/admin/tournaments/[id]/+page.svelte`

This makes admin match editing nice — replaces the bare match list with a real bracket the admin can click.

- [ ] **Step 1: Create src/lib/components/MatchEditModal.svelte**

```svelte
<script lang="ts">
  import type { Match } from '$lib/db';
  import { parseScores } from '$lib/scores';

  type Props = {
    match: Match;
    bestOf: number;
    p1Name: string;
    p2Name: string;
    onClose: () => void;
    onSaved: () => void;
  };
  let { match, bestOf, p1Name, p2Name, onClose, onSaved }: Props = $props();

  const initial = parseScores(match.scores);
  let sets = $state(
    Array.from({ length: bestOf }, (_, i) => initial[i] ?? [0, 0])
  );
  let saving = $state(false);
  let error = $state<string | null>(null);

  async function save() {
    saving = true;
    error = null;
    // Trim trailing all-zero sets
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
    onSaved();
  }
</script>

<div class="modal-backdrop" onclick={onClose} role="dialog" tabindex="-1" aria-label="Edit match"></div>
<div class="modal">
  <h2>Match</h2>
  <table>
    <tr><td>{p1Name}</td>
      {#each sets as set, i}
        <td><input type="number" min="0" max="20" bind:value={sets[i][0]} style="width:50px" /></td>
      {/each}
    </tr>
    <tr><td>{p2Name}</td>
      {#each sets as set, i}
        <td><input type="number" min="0" max="20" bind:value={sets[i][1]} style="width:50px" /></td>
      {/each}
    </tr>
  </table>
  <p><small>Leave a set as 0-0 to mean "not played".</small></p>
  {#if error}<p class="error">{error}</p>{/if}
  <button onclick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
  <button onclick={onClose} style="background:transparent;color:var(--ink);border-color:var(--line)">Cancel</button>
</div>

<style>
  .modal-backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 10;
  }
  .modal {
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    background: var(--paper); border: 2px solid var(--ink); padding: 24px;
    z-index: 11; min-width: 320px;
  }
</style>
```

- [ ] **Step 2: Modify src/routes/admin/tournaments/[id]/+page.svelte to use BracketView + the modal**

Replace the contents of `src/routes/admin/tournaments/[id]/+page.svelte`:

```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  import BracketView from '$lib/components/BracketView.svelte';
  import MatchEditModal from '$lib/components/MatchEditModal.svelte';
  import type { Match } from '$lib/db';

  let { data } = $props();
  let editing = $state<Match | null>(null);

  let generating = $state(false);
  async function generate() {
    generating = true;
    const r = await fetch(`/api/admin/tournaments/${data.tournament!.id}/generate-bracket`, { method: 'POST' });
    if (!r.ok) {
      const t = await r.text();
      alert(`Failed: ${t}`);
    } else {
      location.reload();
    }
    generating = false;
  }

  const playersById = $derived(
    Object.fromEntries(data.tournamentPlayers.map(p => [p.player_id, { id: p.player_id, name: p.name }]))
  );

  function pName(id: string | null) {
    if (!id) return '—';
    return playersById[id]?.name ?? '?';
  }
</script>

{#if !data.tournament}
  <p>Tournament not found.</p>
{:else}
  <h1 style="font-style:italic">{data.tournament.name}</h1>
  <p>Status: {data.tournament.status} · Best of {data.tournament.best_of}</p>

  {#if data.tournament.status === 'setup'}
    <h2>Players ({data.tournamentPlayers.length})</h2>
    <ul>
      {#each data.tournamentPlayers as p (p.player_id)}
        <li>
          {p.name}
          <form method="POST" action="?/removePlayer" use:enhance style="display:inline">
            <input type="hidden" name="player_id" value={p.player_id} />
            <button type="submit">Remove</button>
          </form>
        </li>
      {/each}
    </ul>

    <h3>Add player</h3>
    <form method="POST" action="?/addPlayer" use:enhance>
      <select name="player_id" required>
        <option value="">Select…</option>
        {#each data.allPlayers.filter(p => !data.tournamentPlayers.some(tp => tp.player_id === p.id)) as p (p.id)}
          <option value={p.id}>{p.name}</option>
        {/each}
      </select>
      <button type="submit">Add</button>
    </form>

    <p style="margin-top:24px">
      <button onclick={generate} disabled={generating || data.tournamentPlayers.length < 2}>
        {generating ? 'Generating…' : '🎲 Generate bracket'}
      </button>
    </p>
  {:else}
    <p><small>Click any match to enter scores.</small></p>
    <BracketView
      matches={data.matches}
      {playersById}
      onMatchClick={(m) => { editing = m; }}
    />
  {/if}

  {#if editing}
    <MatchEditModal
      match={editing}
      bestOf={data.tournament.best_of}
      p1Name={pName(editing.player1_id)}
      p2Name={pName(editing.player2_id)}
      onClose={() => { editing = null; }}
      onSaved={() => { editing = null; location.reload(); }}
    />
  {/if}

  <p><a href="/admin/tournaments">← Back</a></p>
{/if}
```

- [ ] **Step 3: End-to-end smoke test**

Run `npm run dev`. Log in as admin. Open a tournament with a generated bracket. Click a match. Modal opens. Enter `6 / 3` then `6 / 2`. Click Save. Modal closes, page reloads, winner shown, next match populated. Verify champion appears on the public tournament page after the final.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Wire match-edit modal into admin tournament page"
```

---

## Task 22: End-to-end manual QA + cleanup

**Files:** none modified — verification only.

- [ ] **Step 1: Reset local DB and walk through the full flow**

```bash
npx wrangler d1 execute tennis-tournament-db --local --command="DELETE FROM matches; DELETE FROM tournament_players; DELETE FROM tournaments; DELETE FROM players;"
```

- [ ] **Step 2: Walk the happy path**

Run `npm run dev`. As admin:
1. Create 6 players: Anna, Beth, Cara, Dana, Eva, Fay.
2. Create tournament "Spring Open 2026", Women Pro, best of 3.
3. Add all 6 players. Click Generate bracket.
4. Confirm: 2 round-1 matches, 2 semis (each with one bye player + one TBD), 1 final.
5. Enter scores for both round-1 matches. Verify winners advance into semis.
6. Enter scores for both semis. Final populates.
7. Enter scores for final. Tournament status → completed, champion set.

As public visitor (logout or different browser):
- Visit `/` → tournament shows under Completed
- Visit `/tournaments/<id>` → see champion banner + bracket
- Visit `/players` → leaderboard with stats
- Visit a player's page → see W-L, head-to-head, match history

- [ ] **Step 3: Test edge cases**

- 4 players (no byes)
- 8 players (no byes, 3 rounds)
- 5 players (3 byes, weird shape — verify bracket renders without errors)
- Best-of-1 tournament (single set per match)
- Best-of-5 tournament (5 set inputs)

- [ ] **Step 4: Note any issues for follow-up but DO NOT fix in this task**

This task is verification, not fixes. If something is broken, file a follow-up task; do not modify code in this task.

- [ ] **Step 5: Commit a no-op marker if nothing was modified**

If you didn't change any files, skip this step.

---

## Task 23: Production deployment

**Files:**
- Modify: `wrangler.toml` (production binding)
- Document only (no code) for Cloudflare dashboard steps

- [ ] **Step 1: Push the repo to GitHub**

User must create a GitHub repo first. Then:

```bash
git remote add origin git@github.com:<user>/tennis-tournament.git
git push -u origin main
```

- [ ] **Step 2: Create the production D1 database**

```bash
npx wrangler d1 create tennis-tournament-db-prod
```

Copy the new `database_id`.

- [ ] **Step 3: Apply the migration to production D1**

```bash
npx wrangler d1 execute tennis-tournament-db-prod --remote --file=migrations/0001_initial.sql
```

Confirm "Y" when prompted.

- [ ] **Step 4: Connect Cloudflare Pages**

In the Cloudflare dashboard:
1. Workers & Pages → Create → Pages → Connect to Git → select the GitHub repo.
2. Framework preset: SvelteKit.
3. Build command: `npm run build`.
4. Output dir: `.svelte-kit/cloudflare`.
5. Environment variables: add `ADMIN_PASSWORD` (a strong password) and `AUTH_SECRET` (32+ random chars).
6. Bindings → D1 database → name `DB` → select `tennis-tournament-db-prod`.

Trigger a deploy.

- [ ] **Step 5: Add the custom domain**

In Pages project → Custom domains → Add `tennis.paraskevakis.com`. Cloudflare auto-creates the DNS record (since the domain is on Cloudflare).

- [ ] **Step 6: Smoke-test production**

Visit `https://tennis.paraskevakis.com`. Log into `/admin` with the production password. Create a player. Confirm it persists across page reloads.

- [ ] **Step 7: Commit any remaining changes**

```bash
git add -A
git commit -m "Production deployment notes" --allow-empty
git push
```

---

## Self-Review Checklist (notes for plan author, ignore at execution time)

- [x] Spec coverage: every spec section maps to a task — data model (T5), bracket (T4), score parsing (T3), stats (T14), public pages (T16-20), admin pages (T9-13, T21), auth (T8-9), deployment (T23), Tennis Classic theme (T15)
- [x] No placeholders in any task
- [x] Type names consistent: `Match`, `Player`, `Tournament`, `Scores` defined once and used throughout
- [x] All file paths absolute relative to project root
- [x] Function signatures consistent across tasks (e.g., `nextMatchPosition(round, position)` returns `{round, position, slot}` — used same way in T4 and T13)
