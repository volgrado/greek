import json
from pathlib import Path

CURRICULUM_PATH = Path("dist/public/data/el/curriculum.json")
SCRIPTS_DIR = Path("data/el/scripts")

def check_coverage():
    with open(CURRICULUM_PATH, "r", encoding="utf-8") as f:
        curr = json.load(f)
    
    grammar_units = curr["structure"]["grammar"]
    all_units = []
    for section in grammar_units.values():
        all_units.extend(section)
    
    # Get all script bases (striping -podcast, -grammar-podcast, etc.)
    script_files = list(SCRIPTS_DIR.glob("*.json"))
    
    print(f"Total units in curriculum: {len(all_units)}")
    
    missing = []
    for unit in all_units:
        uid = unit["id"]
        # Search for a script that matches the id
        found = False
        for sf in script_files:
            if uid in sf.name:
                found = True
                break
        if not found:
            missing.append(uid)
    
    print(f"Missing scripts for these IDs: {missing}")

if __name__ == "__main__":
    check_coverage()
