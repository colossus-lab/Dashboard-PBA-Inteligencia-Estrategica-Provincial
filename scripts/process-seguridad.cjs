/**
 * process-seguridad.js
 *
 * Converts Buenos Aires Province crime statistics from raw CSV files
 * into optimized JSON files for the dashboard.
 *
 * USAGE (run from project root):
 *   node scripts/process-seguridad.js
 *
 * DEPENDENCIES (install before running):
 *   npm install papaparse
 *
 * OUTPUT FILES (written to public/data/seguridad/):
 *   - provincia_panel.json     → annual crime stats at PBA province level
 *   - departamentos_panel.json → annual crime stats per partido (Buenos Aires only)
 *   - delitos_catalogo.json    → mapping of crime code → name
 */

const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");

// ─── PATHS ────────────────────────────────────────────────────────────────────

const DATA_ROOT = path.join(__dirname, "..");
const OUTPUT_DIR = path.join(DATA_ROOT, "public", "data", "seguridad");

const PROVINCIAL_PANEL_CSV = path.join(
  DATA_ROOT,
  "4- Seguridad",
  "seguridad-snic-provincial-estadisticas-criminales-republica-argentina-por-provincias",
  "estadísticas-criminales-en-la-república-argentina-por-provincias-(panel)-(.csv).csv"
);

const DEPARTAMENTAL_PANEL_CSV = path.join(
  DATA_ROOT,
  "4- Seguridad",
  "seguridad-snic-departamental-estadisticas-criminales-republica-argentina-por-departamentos",
  "estadísticas-criminales-en-la-república-argentina-por-departamentos-(panel)-(.csv).csv"
);

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const BUENOS_AIRES_ID = "06"; // Buenos Aires Province (NOT CABA = "02")

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  const kb = (fs.statSync(filePath).size / 1024).toFixed(1);
  console.log(`  ✓ ${path.basename(filePath)} — ${data.length} rows — ${kb} KB`);
}

function parseNumber(val) {
  if (val === null || val === undefined || val === "") return null;
  const n = parseFloat(String(val).replace(",", "."));
  return isNaN(n) ? null : n;
}

