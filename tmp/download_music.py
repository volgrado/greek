import urllib.request
import shutil

# GitHub Sample Music link
url = "https://github.com/rafaelreis-hotmart/Audio-Sample-Files/raw/master/sample.mp3"
output = "assets/audio/podcast_bg.mp3"

req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response, open(output, 'wb') as out_file:
        shutil.copyfileobj(response, out_file)
    print(f"SUCCESS: Downloaded {output}")
except Exception as e:
    print(f"ERROR: {e}")
