import asyncio
from generate_audio import generate_chapter_audio

async def main():
    en_prompt = "The boat arrives at the port of Aegina. The storm is over, but the ground is wet. Nestoras needs to find the Temple of Aphaia. He asks an old man for the way. The temple is far, and he must choose how to get there."
    gr_story = "Πώς πάω στον Ναό της Αφαίας; Πρέπει να πάτε ίσια, λέει ο άντρας. Μετά, στρίψτε αριστερά. Μήπως είναι δεξιά ο δρόμος; Όχι, είναι πολύ μακριά από εδώ. Πηγαίνετε με το λεωφορείο; Όχι, θέλω να πάω με τα πόδια. Πού είναι η στάση για το ταξί; Είναι δίπλα στο λιμάνι."
    
    await generate_chapter_audio("chapter-13", en_prompt, gr_story)

if __name__ == "__main__":
    asyncio.run(main())