function parseCSV(filePath, delimiter) {
  console.log(`\nParsing: ${path.basename(filePath)}`);
  const raw = fs.readFileSync(filePath, "utf-8");
  const result = Papa.parse(raw, {
    header: true,
    delimiter,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  if (result.errors.length > 0) {
    console.warn(`  ⚠ Parse warnings: ${result.errors.length}`);
  }
  console.log(`  → ${result.data.length} rows parsed`);
  return result.data;
}

// ─── STEP 1: PROVINCIAL PANEL ─────────────────────────────────────────────────
// File: comma-separated
// Filter: provincia_id === "06"
// Columns: provincia_id, provincia_nombre, anio, codigo_delito_snic_id,
//          codigo_delito_snic_nombre, cantidad_hechos, cantidad_victimas,
//          cantidad_victimas_masc, cantidad_victimas_fem, cantidad_victimas_sd,
//          tasa_hechos, tasa_victimas, tasa_victimas_masc, tasa_victimas_fem

function processProvincialPanel() {
  const rows = parseCSV(PROVINCIAL_PANEL_CSV, ",");

  const filtered = rows
    .filter((r) => String(r.provincia_id).trim() === BUENOS_AIRES_ID)
    .map((r) => ({
      anio: parseInt(r.anio, 10),
      codigo_delito: String(r.codigo_delito_snic_id).trim(),
      delito_nombre: String(r.codigo_delito_snic_nombre).trim(),
      cantidad_hechos: parseNumber(r.cantidad_hechos),
      cantidad_victimas: parseNumber(r.cantidad_victimas),
      cantidad_victimas_masc: parseNumber(r.cantidad_victimas_masc),
      cantidad_victimas_fem: parseNumber(r.cantidad_victimas_fem),
      cantidad_victimas_sd: parseNumber(r.cantidad_victimas_sd),
      tasa_hechos: parseNumber(r.tasa_hechos),
      tasa_victimas: parseNumber(r.tasa_victimas),
      tasa_victimas_masc: parseNumber(r.tasa_victimas_masc),
      tasa_victimas_fem: parseNumber(r.tasa_victimas_fem),
    }));

  console.log(`  → Buenos Aires rows: ${filtered.length}`);
  return filtered;
}

// ─── STEP 2: DEPARTMENTAL PANEL ───────────────────────────────────────────────
// File: SEMICOLON-separated (critical!)
// Filter: provincia_id === "06"
// Columns: provincia_id, provincia_nombre, departamento_id, departamento_nombre,
//          anio, codigo_delito_snic_id, cod_delito, codigo_delito_snic_nombre,
//          cantidad_hechos, cantidad_victimas, cantidad_victimas_masc,
//          cantidad_victimas_fem, cantidad_victimas_sd,
//          tasa_hechos, tasa_victimas, tasa_victimas_masc, tasa_victimas_fem
//
// NOTE: departamento_id values for Buenos Aires range from 06007 to 06882.
//       Code 06999 = "Departamento sin determinar" — included but flagged.

function processDepartamentalPanel() {
  const rows = parseCSV(DEPARTAMENTAL_PANEL_CSV, ";");

  const filtered = rows
    .filter((r) => String(r.provincia_id).trim() === BUENOS_AIRES_ID)
    .map((r) => ({
      departamento_id: String(r.departamento_id).trim(),
      departamento_nombre: String(r.departamento_nombre).trim(),
      anio: parseInt(r.anio, 10),
      codigo_delito: String(r.codigo_delito_snic_id).trim(),
      cod_delito: String(r.cod_delito).trim(), // extended codes: "14_1", "28_01", etc.
      delito_nombre: String(r.codigo_delito_snic_nombre).trim(),
      cantidad_hechos: parseNumber(r.cantidad_hechos),
      cantidad_victimas: parseNumber(r.cantidad_victimas),
      cantidad_victimas_masc: parseNumber(r.cantidad_victimas_masc),
      cantidad_victimas_fem: parseNumber(r.cantidad_victimas_fem),
      cantidad_victimas_sd: parseNumber(r.cantidad_victimas_sd),
      tasa_hechos: parseNumber(r.tasa_hechos),
      tasa_victimas: parseNumber(r.tasa_victimas),
      tasa_victimas_masc: parseNumber(r.tasa_victimas_masc),
      tasa_victimas_fem: parseNumber(r.tasa_victimas_fem),
    }));

  console.log(`  → Buenos Aires rows: ${filtered.length}`);
  return filtered;
}

// ─── STEP 3: CRIME CATALOGUE ──────────────────────────────────────────────────
// Extract unique crime code → name mapping from provincial panel data.
// Uses extended codes from departmental panel where available.

function buildDelitoCatalogo(provincialData, departamentalData) {
  const catalogue = new Map();

  for (const r of provincialData) {
    if (!catalogue.has(r.codigo_delito)) {
      catalogue.set(r.codigo_delito, r.delito_nombre);
    }
  }
  // Add subcategory codes from departmental data
  for (const r of departamentalData) {
    if (!catalogue.has(r.cod_delito)) {
      catalogue.set(r.cod_delito, r.delito_nombre);
    }
  }

  return Array.from(catalogue.entries())
    .map(([codigo, nombre]) => ({ codigo, nombre }))
    .sort((a, b) => {
      // Sort numerically by primary code, then by subcategory
      const [aMain, aSub] = a.codigo.split("_").map(Number);
      const [bMain, bSub] = b.codigo.split("_").map(Number);
      if (aMain !== bMain) return aMain - bMain;
      return (aSub || 0) - (bSub || 0);
    });
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

function main() {
  console.log("=== process-seguridad.js ===");
  console.log(`Output: ${OUTPUT_DIR}\n`);

  ensureDir(OUTPUT_DIR);

  const provincialData = processProvincialPanel();
  const departamentalData = processDepartamentalPanel();
  const catalogo = buildDelitoCatalogo(provincialData, departamentalData);

  console.log("\nWriting output files:");
  writeJSON(path.join(OUTPUT_DIR, "provincia_panel.json"), provincialData);
  writeJSON(path.join(OUTPUT_DIR, "departamentos_panel.json"), departamentalData);
  writeJSON(path.join(OUTPUT_DIR, "delitos_catalogo.json"), catalogo);

  console.log("\n✓ Done.");
}

main();
