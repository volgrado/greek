# Refactor Board — Live Coordination

Single source of truth for who is doing what. Read
[`INSTRUCTIONS.md`](./INSTRUCTIONS.md) before editing. Claiming = editing this
file and pushing the claim commit first (see Instructions §4).

**Statuses**: `TODO` · `CLAIMED` · `IN-PROGRESS` · `BLOCKED` · `DONE` · `MERGED`

---

## Status table

| ID  | Task                                   | Status | Owner    | Depends on | Solo |
| --- | -------------------------------------- | ------ | -------- | ---------- | ---- |
| R1  | Harden the Markdown build pipeline     | MERGED | fleet-R1 | —          | yes  |
| R2  | JSDoc + consistent module headers (JS) | MERGED | fleet-R2 | —          | yes  |
| R3  | CSS audit & token consolidation        | MERGED | fleet-R3 | —          | yes  |
| R4  | Accessibility + perf pass (shell)      | MERGED | fleet-R4 | —          | yes  |
| R5  | Build-integrity check + CI gate        | MERGED | fleet-R5 | —          | no   |
| R6  | Docs & authoring guide                 | MERGED | fleet-R6 | —          | no   |
| R7  | Practice/SRS interactivity layer       | MERGED | coordinator | R2, R3, R4 | no   |
| L1  | Collapse single-language i18n scaffolding | TODO | —        | L3 (merged) | no  |
| L2  | Drop unused search-index generation    | MERGED | fleet-L2 | —          | yes  |
| L3  | Reuse the pre-rendered shell on first paint | MERGED | fleet-L3 | —     | yes  |

> **Round 1 complete**: R1–R6 merged. **R7 merged** (vocabulary flashcards with
> Leitner spaced repetition, localStorage-backed, offline). Follow-ups F1 and F2
> fixed; F3 fixed.
>
> **Round 2 (lightenings)**: L2 (`build.py`) and L3 (`router.js`) are disjoint and
> run in parallel first; L1 collapses the i18n indirection across `src/js/**` and
> depends on L3 (both touch `router.js`), so it runs after L3 merges.

---

## Task definitions

### R1 — Harden the Markdown build pipeline · `solo`
- **Owns**: `scripts/build.py`
- **Goal**: replace the fragile `re.sub`-on-generated-HTML post-processing (reading
  segments, list rewriting, table wrapping) with a more structured approach that can't
  silently mangle output on slightly-off markup. No new dependencies (`markdown` only).
- **Done when**: build output for all 61 lessons is byte-identical or demonstrably
  more correct; `python scripts/build.py` clean; deterministic build id preserved.

### R2 — JSDoc + consistent module headers (JS) · `solo`
- **Owns**: `src/js/**`
- **Goal**: every module gets a one-line header comment; exported functions get JSDoc
  (`@param`/`@returns`); consistent ordering (imports → consts → functions → exports).
  No behaviour change.
- **Done when**: build clean; app loads and navigates; no `console.log` introduced.

### R3 — CSS audit & token consolidation · `solo`
- **Owns**: `src/css/**` (NOT `src/style.css` order, NOT `src/index.html`)
- **Goal**: dedupe rules, consolidate custom properties in `variables.css`, remove dead
  selectors, ensure consistent units/spacing tokens. Visual output unchanged.
- **Done when**: build clean; bundled `styles.css` renders identically (spot-check home,
  a lesson, dark/sepia themes).

### R4 — Accessibility + perf pass (shell) · `solo`
- **Owns**: `src/index.html`, `src/manifest.json`
- **Goal**: semantic landmarks, `aria-*` on controls (mode switch, theme, download),
  focus states, `font-display`, `rel=preload` for the one stylesheet, `lang`/meta
  correctness. No framework, no new requests beyond a preload hint.
- **Done when**: build clean; keyboard nav works; Lighthouse a11y not regressed.

### R5 — Build-integrity check + CI gate
- **Owns**: `scripts/check.py` (new), `.github/workflows/deploy.yml`
- **Goal**: a stdlib-only `check.py` that fails if any `curriculum.json` id lacks a
  lesson file (or vice versa), or a lesson references a missing image. Wire it as a CI
  step before deploy.
- **Done when**: `python scripts/check.py` exits non-zero on a seeded broken ref and
  zero on the current tree; CI runs it.

### R6 — Docs & authoring guide
- **Owns**: `README.md`, `docs/**` (new)
- **Goal**: expand the README/`docs/` with architecture overview, the lesson-authoring
  conventions, the SW caching model, and the deploy/secrets runbook.
- **Done when**: docs match current reality; no code touched.

### R7 — Practice/SRS interactivity layer · depends on R2, R3, R4
- **Owns**: `src/js/practice.js` (new), `src/css/practice.css` (new), plus the wiring
  lines in `src/js/main.js`, `src/style.css` (`@import`), `src/index.html` (container).
