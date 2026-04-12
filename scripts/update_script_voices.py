import json
import os
from pathlib import Path

SCRIPTS_DIR = Path("data/el/scripts")
OLD_EN_VOICE = "en-AU-WilliamMultilingualNeural"
NEW_EN_VOICE = "en-US-AvaMultilingualNeural"

def update_voices():
    count = 0
    for script_file in SCRIPTS_DIR.glob("*.json"):
        with open(script_file, "r", encoding="utf-8") as f:
            try:
                data = json.load(f)
            except Exception as e:
                print(f"Error reading {script_file}: {e}")
                continue
        
        updated = False
        if "voices" in data:
            if data["voices"].get("en") == OLD_EN_VOICE:
                data["voices"]["en"] = NEW_EN_VOICE
                updated = True
            
            # Also ensure 'gr' is Athina if it happens to be Nestoras in podcasts
            if data["voices"].get("gr") == "el-GR-NestorasNeural":
                data["voices"]["gr"] = "el-GR-AthinaNeural"
                updated = True

        if updated:
            with open(script_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
            count += 1
            print(f"Updated {script_file.name}")

    print(f"Finished. Updated {count} files.")

if __name__ == "__main__":
    update_voices()
