<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white" alt="Vite 6" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Nivo-Charts-FF6B6B?logo=d3.js&logoColor=white" alt="Nivo Charts" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License" />
</p>

# 📊 Dashboard PBA — Inteligencia Estratégica Provincial

**La provincia de Buenos Aires, en datos.** Una plataforma para explorar 16 informes ejecutivos, 13 datasets municipales, mapas 3D interactivos y un asistente de IA que responde preguntas sobre datos públicos.

> 🇦🇷 Convertimos datos abiertos del Estado argentino en inteligencia estratégica accesible para periodistas, funcionarios, investigadores y ciudadanía.

---

## 🧭 Guía rápida

Cuatro grandes ejes para navegar la plataforma:

| Eje | Qué encontrás | Ruta |
|-----|---------------|------|
| 📋 **Informes ejecutivos** | 16 informes con análisis, KPIs y charts | `/poblacion/...`, `/educacion`, `/salud`, ... |
| 🌆 **Conurbano** | Mapa 3D educativo + scrollytelling de seguridad (2000-2024) | `/conurbano/educacion`, `/conurbano/seguridad` |
| 🔍 **Explorador de datos** | Catálogo de 13 datasets tabulares, filtrables y descargables | `/explorar` |
| 💬 **Chat con IA** | Preguntas en lenguaje natural sobre los datos | `/chat` |

---

## 🏠 Inicio (`/`)

La landing presenta la plataforma con cuatro KPIs macro (17,5M habitantes, 135 municipios, 16 informes, 80K+ registros), accesos directos a las secciones principales y un recorrido por las categorías disponibles. Desde acá podés saltar a cualquier informe o al explorador en un click.

---

## 📋 Informes ejecutivos

Cada informe combina **texto narrativo en Markdown** + **KPIs animados** + **charts auto-generados** (barras, torta, líneas) + **mapa coroplético** de los 135 municipios cuando aplica. El layout es split: análisis a la izquierda, visualizaciones sticky a la derecha.

### Población (`/poblacion/...`) — 8 sub-informes basados en Censo 2022 INDEC

| Sub-informe | Ruta |
|-------------|------|
| Estructura por sexo y edad | `/poblacion/estructura` |
| Hábitat — personas | `/poblacion/habitacional-personas` |
| Hábitat — hogares | `/poblacion/habitacional-hogares` |
| Stock de viviendas | `/poblacion/viviendas` |
| Asistencia educativa | `/poblacion/educacion-censal` |
| Características económicas | `/poblacion/economia` |
| Salud y previsión social | `/poblacion/salud-prevision` |
| Fecundidad | `/poblacion/fecundidad` |

### Sectoriales — 6 informes

| Informe | Ruta | Foco |
|---------|------|------|
| 📚 Educación | `/educacion` | Sistema educativo provincial + Aprender 2024 |
| 🏥 Salud | `/salud` | Mortalidad materno-infantil |
| 🔒 Seguridad | `/seguridad` | Hechos delictivos por municipio |
| 💰 Economía & Fiscal | `/economia-fiscal` | Recaudación, coparticipación, empleo |
| 🌾 Agro & Pesca | `/agricultura` | Stock bovino, pesca, oleaginosas |
| 🏭 Industria | `/industria` | Parques industriales |

---

## 🌆 Conurbano (visualizaciones especiales)

### Vulnerabilidad Escolar — `/conurbano/educacion`
**Mapa 3D** que cruza radios censales con escuelas en los 24 partidos del Conurbano. Permite identificar zonas con alta densidad poblacional y baja oferta educativa. Optimizado para mobile con renderizado bajo demanda (Web Worker + TopoJSON simplificado).

### Inseguridad 2000-2024 — `/conurbano/seguridad`
**Scrollytelling interactivo** que recorre 25 años de evolución delictiva en el Conurbano usando datos del SNIC. La narrativa se va revelando a medida que scrolleás, con charts y mapas que se actualizan según el momento histórico.

---

## 🔍 Explorador de datos (`/explorar`)

Un catálogo de **13 datasets** abiertos con interfaz tipo data warehouse:

- **Búsqueda** por nombre, fuente o categoría
- **Filtros** por área temática (Seguridad, Salud, Economía, Agro, Educación, Conurbano)
- **Tabla interactiva** (`/explorar/:datasetId`) con ordenamiento, paginación y filtros por columna
- **Auto-charts** generados según el tipo de datos del dataset
- **Citación de fuentes** oficiales en cada vista

