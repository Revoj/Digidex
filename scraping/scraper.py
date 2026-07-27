import sqlite3
import requests
from bs4 import BeautifulSoup
import time
import re
import sys
import os

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_NAME = os.path.join(_SCRIPT_DIR, 'digidex.db')
BASE_URL = 'https://game8.co'
MAIN_URL = 'https://game8.co/games/Digimon-Story-Time-Stranger/archives/554944'
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

def init_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('''
    CREATE TABLE IF NOT EXISTS digimon (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        field_guide_number INTEGER,
        name TEXT NOT NULL UNIQUE,
        stage TEXT,
        attribute TEXT,
        type TEXT,
        personality TEXT,
        image_url TEXT,
        hp INTEGER DEFAULT 0,
        sp INTEGER DEFAULT 0,
        atk INTEGER DEFAULT 0,
        def_stat INTEGER DEFAULT 0,
        int_stat INTEGER DEFAULT 0,
        spi INTEGER DEFAULT 0,
        spd INTEGER DEFAULT 0,
        detail_url TEXT,
        slug TEXT,
        chr_id TEXT
    )
    ''')
    c.execute('''
    CREATE TABLE IF NOT EXISTS evolutions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_digimon_id INTEGER REFERENCES digimon(id),
        to_digimon_id INTEGER REFERENCES digimon(id),
        conditions TEXT,
        UNIQUE(from_digimon_id, to_digimon_id)
    )
    ''')
    conn.commit()
    return conn

def scrape_main_page(conn):
    print("Fetching main page...")
    response = requests.get(MAIN_URL, headers=HEADERS)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, 'lxml')
    
    target_table = None
    for tbl in soup.find_all('table'):
        headers = [th.get_text(strip=True) for th in tbl.find_all('th')]
        if 'De-Digivolve' in headers and 'Current' in headers and 'Digivolve' in headers:
            target_table = tbl
            break
            
    if not target_table:
        print("Could not find the main evolution table.")
        return []
        
    c = conn.cursor()
    digimons = []
    
    rows = target_table.find('tbody').find_all('tr') if target_table.find('tbody') else target_table.find_all('tr')
    for row in rows:
        tds = row.find_all('td')
        if len(tds) < 3:
            continue
            
        center_td = tds[1] # center column
        b_tag = center_td.find('b', class_='a-bold')
        a_tag = center_td.find('a')
        img_tag = center_td.find('img')
        
        if not b_tag or not a_tag:
            continue
            
        field_guide_text = b_tag.get_text(strip=True).replace('#', '')
        try:
            field_guide_number = int(field_guide_text)
        except ValueError:
            field_guide_number = None
            
        detail_url = a_tag.get('href')
        if detail_url and not detail_url.startswith('http'):
            detail_url = BASE_URL + detail_url
            
        name = a_tag.get_text(strip=True)
        if not name and img_tag:
             name = center_td.get_text(strip=True).replace(b_tag.get_text(strip=True), '').strip()
            
        image_url = img_tag.get('data-src') if img_tag else None
        
        c.execute('''
        INSERT INTO digimon (field_guide_number, name, image_url, detail_url)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(name) DO UPDATE SET
            field_guide_number=excluded.field_guide_number,
            image_url=excluded.image_url,
            detail_url=excluded.detail_url
        ''', (field_guide_number, name, image_url, detail_url))
        
        digimons.append({
            'name': name,
            'detail_url': detail_url
        })
        
    conn.commit()
    print(f"Found {len(digimons)} digimon on main page.")
    return digimons

