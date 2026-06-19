# Greek Language Course (PWA)

A static, offline-capable Progressive Web App for learning Modern Greek. Lessons
are authored in Markdown, compiled to HTML by a Python build step, and served as
a vanilla-JS single-page app. Deployed on Cloudflare Pages.

## Structure

```
data/el/          Course content
  curriculum.json   Lesson ordering + metadata (also drives the search index)
  lessons/*.md      Grammar units, reading chapters, exercises, vocabulary
src/              App source
  index.html        SPA shell
  js/               Router, state, i18n, service worker, PWA install
  css/              Modular stylesheets (by concern)
assets/images/    Lesson/chapter illustrations
scripts/          Python build + content tooling
dist/             Build output (generated)
```

## Develop

Requires Python 3 and Node (for Wrangler).

```bash
# Build content + assets into dist/
npm run build        # = pip install -r requirements.txt && python3 scripts/build.py

# Serve locally
npm run serve        # python3 scripts/serve.py

# Build then serve
npm run dev
```

## Deploy

Cloudflare Pages serves `./dist` (see `wrangler.jsonc`). Run `npm run build`
before deploying so `dist/` reflects the latest content.
