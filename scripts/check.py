"""Build-integrity check for the Greek course content.

Stdlib-only. Run before the build to catch broken content references early:

  * every curriculum.json id must have a matching lesson file, and every
    lesson file must be listed in the curriculum (no orphans either way);
  * every image a lesson references under /assets/images/ must exist on disk.

Exits 0 when the tree is consistent, non-zero (1) when any problem is found,
printing one line per problem. Intended as a CI gate ahead of the build.
"""

import json
import re
import sys
from pathlib import Path

# Repo root is the parent of this scripts/ directory, so the check works
# regardless of the directory the command is invoked from.
ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / 'data'
ASSETS_DIR = ROOT / 'assets'

# Matches Markdown images ![alt](path) and raw HTML <img src="path">.
MD_IMAGE_RE = re.compile(r'!\[[^\]]*\]\(([^)]+)\)')
HTML_IMAGE_RE = re.compile(r'<img\b[^>]*?\bsrc\s*=\s*["\']([^"\']+)["\']', re.IGNORECASE)

# Only validate references into the app's bundled image directory.
ASSET_IMAGE_PREFIX = '/assets/images/'


def collect_curriculum_ids(structure):
    """Return the set of lesson ids declared in a curriculum structure.

    The structure is either flat ({section: [lessons]}) or nested by type
    ({grammar: {...}, vocabulary: {...}}). Lesson ids are taken from the
    'id' field of each lesson entry.
    """
    ids = set()

    def walk(node):
        if isinstance(node, dict):
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for item in node:
                if isinstance(item, dict) and 'id' in item:
                    ids.add(item['id'])
                else:
                    walk(item)

    walk(structure)
    return ids


def extract_image_refs(md_text):
    """Return image reference paths found in a lesson's Markdown source."""
    refs = []
    refs.extend(MD_IMAGE_RE.findall(md_text))
    refs.extend(HTML_IMAGE_RE.findall(md_text))
    return refs


def check_language(lang_dir, problems):
    """Validate a single language directory, appending problems found."""
    lang = lang_dir.name
    curriculum_path = lang_dir / 'curriculum.json'
    lessons_dir = lang_dir / 'lessons'

    try:
        structure = json.loads(curriculum_path.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError) as exc:
        problems.append(f"[{lang}] cannot read curriculum.json: {exc}")
        return

    curriculum_ids = collect_curriculum_ids(structure)

    # Lessons are organised into type subfolders; key them by filename stem.
    lesson_files = {}
    if lessons_dir.exists():
        for path in lessons_dir.rglob('*.md'):
            lesson_files[path.stem] = path

    file_ids = set(lesson_files)

    for missing in sorted(curriculum_ids - file_ids):
        problems.append(
            f"[{lang}] curriculum id '{missing}' has no lesson file under {lessons_dir}/"
        )

    for orphan in sorted(file_ids - curriculum_ids):
        problems.append(
            f"[{lang}] lesson file '{lesson_files[orphan].relative_to(ROOT)}' "
            f"is not listed in curriculum.json"
        )

    # Validate image references in every lesson file.
    for lesson_id in sorted(lesson_files):
        path = lesson_files[lesson_id]
        try:
            md_text = path.read_text(encoding='utf-8')
        except OSError as exc:
            problems.append(f"[{lang}] cannot read lesson '{path.relative_to(ROOT)}': {exc}")
            continue

        for ref in extract_image_refs(md_text):
            if not ref.startswith(ASSET_IMAGE_PREFIX):
                continue
            # Resolve the leading-slash app path against the repo root.
            asset_path = ROOT / ref.lstrip('/')
            if not asset_path.exists():
                problems.append(
                    f"[{lang}] lesson '{path.relative_to(ROOT)}' references "
                    f"missing image '{ref}'"
                )


def main():
    problems = []

    if not DATA_DIR.exists():
        print(f"[ERR] data directory not found: {DATA_DIR}", file=sys.stderr)
        return 1

    lang_dirs = [
        d for d in sorted(DATA_DIR.iterdir())
        if d.is_dir() and (d / 'curriculum.json').exists()
    ]
    if not lang_dirs:
        print(f"[ERR] no language with a curriculum.json found under {DATA_DIR}", file=sys.stderr)
        return 1

    for lang_dir in lang_dirs:
        check_language(lang_dir, problems)

    if problems:
        print(f"[FAIL] build-integrity check found {len(problems)} problem(s):")
        for problem in problems:
            print(f"  - {problem}")
        return 1

    langs = ', '.join(d.name for d in lang_dirs)
    print(f"[OK] build-integrity check passed ({langs}).")
    return 0


if __name__ == '__main__':
    sys.exit(main())
