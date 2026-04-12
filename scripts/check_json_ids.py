import json
import os
from pathlib import Path

SCRIPTS_DIR = Path("data/el/scripts")

def check_ids():
    for f in SCRIPTS_DIR.glob("*.json"):
        with open(f, "r", encoding="utf-8") as file:
            try:
                data = json.load(file)
                print(f"{f.name}: {data.get('id')}")
            except Exception as e:
                print(f"Error reading {f.name}: {e}")

if __name__ == "__main__":
    check_ids()
