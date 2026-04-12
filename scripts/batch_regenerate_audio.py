import subprocess
import os
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

SCRIPTS_DIR = Path("data/el/scripts")
GEN_SCRIPT = Path("scripts/generate_grammar_audio.py")

def generate_single_script(script_path):
    print(f"[{script_path.name}] Starting generation...")
    try:
        # Run the generation script
        subprocess.run(["python", str(GEN_SCRIPT), str(script_path)], check=True, capture_output=True, text=True)
        print(f"[{script_path.name}] SUCCESS: Audio generated.")
        return True
    except subprocess.CalledProcessError as e:
        print(f"[{script_path.name}] ERROR: Generation failed.\nSTDOUT: {e.stdout}\nSTDERR: {e.stderr}")
        return False
    except Exception as e:
        print(f"[{script_path.name}] ANOMALY: {e}")
        return False

def batch_generate_parallel(max_workers=2):
    # Find all 33 grammar scripts
    target_scripts = list(SCRIPTS_DIR.glob("*-grammar.json"))
    
    if not target_scripts:
        print("No script files found matching *-grammar.json!")
        return

    print(f"Found {len(target_scripts)} scripts. Starting parallel generation with {max_workers} workers...\n")

    # Use ThreadPoolExecutor to run generations concurrently
    success_count = 0
    with ThreadPoolExecutor(max_workers=10) as executor:
        # Submit all tasks
        future_to_script = {executor.submit(generate_single_script, script): script for script in target_scripts}
        
        # As they complete, process results
        for future in as_completed(future_to_script):
            script = future_to_script[future]
            try:
                success = future.result()
                if success:
                    success_count += 1
            except Exception as exc:
                print(f"[{script.name}] generated an exception: {exc}")
                
    print(f"\nBatch generation complete! Successfully generated {success_count} / {len(target_scripts)} podcasts.")

if __name__ == "__main__":
    # Ensure stdout/stderr are UTF-8 in terminal
    import sys
    import io
    if sys.stdout.encoding != 'utf-8':
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    if sys.stderr.encoding != 'utf-8':
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
        
    batch_generate_parallel(max_workers=10)
