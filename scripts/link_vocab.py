import os
import re

links = {
    # A1
    "nouns.md": ("vocabulary-family-people", "A1 Vocabulary: Family & People"),
    "verb-to-be.md": ("vocabulary-everyday-objects", "A1 Vocabulary: Everyday Objects & Places"),
    "verbs.md": ("vocabulary-action-verbs", "A1 Vocabulary: Essential Action Verbs"),
    "accusative-case.md": ("vocabulary-survival", "A1 Vocabulary: Survival Phrases"),
    "adjectives.md": ("vocabulary-colors-numbers", "A1 Vocabulary: Colors & Numbers"),
    "interrogative-pronouns.md": ("vocabulary-questions", "A1 Vocabulary: Question Words & Pronouns"),

    # A2
    "plurals.md": ("vocabulary-shopping-clothes", "A2 Vocabulary: Shopping & Clothes"),
    "verb-groups-b.md": ("vocabulary-routines-hobbies", "A2 Vocabulary: Routines & B-Group Verbs"),
    "subjunctive-1.md": ("vocabulary-routines-hobbies", "A2 Vocabulary: Routines & B-Group Verbs"),
    "future-continuous.md": ("vocabulary-time-calendar", "A2 Vocabulary: Time & Calendar"),
    "simple-stem.md": ("vocabulary-food-restaurant", "A2 Vocabulary: Food & the Restaurant"),
    "object-pronouns.md": ("vocabulary-shopping-clothes", "A2 Vocabulary: Shopping & Clothes"),
    "aorist-past.md": ("vocabulary-time-calendar", "A2 Vocabulary: Time & Calendar"),

    # B1
    "genitive-case.md": ("vocabulary-family-possessions", "B1 Vocabulary: Family Tree & Possessions"),
    "imperative.md": ("vocabulary-directions-commands", "B1 Vocabulary: Directions & Commands"),
    "adverbs.md": ("vocabulary-directions-commands", "B1 Vocabulary: Directions & Commands"),
    "deponent-verbs.md": ("vocabulary-deponent-states", "B1 Vocabulary: Deponent Verbs & States"),
    "perfect-tenses.md": ("vocabulary-travel-experiences", "B1 Vocabulary: Travel & Life Experiences"),
    "conditionals-1-2.md": ("vocabulary-travel-experiences", "B1 Vocabulary: Travel & Life Experiences"),

    # B2
    "particles.md": ("vocabulary-particles-fillers", "B2 Vocabulary: Conversational Fillers & Particles"),
    "relative-pronouns.md": ("vocabulary-beliefs-society", "B2 Vocabulary: Beliefs, Relations & Society"),
    "reflexive-pronouns.md": ("vocabulary-beliefs-society", "B2 Vocabulary: Beliefs, Relations & Society"),
    "adjective-comparison.md": ("vocabulary-adjectives-comparisons", "B2 Vocabulary: Adjectives & Comparisons"),
    "impersonal-verbs.md": ("vocabulary-impersonal-weather", "B2 Vocabulary: Expressions, impersonal states & weather"),

    # C1
    "diminutives.md": ("vocabulary-affection-emotion", "C1 Vocabulary: Affection & Emotion"),
    "compound-words.md": ("vocabulary-compound-everyday", "C1 Vocabulary: Common Compound Words"),

    # C2
    "ancient-remnants.md": ("vocabulary-ancient-phrases", "C2 Vocabulary: Ancient Phrases in Modern Greek"),
    "genitive-absolute.md": ("vocabulary-irregular-everyday", "C2 Vocabulary: Irregular Nouns & Verbs in the Wild"),
    "irregular-words.md": ("vocabulary-irregular-everyday", "C2 Vocabulary: Irregular Nouns & Verbs in the Wild")
}

directory = r"C:\Users\APRON\Documents\apps\greek\data\el\lessons"

count = 0
for filename, (vocab_id, vocab_title) in links.items():
    filepath = os.path.join(directory, filename)
    if not os.path.exists(filepath):
        print(f"Skipping {filename} - not found.")
        continue
        
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
        
    if "**Practice Vocabulary:**" in content:
        print(f"Skipping {filename} - already linked.")
        continue
        
    new_text = f"**Practice Vocabulary:** [{vocab_title}](/lessons/{vocab_id})\n\n**Up Next:**"
    updated_content = content.replace("**Up Next:**", new_text)
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(updated_content)
    
    count += 1
    print(f"Updated {filename}")

print(f"Total updated: {count}")
