import asyncio
import json
import os
import re
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

# Voice Defaults
DEFAULT_VOICE_EN = "en-US-AvaMultilingualNeural"  # "Voz inglesa buena"
DEFAULT_VOICE_GR = "el-GR-AthinaNeural"          # Athina for Greek

def split_text_by_language(text):
    """
    Splits text into segments of Greek and Non-Greek (Latin) scripts.
    Returns a list of (voice_type, text_segment) tuples.
    voice_type is either 'gr' (Greek) or 'en' (English).
    """
    # Unicode range for Greek: 0370-03FF
    # This regex finds contiguous blocks of Greek characters vs anything else.
    # We include punctuation and spaces in whichever block they are adjacent to.
    tokens = re.findall(r'[\u0370-\u03FF\s\.,!\?;:·]+|[^\u0370-\u03FF]+', text)
    
    segments = []
    for token in tokens:
        if not token.strip():
            continue
        # If it contains Greek letters, it's Greek
        if re.search(r'[\u0370-\u03FF]', token):
            segments.append(('gr', token.strip()))
        else:
            segments.append(('en', token.strip()))
    return segments

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
        item_voice_role = item["voice"] # 'en' or 'gr'
        text_to_process = item["text"]
        
        print(f"  [{i+1}/{len(script_items)}] Processing item for {item_voice_role}...")
        
        # Split text into language segments
        segments = split_text_by_language(text_to_process)
        
        item_audio = AudioSegment.silent(duration=0)
        
        for j, (lang, segment_text) in enumerate(segments):
            # Determine which voice to use for this specific segment
            if lang == 'gr':
                voice_name = voices.get("gr", DEFAULT_VOICE_GR)
            else:
                voice_name = voices.get("en", DEFAULT_VOICE_EN)
            
            # Ensure we use Ava for anything English if the system voice is Athina
            if lang == 'en' and "Athina" in voice_name:
                voice_name = DEFAULT_VOICE_EN
            elif lang == 'gr' and "William" in voice_name:
                voice_name = DEFAULT_VOICE_GR

            segment_file = temp_dir / f"segment_{i:03d}_{j:03d}.mp3"
            print(f"    Segment {j+1}: [{lang}] -> {voice_name}")
            
            # Use edge-tts CLI
            subprocess.run([
                "python", "-m", "edge_tts", 
                "--voice", voice_name, 
                "--text", segment_text, 
                "--write-media", str(segment_file)
            ], check=True)
            
            segment_audio = AudioSegment.from_mp3(str(segment_file))
            
            # Add a very small pause between segments within the same item for flow
            if j > 0:
                item_audio += AudioSegment.silent(duration=300)
                
            item_audio += segment_audio

        # Add silences between items in the script
        silence_duration = 1000 if i > 0 else 0
        if i > 0 and script_items[i-1]["voice"] != item_voice_role:
            silence_duration = 1600 # Pause for voice/character switch
            
        if silence_duration > 0:
            combined_voice += AudioSegment.silent(duration=silence_duration)
            
        combined_voice += item_audio
        
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