- **Goal**: a vanilla-JS, `localStorage`-backed flashcard/spaced-repetition + typed-cloze
  layer built from existing vocab tables. Offline, zero dependencies.
- **Done when**: build clean; cards persist across reloads; works offline; no new deps.

### L2 — Drop unused search-index generation · `solo`
- **Owns**: `scripts/build.py`
- **Goal**: the build computes a per-lesson `doc_store` + `invertedIndex` and writes
  `search-index.json`, but no code loads it (there is no search feature). Remove that
  computation and the file write. `curriculum.json` (navigation structure only) is
  unchanged; lessons still build.
- **Done when**: `python scripts/build.py` clean; `search-index.json` no longer emitted;
  all 61 lessons still compile; `curriculum.json` byte-identical.

### L3 — Reuse the pre-rendered shell on first paint
- **Owns**: `src/js/router.js`
- **Goal**: `build.py` pre-renders the curriculum into `index.html` for instant paint,
  but `route()` immediately clears `#app` and re-renders it. On the *initial* home
  render, detect the existing pre-rendered curriculum already in `#app` and keep it
  (no re-render); still re-render on later client navigations and view-mode changes.
  Detect client-side (e.g. an existing `.curriculum-container`), with no `build.py` change.
- **Done when**: build clean; first paint keeps the server markup; navigating away and
  back, and switching modes, still render correctly; no console errors.

### L1 — Collapse single-language i18n scaffolding · depends on L3
- **Owns**: `src/js/**` (config.js, i18n.js, data.js, main.js, router.js, state.js, theme.js)
- **Goal**: there is exactly one language (`el`), but the app carries a language
  dimension: `I18N[state.currentLang]`, a `currentLang` state field, `localStorage` lang
  persistence, and language-switch machinery. Collapse it: expose the `el` strings/paths
  directly (e.g. a single `STRINGS` constant), drop `currentLang` and the switch code,
  and simplify `i18n.js` to its real job (applying UI strings + the mode switcher).
  Behaviour and every visible string stay identical; this only removes the unused
  multi-language indirection. Depends on L3 because both edit `router.js`.
- **Done when**: build clean; app renders, navigates, switches view modes, opens lessons,
  and toggles theme exactly as before; no console errors; no `state.currentLang` left.

---

## File-lock view (derived — keep current)

No files are currently locked. When you set a task `CLAIMED`/`IN-PROGRESS`, list its
`Owns` globs here so others can scan in one place.

| Glob | Held by | Since (UTC) |
| ---- | ------- | ----------- |
| —    | —       | —           |

---

## Claim log (append-only)

| UTC timestamp | Agent | Action |
| ------------- | ----- | ------ |
| seed          | —     | board seeded |
| round 1       | fleet-R1..R6 | claimed + completed R1–R6 in parallel worktrees |
| round 1       | coordinator | merged R1–R6 → master, build + check green, branches deleted |

---

## Integration queue (DONE, awaiting coordinator merge)

| Task | Branch | Commit | Verified | Notes |
| ---- | ------ | ------ | -------- | ----- |
| R1   | refactor/R1 | 10c4a3e | merged | structured build pass; fixed crossed-markup bug |
| R2   | refactor/R2 | 695c567 | merged | JSDoc/headers, comments-only |
| R3   | refactor/R3 | 6e2cbb5 | merged | dedup + tokens, zero visual change |
| R4   | refactor/R4 | 6fa57bc | merged | a11y landmarks, skip link, preload |
| R5   | refactor/R5 | 42f698f | merged | check.py + CI gate |
| R6   | refactor/R6 | 0e4440f | merged | README + docs/ |

---

## Blockers / Decisions

Pre-existing issues surfaced by the round-1 agents (out of their scope; candidate
follow-up tasks):

- **F1 (from R3)** — FIXED (`ffced42`). The four `@media (max-width:
  var(--breakpoint-mobile))` queries used an invalid custom property in a media
  feature; replaced with the literal `480px`, restoring the mobile breakpoints.
- **F2 (from R2)** — FIXED (`ffced42`). Removed the duplicated
  `state.markAsViewed(id); prefetchNext(id);` pair in `router.js`.
- **F3 (from R1)** — FIXED (`47f56d6`). `process_li` now skips the gloss-span
  transform when an item contains ` = ` (the vocab definition separator), so
  `**Greek** *(pron)* = English` entries render as clean `<strong>`/`<em>` items
  instead of splitting `.meaning` across the pronunciation. Removed 103 mis-scoped
  span pairs across the vocabulary lessons; legitimate `Target (English)` gloss
  items are unchanged. Verified the new output is correct (not merely different).
