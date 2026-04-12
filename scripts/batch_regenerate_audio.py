import subprocess
import os
from pathlib import Path

# The files we just expanded (all short files under 2MB)
TARGET_SCRIPTS = [
    "adjective-comparison-podcast.json", # Unit 25
    "deponent-verbs-podcast.json",       # Unit 26
    "conditionals-1-2-podcast.json",     # Unit 31
    "irregular-words-podcast.json",      # Unit 33
    "diminutives-podcast.json",           # Unit 34
    "participles-podcast.json",          # Unit 35
    "particles-podcast.json",            # Unit 36
    "reflexive-pronouns-podcast.json",   # Unit 37
    "impersonal-verbs-podcast.json",     # Unit 38
    "relative-pronouns-podcast.json",    # Unit 39
    "genitive-absolute-podcast.json",    # Unit 40
    "compound-words-podcast.json",       # Unit 42
    "ancient-remnants-podcast.json",     # Unit 43
    "idioms-podcast.json"                # Unit 47
]

SCRIPTS_DIR = Path("data/el/scripts")
GEN_SCRIPT = Path("scripts/generate_grammar_audio.py")

def batch_generate():
    for script_name in TARGET_SCRIPTS:
        script_path = SCRIPTS_DIR / script_name
        if not script_path.exists():
            print(f"Warning: {script_name} not found. Skipping.")
            continue
            
        print(f"\n" + "="*50)
        print(f"BATCH GENERATING: {script_name}")
        print("="*50 + "\n")
        
        try:
            # Run the generation script
            subprocess.run(["python", str(GEN_SCRIPT), str(script_path)], check=True)
            print(f"SUCCESS: {script_name} completed.")
        except subprocess.CalledProcessError as e:
            print(f"ERROR: Generation failed for {script_name}: {e}")
        except Exception as e:
            print(f"ANOMALY: {e}")

if __name__ == "__main__":
    batch_generate()
