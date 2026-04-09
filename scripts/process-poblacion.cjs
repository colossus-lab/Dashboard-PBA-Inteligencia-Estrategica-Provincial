/**
 * process-poblacion.js
 *
 * Converts Buenos Aires Province Census 2022 XLSX files into
 * optimized JSON files for the dashboard.
 *
 * USAGE (run from project root):
 *   node scripts/process-poblacion.js
 *
 * DEPENDENCIES:
 *   npm install xlsx
 *
 * INPUT: 49 XLSX files across 9 subcategories in Poblacion/
 *
 * OUTPUT FILES (written to public/data/poblacion/):
 *   One JSON per subcategory folder:
 *   - estructura_sexo_edad.json
 *   - condiciones_habitacionales_poblacion.json
 *   - salud_prevision_social.json
 *   - condiciones_habitacionales_hogares.json
 *   - viviendas.json
 *   - educacion.json
 *   - caracteristicas_economicas.json
 *   - fecundidad.json
 *   - gobiernos_locales.json
 *
 * STRATEGY:
 *   Each XLSX contains one or more cross-tabulation sheets from Censo 2022.
 *   We use the first non-empty sheet for each file, skip header/title rows,
 *   and output the raw rows as-is with a source_file field for traceability.
 *   The frontend can filter and reshape as needed per visualization.
 */

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

// ─── PATHS ────────────────────────────────────────────────────────────────────

const DATA_ROOT = path.join(__dirname, "..");
const INPUT_DIR = path.join(DATA_ROOT, "1- Poblacion");
const OUTPUT_DIR = path.join(DATA_ROOT, "public", "data", "poblacion");

// ─── SUBCATEGORY MAP ─────────────────────────────────────────────────────────
// Maps subfolder name → output JSON filename

const SUBCATEGORIES = [
  {
    folder: "1- Estructura por sexo y edad de la población",
    output: "estructura_sexo_edad.json",
  },
  {
    folder: "2- Condiciones habitacionales de la población",
    output: "condiciones_habitacionales_poblacion.json",
  },
  {
    folder: "3- Salud y previsión social",
    output: "salud_prevision_social.json",
  },
  {
    folder: "4- Condiciones habitacionales de los hogares",
    output: "condiciones_habitacionales_hogares.json",
  },
  {
    folder: "5- Viviendas",
    output: "viviendas.json",
  },
  {
    folder: "6- Educación",
    output: "educacion.json",
  },
  {
    folder: "7- Características económicas",
    output: "caracteristicas_economicas.json",
  },
  {
    folder: "8- Fecundidad",
    output: "fecundidad.json",
  },
  {
    folder: "9- Gobiernos locales",
    output: "gobiernos_locales.json",
  },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  const kb = (fs.statSync(filePath).size / 1024).toFixed(1);
  console.log(`  ✓ ${path.basename(filePath)} — ${data.length} records — ${kb} KB`);
}

/**
 * Converts a worksheet to an array of row objects.
 *
 * Census XLSX files follow a common Argentine government pattern:
 *   Row 1:    Title / table description (merged cells)
 *   Row 2:    Subtitle or blank
 *   Row 3+:   Column headers (sometimes spanning 2 rows)
 *   Data rows follow.
 *
 * We use XLSX.utils.sheet_to_json with defval:null and blankrows:false,
 * which automatically uses the first fully populated row as headers.
 * If the first row is a title (only 1 non-empty cell), we skip it and retry.
 */
function sheetToRows(worksheet, sourceFile) {
  // Convert to array-of-arrays first to inspect structure
  const aoa = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null, blankrows: false });

  if (aoa.length === 0) return [];

  // Find the header row: first row with more than 2 non-null cells
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(aoa.length, 5); i++) {
    const nonNull = aoa[i].filter((v) => v !== null && v !== "").length;
    if (nonNull > 2) {
      headerRowIdx = i;
      break;
    }
  }

  const headers = aoa[headerRowIdx].map((h, i) =>
    h !== null && h !== "" ? String(h).trim() : `col_${i}`
  );

  const rows = [];
  for (let i = headerRowIdx + 1; i < aoa.length; i++) {
    const row = aoa[i];
    // Skip rows that are entirely empty
    if (row.every((v) => v === null || v === "")) continue;
    const obj = { _source: path.basename(sourceFile) };
    headers.forEach((h, j) => {
      obj[h] = row[j] !== undefined ? row[j] : null;
    });
    rows.push(obj);
  }

  return rows;
}

/**
 * Processes all XLSX files in a given subfolder.
 * Returns a flat array of all rows across all files.
 */
function processSubcategory(folderPath) {
  const files = fs.readdirSync(folderPath).filter((f) => f.endsWith(".xlsx"));

  if (files.length === 0) {
    console.warn(`  ⚠ No XLSX files found in ${path.basename(folderPath)}`);
    return [];
  }

  const allRows = [];

  for (const file of files) {
    const filePath = path.join(folderPath, file);
    console.log(`    Reading: ${file}`);

    const workbook = XLSX.readFile(filePath, { cellDates: true });
    const sheetNames = workbook.SheetNames;

    if (sheetNames.length === 0) {
      console.warn(`      ⚠ No sheets found`);
      continue;
    }

    // Use the first sheet; skip "Índice" or "Metadatos" sheets if present
    const targetSheet =
      sheetNames.find(
        (name) =>
          !/^(índice|indice|metadato|metadata|portada|cover)/i.test(name)
      ) || sheetNames[0];

    const ws = workbook.Sheets[targetSheet];
    const rows = sheetToRows(ws, file);
    console.log(`      → ${rows.length} rows from sheet "${targetSheet}"`);
    allRows.push(...rows);
  }

  return allRows;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

function main() {
  console.log("=== process-poblacion.js ===");
  console.log(`Output: ${OUTPUT_DIR}\n`);

  ensureDir(OUTPUT_DIR);

  for (const { folder, output } of SUBCATEGORIES) {
    const folderPath = path.join(INPUT_DIR, folder);
    console.log(`\nProcessing: ${folder}`);

    if (!fs.existsSync(folderPath)) {
      console.warn(`  ⚠ Folder not found, skipping: ${folderPath}`);
      continue;
    }

    const rows = processSubcategory(folderPath);
    writeJSON(path.join(OUTPUT_DIR, output), rows);

    // Buscar y copiar el archivo Markdown de análisis (si existe)
    const mdFiles = fs.readdirSync(folderPath).filter((f) => f.endsWith(".md"));
    if (mdFiles.length > 0) {
      // Tomamos el primero que encontremos (asumiendo 1 análisis central por subcategoría)
      const srcMd = path.join(folderPath, mdFiles[0]);
      const destMdName = output.replace(".json", ".md");
      const destMd = path.join(OUTPUT_DIR, destMdName);
      fs.copyFileSync(srcMd, destMd);
      console.log(`  ✓ Info Analítica vinculada: ${mdFiles[0]} → ${destMdName}`);
    }
  }

  console.log("\n✓ Done.");
}

main();
