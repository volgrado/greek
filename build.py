import json
import sys
import re
from pathlib import Path
import markdown
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
                new_lines.append('</div>')
                continue
            
            # Look for ::: class-names
            m = re.match(r'^[ \t]*:::[ \t]+([a-zA-Z0-9_\-/\.:]+(?:[ \t]+[a-zA-Z0-9_\-/\.:]+)*)[ \t]*$', line)
            if m:
                classes = m.group(1)
                # markdown="1" lets markdown parse the content inside the div
                new_lines.append(f'<div markdown="1" class="{classes}">')
                continue
            
            # No match
            new_lines.append(line)
        return new_lines

class CustomBlockExtension(Extension):
    def extendMarkdown(self, md):
        md.preprocessors.register(CustomBlockPreprocessor(md), 'custom_blocks', 100)

def parse_markdown(md_text):
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
    
    # Process specific styling like Spanish/English translation lists 
    # Current pattern in markdown: - Spanish text (English text)
    # We need to wrap them in spans
    def process_li(match):
        li_content = match.group(1)
        # Check for phrase-list format "Spanish text (English text)"
        m = re.match(r'^(.*?)\s*\((.*?)\)$', li_content)
        if m:
            es_text, en_text = m.groups()
            return f'<li><span class="spanish">{es_text}</span> <span class="meaning">({en_text})</span></li>'
        return f'<li>{li_content}</li>'
        
    html = re.sub(r'<li>(.*?)</li>', process_li, html, flags=re.DOTALL)
    
    return f'<div class="content-wrapper">\n{html}\n</div>'


def build_lang(lang_code, is_default=False):
    print(f"--- Building language: {lang_code} ---")
    
    # Directorios fuente
    lang_dir = Path('data') / lang_code
    lessons_dir = lang_dir / 'lessons'
    curriculum_path = lang_dir / 'curriculum.json'
    
    # Directorios destino
    out_dir = Path('public/data') / lang_code
    out_lessons_dir = out_dir / 'lessons'
    out_dir.mkdir(parents=True, exist_ok=True)
    out_lessons_dir.mkdir(parents=True, exist_ok=True)
    
    # 1. Cargar la Ontología (Currículo)
    if not curriculum_path.exists():
        print(f"WRN: {curriculum_path} not found. Skipping.")
        return None
        
    with curriculum_path.open('r', encoding='utf-8') as f:
        structure = json.load(f)

    # 2. Reconstruir la HOME (Nodo Raíz '/')
    # Instead of AST, we build raw HTML for the home page
    home_html = '<div class="curriculum-container">\n'
    
    for section_name, lessons in structure.items():
        home_html += f'<section>\n  <h2>{section_name}</h2>\n'
        for l in lessons:
            label = f"{l['num']}. {l['title']}" if l.get('num') else l['title']
            home_html += f'''  <a href="#/lessons/{l['id']}" class="curriculum-link">
    <span>{label}</span>
    <span>→</span>
  </a>\n'''
        home_html += '</section>\n'
    home_html += '</div>\n'
    
    curriculum_data = {
        "structure": structure,
        "home": home_html
    }
    
    # Escribir public/data/lang/curriculum.json (still need structure for nav)
    with (out_dir / 'curriculum.json').open('w', encoding='utf-8') as f:
        json.dump(curriculum_data, f, ensure_ascii=False, indent=2)
    print(f"[OK] {out_dir}/curriculum.json generated.")

    # 3. Procesar y escribir Fragmentos de Conocimiento (Lessons) separadamente
    if lessons_dir.exists():
        for file_path in lessons_dir.glob('*.md'):
            lesson_id = file_path.stem
            with file_path.open('r', encoding='utf-8') as f:
                try:
                    md_text = f.read()
                    html_content = parse_markdown(md_text)
                    
                    # Escribir la lección individual como HTML
                    out_lesson_path = out_lessons_dir / f"{lesson_id}.html"
                    with out_lesson_path.open('w', encoding='utf-8') as out_f:
                        out_f.write(html_content)
                        
                except Exception as e:
                    print(f"[ERR] Error compiling Markdown {file_path.name}: {e}")

    print(f"[OK] Lessons successfully compiled to HTML in {out_lessons_dir}.")
    return curriculum_data

def build_all(default_lang='el'):
    data_dir = Path('data')
    if not data_dir.exists():
        print(f"[ERR] Error: {data_dir} directory not found.")
        return

    langs = [d.name for d in data_dir.iterdir() if d.is_dir()]
    
    if not langs:
        print("[ERR] Error: No language directories found in data/")
        return

    for lang in langs:
        build_lang(lang, is_default=(lang == default_lang))

    print("\n--- Build process completed for all languages ---")

if __name__ == "__main__":
    default_l = 'el'
    if len(sys.argv) > 1:
        default_l = sys.argv[1]
    build_all(default_l)


