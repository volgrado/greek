import asyncio
import json
import os
import subprocess
from pathlib import Path
from pydub import AudioSegment
import sys

# Ensure stdout/stderr handle UTF-8 correctly for Windows consoles
if sys.stdout.encoding.lower() != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Configuration
ASSETS_DIR = Path("assets/audio/podcasts")
ASSETS_DIR.mkdir(parents=True, exist_ok=True)
BG_MUSIC_PATH = ASSETS_DIR.parent / "system" / "podcast_bg.mp3"

async def generate_podcast_audio(script_path):
    with open(script_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    podcast_id = data.get("id", "podcast")
    voices = data.get("voices", {})
    script_items = data.get("script", [])
    
    combined_voice = AudioSegment.silent(duration=0)
    
    temp_dir = Path(f"temp_{podcast_id}")
    temp_dir.mkdir(exist_ok=True)
    
    print(f"Generating Podcast Content: {data.get('title', podcast_id)}...")
    
    for i, item in enumerate(script_items):
        item_voice_role = item["voice"] # 'en', 'gr', or 'gr_en'
        text_to_process = item["text"]
        
        # Get the actual voice identifier from the JSON's 'voices' dict
        voice_name = voices.get(item_voice_role)
        if not voice_name:
            print(f"ERROR: Voice mapping for '{item_voice_role}' not found in JSON.")
            return

        print(f"  [{i+1}/{len(script_items)}] Generating segment... Role: {item_voice_role} | Voice: {voice_name} | Text: {repr(text_to_process)}")
        
        segment_file = temp_dir / f"segment_{i:03d}.mp3"
        
        # Check if text is only punctuation
        import re
        import string
        # Strip all punctuation and whitespace to see if there is any alphanumeric
        speakable = re.sub(r'[^\w]', '', text_to_process)
        if not speakable:
            print(f"    -> Text is only punctuation. Skipping TTS, adding small silence.")
            segment_audio = AudioSegment.silent(duration=200)
        else:
            # Use a temporary file for the text to avoid command-line argument 
            # parsing issues (like leading dashes) and encoding problems on Windows.
            text_file = temp_dir / f"text_{i:03d}.txt"
            with open(text_file, "w", encoding="utf-8") as tf:
                tf.write(text_to_process)
            
            subprocess.run([
                "python", "-m", "edge_tts", 
                "--voice", voice_name, 
                "--file", str(text_file), 
                "--write-media", str(segment_file)
            ], check=True)
            segment_audio = AudioSegment.from_mp3(str(segment_file))
        
        # Add silences
        silence_duration = 0
        if i > 0:
            prev_role = script_items[i-1]["voice"]
            # If we switch between William ('en') and the Assistant ('gr' or 'gr_en'), longer pause
            if prev_role == 'en' and item_voice_role != 'en':
                silence_duration = 1600
            elif prev_role != 'en' and item_voice_role == 'en':
                silence_duration = 1600
            elif prev_role != item_voice_role:
                # Assistant switching between Greek and English mid-explanation, short pause
                silence_duration = 300
            else:
                # Same person continuing, normal pause
                silence_duration = 1000
                
        if silence_duration > 0:
            combined_voice += AudioSegment.silent(duration=silence_duration)
            
        combined_voice += segment_audio
        
    # --- Background Music Integration ---
    final_audio = combined_voice
    
    if BG_MUSIC_PATH.exists():
        print(f"Mixing with background music: {BG_MUSIC_PATH}...")
        bg_music = AudioSegment.from_mp3(str(BG_MUSIC_PATH))
        
        # 1. Lower the background music volume significantly
        bg_music = bg_music - 28 # Mild ambient level
        
        # 2. Add an intro/outro padding to the voice
        voice_padding_start = 2000 # 2 seconds of music before speech
        voice_padding_end = 3000   # 3 seconds of music after speech
        
        padded_voice = AudioSegment.silent(duration=voice_padding_start) + combined_voice + AudioSegment.silent(duration=voice_padding_end)
        
        # 3. Loop the background music to cover the full duration
        full_duration = len(padded_voice)
        looped_bg = bg_music * ( (full_duration // len(bg_music)) + 1)
        looped_bg = looped_bg[:full_duration]
        
        # 4. Fade in/out the background music
        looped_bg = looped_bg.fade_in(2000).fade_out(3000)
        
        # 5. Overlay
        final_audio = looped_bg.overlay(padded_voice)
    else:
        print("Warning: Background music file not found. Generating voice-only audio.")

    output_file = ASSETS_DIR / f"{podcast_id}.mp3"
    print(f"Exporting final audio to {output_file}...")
    final_audio.export(output_file, format="mp3")
    
    # Cleanup temp files
    for f in temp_dir.glob("*.mp3"):
        try:
            os.remove(f)
        except Exception as e:
            print(f"Warning: Could not remove temp file {f}: {e}")
    try:
        temp_dir.rmdir()
    except Exception as e:
        print(f"Warning: Could not remove temp directory {temp_dir}: {e}")
    
    print(f"SUCCESS: Generated {output_file}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python generate_grammar_audio.py <script_json_path>")
        sys.exit(1)
        
    asyncio.run(generate_podcast_audio(sys.argv[1]))