def scrape_detail_page(conn, name, detail_url, index, total):
    print(f"Scraping {index}/{total}: {name}...")
    try:
        response = requests.get(detail_url, headers=HEADERS)
        response.raise_for_status()
    except Exception as e:
        print(f"Failed to fetch {detail_url}: {e}")
        return
        
    soup = BeautifulSoup(response.text, 'lxml')
    c = conn.cursor()
    
    # 1. Basic Info
    basic_info_h3 = soup.find(lambda tag: tag.name == "h3" and "Basic Info" in tag.text)
    stage, attribute, digi_type, personality = None, None, None, None
    
    if basic_info_h3:
        info_table = basic_info_h3.find_next_sibling('table')
        if info_table:
            rows = info_table.find_all('tr')
            # The table structure is:
            # Row 0 (headers): Field Guide # | Attribute | Generation
            # Row 1 (data):    [image rowspan=3] | Vaccine | Rookie
            # Row 2 (headers): Type | Base Personality
            # Row 3 (data):    Reptile | Daring
            
            # Parse row pairs: header row + data row
            for i in range(0, len(rows) - 1, 2):
                header_row = rows[i]
                data_row = rows[i + 1]
                headers = [th.get_text(strip=True).lower() for th in header_row.find_all('th')]
                data_cells = data_row.find_all('td')
                
                # The first data row may have a rowspan cell (image) that takes the first position
                # Align data cells to headers by checking if we have an image cell (rowspan)
                cell_values = []
                for td in data_cells:
                    cell_values.append(td)
                
                # Map headers to cells - skip the rowspan image cell
                # If there are fewer data cells than headers, 
                # the first header (Field Guide) maps to the rowspan cell
                offset = len(headers) - len(cell_values)
                
                for j, header in enumerate(headers):
                    cell_idx = j - offset
                    if cell_idx < 0 or cell_idx >= len(cell_values):
                        continue
                    td = cell_values[cell_idx]
                    val_text = td.get_text(strip=True)
                    
                    if 'attribute' in header and not attribute:
                        attribute = val_text
                    elif 'generation' in header and not stage:
                        a_tag = td.find('a')
                        stage = a_tag.get_text(strip=True) if a_tag else val_text
                    elif 'type' in header and 'personality' not in header and not digi_type:
                        digi_type = val_text
                    elif 'personality' in header and not personality:
                        personality = val_text
                        
    # 2. Stats at Lv99
    stats_h3 = soup.find(lambda tag: tag.name == "h3" and "Level 99 Stats" in tag.text)
    hp, sp, atk, def_stat, int_stat, spi, spd = 0, 0, 0, 0, 0, 0, 0
    if stats_h3:
        stats_table = stats_h3.find_next_sibling('table')
        if stats_table:
            for tr in stats_table.find_all('tr'):
                th = tr.find('th')
                td = tr.find('td')
                if th and td:
                    header_text = th.get_text(strip=True).upper()
                    val_div = td.find('div', class_='a-label')
                    val_text = val_div.get_text(strip=True) if val_div else td.get_text(strip=True)
                    try:
                        val = int(val_text)
                        if 'HP' in header_text: hp = val
                        elif 'SP' in header_text: sp = val
                        elif 'ATK' in header_text: atk = val
                        elif 'DEF' in header_text: def_stat = val
                        elif 'INT' in header_text: int_stat = val
                        elif 'SPI' in header_text: spi = val
                        elif 'SPD' in header_text: spd = val
                    except ValueError:
                        pass
                        
    c.execute('''
    UPDATE digimon SET
        stage=?, attribute=?, type=?, personality=?,
        hp=?, sp=?, atk=?, def_stat=?, int_stat=?, spi=?, spd=?
    WHERE name=?
    ''', (stage, attribute, digi_type, personality, hp, sp, atk, def_stat, int_stat, spi, spd, name))
    
    # 3. Evolutions (forward evolutions with conditions)
    # Find the heading that says "Evolutions" but NOT "Evolution Requirements"
    evo_h3 = None
    for h3 in soup.find_all('h3'):
        h3_text = h3.get_text(strip=True)
        if h3_text.endswith('Evolutions') and 'Requirements' not in h3_text and 'De-Digivolution' not in h3_text:
            evo_h3 = h3
            break
    
    if evo_h3:
        evo_table = evo_h3.find_next_sibling('table')
        if evo_table:
            # Check that this table has Digivolution/Requirements headers
            first_ths = evo_table.find_all('th')
            header_texts = [th.get_text(strip=True) for th in first_ths[:2]]
            if any('Digivolution' in h for h in header_texts):
                rows = evo_table.find('tbody').find_all('tr', recursive=False) if evo_table.find('tbody') else evo_table.find_all('tr')
                for tr in rows:
                    tds = tr.find_all('td', recursive=False)
                    if len(tds) >= 2:
                        digi_td = tds[0]
                        req_td = tds[1]
                        
                        a_tag = digi_td.find('a')
                        if a_tag:
                            to_name = a_tag.get_text(strip=True)
                            conditions = req_td.get_text(separator=', ', strip=True)
                            conditions = conditions.replace('・ ', '').replace('・', '').strip()
                            if conditions.startswith(','):
                                conditions = conditions[1:].strip()
                            
                            c.execute('SELECT id FROM digimon WHERE name=?', (name,))
                            from_row = c.fetchone()
                            c.execute('SELECT id FROM digimon WHERE name=?', (to_name,))
                            to_row = c.fetchone()
                            
                            if from_row and to_row:
                                c.execute('''
                                INSERT OR IGNORE INTO evolutions (from_digimon_id, to_digimon_id, conditions)
                                VALUES (?, ?, ?)
                                ''', (from_row[0], to_row[0], conditions))
                                
                                c.execute('''
                                UPDATE evolutions SET conditions=?
                                WHERE from_digimon_id=? AND to_digimon_id=?
                                ''', (conditions, from_row[0], to_row[0]))
                                
    conn.commit()

def main():
    conn = init_db()
    digimons = scrape_main_page(conn)
    total = len(digimons)
    for i, d in enumerate(digimons, 1):
        if d['detail_url']:
            scrape_detail_page(conn, d['name'], d['detail_url'], i, total)
            time.sleep(0.3)
    conn.close()
    print("Scraping completed.")

if __name__ == '__main__':
    main()
