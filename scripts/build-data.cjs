/**
 * build-data.cjs
 * 
 * Orquestador: ejecuta todos los scripts de procesamiento en secuencia.
 * 1. process-*.js  → JSONs intermedios desde CSV/XLSX raw
 * 2. generate-report-data.cjs → data.json finales para scrollytelling + explorer
 * 
 * Uso: node scripts/build-data.cjs
 */

const { execSync } = require("child_process");
const path = require("path");

const SCRIPTS_DIR = __dirname;

const PIPELINE = [
  // Step 1: Process raw CSVs → intermediate JSONs
  "process-seguridad.cjs",
  "process-agricultura.cjs",
  "process-economia.cjs",
  "process-educacion.cjs",
  "process-industria.cjs",
  "process-salud.cjs",
  // Step 2: Generate final data.json + explorer
  "generate-report-data.cjs",
];

console.log("╔══════════════════════════════════════════════════════════╗");
console.log("║       Dashboard PBA — Full Data Build Pipeline          ║");
console.log("╚══════════════════════════════════════════════════════════╝");

const start = Date.now();
let failed = 0;

for (const script of PIPELINE) {
  const scriptPath = path.join(SCRIPTS_DIR, script);
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  Running: ${script}`);
  console.log("═".repeat(60));
  try {
    execSync(`node "${scriptPath}"`, { stdio: "inherit" });
  } catch (err) {
    console.error(`  ❌ FAILED: ${script}`);
    failed++;
  }
}

const elapsed = ((Date.now() - start) / 1000).toFixed(1);
console.log(`\n${"═".repeat(60)}`);
if (failed === 0) {
  console.log(`  ✅ All ${PIPELINE.length} scripts completed in ${elapsed}s`);
} else {
  console.log(`  ⚠️  ${failed} script(s) failed out of ${PIPELINE.length} — ${elapsed}s`);
}
console.log("═".repeat(60));
