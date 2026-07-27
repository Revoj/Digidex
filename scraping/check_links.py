import json
import urllib.request
import urllib.error
import concurrent.futures
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_PATH = os.path.join(SCRIPT_DIR, '..', 'docs', 'data.json')

with open(JSON_PATH, 'r', encoding='utf-8') as f:
    data = json.load(f)

def check_url(digi):
    url = digi.get('full_image_url')
    if not url:
        return digi['name'], "No URL"
        
    req = urllib.request.Request(url, method='HEAD', headers={'User-Agent': 'Mozilla/5.0'})
    try:
        urllib.request.urlopen(req, timeout=5)
        return None
    except urllib.error.HTTPError as e:
        return digi['name'], str(e.code)
    except Exception as e:
        return digi['name'], str(e)

print("Testing 475 image links...")
broken = []
with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
    results = executor.map(check_url, data)
    for res in results:
        if res:
            broken.append(res)

print(f"\nFound {len(broken)} broken links:")
for name, err in broken:
    print(f"{name}: {err}")

with open(os.path.join(SCRIPT_DIR, 'broken_links.json'), 'w') as f:
    json.dump([b[0] for b in broken], f, indent=2)
