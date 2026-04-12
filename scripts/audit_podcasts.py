import json
import re
from pathlib import Path

SCRIPTS_DIR = Path("data/el/scripts")
OUTPUT_FILE = Path("audit_report.txt")

def audit_scripts():
    files = list(SCRIPTS_DIR.glob("*-grammar.json"))
    total_issues = 0
    
    with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
        for f in files:
            try:
                with open(f, "r", encoding="utf-8") as file:
                    data = json.load(file)
            except Exception as e:
                out.write(f"Error reading {f.name}\n")
                continue
                
            script_items = data.get("script", [])
            file_issues = []
            
            for i, item in enumerate(script_items):
                voice = item.get("voice", "")
                text = item.get("text", "")
                
                issues = []
                
                # Rule 1: Incorrect Presenter Identity
                if "I'm Ava" in text or "I am Ava" in text or "my name is Ava" in text:
                    issues.append("William claims to be Ava")
                    
                # Rule 2: Incorrect Podcast Name
                if "Hyper-Exhaustive" in text or "Grammar Masterclass" in text:
                    if "Learn Greek" not in text:
                        issues.append("Uses old podcast name instead of Learn Greek")
                        
                # Rule 3: Athina (gr) reading Latin characters (English/Anglicizations)
                if voice == "gr":
                    if re.search(r'[a-zA-Z]', text):
                        issues.append("Athina (gr) is assigned Latin letters")
                        
                # Rule 4: William (en) reading Greek characters
                if voice == "en":
                    if re.search(r'[\u0370-\u03FF]', text):
                        issues.append("William (en) is assigned Greek letters")
                        
                if issues:
                    file_issues.append({
                        "index": i,
                        "voice": voice,
                        "text": text,
                        "issues": issues
                    })
                    
            if file_issues:
                out.write(f"\n--- Issues in {f.name} ---\n")
                for issue in file_issues:
                    out.write(f"[{issue['voice']}] (Line {issue['index']+1}): {', '.join(issue['issues'])}\n")
                    out.write(f"    Text: {issue['text']}\n")
                    total_issues += 1
                    
        out.write(f"\nTotal problem segments found: {total_issues}\n")

if __name__ == "__main__":
    audit_scripts()
