/**
 * process-salud.js
 *
 * Converts Buenos Aires Province health CSV files
 * into optimized JSON files for the dashboard.
 *
 * USAGE (run from project root):
 *   node scripts/process-salud.js
 *
 * DEPENDENCIES:
 *   npm install papaparse
 *
 * OUTPUT FILES (written to public/data/salud/):
 *   - defunciones_neonatal.json    → neonatal & post-neonatal deaths per municipio (2009–2024)
 *   - nacidos_vivos.json           → live births by weight/sex per municipio (2005–2024)
 *   - defunciones_maternas.json    → maternal deaths by CIE10 per municipio (2009–2024)
 *   - defunciones_fetales.json     → fetal deaths per municipio (2017–2024)
 *
 * NOTE: Several headers in the source files have trailing spaces — these are
 *       stripped by the transformHeader function.
 */

const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");

// ─── PATHS ────────────────────────────────────────────────────────────────────

const DATA_ROOT = path.join(__dirname, "..");
const INPUT_DIR = path.join(DATA_ROOT, "3- Salud");
const OUTPUT_DIR = path.join(DATA_ROOT, "public", "data", "salud");

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
  let raw = fs.readFileSync(filePath, "utf-8");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  const result = Papa.parse(raw, {
    header: true,
    delimiter,
    skipEmptyLines: true,
    // Strip trailing/leading whitespace from all header names
    transformHeader: (h) => h.trim(),
  });
  if (result.errors.length > 0) {
    console.warn(`  ⚠ Parse warnings: ${result.errors.length}`);
  }
  console.log(`  → ${result.data.length} rows parsed`);
  return result.data;
}

// ─── STEP 1: DEFUNCIONES NEONATAL / POSNEONATAL ───────────────────────────────
// Columns: anio,region_sanitaria,muncipio_nombre,muncipio_id,clasificacion,cantidad_defunciones
// Note: typo "muncipio" in source — normalized to "municipio" in output.

function processDefuncionesNeonatal() {
  const rows = parseCSV(
    path.join(INPUT_DIR, "defunciones-neonatal-posneonatal-2009_2024.csv"),
    ","
  );

  return rows.map((r) => ({
    anio: parseInt(r.anio, 10),
    region_sanitaria: String(r.region_sanitaria).trim(),
    municipio_nombre: String(r.muncipio_nombre).trim(),
    municipio_id: String(r.muncipio_id).trim(),
    clasificacion: String(r.clasificacion).trim(),
    cantidad: parseNumber(r.cantidad_defunciones),
  }));
}

// ─── STEP 3: NACIDOS VIVOS POR PESO ──────────────────────────────────────────
// BOM-prefixed. Columns: anio,municipio_nombre,municipio_id,sexo,intervalo_peso,nacidos_cantidad

function processNacidosVivos() {
  const rows = parseCSV(
    path.join(INPUT_DIR, "nacidos-vivos-peso-2005_2024.csv"),
    ","
  );

  return rows.map((r) => ({
    anio: parseInt(r.anio, 10),
    municipio_nombre: String(r.municipio_nombre).trim(),
    municipio_id: String(r.municipio_id).trim(),
    sexo: String(r.sexo).trim(),
    intervalo_peso: String(r.intervalo_peso).trim(),
    cantidad: parseNumber(r.nacidos_cantidad),
  }));
}

// ─── STEP 4: DEFUNCIONES MATERNAS ────────────────────────────────────────────
// Columns: anio,municipio_id,municipio_nombre,region_sanitaria,
//          CIE10_codigo,CIE10_descripcion,clasificacion,cantidad
// Note: trailing spaces in several headers — stripped by transformHeader.

function processDefuncionesMaternas() {
  const rows = parseCSV(
    path.join(INPUT_DIR, "defunciones-maternas-2009_2024.csv"),
    ","
  );

  return rows.map((r) => ({
    anio: parseInt(r.anio, 10),
    municipio_id: String(r.municipio_id).trim(),
    municipio_nombre: String(r.municipio_nombre).trim(),
    region_sanitaria: String(r.region_sanitaria).trim(),
    cie10_codigo: String(r.CIE10_codigo).trim(),
    cie10_descripcion: String(r.CIE10_descripcion).trim(),
    clasificacion: String(r.clasificacion).trim(),
    cantidad: parseNumber(r.cantidad),
  }));
}

// ─── STEP 5: DEFUNCIONES FETALES ─────────────────────────────────────────────
// Columns: anio,residencia_muncipio_id,residencia_muncipio_nombre,cantidad
// Note: trailing spaces in headers + typo "muncipio" — normalized in output.

function processDefuncionesFetales() {
  const rows = parseCSV(
    path.join(INPUT_DIR, "defunciones-fetales-2017_2024.csv"),
    ","
  );

  return rows.map((r) => ({
    anio: parseInt(r.anio, 10),
    municipio_id: String(r.residencia_muncipio_id).trim(),
    municipio_nombre: String(r.residencia_muncipio_nombre).trim(),
    cantidad: parseNumber(r.cantidad),
  }));
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

function main() {
  console.log("=== process-salud.js ===");
  console.log(`Output: ${OUTPUT_DIR}\n`);

  ensureDir(OUTPUT_DIR);

  const defuncionesNeonatal = processDefuncionesNeonatal();
  const nacidosVivos = processNacidosVivos();
  const defuncionesMaternas = processDefuncionesMaternas();
  const defuncionesFetales = processDefuncionesFetales();

  console.log("\nWriting output files:");
  writeJSON(path.join(OUTPUT_DIR, "defunciones_neonatal.json"), defuncionesNeonatal);
  writeJSON(path.join(OUTPUT_DIR, "nacidos_vivos.json"), nacidosVivos);
  writeJSON(path.join(OUTPUT_DIR, "defunciones_maternas.json"), defuncionesMaternas);
  writeJSON(path.join(OUTPUT_DIR, "defunciones_fetales.json"), defuncionesFetales);

  console.log("\n✓ Done.");
}

main();
