import asyncio
import os
import re
import subprocess
from pathlib import Path
from pydub import AudioSegment

# Configuration
VOICE_EN = "en-AU-WilliamMultilingualNeural"
VOICE_GR = "el-GR-NestorasNeural"
ASSETS_DIR = Path("assets/audio")
ASSETS_DIR.mkdir(parents=True, exist_ok=True)

def parse_vtt_time(vtt_time_str):
    """Converts VTT timestamp (HH:MM:SS.mmm) to milliseconds."""
    # Handle both comma and dot as decimal separator
    vtt_time_str = vtt_time_str.replace(',', '.')
    h, m, s = vtt_time_str.split(':')
    return int(h) * 3600000 + int(m) * 60000 + int(float(s) * 1000)

def format_vtt_time(ms):
    """Converts milliseconds back to VTT timestamp (HH:MM:SS.mmm)."""
    h = ms // 3600000
    ms %= 3600000
    m = ms // 60000
    ms %= 60000
    s = ms // 1000
    ms %= 1000
    return f"{h:02}:{m:02}:{s:02}.{ms:03}"

async def generate_chapter_audio(chapter_id, en_text, gr_text):
    temp_en_mp3 = "temp_en.mp3"
    temp_gr_mp3 = "temp_gr.mp3"
    temp_gr_vtt = "temp_gr.vtt"
    
    output_mp3 = ASSETS_DIR / f"{chapter_id}.mp3"
    output_vtt = ASSETS_DIR / f"{chapter_id}.vtt"

    # 1. Generate English Prompt using CLI
    print(f"Generating English prompt for {chapter_id}...")
    subprocess.run(["python", "-m", "edge_tts", "--voice", VOICE_EN, "--text", en_text, "--write-media", temp_en_mp3], check=True)
    
    # 2. Generate Greek Story with VTT using CLI
    print(f"Generating Greek story and VTT for {chapter_id}...")
    subprocess.run(["python", "-m", "edge_tts", "--voice", VOICE_GR, "--text", gr_text, "--write-media", temp_gr_mp3, "--write-subtitles", temp_gr_vtt], check=True)

    # 3. Process Audio (Merge)
    audio_en = AudioSegment.from_mp3(temp_en_mp3)
    audio_gr = AudioSegment.from_mp3(temp_gr_mp3)
    
    # Add a small silence between them
    silence = AudioSegment.silent(duration=1000)
    full_audio = audio_en + silence + audio_gr
    full_audio.export(output_mp3, format="mp3")
    
    # 4. Process VTT (Shift timestamps by English duration + silence)
    offset_ms = len(audio_en) + 1000
    
    with open(temp_gr_vtt, "r", encoding="utf-8") as f:
        vtt_content = f.read()
        
    lines = vtt_content.splitlines()
    shifted_vtt = ["WEBVTT\n\n"]
    
    for line in lines:
        # Match VTT timestamp line: 00:00:00.000 --> 00:00:00.000
        match = re.search(r"(\d{2}:\d{2}:\d{2}[\.,]\d{3}) --> (\d{2}:\d{2}:\d{2}[\.,]\d{3})", line)
        if match:
            start_ms = parse_vtt_time(match.group(1)) + offset_ms
            end_ms = parse_vtt_time(match.group(2)) + offset_ms
            shifted_vtt.append(f"{format_vtt_time(start_ms)} --> {format_vtt_time(end_ms)}")
        elif line.strip() and not line.startswith("WEBVTT") and not re.match(r"^\d+$", line.strip()):
            shifted_vtt.append(line)
        elif not line.strip():
            shifted_vtt.append("")
            
    with open(output_vtt, "w", encoding="utf-8") as f:
        f.write("\n".join(shifted_vtt))
        
    # Cleanup
    if os.path.exists(temp_en_mp3): os.remove(temp_en_mp3)
    if os.path.exists(temp_gr_mp3): os.remove(temp_gr_mp3)
    if os.path.exists(temp_gr_vtt): os.remove(temp_gr_vtt)
    print(f"DONE: {output_mp3} and {output_vtt}")

if __name__ == "__main__":
    # Chapter 1 Data
    en_prompt = "You are about to read the first chapter of The Athens Enigma. Nestoras has just arrived at the central station in Athens. He is looking for an old family secret hidden in the chaotic, modern concrete jungle of the city. Listen carefully to the story."
    gr_story = "Το ταξίδι. Το τρένο φτάνει στον σταθμό Λαρίσης. Ο Νέστορας κοιτάζει έξω από το παράθυρο. Δεν υπάρχουν λευκά σπίτια εδώ, μόνο πολυκατοικίες. Η Αθήνα είναι μια τσιμεντένια θάλασσα. Βγαίνει από το τρένο και νιώθει τη ζέστη. Στην τσάντα του, έχει ένα παλιό τζάκετ και ένα μπλοκ σημειώσεων. Ξαφνικά, ένας άντρας με γκρίζα μαλλιά τού μιλάει. Γεια σου! Ψάχνεις το ξενοδοχείο; ρωτάει ο άντρας. Ο Νέστορας λέει: Ναι, εντάξει. Πού είναι; Ο άντρας δείχνει τον ουρανό. Εκεί που γεννιέται η μπόρα, λέει κρυπτογραφικά. Ο Νέστορας μένει σιωπηλός. Το αίνιγμα ξεκινάει."
    
    asyncio.run(generate_chapter_audio("chapter-01", en_prompt, gr_story))
