import shutil
from pathlib import Path
import json
import sys
import re
import markdown

def strip_html(html_text):
    """Removes HTML tags to create clean searchable text."""
    clean = re.sub(r'<.*?>', ' ', html_text)
    return re.sub(r'\s+', ' ', clean).strip()
from markdown.extensions import Extension
from markdown.preprocessors import Preprocessor

class CustomBlockPreprocessor(Preprocessor):
    """
    A preprocessor that converts `::: class-names` into `<div class="...">` 
    and `::: end` into `</div>` before the Markdown engine processes blocks.
    This guarantees no <p> tags interfere with our wrappers.
    """
    def run(self, lines):
        new_lines = []
        for line in lines:
            # Look for single-line syntax: ::: class content ::: end
            inline_m = re.match(r'^[ \t]*:::[ \t]+([a-zA-Z0-9_\-/\.:]+(?:[ \t]+[a-zA-Z0-9_\-/\.:]+)*)[ \t]+(.*?)[ \t]*:::[ \t]*end[ \t]*$', line)
            if inline_m:
                classes = inline_m.group(1)
                content = inline_m.group(2)
                # Important: Python markdown requires blank lines around HTML blocks to parse inner content!
                # Even for inline, we'll follow this pattern to be safe.
                new_lines.append(f'<div markdown="1" class="{classes}">{content}</div>')
                continue

            # Look for ::: end
            if re.match(r'^[ \t]*:::[ \t]*end[ \t]*$', line):
                new_lines.append('')
                new_lines.append('</div>')
                new_lines.append('')
                continue
            
            # Look for ::: class-names
            m = re.match(r'^[ \t]*:::[ \t]+([a-zA-Z0-9_\-/\.:]+(?:[ \t]+[a-zA-Z0-9_\-/\.:]+)*)[ \t]*$', line)
            if m:
                classes = m.group(1)
                # markdown="1" lets markdown parse the content inside the div
                new_lines.append('')
                new_lines.append(f'<div markdown="1" class="{classes}">')
                new_lines.append('')
                continue
            
            # No match
            new_lines.append(line)
        return new_lines

class CalloutPreprocessor(Preprocessor):
    """
    Converts GitHub-style alerts:
    > [!IMPORTANT]
    > some text
    Into <div class="callout callout-important">some text</div>
    """
    def run(self, lines):
        new_lines = []
        i = 0
        while i < len(lines):
            line = lines[i]
            # Match the start of an alert: > [!TYPE]
            m = re.match(r'^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$', line, re.IGNORECASE)
            if m:
                callout_type = m.group(1).lower()
                new_lines.append(f'<div markdown="1" class="callout callout-{callout_type}">')
                new_lines.append(f'<div class="callout-label">{callout_type.upper()}</div>')
                i += 1
                # Process subsequent lines that start with >
                while i < len(lines) and lines[i].startswith('>'):
                    content = lines[i][1:].strip()
                    # If it was exactly "> ", content is empty, but we want a newline/paragraph break in MD
                    if lines[i].startswith('> '):
                        new_lines.append(lines[i][2:])
                    else:
                        new_lines.append('')
                    i += 1
                new_lines.append('</div>')
                continue
            
            new_lines.append(line)
            i += 1
        return new_lines

class CustomBlockExtension(Extension):
    def extendMarkdown(self, md):
        md.preprocessors.register(CustomBlockPreprocessor(md), 'custom_blocks', 101)
        md.preprocessors.register(CalloutPreprocessor(md), 'callouts', 102)

