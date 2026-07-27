import sqlite3
import requests
from bs4 import BeautifulSoup
import concurrent.futures
import time
import os

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_NAME = os.path.join(_SCRIPT_DIR, 'digidex.db')

def setup_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    columns = [
        'fir_res', 'wtr_res', 'plt_res', 'ice_res', 'ele_res', 
        'ert_res', 'stl_res', 'wnd_res', 'lgt_res', 'drk_res', 'nul_res'
    ]
    
    # Check existing columns
    c.execute("PRAGMA table_info(digimon)")
    existing_cols = [row[1] for row in c.fetchall()]
    
    for col in columns:
        if col not in existing_cols:
            c.execute(f"ALTER TABLE digimon ADD COLUMN {col} TEXT")
            
    conn.commit()
    conn.close()

def get_resistance_value(td):
    img = td.find('img')
    if img and img.has_attr('alt'):
        alt = img['alt']
        if alt == '-': return 'Normal'
        if alt == '△': return 'Weak'
        if alt == '⭘': return 'Strong'
    return 'Normal'

def scrape_digimon_resistances(digi):
    digi_id, name, url = digi
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        res_h3 = None
        for h3 in soup.find_all('h3'):
            if 'Elemental Resistances' in h3.get_text():
                res_h3 = h3
                break
                
        if res_h3:
            table = res_h3.find_next_sibling('table')
            if table:
                rows = table.find_all('tr')
                if len(rows) >= 4:
                    tds_1 = rows[1].find_all(['td', 'th'])
                    tds_2 = rows[3].find_all(['td', 'th'])
                    
                    if len(tds_1) >= 6 and len(tds_2) >= 5:
                        fir = get_resistance_value(tds_1[0])
                        wtr = get_resistance_value(tds_1[1])
                        plt = get_resistance_value(tds_1[2])
                        ice = get_resistance_value(tds_1[3])
                        ele = get_resistance_value(tds_1[4])
                        ert = get_resistance_value(tds_1[5])
                        
                        stl = get_resistance_value(tds_2[0])
                        wnd = get_resistance_value(tds_2[1])
                        lgt = get_resistance_value(tds_2[2])
                        drk = get_resistance_value(tds_2[3])
                        nul = get_resistance_value(tds_2[4])
                        
                        return (digi_id, fir, wtr, plt, ice, ele, ert, stl, wnd, lgt, drk, nul)
                    else:
                        print(f"[{name}] Tds len mismatch: {len(tds_1)} and {len(tds_2)}")
                else:
                    print(f"[{name}] Rows len < 4")
            else:
                print(f"[{name}] No table sibling")
        else:
            print(f"[{name}] No Elemental Resistances h3")
    except Exception as e:
        print(f"Error scraping {name}: {e}")
    return None

def main():
    setup_db()
    
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("SELECT id, name, detail_url FROM digimon WHERE detail_url IS NOT NULL")
    digimon_list = c.fetchall()
    conn.close()
    
    print(f"Starting resistance scrape for {len(digimon_list)} Digimon...")
    start_time = time.time()
    
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        future_to_digi = {executor.submit(scrape_digimon_resistances, d): d for d in digimon_list}
        for i, future in enumerate(concurrent.futures.as_completed(future_to_digi)):
            res = future.result()
            if res:
                results.append(res)
            if i % 50 == 0:
                print(f"Processed {i}/{len(digimon_list)}...")
                
    # Update DB
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.executemany('''
        UPDATE digimon SET 
            fir_res=?, wtr_res=?, plt_res=?, ice_res=?, ele_res=?, 
            ert_res=?, stl_res=?, wnd_res=?, lgt_res=?, drk_res=?, nul_res=?
        WHERE id=?
    ''', [(r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10], r[11], r[0]) for r in results])
    conn.commit()
    conn.close()
    
    print(f"Successfully updated {len(results)} Digimon in {time.time() - start_time:.2f} seconds.")

if __name__ == '__main__':
    main()
