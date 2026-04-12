import json
import os
import shutil
from pathlib import Path

CURRICULUM_PATH = Path("dist/public/data/el/curriculum.json")
SCRIPTS_DIR = Path("data/el/scripts")
BACKUP_DIR = Path("data/el/scripts_backup")

def migrate_scripts():
    # Load curriculum
    with open(CURRICULUM_PATH, "r", encoding="utf-8") as f:
        curr = json.load(f)
    
    grammar_units = curr["structure"]["grammar"]
    all_units = []
    for section in grammar_units.values():
        all_units.extend(section)
    
    # Create backup
    if not BACKUP_DIR.exists():
        shutil.copytree(SCRIPTS_DIR, BACKUP_DIR)
        print(f"Backup created at {BACKUP_DIR}")

    script_files = list(SCRIPTS_DIR.glob("*.json"))
    
    processed_ids = set()

    for unit in all_units:
        uid = unit["id"]
        num = unit["num"]
        title = unit["title"].replace(f"Unit {num}: ", "").replace(" Masterclass", "").strip()
        
        # Best match logic
        matches = [f for f in script_files if uid in f.name]
        if not matches:
            print(f"Warning: No script found for {uid}")
            continue
            
        # If multiple matches, prefer the one we worked on recently (xxx-podcast.json) 
        # or the biggest one if we expanded it.
        # Actually, let's just pick the one that matches uid exactly if possible.
        best_match = None
        if len(matches) > 1:
            # Prefer 'xxx-podcast.json' if it exists, as that's what I used for expansion
            pref = [m for m in matches if m.name == f"{uid}-podcast.json"]
            if pref:
                best_match = pref[0]
            else:
                # Otherwise pick the biggest file
                best_match = max(matches, key=lambda p: p.stat().st_size)
        else:
            best_match = matches[0]
            
        target_name = f"{uid}-grammar.json"
        target_path = SCRIPTS_DIR / target_name
        
        print(f"Migrating {best_match.name} -> {target_name} (Unit {num})")
        
        # Load and patch
        with open(best_match, "r", encoding="utf-8") as f:
            try:
                data = json.load(f)
            except Exception as e:
                print(f"Error loading {best_match.name}: {e}")
                continue
                
        data["id"] = f"{uid}-grammar"
        data["title"] = f"Unit {num} Hyper-Exhaustive Masterclass: {title}"
        
        # Save to new name
        with open(target_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
            
        processed_ids.add(best_match.name)
        if best_match.name != target_name:
             # We won't delete yet to be safe, but we track what was used
             pass

    print("\nMigration complete.")
    print(f"Processed {len(processed_ids)} unique source files.")

if __name__ == "__main__":
    migrate_scripts()