Datasets destacados: delitos por tipo y municipio, nacimientos y mortalidad, PBG y exportaciones, capturas pesqueras, stock bovino, establecimientos educativos, pruebas Aprender, radios censales del GBA.

---

## 💬 Chat con IA (`/chat`)

Asistente conversacional con contexto de la plataforma. Respondé preguntas como:

- *"¿Qué municipios tienen mayor recaudación de ingresos brutos?"*
- *"Mostrame la evolución de delitos contra la propiedad en La Matanza"*
- *"¿Cuántas escuelas hay en el Conurbano sur?"*

Trae **preguntas sugeridas** por categoría (Economía, Municipios, Seguridad, Agricultura) para arrancar.

---

## 🎤 Modo presentación (`/presentacion`)

Vista full-screen para mostrar la plataforma en eventos, charlas o reuniones. Ideal para proyectar.

---

## 💡 Tips de uso

- 🌓 **Dark/Light mode**: toggle en la navbar, persiste entre sesiones.
- 🔎 **Búsqueda global** en la navbar para saltar entre informes y datasets.
- 📱 **Mobile-friendly**: el mapa 3D del Conurbano y los charts se adaptan a pantalla chica.
- 📑 **Citá las fuentes**: cada dataset y cada informe muestra el organismo público de origen.
- ⌨️ **Navegación por teclado** entre sub-informes de Población.

---

## 📊 Fuentes oficiales

| Categoría | Fuente |
|-----------|--------|
| Población, Hogares, Viviendas | Censo 2022 — INDEC |
| Educación | DGCyE PBA + Min. Capital Humano (Aprender) |
| Salud | Ministerio de Salud PBA |
| Seguridad | Min. Seguridad PBA + SNIC (Min. Seguridad Nación) |
| Economía & Fiscal | ARBA + MECON |
| Agricultura | MAGyP + SENASA |
| Industria | Min. Producción PBA |
| Series Conurbano | EPH (INDEC) + radios censales |

---

## 👨‍💻 Para desarrolladores

<details>
<summary>Setup local, stack y pipeline de datos</summary>

### Requisitos
- Node.js 18+
- npm 9+

### Instalación
```bash
git clone https://github.com/colossus-lab/dashboard-pba.git
cd dashboard-pba
npm install
npm run dev
```

### Stack
| Capa | Tecnología |
|------|-----------|
| Framework | React 19 + TypeScript 5.7 |
| Bundler | Vite 6 |
| Routing | React Router 7 |
| State | Zustand 5 |
| Charts | Nivo (Bar, Pie, Line) |
| Mapas | D3-geo + TopoJSON |
| Markdown | react-markdown + remark-gfm |
| Chat IA | @ai-sdk/react |
| Deploy | Vercel |

### Pipeline de datos
Los CSVs/Excel originales se procesan vía scripts en `scripts/process-*.cjs` y se consolidan con:
```bash
npm run build-data
```
Esto regenera los JSONs en `public/data/` (KPIs, charts, mapas) y `public/data/explorer/` (datasets tabulares).

### Estructura
```
public/
  data/        # JSONs de informes + explorer + topojson
  reports/     # Markdown de cada informe
src/
  pages/       # Landing, ReportView, Explorer, Chat, Conurbano
  components/  # charts/, layout/, ui/, report/
  data/        # reportRegistry (metadata)
  store/       # Zustand (tema, navegación)
```

</details>

---

## 🤝 Contribuir

Las contribuciones son bienvenidas: nuevos datasets, visualizaciones, mejoras de accesibilidad o tests. Hacé un fork, abrí una branch y mandá un PR.

---

## 📝 Licencia

Proyecto bajo [Licencia MIT](LICENSE). Los datos son de **fuentes públicas oficiales** del Estado argentino. Sin afiliación con el Gobierno de la Provincia de Buenos Aires.

---

## 👥 Equipo

Desarrollado por **[Laboratorio Colossus](https://github.com/colossus-lab)** — Análisis de datos e inteligencia territorial.

---

<p align="center">
  <strong>⭐ Si te resulta útil, dejá una estrella en GitHub ⭐</strong>
</p>
