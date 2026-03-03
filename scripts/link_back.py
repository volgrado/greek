import os

links_back = {
    "vocabulary-survival.md": ("accusative-case", "Unit 5: The Accusative Case"),
    "vocabulary-family-people.md": ("nouns", "Unit 2: The Basics of Nouns"),
    "vocabulary-everyday-objects.md": ("accusative-case", "Unit 5: The Accusative Case"),
    "vocabulary-action-verbs.md": ("verbs", "Unit 4: Intro to Verbs (Type A)"),
    "vocabulary-colors-numbers.md": ("adjectives", "Unit 6: Adjectives & Agreement"),
    "vocabulary-questions.md": ("interrogative-pronouns", "Unit 7: Asking Questions"),

    "vocabulary-shopping-clothes.md": ("plurals", "Unit 8: Plural Nouns & Adjectives"),
    "vocabulary-routines-hobbies.md": ("verb-groups-b", "Unit 9: Verb Groups B1 & B2"),
    "vocabulary-food-restaurant.md": ("simple-stem", "Unit 12: Building the Simple Stem"),
    "vocabulary-time-calendar.md": ("future-continuous", "Unit 11: Future Tenses (Θα)"),

    "vocabulary-family-possessions.md": ("genitive-case", "Unit 15: Genitive Case"),
    "vocabulary-directions-commands.md": ("imperative", "Unit 16: Imperative Mood"),
    "vocabulary-deponent-states.md": ("deponent-verbs", "Unit 18: Passive & Deponent Verbs"),
    "vocabulary-travel-experiences.md": ("perfect-tenses", "Unit 20: The Perfect Tenses"),

    "vocabulary-particles-fillers.md": ("particles", "Unit 22: Spoken Expressions"),
    "vocabulary-adjectives-comparisons.md": ("adjective-comparison", "Unit 25: Adjective Comparison"),
    "vocabulary-impersonal-weather.md": ("impersonal-verbs", "Unit 27: Impersonal Verbs"),
    "vocabulary-beliefs-society.md": ("relative-pronouns", "Unit 23: Relative Pronouns"),

    "vocabulary-affection-emotion.md": ("diminutives", "Unit 29: Diminutives")
}

directory = r"C:\Users\APRON\Documents\apps\greek\data\el\lessons"

count = 0
for filename, (grammar_id, grammar_title) in links_back.items():
    filepath = os.path.join(directory, filename)
    if not os.path.exists(filepath):
        print(f"Skipping {filename} - not found.")
        continue
        
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
        
    if "**Practice Grammar:**" in content:
        print(f"Skipping {filename} - already linked.")
        continue
        
    new_text = f"\n\n---\n\n**Practice Grammar:** [{grammar_title}](/lessons/{grammar_id})\n"
    
    with open(filepath, "a", encoding="utf-8") as f:
        f.write(new_text)
    
    count += 1
    print(f"Appended to {filename}")

print(f"Total updated: {count}")
