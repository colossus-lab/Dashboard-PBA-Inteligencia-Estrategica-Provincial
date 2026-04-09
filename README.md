<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white" alt="Vite 6" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Nivo-Charts-FF6B6B?logo=d3.js&logoColor=white" alt="Nivo Charts" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License" />
</p>

# 📊 Dashboard PBA — Inteligencia Estratégica Provincial

**Dashboard interactivo de datos abiertos de la Provincia de Buenos Aires.** Análisis de 7 áreas estratégicas con informes ejecutivos, visualizaciones dinámicas, mapas coropléticos y exploración tabular de datasets.

> 🇦🇷 Proyecto de datos abiertos que transforma información pública en inteligencia ejecutiva para la toma de decisiones.

---

## ✨ Funcionalidades

### 📋 Informes Ejecutivos
- **7 categorías principales**: Población, Educación, Salud, Seguridad, Economía, Agricultura, Industria
- **8 sub-informes censales**: Estructura poblacional, condiciones habitacionales, fecundidad, viviendas, educación censal, economía, salud/previsión
- Renderizado Markdown con tablas estilizadas y blockquotes interpretativos
- KPI counters animados y navegación entre informes

### 📈 Visualizaciones Dinámicas
- Charts auto-generados por sección (bar, pie, line) via **Nivo**
- Layout split: texto a la izquierda, charts sticky a la derecha
- Tema claro/oscuro con transiciones suaves
- Mapas coropléticos SVG de los 135 municipios bonaerenses

### 🔍 Data Explorer
- Catálogo de **13 datasets** con búsqueda y filtrado por categoría
- Tablas interactivas con ordenamiento, paginación y filtros por columna
- Auto-charts generados dinámicamente según tipo de datos
- Exportación y exploración granular

### 🎨 Diseño
- Glassmorphism + gradientes premium
- Dark/Light mode con toggle persistente
- Responsive: optimizado para desktop, tablet y mobile
- Tipografía: Inter + Outfit via Google Fonts
- Micro-animaciones y secciones con reveal on-scroll

---

## 🏗️ Arquitectura

```
dashboard-pba/
├── public/
│   ├── data/              # JSONs pre-procesados (KPIs, charts, mapas)
│   │   ├── explorer/      # 13 datasets tabulares para Data Explorer
│   │   └── *.json         # Datos por categoría + topojson del mapa
│   └── reports/           # Markdown de informes (.md)
│       └── poblacion/     # Sub-informes censales
├── scripts/
│   ├── generate-report-data.cjs  # Pipeline maestro de datos
│   ├── build-data.cjs            # Orquestador npm run build-data
│   └── process-*.cjs             # Procesadores por categoría
├── src/
│   ├── components/
│   │   ├── charts/        # ChartRenderer, MapaPBA
│   │   ├── layout/        # Layout, Navbar, Footer
│   │   └── ui/            # KPICounter, SectionReveal
│   ├── data/              # reportRegistry (metadata de informes)
│   ├── hooks/             # useReportData, useIntersectionObserver
│   ├── pages/             # Landing, ReportView, ExplorerIndex/Detail
│   ├── store/             # Zustand (tema, sección activa)
│   ├── types/             # TypeScript interfaces
│   └── index.css          # Sistema de diseño completo
├── vercel.json            # Config de deploy
└── package.json
```

### Pipeline de datos

```
CSVs/Excel originales
       ↓
 scripts/process-*.cjs      → Parsea y normaliza
       ↓
 scripts/generate-report-data.cjs  → Genera JSONs enriquecidos
       ↓
 public/data/*.json          → KPIs + Charts + MapData
 public/data/explorer/*.json → Datasets tabulares + index.json
```

Ejecutar el pipeline:
```bash
npm run build-data
```

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Framework** | React 19 + TypeScript 5.7 |
| **Bundler** | Vite 6 |
| **Routing** | React Router 7 |
| **State** | Zustand 5 |
| **Charts** | Nivo (Bar, Pie, Line) |
| **Mapas** | D3-geo + TopoJSON custom |
| **Markdown** | react-markdown + remark-gfm |
| **Data Pipeline** | Node.js + PapaParse + SheetJS |
| **Styling** | Vanilla CSS (design tokens) |
| **Deploy** | Vercel |

---

## 📊 Datasets incluidos

| Categoría | Informe | Fuente |
|-----------|---------|--------|
| 🏘️ Población | Estructura, viviendas, hogares, fecundidad | Censo 2022 INDEC |
| 📚 Educación | Sistema educativo + Aprender 2024 | DGCyE + MCapHum |
| 🏥 Salud | Mortalidad materno-infantil | Min. Salud PBA |
| 🔒 Seguridad | Hechos delictivos 2024 | Min. Seguridad PBA |
| 💰 Economía | Recaudación, coparticipación, empleo | ARBA + MECON |
| 🌾 Agricultura | Stock bovino, pesca, oleaginosas | MAGyP + SENASA |
| 🏭 Industria | Parques industriales | Min. Producción PBA |

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Podés:

1. **Fork** del repositorio
2. Crear una branch (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de cambios (`git commit -m 'Agrega nueva funcionalidad'`)
4. Push a la branch (`git push origin feature/nueva-funcionalidad`)
5. Abrir un **Pull Request**

### Ideas para contribuir

- 🗺️ Agregar nuevos datasets provinciales
- 📊 Nuevos tipos de visualización
- 🌐 Internacionalización (i18n)
- 📱 Mejoras de UX mobile
- ♿ Accesibilidad (a11y)
- 🧪 Tests unitarios y E2E

---

## 📝 Licencia

Este proyecto está bajo la [Licencia MIT](LICENSE).

Los datos utilizados son de **fuentes públicas** del Estado argentino (INDEC, Ministerios, Organismos Provinciales). Este proyecto no tiene afiliación oficial con el Gobierno de la Provincia de Buenos Aires.

---

## 👥 Equipo

Desarrollado por **[Laboratorio Colossus](https://github.com/colossus-lab)** — Análisis de datos e inteligencia territorial.

---

<p align="center">
  <strong>⭐ Si este proyecto te resulta útil, dejá una estrella en GitHub ⭐</strong>
</p>
