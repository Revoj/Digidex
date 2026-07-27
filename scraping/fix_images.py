import json
import os
import requests
from bs4 import BeautifulSoup
import urllib.parse
from concurrent.futures import ThreadPoolExecutor

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_PATH = os.path.join(SCRIPT_DIR, '..', 'docs', 'data.json')

with open(JSON_PATH, 'r', encoding='utf-8') as f:
    data = json.load(f)

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

def is_broken(url):
    try:
        r = requests.get(url, headers=headers, timeout=5, stream=True)
        content_type = r.headers.get('Content-Type', '')
        if 'text/html' in content_type:
            return True
        if r.status_code != 200:
            return True
        return False
    except:
        return True

def get_fandom_image(name):
    # Try Spanish wiki
    search_name = urllib.parse.quote(name.replace(' ', '_'))
    urls_to_try = [
        f"https://digiworld.fandom.com/es/wiki/{search_name}",
        f"https://digimon.fandom.com/wiki/{search_name}"
    ]
    
    for url in urls_to_try:
        try:
            r = requests.get(url, headers=headers, timeout=5)
            if r.status_code == 200:
                soup = BeautifulSoup(r.text, 'lxml')
                
                # Try finding pi-image (infobox image)
                infobox_img = soup.find('figure', class_='pi-image')
                if infobox_img:
                    a_tag = infobox_img.find('a')
                    if a_tag and a_tag.get('href'):
                        img_url = a_tag['href']
                        # Remove revision params
                        return img_url.split('/revision/')[0]
                
                # Fallback to og:image
                og_img = soup.find('meta', property='og:image')
                if og_img and og_img.get('content'):
                    return og_img['content'].split('/revision/')[0]
        except Exception as e:
            continue
    return None

def process_digimon(digi):
    url = digi.get('full_image_url')
    if not url:
        return None
    
    if is_broken(url):
        print(f"Broken: {digi['name']}")
        new_url = get_fandom_image(digi['name'])
        if new_url:
            print(f" -> Found on Fandom: {new_url}")
            digi['full_image_url'] = new_url
            return True
        else:
            print(f" -> Fandom fallback failed for {digi['name']}")
            # Fallback to game8 image url if absolutely no fandom
            digi['full_image_url'] = digi.get('image_url')
            return True
    return False

print("Checking for broken images and updating from Fandom...")
changed = 0
with ThreadPoolExecutor(max_workers=10) as executor:
    results = executor.map(process_digimon, data)
    changed = sum(1 for r in results if r)

if changed > 0:
    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Updated {changed} broken images.")
else:
    print("All images are working!")