def parse_markdown(md_text, lang_code):
    """Compiles Markdown to HTML."""

    # We use the 'markdown' library with tables, attr_list, sane_lists, and md_in_html
    # We also inject our CustomBlockExtension to handle ::: wrappers cleanly.
    html = markdown.markdown(
        md_text, 
        extensions=[
            'tables', 
            'attr_list', 
            'sane_lists', 
            'md_in_html',
            CustomBlockExtension()
        ]
    )

    # Wrap tables for responsiveness
    html = re.sub(r'<table>', '<div class="table-wrapper"><table>', html)
    html = re.sub(r'</table>', '</table></div>', html)
    
    # Process specific styling like translation lists 
    # Current pattern in markdown: - Target text (English text)
    def process_li(match):
        li_content = match.group(1).strip()

        # 1. Check for checklist-format "[ ]" or "[x]"
        checkbox_m = re.match(r'\[([ xX])\]\s*(.*)', li_content, re.DOTALL)
        if checkbox_m:
            checked = checkbox_m.group(1).lower() == 'x'
            content = checkbox_m.group(2)
            checked_attr = 'checked' if checked else ''
            return f'<li class="checklist-item"><input type="checkbox" disabled {checked_attr}> <span>{content}</span></li>'

        # 2. Check for phrase-list format "Target text (English text)"
        m = re.match(r'^(.*?)\s*\((.*?)\)$', li_content, re.DOTALL)
        if m:
            target_text, en_text = m.groups()
            return f'<li><span class="lang-{lang_code}">{target_text}</span> <span class="meaning">({en_text})</span></li>'
        
        return f'<li>{li_content}</li>'
        
    html = re.sub(r'<li>(.*?)</li>', process_li, html, flags=re.DOTALL)
    
    return f'<div class="content-wrapper">\n{html}\n</div>'


def build_lang(lang_code, dist_root):
    print(f"--- Building language: {lang_code} ---")
    
    # Directorios fuente
    lang_dir = Path('data') / lang_code
    lessons_dir = lang_dir / 'lessons'
    curriculum_path = lang_dir / 'curriculum.json'
    
    # Directorios destino (Directo a dist)
    out_dir = dist_root / 'public/data' / lang_code
    out_lessons_dir = out_dir / 'lessons'
    out_dir.mkdir(parents=True, exist_ok=True)
    out_lessons_dir.mkdir(parents=True, exist_ok=True)
    
    # 1. Cargar la Ontología (Currículo)
    if not curriculum_path.exists():
        print(f"WRN: {curriculum_path} not found. Skipping.")
        return None
        
    with curriculum_path.open('r', encoding='utf-8') as f:
        structure = json.load(f)

    # Numeración jerárquica y Mapeo de Metadatos
    lesson_meta_map = {}
    
    # structure can be {"grammar": {...}, "vocabulary": {...}} or just {...}
    is_nested = "grammar" in structure
    
    def process_branch(branch, branch_name=""):
        c_idx = 1
        for section_name, lessons in branch.items():
            l_idx = 1
            for l in lessons:
                l['hierarchical_num'] = f"{c_idx}.{l_idx}"
                lesson_meta_map[l['id']] = {
                    'title': l['title'],
                    'chapter': f"{c_idx}. {section_name}",
                    'num': f"{c_idx}.{l_idx}"
                }
                l_idx += 1
            c_idx += 1

    if is_nested:
        for branch_key in structure:
            process_branch(structure[branch_key])
    else:
        process_branch(structure)

    # 3. Procesar Lessons y generar índice de búsqueda
    doc_store = {}
    inverted_index = {}
    
    import unicodedata
    def normalize_text_py(text):
        text = unicodedata.normalize('NFD', str(text))
        text = "".join([c for c in text if not unicodedata.combining(c)])
        return text.lower()

    if lessons_dir.exists():
        for file_path in lessons_dir.glob('*.md'):
            lesson_id = file_path.stem
            with file_path.open('r', encoding='utf-8') as f:
                try:
                    md_text = f.read()
                    html_content = parse_markdown(md_text, lang_code)
                    
                    # Guardar HTML
                    out_lesson_path = out_lessons_dir / f"{lesson_id}.html"
                    with out_lesson_path.open('w', encoding='utf-8') as out_f:
                        out_f.write(html_content)

                    # Obtener título y metadatos para el índice
                    meta = lesson_meta_map.get(lesson_id, {})
                    title = meta.get('title', lesson_id)
                    chapter = meta.get('chapter', "")
                    h_num = meta.get('num', "")
                    clean_text = strip_html(html_content)

                    # Añadir al Document Store
                    doc_store[lesson_id] = {
                        "id": lesson_id,
                        "title": title,
                        "chapter": chapter,
                        "num": h_num,
                        "content": clean_text
                    }
                    
                    # Añadir al Inverted Index
                    # Tokenize words using basic alphanumeric matching
                    # Range \u0370-\u03FF covers the Greek and Coptic block
                    raw_words = re.findall(r'[a-z0-9\u0370-\u03ff]+', normalize_text_py(title + " " + clean_text))
                    unique_words = set(raw_words)
                    
                    for w in unique_words:
                        if len(w) >= 2: # Omit very short 1-char words from index
                            if w not in inverted_index:
                                inverted_index[w] = []
                            inverted_index[w].append(lesson_id)

                except Exception as e:
                    print(f"[ERR] Error compiling Markdown {file_path.name}: {e}")

    curriculum_data = {
        "structure": structure,
        "searchIndex": doc_store,
        "invertedIndex": inverted_index
    }
    
    # Escribir el JSON de currículo y búsqueda unificado
    with (out_dir / 'curriculum.json').open('w', encoding='utf-8') as f:
        json.dump(curriculum_data, f, ensure_ascii=False, indent=2)
    print(f"[OK] {out_dir}/curriculum.json generated with embedded search index.")

    return curriculum_data

