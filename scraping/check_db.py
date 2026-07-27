import sqlite3
import os

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
conn = sqlite3.connect(os.path.join(_SCRIPT_DIR, 'digidex.db'))
c = conn.cursor()

c.execute('SELECT COUNT(*) FROM digimon')
print(f'Total Digimon: {c.fetchone()[0]}')

c.execute('SELECT COUNT(*) FROM evolutions')
print(f'Total Evolutions: {c.fetchone()[0]}')

c.execute('SELECT COUNT(*) FROM digimon WHERE stage IS NOT NULL')
print(f'With stage info: {c.fetchone()[0]}')

c.execute('SELECT COUNT(*) FROM digimon WHERE hp > 0')
print(f'With stats: {c.fetchone()[0]}')

c.execute('SELECT DISTINCT stage FROM digimon WHERE stage IS NOT NULL')
print(f'Stages: {[r[0] for r in c.fetchall()]}')

c.execute('SELECT name, stage, attribute, hp, atk FROM digimon WHERE name = ?', ('Agumon',))
print(f'Agumon: {c.fetchone()}')

c.execute('''
    SELECT d2.name, e.conditions 
    FROM evolutions e 
    JOIN digimon d2 ON e.to_digimon_id = d2.id 
    JOIN digimon d1 ON e.from_digimon_id = d1.id 
    WHERE d1.name = ?
''', ('Agumon',))
print(f'Agumon evolutions:')
for row in c.fetchall():
    print(f'  -> {row[0]}: {row[1]}')

conn.close()
