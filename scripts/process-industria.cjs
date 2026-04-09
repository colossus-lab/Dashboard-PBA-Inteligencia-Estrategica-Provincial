/**
 * process-industria.js
 *
 * Converts Buenos Aires Province industry CSV files
 * into optimized JSON files for the dashboard.
 *
 * USAGE (run from project root):
 *   node scripts/process-industria.js
 *
 * DEPENDENCIES:
 *   npm install papaparse
 *
 * OUTPUT FILES (written to public/data/industria/):
 *   - empresas.json  → company counts by segment per year (2007–2023)
 *   - parques.json   → industrial parks directory with geo coords
 */

const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");

// ─── PATHS ────────────────────────────────────────────────────────────────────

const DATA_ROOT = path.join(__dirname, "..");
const INPUT_DIR = path.join(DATA_ROOT, "7- Industria");
const OUTPUT_DIR = path.join(DATA_ROOT, "public", "data", "industria");

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

// ─── STEP 1: EMPRESAS POR SEGMENTO ───────────────────────────────────────────
// Columns: anio,empresas,establecimientos,segmento

function processEmpresas() {
  const rows = parseCSV(
    path.join(INPUT_DIR, "empresas-segmento-2007_2023.csv"),
    ","
  );

  return rows.map((r) => ({
    anio: parseInt(r.anio, 10),
    empresas: parseNumber(r.empresas),
    establecimientos: parseNumber(r.establecimientos),
    segmento: String(r.segmento).trim(),
  }));
}

// ─── STEP 2: PARQUES INDUSTRIALES ────────────────────────────────────────────
// Columns: municipio_nombre,municipio_id,parque,region,renpi,superficie,latitud,longitud

function processParques() {
  const rows = parseCSV(
    path.join(INPUT_DIR, "parques-industriales.csv"),
    ","
  );

  return rows
    .filter((r) => r.municipio_id && String(r.municipio_id).trim() !== "")
    .map((r) => ({
      municipio_nombre: String(r.municipio_nombre).trim(),
      municipio_id: String(r.municipio_id).trim(),
      parque: String(r.parque).trim(),
      region: String(r.region).trim(),
      renpi: String(r.renpi).trim(),
      superficie: parseNumber(r.superficie),
      latitud: parseNumber(r.latitud),
      longitud: parseNumber(r.longitud),
    }));
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

function main() {
  console.log("=== process-industria.js ===");
  console.log(`Output: ${OUTPUT_DIR}\n`);

  ensureDir(OUTPUT_DIR);

  const empresas = processEmpresas();
  const parques = processParques();

  console.log("\nWriting output files:");
  writeJSON(path.join(OUTPUT_DIR, "empresas.json"), empresas);
  writeJSON(path.join(OUTPUT_DIR, "parques.json"), parques);

  console.log("\n✓ Done.");
}

main();
