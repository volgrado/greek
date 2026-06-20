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

> **Round 1 complete**: R1–R6 merged. **R7 merged** (vocabulary flashcards with
> Leitner spaced repetition, localStorage-backed, offline). Follow-ups F1 and F2
> fixed; F3 confirmed as a real content bug (details below).

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

- **F1 (from R3)** — FIXED (`ffced42`). The four `@media (max-width:
  var(--breakpoint-mobile))` queries used an invalid custom property in a media
  feature; replaced with the literal `480px`, restoring the mobile breakpoints.
- **F2 (from R2)** — FIXED (`ffced42`). Removed the duplicated
  `state.markAsViewed(id); prefetchNext(id);` pair in `router.js`.
- **F3 (from R1)** — OPEN, now **confirmed as real content corruption**. The
  phrase-list transform fires on vocabulary items of the form
  `**Greek** *(pron)* = English` because they end in `(...)`, splitting the
  `.meaning` span across the pronunciation (the `.lang-el`/`.meaning` markup ends
  up wrapping the pron, not the English). R7's card extractor works around it by
  parsing the ` = ` separator from text, but the lesson HTML itself still renders
  with mis-scoped spans. Fix: in `build.py`'s `process_li`, skip the phrase-list
  wrap when the item contains ` = ` (the vocab definition format), so those items
  render as plain `<strong>`/`<em>` list entries. Changes byte output on ~22 vocab
  lessons — verify the new output is correct, not merely different.
