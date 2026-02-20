import json
import os
import sys

# --- EL COMPILADOR ZEN (THE WEAVER) ---

def validate_node(node, path):
    """Valida que el nodo cumpla con el esquema básico [tag, props, ...children]."""
    if not isinstance(node, list):
        return
    if len(node) < 2 or not isinstance(node[1], dict):
        print(f"❌ Error in {path}: Node must be [tag, {{props}}, ...children]")

def build_lang(lang_code):
    print(f"--- Building language: {lang_code} ---")
    db = {}
    lang_dir = os.path.join('data', lang_code)
    
    # 1. Cargar la Ontología (Currículo)
    curriculum_path = os.path.join(lang_dir, 'curriculum.json')
    if not os.path.exists(curriculum_path):
        print(f"WRN: {curriculum_path} not found. Skipping.")
        return None
        
    with open(curriculum_path, 'r', encoding='utf-8') as f:
        structure = json.load(f)

    # Crear lista plana de lecciones para navegación
    flat_lessons = []
    for section in structure.values():
        for l in section:
            flat_lessons.append(l)

    # 2. Reconstruir la HOME (Nodo Raíz '/')
    home = ["div", {"className": "curriculum-container"}]
    
    for section_name, lessons in structure.items():
        section_node = ["section", {}, ["h2", {}, section_name]]
        for l in lessons:
            label = f"{l['num']}. {l['title']}" if l.get('num') else l['title']
            section_node.append([
                "a", 
                {"href": f"#/lessons/{l['id']}", "className": "curriculum-link"},
                ["span", {}, label],
                ["span", {}, "→"]
            ])
        home.append(section_node)
    
    db["/"] = home
    db["/curriculum"] = home

    # 3. Recolectar Fragmentos de Conocimiento (Lessons)
    lessons_dir = os.path.join(lang_dir, 'lessons')
    lesson_fragments = {}
    if os.path.exists(lessons_dir):
        for filename in os.listdir(lessons_dir):
            if filename.endswith('.json'):
                lesson_id = filename[:-5].replace('_', '/')
                with open(os.path.join(lessons_dir, filename), 'r', encoding='utf-8') as f:
                    try:
                        lesson_fragments[lesson_id] = json.load(f)
                    except Exception as e:
                        print(f"[ERR] Error loading {filename}: {e}")

    # 4. Procesar Navigación Automática
    available_lessons = [l for l in flat_lessons if l['id'] in lesson_fragments]
    
    for i, l in enumerate(available_lessons):
        lid = l['id']
        path = f"/lessons/{lid}"
        node = lesson_fragments[lid]
        
        if isinstance(node, list):
            node = [child for child in node if not (
                isinstance(child, list) and 
                len(child) > 1 and 
                isinstance(child[1], dict) and 
                (child[1].get('className') == 'lesson-nav' or child[1].get('class') == 'lesson-nav')
            )]

        nav_block = ["div", {"className": "lesson-nav"}]
        
        if i > 0:
            prev_l = available_lessons[i-1]
            nav_block.append(["a", {"href": f"#/lessons/{prev_l['id']}"}, f"← {prev_l['title']}"])
        else:
            nav_block.append(["span", {}, ""]) 

        nav_block.append(["a", {"href": "#/", "className": "menu-btn"}, "MENU"])

        if i < len(available_lessons) - 1:
            next_l = available_lessons[i+1]
            nav_block.append(["a", {"href": f"#/lessons/{next_l['id']}"}, f"{next_l['title']} →"])
        else:
            nav_block.append(["span", {}, ""]) 

        if isinstance(node, list):
            node.append(nav_block)
        
        db[path] = node

    # 5. Estado de Fallo (404)
    db["404"] = ["div", {"style": "padding: 5rem; text-align: center"},
        ["h1", {"style": "color: #e53e3e"}, "404: Nodo no encontrado"],
        ["a", {"href": "#/"}, "Volver al Origen"]
    ]

    # 6. Consolidación del Grafo
    output_filename = f'data-{lang_code}.json'
    with open(output_filename, 'w', encoding='utf-8') as f:
        json.dump(db, f, ensure_ascii=False, indent=2)
    
    # Special case for backward compatibility
    if lang_code == 'el':
        with open('data.json', 'w', encoding='utf-8') as f:
            json.dump(db, f, ensure_ascii=False, indent=2)
        print(f"[OK] data.json (linked to {lang_code}) updated.")

    print(f"[OK] {output_filename} generated successfully.")
    return db

def build_all():
    data_dir = 'data'
    if not os.path.exists(data_dir):
        print(f"[ERR] Error: {data_dir} directory not found.")
        return

    langs = [d for d in os.listdir(data_dir) if os.path.isdir(os.path.join(data_dir, d))]
    
    if not langs:
        print("[ERR] Error: No language directories found in data/")
        return

    for lang in langs:
        build_lang(lang)

    print("\n--- Build process completed for all languages ---")

if __name__ == "__main__":
    build_all()

