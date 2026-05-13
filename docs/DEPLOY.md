# Deploying to Cloudflare

End-to-end deploy of `filathlitikos-tennis` to Cloudflare Pages + D1 at
`tennis.paraskevakis.com`. Free tier is enough for a club-sized hobby app.

## Prerequisites

- Cloudflare account (you already have one — `tasos@amhealth.eu`)
- `wrangler` CLI authenticated — verify with `npx wrangler whoami`
- The domain `paraskevakis.com` already on Cloudflare DNS (so the subdomain CNAME is automatic)

---

## 1. Create the production D1 database

```bash
cd "/Users/admin/Documents/tennis tournament"
npx wrangler d1 create tennis-tournament-db-prod
```

Wrangler prints the new database — copy the `database_id`.

## 2. Wire it into wrangler.toml

Open `wrangler.toml` and replace the placeholder ID **and** add a separate
local-dev binding so dev keeps working:

```toml
name = "filathlitikos-tennis"
compatibility_date = "2024-09-23"
pages_build_output_dir = ".svelte-kit/cloudflare"

[[d1_databases]]
binding = "DB"
database_name = "tennis-tournament-db-prod"
database_id = "<paste the new id here>"
preview_database_id = "<paste the new id here>"
```

> The local `.wrangler/state/v3/d1/` SQLite is keyed by `binding`, not `database_name`,
> so local dev still finds the same data after the rename.

## 3. Apply the schema to the remote DB

```bash
npx wrangler d1 execute tennis-tournament-db-prod --remote --file=migrations/0001_initial.sql
```

Confirm "y" if prompted. Verify:

```bash
npx wrangler d1 execute tennis-tournament-db-prod --remote \
  --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

You should see `matches`, `players`, `tournament_players`, `tournaments`.

## 4. (Optional) Seed sample data on remote

If you want the production site to launch with the 16 Greek players + 5 tournaments
already loaded:

```bash
npx wrangler d1 execute tennis-tournament-db-prod --remote --file=seeds/sample-data.sql
```

(Skip if you'd rather start with an empty DB and add real players via the admin UI.)

## 5. Create the Pages project

```bash
npx wrangler pages project create filathlitikos-tennis \
  --production-branch=main \
  --compatibility-date=2024-09-23
```

## 6. Set the admin secrets

Pick a strong password and a 32+ char random string for the auth secret.

```bash
# Generate a strong AUTH_SECRET (base64 of 32 random bytes)
openssl rand -base64 32

# Set them on the Pages project (interactive — wrangler prompts for the value)
npx wrangler pages secret put ADMIN_PASSWORD --project-name=filathlitikos-tennis
npx wrangler pages secret put AUTH_SECRET    --project-name=filathlitikos-tennis
```

## 7. Build and deploy

```bash
npm run build
npx wrangler pages deploy .svelte-kit/cloudflare --project-name=filathlitikos-tennis
```

Wrangler returns a `*.pages.dev` URL. Visit it — the site loads, but the
admin page returns errors because the D1 binding isn't attached yet.

## 8. Bind D1 to the Pages project

Two options — pick one:

**Option A — dashboard (one click):**

1. dash.cloudflare.com → Workers & Pages → `filathlitikos-tennis` → Settings → Functions → D1 database bindings
2. Add binding: variable `DB`, database `tennis-tournament-db-prod`, environment `Production` (and `Preview` if you want preview deploys to share the DB)
3. Save → next deploy picks it up

**Option B — CLI (no dashboard):**

The Pages project file lives at the dashboard, so the easiest CLI path is to
re-deploy with the binding declared in a `wrangler.toml` at the project root
(it's already there). Some Pages-internal binding state is set on the first
dashboard add — afterwards, `wrangler pages deploy` honors `wrangler.toml`.

After binding, redeploy:

```bash
npm run build
npx wrangler pages deploy .svelte-kit/cloudflare --project-name=filathlitikos-tennis
```

## 9. Connect the custom domain

dash.cloudflare.com → `filathlitikos-tennis` → Custom domains → **Set up a custom domain**
→ enter `tennis.paraskevakis.com` → Continue.

Cloudflare auto-creates the CNAME record because `paraskevakis.com` is
already on its DNS. SSL provisioning takes ~1 minute.

Visit `https://tennis.paraskevakis.com`.

## 10. (Optional) Auto-deploy on push to main

Right now you deploy manually with `wrangler pages deploy`. To get
"push to GitHub → automatic deploy":

1. Pages project → Settings → Builds & deployments → **Connect to Git**
2. Pick `TasosParaskevakis/filathlitikos-tennis`
3. Production branch: `main`
4. Build command: `npm run build`
5. Build output: `.svelte-kit/cloudflare`
6. Save

After this, every `git push origin main` triggers a build and deploy.

---

## Cost

Within Cloudflare's free tier for a club-sized app:

- **Pages**: 500 builds/month, unlimited bandwidth
- **D1**: 5 GB storage, 5M reads/day, 100k writes/day
- **Custom domain + SSL**: free

You will not hit any of those limits with a tennis club's traffic.

## Common issues

- **`wrangler d1 execute … --remote` hangs**: re-auth with `npx wrangler login`.
- **Pages deploy succeeds but `/admin` errors with `ADMIN_PASSWORD not configured`**: secret didn't propagate; redeploy after running `wrangler pages secret put`.
- **`/admin` works locally but 500s in prod**: D1 binding missing; do step 8.
- **Custom domain stays "verifying"**: confirm the CNAME exists in Cloudflare DNS for the subdomain.
