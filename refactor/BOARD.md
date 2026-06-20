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
| R7  | Practice/SRS interactivity layer       | TODO   | —        | R2, R3, R4 | no   |

> **Round 1 complete**: R1–R6 merged to master (build + integrity check green).
> R7 is now **unblocked** (its dependencies R2/R3/R4 are merged) and ready to claim.

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

- **F1 (from R3)** — Several `@media` queries use `max-width: var(--breakpoint-mobile)`.
  CSS custom properties are invalid in media-query feature values, so those mobile
  breakpoints currently never apply (`tables.css`, `footer.css`, `lessons.css`,
  `mode-switcher.css`). Fix: inline the literal value or use a build-time substitution.
- **F2 (from R2)** — `src/js/router.js` has a duplicated `state.markAsViewed(id);
  prefetchNext(id);` pair (harmless redundancy). Remove one.
- **F3 (from R1)** — The phrase-list inner split regex `^(.*?)\s*\((.*?)\)$` can still
  pick a split point inside inline markup on a leaf item. Left as-is to preserve
  byte-identical output on 40 lessons; harden separately with sign-off on byte changes.
