# Refactor Board — Live Coordination

Single source of truth for who is doing what. Read
[`INSTRUCTIONS.md`](./INSTRUCTIONS.md) before editing. Claiming = editing this
file and pushing the claim commit first (see Instructions §4).

**Statuses**: `TODO` · `CLAIMED` · `IN-PROGRESS` · `BLOCKED` · `DONE` · `MERGED`

---

## Status table

| ID  | Task                                   | Status | Owner | Depends on | Solo |
| --- | -------------------------------------- | ------ | ----- | ---------- | ---- |
| R1  | Harden the Markdown build pipeline     | TODO   | —     | —          | yes  |
| R2  | JSDoc + consistent module headers (JS) | TODO   | —     | —          | yes  |
| R3  | CSS audit & token consolidation        | TODO   | —     | —          | yes  |
| R4  | Accessibility + perf pass (shell)      | TODO   | —     | —          | yes  |
| R5  | Build-integrity check + CI gate        | TODO   | —     | —          | no   |
| R6  | Docs & authoring guide                 | TODO   | —     | —          | no   |
| R7  | Practice/SRS interactivity layer       | TODO   | —     | R2, R3, R4 | no   |

> **Parallelizable now**: R1, R2, R3, R4, R5, R6 (disjoint ownership).
> R7 waits on R2/R3/R4 because it adds wiring lines into files those tasks own.

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
| —             | —     | board seeded |

---

## Integration queue (DONE, awaiting coordinator merge)

| Task | Branch | Commit | Verified | Notes |
| ---- | ------ | ------ | -------- | ----- |
| —    | —      | —      | —        | —     |

---

## Blockers / Decisions

- _(none yet)_ — record cross-cutting issues, scope changes, and resolutions here with
  a UTC timestamp and the agent id.
