import json
import os
from pathlib import Path

SCRIPTS_DIR = Path("data/el/scripts")

def check_scripts():
    for f in SCRIPTS_DIR.glob("*.json"):
        with open(f, "r", encoding="utf-8") as file:
            try:
                data = json.load(file)
                print(f"File: {f.name}")
                print(f"  ID in JSON: {data.get('id')}")
                print(f"  Title in JSON: {data.get('title')}")
                
                # Check for mention of Unit Number in Title
                title = data.get('title', '')
                print(f"  Unit Ref: {title}")
                print("-" * 20)
            except Exception as e:
                print(f"Error reading {f.name}: {e}")

if __name__ == "__main__":
    check_scripts()
