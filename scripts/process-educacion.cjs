/**
 * process-educacion.js
 *
 * Converts Buenos Aires Province education CSV files
 * into optimized JSON files for the dashboard.
 *
 * USAGE (run from project root):
 *   node scripts/process-educacion.js
 *
 * DEPENDENCIES:
 *   npm install papaparse
 *
 * OUTPUT FILES (written to public/data/educacion/):
 *   - establecimientos.json  → educational institutions with geo coords (2025)
 *   - trayectoria.json       → school trajectory indicators per municipio (2012–2022)
 *   - aprender.json          → Aprender assessment results per partido (2016+)
 */

const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");

// ─── PATHS ────────────────────────────────────────────────────────────────────

const DATA_ROOT = path.join(__dirname, "..");
const INPUT_DIR = path.join(DATA_ROOT, "2- Educacion");
const OUTPUT_DIR = path.join(DATA_ROOT, "public", "data", "educacion");

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
    transformHeader: (h) => h.trim(),
  });
  if (result.errors.length > 0) {
    console.warn(`  ⚠ Parse warnings: ${result.errors.length}`);
  }
  console.log(`  → ${result.data.length} rows parsed`);
  return result.data;
}

// ─── STEP 1: ESTABLECIMIENTOS EDUCATIVOS ─────────────────────────────────────
// Columns: municipio_id, municipio_nombre, establecimiento_id, establecimiento_nombre,
//          region_educativa, modalidad, nivel, sector, area, matricula, varones, mujeres,
//          latitud, longitud (plus many administrative columns we drop)

function processEstablecimientos() {
  const rows = parseCSV(
    path.join(INPUT_DIR, "establecimientos-educativos-30032026.csv"),
    ","
  );

  return rows
    .filter((r) => r.municipio_id && String(r.municipio_id).trim() !== "")
    .map((r) => ({
      municipio_id: String(r.municipio_id).trim(),
      municipio_nombre: String(r.municipio_nombre).trim(),
      establecimiento_id: String(r.establecimiento_id).trim(),
      establecimiento_nombre: String(r.establecimiento_nombre).trim(),
      region_educativa: String(r.region_educativa).trim(),
      modalidad: String(r.modalidad).trim(),
      nivel: String(r.nivel).trim(),
      sector: String(r.sector).trim(),
      area: String(r.area).trim(),
      matricula: parseNumber(r.matricula),
      varones: parseNumber(r.varones),
      mujeres: parseNumber(r.mujeres),
      latitud: parseNumber(r.latitud),
      longitud: parseNumber(r.longitud),
    }));
}

// ─── STEP 2: INDICADORES DE TRAYECTORIA ──────────────────────────────────────
// Columns: anio,municipio_id,municipio_nombre + 20 indicator columns

function processTrayectoria() {
  const rows = parseCSV(
    path.join(INPUT_DIR, "indicadores-proceso-trayectoria-sobreedad-2012_2022.csv"),
    ","
  );

  return rows.map((r) => ({
    anio: parseInt(r.anio, 10),
    municipio_id: String(r.municipio_id).trim(),
    municipio_nombre: String(r.municipio_nombre).trim(),
    // Primaria
    promocion_efectiva_primaria: parseNumber(r.promocion_efectiva_primaria),
    repitencia_primaria: parseNumber(r.repitencia_primaria),
    reinscripcion_primaria: parseNumber(r.reinscripcion_primaria),
    abandono_primaria: parseNumber(r.abandono_interanual_primaria),
    alumnos_promovidos_primaria: parseNumber(r.alumnos_promovidos_primaria),
    alumnos_no_promovidos_primaria: parseNumber(r.alumnos_no_promovidos_primaria),
    salidos_sin_pase_primaria: parseNumber(r.salidos_sin_pase_primaria),
    sobreedad_primaria: parseNumber(r.sobreedad_primaria),
    sobreedad_avanzada_primaria: parseNumber(r.sobreedad_avanzada_primaria),
    // Secundaria
    promocion_efectiva_secundaria: parseNumber(r.promocion_efectiva_secundaria),
    repitencia_secundaria: parseNumber(r.repitencia_secundaria),
    reinscripcion_secundaria: parseNumber(r.reinscripcion_secundaria),
    abandono_secundaria: parseNumber(r.abandono_interanual_secundaria),
    alumnos_promovidos_secundaria: parseNumber(r.alumnos_promovidos_secundaria),
    alumnos_no_promovidos_secundaria: parseNumber(r.alumnos_no_promovidos_secundaria),
    salidos_sin_pase_secundaria: parseNumber(r.salidos_sin_pase_secundaria),
    sobreedad_secundaria: parseNumber(r.sobreedad_secundaria),
    sobreedad_avanzada_secundaria: parseNumber(r.sobreedad_avanzada_secundaria),
  }));
}

// ─── STEP 3: RESULTADOS APRENDER ─────────────────────────────────────────────
// BOM-prefixed. Columns: nombre_partido,id_partido,año,materia,respondientes,resultado,porcentaje
// Note: porcentaje uses comma as decimal separator ("8,20").

function processAprender() {
  const rows = parseCSV(
    path.join(INPUT_DIR, "resultados-aprender-resultados_aprender.csv"),
    ","
  );

  return rows.map((r) => ({
    partido_nombre: String(r.nombre_partido).trim(),
    partido_id: String(r.id_partido).trim(),
    anio: parseInt(r["año"] || r["ano"] || r["anio"] || r["año"], 10),
    materia: String(r.materia).trim(),
    respondientes: parseNumber(r.respondientes),
    resultado: String(r.resultado).trim(),
    // porcentaje may use comma decimal ("8,20") — parseNumber handles this
    porcentaje: parseNumber(r.porcentaje),
  }));
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

function main() {
  console.log("=== process-educacion.js ===");
  console.log(`Output: ${OUTPUT_DIR}\n`);

  ensureDir(OUTPUT_DIR);

  const establecimientos = processEstablecimientos();
  const trayectoria = processTrayectoria();
  const aprender = processAprender();

  console.log("\nWriting output files:");
  writeJSON(path.join(OUTPUT_DIR, "establecimientos.json"), establecimientos);
  writeJSON(path.join(OUTPUT_DIR, "trayectoria.json"), trayectoria);
  writeJSON(path.join(OUTPUT_DIR, "aprender.json"), aprender);

  console.log("\n✓ Done.");
}

main();
