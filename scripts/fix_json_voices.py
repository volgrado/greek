import json
import re
from pathlib import Path

SCRIPTS_DIR = Path("data/el/scripts")

def split_text_by_language(text):
    # Splits text into segments of Greek and Non-Greek (Latin) scripts.
    tokens = re.findall(r'[\u0370-\u03FF\s\.,!\?;:·\-]+|[^\u0370-\u03FF]+', text)
    
    segments = []
    for token in tokens:
        if not token.strip():
            continue
        if re.search(r'[\u0370-\u03FF]', token):
            segments.append(('gr', token)) # Keep original spacing where possible
        else:
            segments.append(('gr_en', token))
    
    # Merge consecutive segments of the same language
    merged = []
    for lang, txt in segments:
        if merged and merged[-1][0] == lang:
            merged[-1] = (lang, merged[-1][1] + txt)
        else:
            merged.append((lang, txt))
            
    # Clean up whitespace
    final_segments = []
    for lang, txt in merged:
        cleaned = txt.strip()
        if cleaned:
            final_segments.append((lang, cleaned))
            
    return final_segments

def process_file(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 1. Update voices
    data["voices"] = {
        "en": "en-AU-WilliamMultilingualNeural",
        "gr": "el-GR-AthinaNeural",
        "gr_en": "en-US-AvaMultilingualNeural"
    }

    original_script = data.get("script", [])
    new_script = []

    for item in original_script:
        voice = item.get("voice")
        text = item.get("text")

        # If it's William, keep it as 'en' 
        # (Assuming William speaks English, and if there's Greek, he'll just read it in his voice)
        if voice == "en":
            new_script.append({
                "voice": "en",
                "text": text
            })
        elif voice == "gr" or voice == "gr_en":
            # It's Athina, split by language
            segments = split_text_by_language(text)
            for lang, segment_text in segments:
                new_script.append({
                    "voice": lang, 
                    "text": segment_text
                })
        else:
            new_script.append(item)

    data["script"] = new_script

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
        
    print(f"Processed {file_path.name}")

def main():
    files = list(SCRIPTS_DIR.glob("*-grammar.json"))
    for f in files:
        process_file(f)
    print(f"\nSuccessfully processed {len(files)} files.")

if __name__ == "__main__":
    main()
