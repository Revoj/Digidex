import sqlite3
import json
import os

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_NAME = os.path.join(_SCRIPT_DIR, 'digidex.db')
OUTPUT_PATH = os.path.join(os.path.dirname(_SCRIPT_DIR), 'docs', 'data.json')

def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

def main():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = dict_factory
    c = conn.cursor()
    
    # Get all digimon
    c.execute("SELECT * FROM digimon ORDER BY field_guide_number")
    digimon_list = c.fetchall()
    
    # Get all evolutions and de-evolutions for each
    for digi in digimon_list:
        digimon_id = digi['id']
        
        # Evolutions
        c.execute('''
            SELECT to_id.id as to_id, to_id.name as to_name, to_id.image_url as to_image_url, to_id.stage as to_stage, e.conditions
            FROM evolutions e
            JOIN digimon to_id ON e.to_digimon_id = to_id.id
            WHERE e.from_digimon_id = ?
        ''', (digimon_id,))
        digi['evolutions'] = c.fetchall()
        
        # De-evolutions
        c.execute('''
            SELECT from_id.id as from_id, from_id.name as from_name, from_id.image_url as from_image_url, from_id.stage as from_stage
            FROM evolutions e
            JOIN digimon from_id ON e.from_digimon_id = from_id.id
            WHERE e.to_digimon_id = ?
        ''', (digimon_id,))
        digi['de_digivolutions'] = c.fetchall()
        
    # Write to JSON file
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(digimon_list, f, ensure_ascii=False, indent=2)
        
    print(f"Exported {len(digimon_list)} Digimon to data.json successfully!")
    conn.close()

if __name__ == "__main__":
    main()
