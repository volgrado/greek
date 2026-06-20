# Deploy & secrets runbook

The site is a static build served by Cloudflare. `dist/` is generated on every
deploy and is **never committed** (it is gitignored). Cloudflare serves the
`./dist` directory as configured in `wrangler.jsonc`.

## Cloudflare configuration (`wrangler.jsonc`)

```jsonc
{
  "name": "greek",
  "compatibility_date": "...",
  "assets": { "directory": "./dist" },
  "routes": [
    { "pattern": "schemas.work",     "custom_domain": true },
    { "pattern": "www.schemas.work", "custom_domain": true }
  ]
}
```

- `assets.directory` points Cloudflare at the built `./dist` output.
- The custom-domain routes bind the deployment to `schemas.work` and
  `www.schemas.work`.
- SPA fallback (serving `index.html` for unknown paths) is handled by
  `src/_redirects`, which the build copies into `dist/`.

## CI deploy (default path)

Pushing to `master` triggers `.github/workflows/deploy.yml`. The workflow:

1. Checks out the repo.
2. Sets up Python 3.x.
3. Builds: `pip install -r requirements.txt` then `python scripts/build.py`.
4. Deploys with `cloudflare/wrangler-action@v3`, which runs `wrangler deploy`
   using the two repository secrets below.

It can also be run on demand from the Actions tab via `workflow_dispatch`.

```yaml
- name: Deploy to Cloudflare
  uses: cloudflare/wrangler-action@v3
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

## Required secrets

The deploy needs exactly two GitHub Actions repository secrets:

| Secret                  | What it is                                          |
| ----------------------- | --------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | A scoped Cloudflare API token authorising the deploy. |
| `CLOUDFLARE_ACCOUNT_ID` | The Cloudflare account id that owns the project.    |

Set them under **GitHub repo → Settings → Secrets and variables → Actions → New
repository secret**. They are referenced only via `${{ secrets.* }}` in the
workflow and never printed in logs. Do not commit either value to the repo or to
`wrangler.jsonc`.

### Creating the API token

In the Cloudflare dashboard → **My Profile → API Tokens → Create Token**, grant a
token with permission to deploy this Workers/Pages project (the standard
"Edit Cloudflare Workers" template is sufficient for `wrangler deploy`). Copy the
token once and store it as `CLOUDFLARE_API_TOKEN`.

### Finding the account id

The account id is shown in the Cloudflare dashboard URL and on the account's
overview page (Workers & Pages → account details). Store it as
`CLOUDFLARE_ACCOUNT_ID`.

### Rotation

To rotate the token, create a new one in Cloudflare, update the
`CLOUDFLARE_API_TOKEN` secret in GitHub, then revoke the old token. No code change
is needed.

## Manual deploy

For a local one-off deploy you need the Wrangler CLI (a dev dependency) and to be
authenticated to Cloudflare:

```bash
npm run build          # build dist/
npx wrangler deploy    # deploy ./dist to Cloudflare
```

`wrangler` reads credentials from your local Cloudflare login (`wrangler login`)
or from `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` environment variables if
set. Prefer the CI path for routine deploys; use the manual path only for testing.

## Cache invalidation on deploy

No manual cache busting is required. Each build stamps the service worker with a
content-derived build id, which rotates the `greek-app-*` cache name; the worker's
`activate` handler purges stale caches. See
[service-worker.md](./service-worker.md) for the full caching model.

## Verifying a deploy

After a push to `master`:

1. Check the **Build & Deploy** workflow run in the GitHub Actions tab is green.
2. Load the site and confirm the curriculum renders and a lesson opens.
3. In DevTools → Application, confirm a service worker is active and a fresh
   `greek-app-<build-id>` cache exists (the id should match the latest build).
