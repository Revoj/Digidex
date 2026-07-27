# Digidex

Base de datos y visor de evoluciones para **Digimon Story: Time Stranger** (Digimon Story: Cyber Sleuth - Complete Edition).

🔗 **[Ver en vivo → revoj.github.io/Digidex](https://revoj.github.io/Digidex/)**

## Características

- 📋 **475 Digimon** con stats, atributos, etapas y personalidades
- 🔍 Búsqueda por nombre con autocompletado y preview
- 🏷️ Filtros por etapa y atributo (con iconos)
- 🗺️ **Vista de grafo** interactiva con vis.js para explorar cadenas evolutivas
- 📊 **Vista de cuadrícula** con tarjetas detalladas
- 🧬 Panel lateral con stats, resistencias elementales y enlaces externos
- 🔗 Enlaces a guías de [Game8](https://game8.co) y modelos 3D de [Nuffle](https://nuffle.me)
- 🌲 **Trace Origins** — rastreo recursivo de todos los orígenes evolutivos de un Digimon
- 📱 Diseño responsivo

## Estructura del proyecto

```
Digidex/
├── docs/                  # Sitio web (GitHub Pages)
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   └── data.json          # Datos exportados de la DB
├── scraping/              # Flujos de scraping
│   ├── scraper.py         # Scraper principal (Game8)
│   ├── update_resistances.py
│   ├── check_db.py
│   ├── export_json.py     # Exporta DB → docs/data.json
│   ├── requirements.txt
│   └── digidex.db         # Base de datos SQLite
├── server/                # Versión con servidor Python
│   ├── server.py          # API REST + servidor de archivos
│   └── start-digidex.bat  # Script de arranque (Windows)
└── .gitignore
```

## Uso

### Versión online (Single Page)

Disponible en [revoj.github.io/Digidex](https://revoj.github.io/Digidex/). No requiere instalación.

### Versión local con servidor

```bash
# Opción 1: Ejecutar el bat (Windows)
server/start-digidex.bat

# Opción 2: Ejecutar manualmente
python server/server.py
# Abrir http://localhost:8000
```

### Scraping (actualizar datos)

```bash
pip install -r scraping/requirements.txt

# Scraper principal
python scraping/scraper.py

# Actualizar resistencias
python scraping/update_resistances.py

# Exportar a JSON para el sitio
python scraping/export_json.py

# Verificar datos
python scraping/check_db.py
```

## Stack

- **Frontend:** HTML, CSS, JavaScript vanilla
- **Grafo:** [vis.js](https://visjs.org/) (vis-network)
- **Fuente:** [Inter](https://fonts.google.com/specimen/Inter) + [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk)
- **Scraping:** Python, BeautifulSoup, SQLite
- **Servidor:** Python http.server
- **Deploy:** GitHub Pages (`/docs`)

## Datos

Los datos se obtienen de [Game8](https://game8.co/games/Digimon-Story-Time-Stranger). Cada Digimon incluye:

| Campo | Descripción |
|-------|-------------|
| Stats | HP, SP, ATK, DEF, INT, SPD |
| Resistencias | Fire, Water, Plant, Ice, Elec, Earth, Steel, Wind, Light, Dark, Null |
| Evoluciones | Digivolves to / De-digivolves from con condiciones |
| Metadata | Stage, Attribute, Type, Personality |

---

> Este es un proyecto de fan. Digimon y todos los nombres relacionados son propiedad de Bandai Namco.
