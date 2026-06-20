# Deploy

The site is a static build served by **Cloudflare Pages**, wired to the GitHub
repo via its **git integration**. There is no deploy step, no `wrangler`, and no
secret in this repository: pushing to `master` is the deploy.

`dist/` is generated on every build and is **never committed** (it is gitignored);
Cloudflare builds it fresh.

## How a deploy happens

1. You push to `master`.
2. Cloudflare Pages detects the new commit, runs the **build command**, and
   publishes the output directory to the edge (and to the custom domains).
3. Independently, `.github/workflows/ci.yml` runs the integrity check and the
   build so breakage is caught even if Cloudflare's build would have surfaced it
   later. CI does **not** deploy.

## Cloudflare Pages settings (configured in the dashboard, not in the repo)

| Setting            | Value                                                       |
| ------------------ | ----------------------------------------------------------- |
| Production branch  | `master`                                                    |
| Build command      | `pip install -r requirements.txt && python3 scripts/build.py` |
| Build output dir   | `dist`                                                      |
| Custom domains     | `schemas.work`, `www.schemas.work`                          |

- The build command must run the Python build — `dist/` is not in git, so a
  "no build / direct upload" configuration would deploy an empty site.
- SPA fallback (serving `index.html` for unknown paths) is handled by
  `src/_redirects`, which the build copies into `dist/`.
- To gate the deploy on content integrity, prefix the build command with
  `python3 scripts/check.py &&`.

## Cache invalidation on deploy

No manual cache busting is required. Each build stamps the service worker with a
content-derived build id, which rotates the `greek-app-*` cache name; the worker's
`activate` handler purges stale caches. See
[service-worker.md](./service-worker.md) for the full caching model.

## Verifying a deploy

After a push to `master`:

1. Confirm the **CI** workflow run in the GitHub Actions tab is green.
2. Confirm the Cloudflare Pages deployment succeeded (Cloudflare dashboard →
   Workers & Pages → this project → Deployments).
3. Load the site, confirm the curriculum renders and a lesson opens.
4. In DevTools → Application, confirm a service worker is active and a fresh
   `greek-app-<build-id>` cache exists.

## Local preview

There is no local deploy path (and no Node dependency). To preview the built site
locally before pushing:

```bash
npm run build   # or: pip install -r requirements.txt && python3 scripts/build.py
npm run serve   # or: python3 scripts/serve.py   ->  http://localhost:8002
```
