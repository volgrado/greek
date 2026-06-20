# Architecture overview

A zero-dependency, offline-first, static Progressive Web App for learning Modern
Greek. Lessons are authored in Markdown, compiled to HTML by a Python build step,
and served as a vanilla-JS single-page app. Deployed on Cloudflare.

There is no runtime framework, no bundler, and no client-side package manager. The
browser loads hand-written ES modules and one bundled stylesheet. The only
build-time dependency is the `markdown` package (see `requirements.txt`).

## Repository layout

```
data/el/                 Course content (the `el` = Greek language pack)
  curriculum.json          Lesson ordering + metadata; drives nav and search
  lessons/
    grammar/*.md           Grammar units
    vocabulary/*.md        Vocabulary / lexis lists
    practice/*.md          Practice drills
src/                     App source (copied/compiled into dist/)
  index.html              SPA shell; build injects a pre-rendered curriculum
  manifest.json           PWA manifest
  sw.js                   Service worker (cache strategies, offline)
  style.css               CSS entry point: ordered @import list only
  css/*.css               Modular stylesheets, one concern each
  js/*.js                 ES modules (router, state, i18n, data, pwa, theme)
  _redirects              Cloudflare SPA fallback rules
assets/                  Icons and lesson illustrations (copied verbatim)
scripts/
  build.py                Markdown -> HTML, CSS bundle, shell pre-render, SW stamp
  serve.py                Local dev server on http://localhost:8002
dist/                    Build output. Generated, gitignored, never committed.
```

## Build pipeline (`scripts/build.py`)

`python scripts/build.py` produces `dist/` from scratch. Each run:

1. **Clean.** Removes any existing `dist/` and recreates it.
2. **Copy static files.** `index.html`, `sw.js`, `manifest.json`, `_redirects`
   from `src/`, the whole `src/js/` tree, and `assets/`.
3. **Bundle CSS.** Reads the ordered `@import` list in `src/style.css`,
   concatenates the named files from `src/css/` in that exact order, and writes a
   single `dist/styles.css`. This avoids a runtime `@import` waterfall. To add a
   stylesheet, drop it in `src/css/` and add one `@import` line to `src/style.css`
   in the position you want in the cascade.
4. **Compile content.** For every language directory under `data/`, reads
   `curriculum.json`, recursively globs `lessons/**/*.md`, compiles each Markdown
   file to HTML (see [authoring.md](./authoring.md) for the conventions), and
   writes it to `dist/public/data/<lang>/lessons/<id>.html`. The lesson `id` is
   the filename stem, so subfolders (`grammar/`, `vocabulary/`, `practice/`) do
   not affect output paths.
5. **Build the search index.** While compiling, it strips HTML to plain text and
   builds a document store plus an inverted word index (Greek + Latin tokens).
   These are embedded into `dist/public/data/<lang>/curriculum.json` alongside the
   structure, so search works fully offline with no extra requests.
6. **Pre-render the shell.** Reconstructs the curriculum HTML exactly as
   `router.js` would render the home view and injects it into the `<main id="app">`
   of `dist/index.html`. This gives a zero-JS first paint (no white-screen flash).
7. **Stamp the service worker.** Computes a SHA-1 over the source inputs (`data/`
   and `src/` except `sw.js`), takes the first 12 hex chars as the build id, and
   replaces the `__BUILD_ID__` placeholder in `dist/sw.js`. Because the hash is
   over source files (not built output, whose index ordering can vary with
   `PYTHONHASHSEED`), the id is deterministic for a given input tree. See
   [service-worker.md](./service-worker.md).

The build is idempotent and has no incremental mode: it always rebuilds `dist/`
fully. It is fast enough that this is not a problem.

## Runtime: the single-page app

`src/index.html` is the shell. It loads `/styles.css` and `/js/main.js` (an ES
module) and declares static UI (header, mode switch, theme toggle, footer,
download button, `<template>` elements for skeletons and errors). Fonts are loaded
from Google Fonts with `preconnect`; everything else is local.

The JS modules in `src/js/`:

| Module           | Responsibility                                                        |
| ---------------- | --------------------------------------------------------------------- |
| `main.js`        | Entry point. Boots theme, i18n, router, PWA; loads data; routes.      |
| `config.js`      | i18n strings per language and app constants (cache names, defaults).  |
| `state.js`       | Reactive app state via a `Proxy`; cross-tab sync via `BroadcastChannel`; viewed-lesson progress in `localStorage`. |
| `data.js`        | Fetches `curriculum.json` and lesson HTML; prefetches the next lesson.|
| `router.js`      | Client-side routing (Navigation API, hash fallback), View Transitions, curriculum render, lesson mount, keyboard nav. |
| `route-utils.js` | `matchLessonPath` (shared with the service worker).                   |
| `lesson-utils.js`| Flattens curriculum, builds per-lesson prev/next nav (shared with SW).|
| `i18n.js`        | UI string painting, mode switcher (grammar/vocabulary/practice), reset-progress. |
| `theme.js`       | Theme selection and persistence.                                      |
| `pwa.js`         | Service-worker registration and the offline-download feature.         |

### Routing

URLs are clean paths. `/` and `/curriculum` render the curriculum list;
`/lessons/<id>` renders a compiled lesson. Where the Navigation API is available
the router intercepts navigations and swaps content with a View Transition; older
browsers fall back to hash routing (`#/lessons/<id>`). On the server side,
`src/_redirects` and `scripts/serve.py` both send unknown paths to `index.html`
so deep links resolve to the SPA shell.

### State and progress

`state.js` wraps a plain data object in a `Proxy` so assignments notify
subscribers. Viewed lessons are stored in `localStorage` and broadcast to other
open tabs over a `BroadcastChannel`, so progress and the current language/mode
stay in sync across tabs. No server, no account, no analytics.

### Offline

The service worker (`src/sw.js`) precaches the app shell and serves content with
per-route strategies; the footer "Download Offline" button bulk-caches every
lesson for the current language. Detailed in [service-worker.md](./service-worker.md).

## Constraints that shape the design

- **Zero runtime dependencies.** No frameworks, no npm/pip runtime libraries, no
  CDN `<script>`/`<link>`. Vanilla HTML/CSS/JS only. The build-time `markdown`
  package is the sole exception.
- **Offline-first and fast.** Pre-rendered shell, one bundled stylesheet, embedded
  search index, aggressive caching. Avoid adding blocking requests or large
  payloads.
- **Static output.** `dist/` is plain files served by Cloudflare. Anything that
  needs a server at request time does not belong here.
