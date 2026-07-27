import sqlite3
import json
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler
import re
import os

# Resolve paths relative to this script's location
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_SCRIPT_DIR)
DB_NAME = os.path.join(_PROJECT_ROOT, 'scraping', 'digidex.db')
_DOCS_DIR = os.path.join(_PROJECT_ROOT, 'docs')

def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

def get_db():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = dict_factory
    return conn

class DigidexHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()
        
    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        
        if path.startswith('/api/'):
            self.handle_api(parsed_url)
        else:
            super().do_GET()
            
    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
        
    def handle_api(self, parsed_url):
        path = parsed_url.path
        query = urllib.parse.parse_qs(parsed_url.query)
        conn = get_db()
        c = conn.cursor()
        
        try:
            if path == '/api/digimon':
                c.execute("SELECT * FROM digimon ORDER BY field_guide_number")
                data = c.fetchall()
                self.send_json(data)
                
            elif path.startswith('/api/digimon/'):
                match = re.match(r'/api/digimon/(\d+)', path)
                if match:
                    digimon_id = int(match.group(1))
                    c.execute("SELECT * FROM digimon WHERE id=?", (digimon_id,))
                    data = c.fetchone()
                    if data:
                        c.execute('''
                            SELECT to_id.id as to_id, to_id.name as to_name, to_id.image_url as to_image_url, to_id.stage as to_stage, e.conditions
                            FROM evolutions e
                            JOIN digimon to_id ON e.to_digimon_id = to_id.id
                            WHERE e.from_digimon_id = ?
                        ''', (digimon_id,))
                        data['evolutions'] = c.fetchall()
                        
                        c.execute('''
                            SELECT from_id.id as from_id, from_id.name as from_name, from_id.image_url as from_image_url, from_id.stage as from_stage
                            FROM evolutions e
                            JOIN digimon from_id ON e.from_digimon_id = from_id.id
                            WHERE e.to_digimon_id = ?
                        ''', (digimon_id,))
                        data['de_digivolutions'] = c.fetchall()
                        
                        self.send_json(data)
                    else:
                        self.send_json({"error": "Not found"}, 404)
                else:
                    self.send_json({"error": "Invalid ID"}, 400)
                    
            elif path == '/api/search':
                q_name = query.get('q', [''])[0]
                q_stage = query.get('stage', [''])[0]
                q_attr = query.get('attribute', [''])[0]
                
                sql = "SELECT * FROM digimon WHERE 1=1"
                params = []
                if q_name:
                    sql += " AND name LIKE ?"
                    params.append(f"%{q_name}%")
                if q_stage:
                    sql += " AND stage = ?"
                    params.append(q_stage)
                if q_attr:
                    sql += " AND attribute = ?"
                    params.append(q_attr)
                    
                c.execute(sql, params)
                data = c.fetchall()
                self.send_json(data)
                
            elif path.startswith('/api/evolution-chain/'):
                match = re.match(r'/api/evolution-chain/(\d+)', path)
                if match:
                    digimon_id = int(match.group(1))
                    
                    c.execute("SELECT id, name, stage, image_url FROM digimon WHERE id=?", (digimon_id,))
                    current = c.fetchone()
                    
                    if not current:
                        self.send_json({"error": "Not found"}, 404)
                        return
                        
                    def get_ancestors(did, depth=2):
                        if depth == 0: return []
                        c.execute('''
                            SELECT from_id.id, from_id.name, from_id.stage, from_id.image_url
                            FROM evolutions e
                            JOIN digimon from_id ON e.from_digimon_id = from_id.id
                            WHERE e.to_digimon_id = ?
                        ''', (did,))
                        parents = c.fetchall()
                        for p in parents:
                            p['ancestors'] = get_ancestors(p['id'], depth - 1)
                        return parents
                        
                    def get_descendants(did, depth=2):
                        if depth == 0: return []
                        c.execute('''
                            SELECT to_id.id, to_id.name, to_id.stage, to_id.image_url, e.conditions
                            FROM evolutions e
                            JOIN digimon to_id ON e.to_digimon_id = to_id.id
                            WHERE e.from_digimon_id = ?
                        ''', (did,))
                        children = c.fetchall()
                        for child in children:
                            child['descendants'] = get_descendants(child['id'], depth - 1)
                        return children
                        
                    result = {
                        "ancestors": get_ancestors(digimon_id, 2),
                        "current": current,
                        "descendants": get_descendants(digimon_id, 2)
                    }
                    self.send_json(result)
                else:
                    self.send_json({"error": "Invalid ID"}, 400)
            else:
                self.send_json({"error": "Not found"}, 404)
        except Exception as e:
            self.send_json({"error": str(e)}, 500)
        finally:
            conn.close()

def run(server_class=HTTPServer, handler_class=DigidexHandler, port=8000):
    # Serve static files from the docs directory
    os.chdir(_DOCS_DIR)
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f'Starting httpd server on port {port}...')
    print(f'Serving files from: {_DOCS_DIR}')
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    httpd.server_close()
    print('Server stopped.')

if __name__ == '__main__':
    run()
