import json
import re
from pathlib import Path

SCRIPTS_DIR = Path("data/el/scripts")

def split_text_by_language(text):
    # Splits text into tokens of purely Greek+punctuation vs. purely non-Greek
    # The regex below splits precisely where Greek/punctuation transitions to Latin characters.
    # Group 1: Greek chars and any space/punctuation
    # Group 2: Latin chars (and other non-Greek) and space/punctuation
    # Actually, it's safer to classify word by word:
    
    words = re.findall(r'[A-Za-zÀ-ÿ]+|[\u0370-\u03FF]+|[^\w]+', text)
    segments = []
    
    current_lang = 'gr'
    current_text = ""
    
    for word in words:
        if re.search(r'[A-Za-zÀ-ÿ]', word):
            # It's a latin word
            if current_lang == 'gr' and current_text.strip():
                segments.append((current_lang, current_text))
                current_text = ""
            current_lang = 'gr_en'
            current_text += word
        elif re.search(r'[\u0370-\u03FF]', word):
            # It's a Greek word
            if current_lang == 'gr_en' and current_text.strip():
                segments.append((current_lang, current_text))
                current_text = ""
            current_lang = 'gr'
            current_text += word
        else:
            # It's punctuation/spaces
            current_text += word

    if current_text.strip():
        # Clean trailing spaces
        segments.append((current_lang, current_text))
        
    # Clean and merge
    final_segments = []
    for lang, txt in segments:
        cleaned = txt.strip()
        if cleaned:
            final_segments.append((lang, cleaned))
            
    return final_segments

def process_file(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Global fixes in Title
    title = data.get("title", "")
    title = title.replace("Hyper-Exhaustive Masterclass", "Learn Greek Grammar Masterclass")
    title = title.replace("Hyper-Exhaustive Grammar Masterclass", "Learn Greek Grammar Masterclass")
    title = title.replace("Grammar Masterclass", "Learn Greek Grammar Masterclass")
    # Clean up double mentions if any
    title = title.replace("Learn Greek Learn Greek", "Learn Greek")
    data["title"] = title

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

        # Global fixes in text
        text = text.replace("I'm Ava", "I'm William")
        text = text.replace("my name is Ava", "my name is William")
        text = text.replace("I am Ava", "I am William")
        text = text.replace("Hyper-Exhaustive Grammar Masterclass", "Learn Greek Grammar Masterclass")
        text = text.replace("Hyper-Exhaustive Masterclass", "Learn Greek Grammar Masterclass")

        if voice == "en":
            new_script.append({
                "voice": "en",
                "text": text
            })
        elif voice == "gr" or voice == "gr_en":
            # Split Greek and Latin appropriately
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

def main():
    files = list(SCRIPTS_DIR.glob("*-grammar.json"))
    for f in files:
        process_file(f)
    print(f"\nSuccessfully processed {len(files)} files.")

if __name__ == "__main__":
    main()
