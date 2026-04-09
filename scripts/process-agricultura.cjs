/**
 * process-agricultura.js
 *
 * Converts Buenos Aires Province agriculture & livestock CSV files
 * into optimized JSON files for the dashboard.
 *
 * USAGE (run from project root):
 *   node scripts/process-agricultura.js
 *
 * DEPENDENCIES:
 *   npm install papaparse
 *
 * OUTPUT FILES (written to public/data/agricultura/):
 *   - stock_bovino.json        → bovine stock per municipio per year (2010–2023)
 *   - estimaciones_agricolas.json → crop estimates per municipio/campaign (1969–2025)
 *   - capturas_pesqueras.json  → fishing catch by species per year (2020–2024)
 */

const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");

// ─── PATHS ────────────────────────────────────────────────────────────────────

const DATA_ROOT = path.join(__dirname, "..");
const INPUT_DIR = path.join(DATA_ROOT, "6- Agricultura y Ganaderia");
const OUTPUT_DIR = path.join(DATA_ROOT, "public", "data", "agricultura");

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

// ─── STEP 1: STOCK BOVINO ─────────────────────────────────────────────────────
// Semicolon-separated. Already filtered to PBA municipios only.
// Columns: anio;municipio_id;municipio_nombre;stock

function processStockBovino() {
  const filePath = path.join(INPUT_DIR, "stock-ganadero-bovino-por-municipio-032010_032023.csv");
  const rows = parseCSV(filePath, ";");

  return rows.map((r) => ({
    anio: parseInt(r.anio, 10),
    municipio_id: String(r.municipio_id).trim(),
    municipio_nombre: String(r.municipio_nombre).trim(),
    stock: parseNumber(r.stock),
  }));
}

// ─── STEP 2: ESTIMACIONES AGRÍCOLAS ──────────────────────────────────────────
// Comma-separated.
// Columns: cultivo,campania,municipio_id,municipio_nombre,
//          superficie_sembrada,superficie_cosechada,produccion,rendimiento

function processEstimacionesAgricolas() {
  const filePath = path.join(INPUT_DIR, "estimaciones-agricolas-1969_2025.csv");
  const rows = parseCSV(filePath, ",");

  return rows.map((r) => ({
    cultivo: String(r.cultivo).trim(),
    campania: String(r.campania).trim(),
    municipio_id: String(r.municipio_id).trim(),
    municipio_nombre: String(r.municipio_nombre).trim(),
    superficie_sembrada: parseNumber(r.superficie_sembrada),
    superficie_cosechada: parseNumber(r.superficie_cosechada),
    produccion: parseNumber(r.produccion),
    rendimiento: parseNumber(r.rendimiento),
  }));
}

// ─── STEP 3: CAPTURAS PESQUERAS ───────────────────────────────────────────────
// Comma-separated. Provincial totals by species and year.
// Columns: especie,anio,cantidad

function processCapturasP() {
  const filePath = path.join(INPUT_DIR, "capturas_por_especies_pba_2020-2024.csv");
  const rows = parseCSV(filePath, ",");

  return rows.map((r) => ({
    especie: String(r.especie).trim(),
    anio: parseInt(r.anio, 10),
    cantidad: parseNumber(r.cantidad),
  }));
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

function main() {
  console.log("=== process-agricultura.js ===");
  console.log(`Output: ${OUTPUT_DIR}\n`);

  ensureDir(OUTPUT_DIR);

  const stockBovino = processStockBovino();
  const estimaciones = processEstimacionesAgricolas();
  const capturas = processCapturasP();

  console.log("\nWriting output files:");
  writeJSON(path.join(OUTPUT_DIR, "stock_bovino.json"), stockBovino);
  writeJSON(path.join(OUTPUT_DIR, "estimaciones_agricolas.json"), estimaciones);
  writeJSON(path.join(OUTPUT_DIR, "capturas_pesqueras.json"), capturas);

  console.log("\n✓ Done.");
}

main();
