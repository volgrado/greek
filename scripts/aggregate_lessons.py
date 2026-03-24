import json
from pathlib import Path
import os

def aggregate():
    # Set working directory to project root
    project_root = Path(__file__).parent.parent
    os.chdir(project_root)
    
    curriculum_path = Path('data/el/curriculum.json')
    lessons_dir = Path('data/el/lessons')
    output_path = Path('full_curriculum.md')

    if not curriculum_path.exists():
        print(f"Error: {curriculum_path} not found.")
        return

    with open(curriculum_path, 'r', encoding='utf-8') as f:
        curriculum = json.load(f)

    full_md = "# Greek Language Course - Full Curriculum\n\n"
    full_md += "This document contains all grammar, vocabulary, and exercise units in the correct sequence.\n\n"

    for branch in ['grammar', 'vocabulary', 'exercises']:
        if branch not in curriculum:
            continue
        
        full_md += f"\n# PART: {branch.upper()}\n"
        full_md += "=" * 20 + "\n\n"
        
        for section, lessons in curriculum[branch].items():
            full_md += f"\n## SECTION: {section}\n"
            full_md += "-" * 20 + "\n\n"
            
            for lesson in lessons:
                lesson_id = lesson['id']
                lesson_file = lessons_dir / f"{lesson_id}.md"
                
                if lesson_file.exists():
                    with open(lesson_file, 'r', encoding='utf-8') as lf:
                        content = lf.read()
                        # Demote headers in the content to keep the document structure clean
                        # # -> ###, ## -> ####, etc.
                        content = content.replace('\n# ', '\n### ')
                        content = content.replace('\n## ', '\n#### ')
                        if content.startswith('# '):
                            content = '### ' + content[2:]
                        
                        full_md += f"<!-- START LESSON: {lesson_id} -->\n"
                        full_md += content
                        full_md += "\n\n---\n\n"
                else:
                    full_md += f"### {lesson.get('title', lesson_id)}\n\n"
                    full_md += f"*Content for lesson `{lesson_id}` is currently missing from the database.*\n\n---\n\n"

    with open(output_path, 'w', encoding='utf-8') as out:
        out.write(full_md)
    
    print(f"Aggregated curriculum saved to {output_path.absolute()}")

if __name__ == "__main__":
    aggregate()
