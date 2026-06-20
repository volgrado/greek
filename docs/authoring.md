# Lesson authoring guide

Lessons are Markdown files under `data/el/lessons/`, organised into three type
subfolders:

```
data/el/lessons/
  grammar/        Grammar units
  vocabulary/     Vocabulary / lexis lists
  practice/       Practice drills
```

The build globs these recursively, so the subfolder is purely organisational — it
does not appear in the output path. The **filename stem is the lesson `id`**: a
file `grammar/basics.md` compiles to `/public/data/el/lessons/basics.html` and is
referenced as `basics` in `curriculum.json` and in links (`/lessons/basics`).

## Registering a lesson in the curriculum

Every lesson must be listed in `data/el/curriculum.json`, and every id in that
file must have a matching `.md` file. The file is split into the three view modes,
each a map of section name to an ordered array of lessons:

```json
{
  "grammar": {
    "A1 Foundations & Survival": [
      { "id": "basics", "title": "Unit 1: The Greek Writing System Masterclass", "num": 1 },
      { "id": "nouns",  "title": "Unit 2: The Basics of Nouns & Articles",       "num": 2 }
    ],
    "A2 Expansion & Daily Life": [ ... ]
  },
  "vocabulary": { ... },
  "practice":   { ... }
}
```

- The top-level keys (`grammar`, `vocabulary`, `practice`) are the view modes the
  header mode switcher toggles between.
- Each section name becomes a collapsible chapter heading, numbered in array
  order (`1. A1 Foundations…`, `2. A2 Expansion…`).
- `id` is the filename stem; `title` is shown in the list and lesson header; `num`
  is informational. The build also derives a `hierarchical_num` (e.g. `1.2`).
- Array order is the lesson order, and drives prev/next navigation within a mode.

> The order matters. Prev/next and "viewed" progress walk the flattened curriculum
> in the order the JSON declares.

To add a lesson: create the Markdown file in the right subfolder, then add an entry
(with the matching `id`) to the appropriate section in `curriculum.json`. Run the
build to confirm.

## Markdown conventions

Standard Markdown works (headings, **bold**, *italic*, lists, links, tables,
blockquotes, horizontal rules). The build uses the `markdown` library with the
`tables`, `attr_list`, `sane_lists`, and `md_in_html` extensions, plus a custom
extension for the project-specific blocks below.

### Tables

Plain Markdown tables. The build wraps each `<table>` in
`<div class="table-container">` so wide tables scroll horizontally on small
screens. Used heavily for alphabet and conjugation tables.

### Phrase lists (target + gloss)

A list item of the form `Greek text (English gloss)` is rendered with the Greek
text and the parenthetical gloss styled separately:

```markdown
- **αι** = [e] like in p**e**t (e.g., **αι**τία - cause)
```

becomes a list item with the leading text in a `lang-el` span and the trailing
`(...)` in a `meaning` span.

### Checklist items

List items using the GitHub task syntax render as a disabled checkbox plus label.
Use `[x]` for a pre-checked item:

```markdown
- [ ] I can identify the 24 letters and their sounds.
- [x] I know what the tonos does.
```

### Callouts

GitHub-style alert blockquotes become styled callout boxes. Five types are
supported, each with its own colour and label: `NOTE`, `TIP`, `IMPORTANT`,
`WARNING`, `CAUTION`.

```markdown
> [!TIP]
> **The Crisp Pronunciation Rule:** In Greek, π, τ, and κ are perfectly crisp.

> [!NOTE]
> Sigma becomes **ς** only at the end of a word; it sounds the same either way.
```

The opening line must be exactly `> [!TYPE]` on its own. Subsequent `>`-prefixed
lines are the body and may contain normal Markdown (bold, lists, line breaks).

### Reading segments

The build supports a generic fenced block for grouping content under a CSS class,
using `:::` fences. This is the mechanism behind paired reading segments:

```markdown
::: reading-segment
Το σπίτι είναι μεγάλο.
*The house is big.*
::: end
```

A `::: <class-names>` line opens a `<div class="<class-names>">` (with
`markdown="1"`, so the inner content is still parsed as Markdown), and `::: end`
closes it. You can apply any space-separated class list. A single-line form is also
accepted: `::: class content ::: end`.

> Note: this is a supported build feature, but no lesson in the current tree uses
> a `:::` block yet. Reach for it when you need a labelled, full-width reading
> passage; otherwise a callout or a plain blockquote is usually enough.

### Quick Check self-tests

Quick Checks are inline, JS-free self-tests that work offline. They use a native
`<details>`/`<summary>` element: the prompt is the summary, the answer is revealed
on click. Because `md_in_html` is enabled, the answer may contain Markdown.

```html
<details>
<summary><strong>1. "I will go to the store tomorrow."</strong></summary>

**Θα πάω στο μαγαζί αύριο.**
</details>
```

Leave a blank line after the `<summary>` line so the revealed Markdown parses as a
paragraph. Group several into a "Quick Check" section under a heading.

## Linking between lessons

Link to another lesson with its id: `[Unit 2: Nouns](/lessons/nouns)`. Lessons
commonly end with a "Next Lesson" link and, where relevant, a cross-link to the
matching vocabulary or practice lesson. The router resolves these as client-side
navigations.

## Images

Reference illustrations from `assets/images/` with a normal Markdown image:

```markdown
![Old Greek grandmother cooking](/assets/images/greek_grandmother_kitchen.png)
```

The `assets/` tree is copied verbatim into `dist/`, so the path is the same at
runtime. Add the image file to `assets/images/` before referencing it.

## After editing

Run the build (`python scripts/build.py`, or `npm run build`) and check the
output, or push — CI builds for you. A lesson that is in `curriculum.json` but has
no file, or has a file but no curriculum entry, is a content bug; keep the two in
sync.
