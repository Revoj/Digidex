import sqlite3
import json
import os

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_SCRIPT_DIR)
DB_PATH = os.path.join(_SCRIPT_DIR, 'digidex.db')
INDEX_PATH = os.path.join(_PROJECT_ROOT, 'digimon_index.json')

def norm(name):
    """Normalize string for fuzzy matching (case, colons, hyphens, spaces)."""
    return name.lower().replace(':', '').replace('-', ' ').replace('  ', ' ').replace('(', '').replace(')', '').strip()

def main():
    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(f"Database not found at {DB_PATH}")
    if not os.path.exists(INDEX_PATH):
        raise FileNotFoundError(f"Index file not found at {INDEX_PATH}")

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Check and add 'slug' and 'chr_id' columns if missing
    c.execute("PRAGMA table_info(digimon)")
    columns = [col[1] for col in c.fetchall()]

    if 'slug' not in columns:
        print("Adding 'slug' column to 'digimon' table...")
        c.execute("ALTER TABLE digimon ADD COLUMN slug TEXT")

    if 'chr_id' not in columns:
        print("Adding 'chr_id' column to 'digimon' table...")
        c.execute("ALTER TABLE digimon ADD COLUMN chr_id TEXT")

    conn.commit()

    # Load digimon_index.json
    with open(INDEX_PATH, 'r', encoding='utf-8') as f:
        index_data = json.load(f)

    # Build maps for exact and normalized name matching
    index_by_name = {}
    index_by_norm = {}

    for item in index_data:
        name = item.get('name')
        if name:
            index_by_name[name.lower()] = item
            index_by_norm[norm(name)] = item

    # Get all digimon in DB
    c.execute("SELECT id, field_guide_number, name FROM digimon")
    db_digimon = c.fetchall()

    updated_count = 0
    missing_matches = []

    for digi_id, field_guide_num, name in db_digimon:
        matched_item = None
        n_lower = name.lower()
        n_norm = norm(name)

        if n_lower in index_by_name:
            matched_item = index_by_name[n_lower]
        elif n_norm in index_by_norm:
            matched_item = index_by_norm[n_norm]

        if matched_item:
            slug = matched_item.get('slug')
            chr_id = matched_item.get('chr_id')
            c.execute(
                "UPDATE digimon SET slug = ?, chr_id = ? WHERE id = ?",
                (slug, chr_id, digi_id)
            )
            updated_count += 1
        else:
            missing_matches.append((digi_id, field_guide_num, name))

    conn.commit()
    print(f"Successfully updated {updated_count} Digimon records with slug and chr_id.")
    if missing_matches:
        print(f"{len(missing_matches)} Digimon in DB were not in digimon_index.json (defaults kept).")

    conn.close()

if __name__ == "__main__":
    main()
