import json
import os
import sys
from pathlib import Path

# Force UTF-8 for Windows console
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())

SCRIPTS_DIR = Path("data/el/scripts")

def check_scripts():
    all_mapping = {}
    for f in SCRIPTS_DIR.glob("*.json"):
        with open(f, "r", encoding="utf-8") as file:
            try:
                data = json.load(file)
                unit_title = data.get('title', '')
                unit_id = data.get('id', '')
                all_mapping[f.name] = {
                    "id": unit_id,
                    "title": unit_title
                }
            except Exception as e:
                pass
    
    print(json.dumps(all_mapping, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    check_scripts()
