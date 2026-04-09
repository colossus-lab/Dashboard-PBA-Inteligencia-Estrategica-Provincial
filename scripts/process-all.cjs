/**
 * process-all.js
 *
 * Runner that executes all data processing scripts in sequence.
 * Used as a prebuild step in Vercel (see vercel.json buildCommand).
 *
 * USAGE (run from project root):
 *   node scripts/process-all.js
 *
 * Or via npm:
 *   npm run process-data
 *
 * REQUIREMENTS:
 *   npm install papaparse xlsx
 */

const { execSync } = require("child_process");
const path = require("path");

const SCRIPTS = [
  "process-seguridad.js",
  "process-agricultura.js",
  "process-economia.js",
  "process-educacion.js",
  "process-industria.js",
  "process-salud.js",
  "process-poblacion.js",
];

const SCRIPTS_DIR = __dirname;

function run(script) {
  const scriptPath = path.join(SCRIPTS_DIR, script);
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Running: ${script}`);
  console.log("=".repeat(60));
  execSync(`node "${scriptPath}"`, { stdio: "inherit" });
}

console.log("╔══════════════════════════════════════════════════════════╗");
console.log("║         Dashboard PBA — Data Processing Pipeline        ║");
console.log("╚══════════════════════════════════════════════════════════╝");
console.log(`\nProcessing ${SCRIPTS.length} categories...\n`);

const start = Date.now();

for (const script of SCRIPTS) {
  run(script);
}

const elapsed = ((Date.now() - start) / 1000).toFixed(1);
console.log(`\n${"=".repeat(60)}`);
console.log(`✓ All categories processed in ${elapsed}s`);
console.log("=".repeat(60));