def build_all():
    dist_dir = Path('dist')
    
    # 1. Clean and Prepare
    print("\n--- Initializing Build ---")
    dist_dir.mkdir(parents=True, exist_ok=True)

    # 2. Copy UI Assets from src/ and assets/
    src_dir = Path('src')
    static_files = ['index.html', 'sw.js', 'manifest.json', 'style.css']
    for f in static_files:
        src_path = src_dir / f
        if src_path.exists():
            shutil.copy(src_path, dist_dir / f)
    
    shutil.copytree(src_dir / 'js', dist_dir / 'js', dirs_exist_ok=True)
    shutil.copytree(Path('assets'), dist_dir / 'assets', dirs_exist_ok=True)
    shutil.copytree(src_dir / 'css', dist_dir / 'css', dirs_exist_ok=True)

    # 3. Build Content
    data_dir = Path('data')
    if data_dir.exists():
        langs = [d.name for d in data_dir.iterdir() if d.is_dir()]
        for lang in langs:
            build_lang(lang, dist_dir)
            
    # 4. Zero-JS Initial Paint: Pre-render English (or first lang) Curriculum into index.html
    # This prevents the white-screen flash and makes the app load instantly
    print("\n--- Generating Zero-JS App Shell ---")
    try:
        curriculum_file = dist_dir / 'public' / 'data' / 'en' / 'curriculum.json'
        if not curriculum_file.exists():
            # Fallback to el if en doesn't exist
            curriculum_file = dist_dir / 'public' / 'data' / 'el' / 'curriculum.json'
            
        if curriculum_file.exists():
            with curriculum_file.open('r', encoding='utf-8') as f:
                db = json.load(f)
                
            # Reconstruct the HTML tree exactly as router.js would
            shell_html = '<div class="curriculum-container">\n'
            
            # Use grammar section for initial paint
            is_nested = "grammar" in db['structure']
            curriculum_structure = db['structure']['grammar'] if is_nested else db['structure']

            chapter_idx = 1
            for section_name, lessons in curriculum_structure.items():
                shell_html += f'''<section class="curriculum-section" data-section-id="grammar-{chapter_idx}">
                <div class="section-header">
                    <h2>{chapter_idx}. {section_name}</h2>
                    <span class="toggle-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </span>
                </div>
                <div class="section-content">
                '''
                lesson_idx = 1
                for l in lessons:
                    h_num = l.get('hierarchical_num', f"{chapter_idx}.{lesson_idx}")
                    label = f"{h_num}. {l['title']}"
                    shell_html += f'''    <a href="/lessons/{l['id']}" class="curriculum-link">
                        <span>{label}</span>
                        <span>→</span>
                    </a>\n'''
                    lesson_idx += 1
                shell_html += '</div>\n</section>\n'
                chapter_idx += 1
            shell_html += '</div>\n'
            
            # Inject it into dist/index.html
            index_path = dist_dir / 'index.html'
            with index_path.open('r', encoding='utf-8') as f:
                index_content = f.read()
                
            # Replace <main id="app"></main> with the pre-rendered shell
            injected_content = index_content.replace('<main id="app"></main>', f'<main id="app">\n{shell_html}\n</main>')
            
            with index_path.open('w', encoding='utf-8') as f:
                f.write(injected_content)
                
            print("[OK] Pre-rendered HTML shell injected into index.html")
    except Exception as e:
        print(f"[ERR] Failed to generate App Shell: {e}")

    print("\n--- Build process completed ---")
    print(f"[OK] Final production site ready in: {dist_dir.absolute()}")

if __name__ == "__main__":
    build_all()


