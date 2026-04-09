/**
 * process-economia.js
 *
 * Converts Buenos Aires Province economic & finance CSV files
 * into optimized JSON files for the dashboard.
 *
 * USAGE (run from project root):
 *   node scripts/process-economia.js
 *
 * DEPENDENCIES:
 *   npm install papaparse
 *
 * OUTPUT FILES (written to public/data/economia/):
 *   - recaudacion.json         → provincial tax collection by concept/month (1999–2026)
 *   - transferencias.json      → transfers to municipios by concept/month (2010–2026)
 *   - exportaciones.json       → exports by category/month (2010–2025)
 *   - pbg.json                 → Producto Bruto Geográfico by sector/year (2004+)
 *   - consejos_escolares.json  → school council transfers to municipios (2016–2026)
 */

const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");

// ─── PATHS ────────────────────────────────────────────────────────────────────

const DATA_ROOT = path.join(__dirname, "..");
const INPUT_DIR = path.join(DATA_ROOT, "5- Economía y Finanzas");
const OUTPUT_DIR = path.join(DATA_ROOT, "public", "data", "economia");

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
  // Strip BOM if present
  let raw = fs.readFileSync(filePath, "utf-8");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
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

// ─── STEP 1: RECAUDACIÓN TRIBUTARIA ──────────────────────────────────────────
// Columns: anio,mes,concepto,monto

function processRecaudacion() {
  const rows = parseCSV(
    path.join(INPUT_DIR, "recaudacion-tributaria-011999_012026.csv"),
    ","
  );
  return rows.map((r) => ({
    anio: parseInt(r.anio, 10),
    mes: parseInt(r.mes, 10),
    concepto: String(r.concepto).trim(),
    monto: parseNumber(r.monto),
  }));
}

// ─── STEP 2: TRANSFERENCIAS A MUNICIPIOS ─────────────────────────────────────
// Columns: anio,mes,municipio_id,municipio_nombre,concepto,monto

function processTransferencias() {
  const rows = parseCSV(
    path.join(INPUT_DIR, "transferencias-municipios-012010_012026.csv"),
    ","
  );
  return rows.map((r) => ({
    anio: parseInt(r.anio, 10),
    mes: parseInt(r.mes, 10),
    municipio_id: String(r.municipio_id).trim(),
    municipio_nombre: String(r.municipio_nombre).trim(),
    concepto: String(r.concepto).trim(),
    monto: parseNumber(r.monto),
  }));
}

// ─── STEP 3: EXPORTACIONES ────────────────────────────────────────────────────
// BOM-prefixed. Columns: anio,mes,grandes_rubros,rubros,valor

function processExportaciones() {
  const rows = parseCSV(
    path.join(INPUT_DIR, "exportaciones-acumuladas-grandes-rubros-2010_2025.csv"),
    ","
  );
  return rows.map((r) => ({
    anio: parseInt(r.anio, 10),
    mes: parseInt(r.mes, 10),
    grandes_rubros: String(r.grandes_rubros).trim(),
    rubros: String(r.rubros).trim(),
    valor: parseNumber(r.valor),
  }));
}

// ─── STEP 4: PBG ─────────────────────────────────────────────────────────────
// Columns: actividad_detalle,actividad_sector_letra,actividad_sector_detalle,
//          anio,valor_precios_corrientes,valor_precios_constantes
// Note: CSV has trailing empty columns — we ignore them via explicit mapping.

function processPBG() {
  const rows = parseCSV(
    path.join(INPUT_DIR, "Producto Bruto Geográfico (PBG).csv"),
    ","
  );
  return rows
    .filter((r) => r.anio && String(r.anio).trim() !== "")
    .map((r) => ({
      actividad_detalle: String(r.actividad_detalle).trim(),
      sector_letra: String(r.actividad_sector_letra).trim(),
      sector_detalle: String(r.actividad_sector_detalle).trim(),
      anio: parseInt(r.anio, 10),
      valor_corrientes: parseNumber(r.valor_precios_corrientes),
      valor_constantes: parseNumber(r.valor_precios_constantes),
    }));
}

// ─── STEP 5: CONSEJOS ESCOLARES ──────────────────────────────────────────────
// Columns: anio,mes,id_municipio,nombre_municipio,concepto,monto

function processCConsejosEscolares() {
  const rows = parseCSV(
    path.join(INPUT_DIR, "consejos-escolares-012010_012026.csv"),
    ","
  );
  return rows.map((r) => ({
    anio: parseInt(r.anio, 10),
    mes: parseInt(r.mes, 10),
    municipio_id: String(r.id_municipio).trim(),
    municipio_nombre: String(r.nombre_municipio).trim(),
    concepto: String(r.concepto).trim(),
    monto: parseNumber(r.monto),
  }));
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

function main() {
  console.log("=== process-economia.js ===");
  console.log(`Output: ${OUTPUT_DIR}\n`);

  ensureDir(OUTPUT_DIR);

  const recaudacion = processRecaudacion();
  const transferencias = processTransferencias();
  const exportaciones = processExportaciones();
  const pbg = processPBG();
  const consejosEscolares = processCConsejosEscolares();

  console.log("\nWriting output files:");
  writeJSON(path.join(OUTPUT_DIR, "recaudacion.json"), recaudacion);
  writeJSON(path.join(OUTPUT_DIR, "transferencias.json"), transferencias);
  writeJSON(path.join(OUTPUT_DIR, "exportaciones.json"), exportaciones);
  writeJSON(path.join(OUTPUT_DIR, "pbg.json"), pbg);
  writeJSON(path.join(OUTPUT_DIR, "consejos_escolares.json"), consejosEscolares);

  console.log("\n✓ Done.");
}

main();
