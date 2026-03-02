import json
import os

data = {
    "A1 Foundations & Survival": [
        { "id": "basics", "title": "The Greek Alphabet" },
        { "id": "double-letters", "title": "Double Letters" },
        { "id": "read", "title": "Learn to Read" },
        { "id": "vowels-consonants", "title": "Vowels and Consonants" },
        { "id": "accents", "title": "Accents (Τονισμός)" },
        { "id": "punctuation", "title": "Punctuation Marks" },
        { "id": "nouns", "title": "Introduction to Nouns" },
        { "id": "genders", "title": "The Genders" },
        { "id": "articles", "title": "The Articles" },
        { "id": "cases", "title": "The Cases" },
        { "id": "declension", "title": "The Declension" },
        { "id": "masculine-declension", "title": "Masculine Declension" },
        { "id": "feminine-declension", "title": "Feminine Declension" },
        { "id": "neuter-declension", "title": "Neuter Declension" },
        { "id": "articles-declension", "title": "Articles Declension" },
        { "id": "verb-to-be", "title": "The Verb 'To Be' (Είμαι)" },
        { "id": "have-verb", "title": "The Verb 'To Have' (Έχω)" },
        { "id": "personal-pronouns", "title": "Personal Pronouns" },
        { "id": "verbs", "title": "Introduction to Verbs" },
        { "id": "verb-groups", "title": "Groups of Verbs" },
        { "id": "conjugation-present", "title": "Present Conjugation (Type A)" },
        { "id": "negation", "title": "Negation" },
        { "id": "accusative-case", "title": "The Accusative Case & Direct Objects" },
        { "id": "adjectives", "title": "The Adjectives" },
        { "id": "colors-numbers", "title": "Colors and Numbers" },
        { "id": "interrogative-pronouns", "title": "Asking Questions (Interrogatives)" }
    ],
    "A2 Expansion & Daily Life": [
        { "id": "plurals", "title": "Plural Nouns & Adjectives" },
        { "id": "verb-groups-b", "title": "Verb Groups B1 & B2" },
        { "id": "subjunctive-1", "title": "The Subjunctive Mood (Part 1)" },
        { "id": "future-continuous", "title": "The Continuous Future" },
        { "id": "imperfect-tense", "title": "The Imperfect Tense (Continuous Past)" },
        { "id": "past-conjugation", "title": "Past Conjugation Basics" },
        { "id": "genitive-case", "title": "The Genitive Case" },
        { "id": "possessive-pronouns", "title": "Possessive Pronouns" },
        { "id": "object-pronouns", "title": "Direct and Indirect Object Pronouns" },
        { "id": "demonstrative-pronouns", "title": "Demonstrative Pronouns" },
        { "id": "indefinite-pronouns", "title": "Indefinite Pronouns" },
        { "id": "tenses", "title": "Overview of Verb Tenses" },
        { "id": "auxiliary-verbs", "title": "Auxiliary Verbs" },
        { "id": "voices-moods", "title": "Voices and Moods Overview" }
    ],
    "B1 The Great Divide: Verbal Aspect": [
        { "id": "aspect-intro", "title": "Introduction to Verbal Aspect" },
        { "id": "aorist-past", "title": "The Aorist (Simple Past)" },
        { "id": "simple-future", "title": "The Simple Future" },
        { "id": "simple-subjunctive", "title": "The Simple Subjunctive" },
        { "id": "deponent-verbs", "title": "Deponent Verbs (-ομαι)" },
        { "id": "imperative", "title": "The Imperative (Commands)" },
        { "id": "degrees-adjectives", "title": "Degrees of Adjectives" },
        { "id": "adverbs", "title": "The Adverbs" },
        { "id": "prepositions", "title": "The Prepositions" },
        { "id": "conjunctions", "title": "The Conjunctions" }
    ],
    "B2 Fluency & Nuance": [
        { "id": "passive-voice", "title": "True Passive Voice" },
        { "id": "perfect-tenses", "title": "The Perfect Tenses" },
        { "id": "participles", "title": "Active & Passive Participles" },
        { "id": "conditionals-1-2", "title": "Conditional Sentences (Type 1 & 2)" },
        { "id": "relative-pronouns", "title": "Relative Pronouns" },
        { "id": "reflexive-pronouns", "title": "Reflexive Pronouns" },
        { "id": "impersonal-verbs", "title": "Impersonal Verbs & Expressions" },
        { "id": "definite-pronouns", "title": "Definite Pronouns" }
    ],
    "C1 Advanced Syntax & Idioms": [
        { "id": "conditionals-3", "title": "Conditional Sentences (Type 3)" },
        { "id": "diminutives", "title": "Diminutives and Augmentatives" },
        { "id": "particles", "title": "The Particles" },
        { "id": "advanced-particles", "title": "Nuanced Particles" },
        { "id": "subjunctive-advanced", "title": "Advanced Subjunctive Usage" },
        { "id": "compound-words", "title": "Compound Words" }
    ],
    "C2 Mastery & Archaisms": [
        { "id": "ancient-remnants", "title": "Ancient Remnants in Modern Greek" },
        { "id": "genitive-absolute", "title": "Participles in the Genitive Absolute" },
        { "id": "irregular-verbs-nouns", "title": "Irregular & Defective Nouns and Verbs" },
        { "id": "idioms-proverbs", "title": "Idiomatic Expressions & Proverbs" }
    ],
    "Practical Greek": [
        { "id": "phrases", "title": "Essential Phrases" },
        { "id": "social-expressions", "title": "Social Expressions" },
        { "id": "dialogues-travel", "title": "Travel Dialogues" },
        { "id": "interjections", "title": "Interjections" }
    ]
}

# Add num sequential
num = 1
for category in data.values():
    for lesson in category:
        lesson["num"] = num
        num += 1

curriculum_path = r"c:\Users\APRON\Documents\apps\greek\data\el\curriculum.json"
with open(curriculum_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=4, ensure_ascii=False)

lessons_dir = r"c:\Users\APRON\Documents\apps\greek\data\el\lessons"
os.makedirs(lessons_dir, exist_ok=True)

for category in data.values():
    for lesson in category:
        filename = os.path.join(lessons_dir, f"{lesson['id']}.md")
        if not os.path.exists(filename):
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(f"# {lesson['title']}\n\nContent for {lesson['title']} goes here.\n")
print(f"Generated {num-1} lessons and updated curriculum.json")
