/* eslint-disable */
/**
 * Pre-procesamiento de assets pesados de Conurbano (manual, no en prebuild).
 *
 * Genera:
 *  - public/data/conurbano/educacion/radios_gba.topojson (desde .geojson, simplificado 8%)
 *  - public/data/conurbano/educacion/radios_hexgrid.topojson (desde .geojson, simplificado 15%)
 *  - public/data/conurbano/educacion/gba_schools.json (array plano desde gba_schools_enriched.geojson)
 *  - public/data/conurbano/seguridad/conurbano.topojson (desde .geojson, simplificado 15%)
 *  - public/data/conurbano/seguridad/conurbano-hexgrid.topojson (desde .geojson, simplificado 15%)
 *
 * Uso:
 *   node scripts/conurbano-build-tiles.cjs
 *
 * Requiere mapshaper. Si no está instalado: `npx mapshaper` lo instala on-demand.
 *
 * Después de regenerar, se pueden borrar los .geojson originales del repo
 * (los .topojson son la fuente que sirve el front).
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const EDU = path.join(ROOT, 'public/data/conurbano/educacion');
const SEG = path.join(ROOT, 'public/data/conurbano/seguridad');

function run(cmd) {
  console.log(`\n→ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: ROOT });
}

// 1. Polígonos: simplificación + TopoJSON con quantization
function geoToTopo(input, output, simplify) {
  if (!fs.existsSync(input)) {
    console.warn(`⚠ skip (no existe): ${input}`);
    return;
  }
  const flags = simplify
    ? `-simplify percentage=${simplify} keep-shapes -clean`
    : '-clean';
  run(`npx mapshaper ${JSON.stringify(input)} ${flags} -o format=topojson quantization=10000 ${JSON.stringify(output)}`);
}

// 2. Schools (puntos): geojson → array plano JSON, eliminando GeoJSON wrapper.
function schoolsToFlatJson(input, output) {
  if (!fs.existsSync(input)) {
    console.warn(`⚠ skip (no existe): ${input}`);
    return;
  }
  console.log(`\n→ schools: ${input} → ${output}`);
  const fc = JSON.parse(fs.readFileSync(input, 'utf-8'));
  const out = [];
  for (const f of fc.features) {
    const g = f.geometry;
    if (!g || g.type !== 'Point') continue;
    const [lng, lat] = g.coordinates;
    const p = f.properties || {};
    out.push({
      cue: String(p.cue ?? ''),
      nombre: String(p.nombre ?? ''),
      sector: String(p.sector ?? ''),
      ambito: String(p.ambito ?? ''),
      partido: String(p.partido ?? ''),
      localidad: String(p.localidad ?? ''),
      domicilio: String(p.domicilio ?? ''),
      niveles: Array.isArray(p.niveles)
        ? p.niveles
        : typeof p.niveles === 'string'
          ? safeJsonArray(p.niveles)
          : [],
      geocode_quality: String(p.geocode_quality ?? 'calle'),
      confianza: p.confianza ?? 'media',
      lng,
      lat,
      radio_id: p.radio_id ?? null,
      vulnerability_score: numOrNull(p.vulnerability_score),
      vulnerability_decile: numOrNull(p.vulnerability_decile),
      pct_sin_instruccion: numOrNull(p.pct_sin_instruccion),
      pct_secundario_completo: numOrNull(p.pct_secundario_completo),
      tasa_nunca_asistio: numOrNull(p.tasa_nunca_asistio),
      nbi_pct: numOrNull(p.nbi_pct),
      privacion_material_pct: numOrNull(p.privacion_material_pct),
      hacinamiento_pct: numOrNull(p.hacinamiento_pct),
    });
  }
  fs.writeFileSync(output, JSON.stringify(out));
  const sizeKB = Math.round(fs.statSync(output).size / 1024);
  console.log(`  ✔ ${out.length} colegios · ${sizeKB} KB`);
}

function numOrNull(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function safeJsonArray(s) {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

console.log('═══════════════════════════════════════');
console.log('  Conurbano · pre-procesado de assets');
console.log('═══════════════════════════════════════');

// EDUCACIÓN
geoToTopo(
  path.join(EDU, 'radios_gba.geojson'),
  path.join(EDU, 'radios_gba.topojson'),
  '8%',
);
geoToTopo(
  path.join(EDU, 'radios_hexgrid.geojson'),
  path.join(EDU, 'radios_hexgrid.topojson'),
  '15%',
);
schoolsToFlatJson(
  path.join(EDU, 'gba_schools_enriched.geojson'),
  path.join(EDU, 'gba_schools.json'),
);

// SEGURIDAD
geoToTopo(
  path.join(SEG, 'conurbano.geojson'),
  path.join(SEG, 'conurbano.topojson'),
  '15%',
);
geoToTopo(
  path.join(SEG, 'conurbano-hexgrid.geojson'),
  path.join(SEG, 'conurbano-hexgrid.topojson'),
  '15%',
);

console.log('\n✅ Listo. Antes de borrar los .geojson originales, verificá visualmente.');
