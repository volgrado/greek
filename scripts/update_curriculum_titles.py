import json
from pathlib import Path

CURRICULUM_PATH = Path("dist/public/data/el/curriculum.json")
SCRIPTS_DIR = Path("data/el/scripts")

def update_curriculum():
    with open(CURRICULUM_PATH, "r", encoding="utf-8") as f:
        curr = json.load(f)
        
    script_titles = {}
    for f in SCRIPTS_DIR.glob("*-grammar.json"):
        with open(f, "r", encoding="utf-8") as sf:
            try:
                data = json.load(sf)
                # Ensure the id matches the curriculum id
                uid = data.get("id", "").replace("-grammar", "")
                title = data.get("title", "")
                if uid and title:
                    script_titles[uid] = title
            except Exception as e:
                print(f"Error reading {f.name}: {e}")
                
    # Update structure
    for section_name, units in curr["structure"]["grammar"].items():
        for unit in units:
            uid = unit["id"]
            if uid in script_titles:
                unit["title"] = script_titles[uid]
                
    # Update searchIndex
    for uid, unit_data in curr["searchIndex"].items():
        if uid in script_titles:
            unit_data["title"] = script_titles[uid]
            
    # Save back
    with open(CURRICULUM_PATH, "w", encoding="utf-8") as f:
        json.dump(curr, f, indent=2, ensure_ascii=False)
        
    print("Curriculum titles updated successfully.")

if __name__ == "__main__":
    update_curriculum()
