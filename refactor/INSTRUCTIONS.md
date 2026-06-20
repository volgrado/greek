# Refactor Pipeline — Agent Operating Manual

You are one of several agents refactoring this repository in parallel. This file
is the contract. Read it fully before touching anything. The live work board is
[`BOARD.md`](./BOARD.md).

---

## 0. The one-paragraph version

Pick an unclaimed task from `BOARD.md` whose dependencies are met and whose files
nobody else owns. Claim it (commit the claim first). Work in your own git
worktree. Make the change, keep it scoped to that task only. Verify the build and
behaviour. Commit with the standard trailer. Mark the task `DONE` on the board and
move it to the integration queue. Never edit files another in-progress task owns.

---

## 1. What this project is (context you must respect)

A **zero-dependency, offline-first, static** Greek-language course PWA.

- **Content**: Markdown in `data/el/lessons/{grammar,vocabulary,practice}/`, indexed
  by `data/el/curriculum.json`. Lesson `id` = filename stem.
- **App**: hand-written vanilla-JS ES modules in `src/js/`, split CSS in `src/css/`,
  shell in `src/index.html`, service worker in `src/sw.js`.
- **Build**: `python scripts/build.py` compiles Markdown → HTML, bundles CSS into one
  `styles.css`, and stamps the SW with a content-hash build id, all into `dist/`.
- **Serve**: `python scripts/serve.py` (http://localhost:8002).
- **Deploy**: GitHub Actions builds and runs `wrangler deploy` on push to `master`.
  `dist/` is generated, **never committed**.

## 2. Non-negotiable constraints (violating these fails review)

1. **No runtime dependencies.** No npm/pip packages shipped to the browser, no
   frameworks, no CDN `<script>`/`<link>` libraries. Vanilla HTML/CSS/JS only.
   (Build-time `markdown` in `requirements.txt` is the *only* allowed dependency.)
2. **Ultra-fast / offline-first.** Don't add blocking requests, large payloads, or
   anything that delays first paint. The pre-rendered shell and single `styles.css`
   stay intact.
3. **Don't break the build.** `python scripts/build.py` must succeed after your change.
4. **Stay in scope.** Touch only the files your task owns. No drive-by edits.

## 3. House style (apply consistently)

- **File names**: `kebab-case` (`lesson-utils.js`, `mode-switcher.css`).
- **Comments**: English, plain, technical. No emoji, no "Genius Move"-style prose.
- **Logging**: no `console.log`/`debug`/`info` in shipped JS. `console.warn`/`error`
  for genuine error paths only.
- **CSS**: author in split `src/css/*.css`; `build.py` concatenates them in the order
  declared by `src/style.css`. Add a new stylesheet by adding an `@import` line there.
- **Service worker**: strategy-based (`cacheFirst`/`networkFirst`/`staleWhileRevalidate`/
  `appShell`) routed through `handle()`. Cache names use the `greek-*` scheme. Never
  hardcode a cache version — the build stamps `__BUILD_ID__`.
- **Lessons**: Markdown with `> [!NOTE]`/`[!TIP]` callouts, `::: reading-segment` blocks,
  and `<details>` "Quick Check" self-tests. Every `curriculum.json` id must have a file.

## 4. Workflow protocol (follow in order)

1. **Sync**: `git fetch origin && git checkout master && git pull --ff-only`.
2. **Pick**: choose a `TODO` task in `BOARD.md` with all `Depends on` satisfied and whose
   `Owns` files are not held by any `CLAIMED`/`IN-PROGRESS` task.
3. **Claim (this is the lock)**: edit that task's row to `CLAIMED`, fill `Owner` (your
   agent id) and a UTC timestamp, add a line to the Claim Log. Commit **only**
   `BOARD.md` with message `chore(board): claim <TASK-ID> as <agent-id>` and push.
   If the push is rejected (someone claimed first), `git pull --rebase`, re-check the
   board, and pick a different task.
4. **Isolate**: create a worktree for the task —
   `git worktree add ../greek-<TASK-ID> -b refactor/<TASK-ID>`. Work there.
   (Orchestrated subagents: use `isolation: "worktree"`.)
5. **Work**: implement the task, scoped to its `Owns` files. Set status `IN-PROGRESS`.
6. **Verify** (Definition of Done — all must pass):
   - `python scripts/build.py` exits clean.
   - If the change is observable, serve and check it (`scripts/serve.py`), or describe
     the exact manual check in the task's `Notes`.
   - No new runtime dependency; no `console.log`; conventions in §3 honoured.
   - `git diff --stat` shows only files this task owns.
7. **Commit**: conventional message + trailer (see §6) on the `refactor/<TASK-ID>` branch.
8. **Hand off**: set the task to `DONE`, record the branch/commit in the Integration
   Queue, commit the board update. Remove your worktree (`git worktree remove`).

## 5. Conflict & isolation rules

- **One task owns a file at a time.** Before claiming, scan all `CLAIMED`/`IN-PROGRESS`
  rows; if any `Owns` glob overlaps yours, pick another task or wait for it to finish.
- **Shared/central files** (`scripts/build.py`, `src/index.html`, `src/style.css`,
  `src/js/main.js`) are high-contention. Tasks touching them are marked `solo:true` and
  must run alone relative to each other — respect their `Depends on`.
- **Never force-push. Never rewrite history. Never touch `master` directly** — all work
  lands via `refactor/<TASK-ID>` branches that the coordinator merges.
- **The board is the single source of truth.** If reality and the board disagree, fix
  the board and note it in Decisions.

## 6. Commit & integration

- Branch per task: `refactor/<TASK-ID>`. Small, focused commits.
- Message format:
  ```
  <type>(<scope>): <summary>

  <why + what, wrapped ~72 cols>

  Refs: <TASK-ID>
  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
  ```
  `type` ∈ feat, fix, refactor, perf, docs, chore, test.
- **Integration** is done by the coordinator: merge `refactor/<TASK-ID>` → `master`
  (after build passes), resolve conflicts, delete the branch. Agents do not merge to
  master themselves.

## 7. Escalation

Blocked, found a cross-cutting issue, or need to touch a file outside your task? Do
**not** improvise. Add an entry under **Blockers / Decisions** in `BOARD.md`, set your
task to `BLOCKED` with a reason, and stop. The coordinator re-scopes.
