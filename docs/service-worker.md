# Service worker & caching model

The service worker (`src/sw.js`) makes the app offline-first. It precaches the app
shell on install and serves runtime requests through per-route caching strategies.
It has no dependencies.

## Cache versioning is automatic

Never hardcode a cache version. `src/sw.js` ships with a `__BUILD_ID__`
placeholder; `scripts/build.py` replaces it with a 12-character content hash (the
first 12 hex chars of a SHA-1 over the `data/` and `src/` source trees, excluding
`sw.js` itself). Because the hash is derived from source inputs, it is
deterministic for a given tree and only changes when content changes.

The app-shell cache name embeds this build id, so a new build produces a new cache
name. On activation the worker deletes every cache not in the current set, so stale
shells are purged automatically — no manual version bump, no user action.

## Cache names — the `greek-*` scheme

All cache names use a `greek-*` prefix so they are easy to identify and clear:

| Constant         | Cache name                  | Holds                                   | Versioning            |
| ---------------- | --------------------------- | --------------------------------------- | --------------------- |
| `CACHES.app`     | `greek-app-<BUILD_ID>`      | App shell, JS, CSS, manifest, icon, curriculum, images | Build id (auto) |
| `CACHES.lessons` | `greek-lessons-el-v2`       | Compiled lesson HTML                    | Manual `v2` suffix    |
| `CACHES.fonts`   | `greek-fonts-v1`            | Google Fonts responses                  | Manual `v1` suffix    |

The lessons cache is **not** tied to the build id on purpose: the "Download
Offline" feature in `src/js/pwa.js` writes lesson HTML into it directly, and
`src/js/state.js` reads it back to report download status. That name is duplicated
as constants in `src/js/config.js`:

```js
LESSON_CACHE_PREFIX: 'greek-lessons-',
LESSON_CACHE_VERSION: 'v2',
```

The runtime composes `greek-lessons-<lang>-<version>` (e.g. `greek-lessons-el-v2`).

> If you ever change the lessons cache version, change it in **both** `src/sw.js`
> (`CACHES.lessons`) and `src/js/config.js` (`LESSON_CACHE_VERSION`) — they must
> match or the download feature and the offline lesson reads will target different
> caches. The fonts and app caches are owned entirely by the service worker.

## Caching strategies

Requests are routed by `handle(request)` to one of four strategies:

| Strategy              | Used for                | Behaviour                                                        |
| --------------------- | ----------------------- | --------------------------------------------------------------- |
| `appShell`            | navigations (`mode: navigate`) | Return the cached shell for any path (SPA routes client-side), refresh it in the background. |
| `networkFirst`        | `curriculum.json`       | Fetch fresh when online, cache it, fall back to cache offline.   |
| `staleWhileRevalidate`| lesson HTML             | Serve cache immediately, refresh in the background.             |
| `cacheFirst`          | fonts, images, precached static assets | Serve from cache; on miss fetch and cache. For immutable assets. |

Routing predicates (in `handle`):

- Navigations → `appShell`.
- Path ends with `/curriculum.json` → `networkFirst` into the app cache (keeps the
  curriculum and search index fresh when online).
- Path under `/data/.../lessons/` → `staleWhileRevalidate` into the lessons cache.
- Font origin (`fonts.`) → `cacheFirst` into the fonts cache.
- `/assets/images/` or a precached path → `cacheFirst` into the app cache.
- Anything else → cache-first lookup, then network, without polluting caches.

Only `GET` requests are handled; other methods pass through untouched.

## Lifecycle

- **install**: `skipWaiting()` then precache `PRECACHE_URLS` (shell, all JS
  modules, `styles.css`, manifest, icon, and the curriculum) into the app cache.
- **activate**: delete every cache name not in the current set, then
  `clients.claim()` so the new worker controls open pages immediately.
- **fetch**: ignore non-`GET`; otherwise `respondWith(handle(request))`.

`src/js/pwa.js` registers the worker but intentionally does **not** reload on
`controllerchange`. A new worker takes over quietly on the next navigation, which
avoids reload loops on hard refreshes.

## The offline-download feature

The footer "Download Offline" button (`src/js/pwa.js`) bulk-fetches every lesson
for the current language and stores the HTML in `greek-lessons-<lang>-<version>`.
`src/js/state.js#checkDownloadStatus` then compares the cached lesson URLs against
the flattened curriculum to decide whether the full set is available offline, and
the UI shows "Offline Ready" when it is.

This is why the lessons cache is kept separate from the build-id app cache: it must
survive deploys so a user's downloaded lessons are not wiped by a routine content
update. Bump `LESSON_CACHE_VERSION` only when the lesson HTML format changes in a
way that requires re-downloading.

## Clearing caches manually (debugging)

In DevTools → Application → Cache Storage you will see the `greek-*` caches. To
force a clean state, unregister the service worker and delete the `greek-*` caches,
then reload. A normal deploy does not require this — the new build id rotates the
app cache and `activate` cleans up the old one.
