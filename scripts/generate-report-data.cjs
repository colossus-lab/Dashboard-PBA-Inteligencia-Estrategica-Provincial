/**
 * generate-report-data.cjs
 * 
 * Genera los 14 data.json para el dashboard scrollytelling.
 * Cada data.json sigue el schema ReportData con: meta, kpis, charts, rankings, mapData.
 * 
 * Uso: node scripts/generate-report-data.cjs
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { COASTAL_TOURIST_MUNICIPIOS } = require('./data/municipios-turisticos-costeros.cjs');

const ROOT = path.join(__dirname, '..');
const OUT_DATA = path.join(ROOT, 'public', 'data');
const OUT_REPORTS = path.join(ROOT, 'public', 'reports');

// Ensure directories exist
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
ensureDir(path.join(OUT_DATA, 'poblacion'));
ensureDir(path.join(OUT_REPORTS, 'poblacion'));

// Helper: read Excel sheet as array of arrays
function readSheet(filePath, sheetIndex = 0) {
  const wb = XLSX.readFile(filePath);
  const sheetName = wb.SheetNames.filter(s => !['Carátula','Índice','Caratula','Indice'].includes(s))[sheetIndex];
  if (!sheetName) return [];
  return XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' });
}

// Helper: clean numeric value
function num(val) {
  if (val === '' || val === '-' || val === '///' || val === '...') return null;
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

// Helper: format number with dots
function fmt(n) {
  if (n === null || n === undefined) return '-';
  return n.toLocaleString('es-AR');
}

// Write JSON output
function writeJson(relativePath, data) {
  const fullPath = path.join(OUT_DATA, relativePath);
  ensureDir(path.dirname(fullPath));
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf8');
  const sizeKB = Math.round(fs.statSync(fullPath).size / 1024);
  console.log(`  ✅ ${relativePath} (${sizeKB} KB) — ${data.kpis.length} KPIs, ${data.charts.length} charts`);
  if (sizeKB > 3000) console.warn(`  ⚠️  WARNING: ${relativePath} exceeds 3MB!`);
}

// Copy MD report to public/reports/
function copyReport(sourcePath, destRelative) {
  const dest = path.join(OUT_REPORTS, destRelative);
  ensureDir(path.dirname(dest));
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, dest);
    console.log(`  📄 Copied report → ${destRelative}`);
  } else {
    console.warn(`  ⚠️  Report not found: ${sourcePath}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// 1.7 ECONOMÍA (Actividad económica por municipio)
// ═══════════════════════════════════════════════════════════════
function generateEconomia() {
  console.log('\n📊 1.7 — Características Económicas');
  const dir = path.join(ROOT, '1- Poblacion', '7- Características económicas');
  const file = fs.readdirSync(dir).find(f => f.endsWith('.xlsx'));
  const data = readSheet(path.join(dir, file));

  // Parse municipal data
  const municipios = [];
  let totalRow = null;
  let gbaRow = null;
  let restoRow = null;

  for (const row of data) {
    const code = String(row[0] || '').trim();
    const name = String(row[1] || '').trim();
    const pob14 = num(row[2]);
    const pea = num(row[3]);
    const ocup = num(row[4]);
    const desoc = num(row[5]);
    const pnea = num(row[6]);

    if (code === '06' && name.includes('Total')) {
      totalRow = { pob14, pea, ocup, desoc, pnea };
    } else if (name.includes('24 Partidos')) {
      gbaRow = { pob14, pea, ocup, desoc, pnea };
    } else if (name.includes('Resto de partidos')) {
      restoRow = { pob14, pea, ocup, desoc, pnea };
    } else if (code.match(/^\d{5}$/) && pob14) {
      municipios.push({
        municipioId: code,
        municipioNombre: name,
        pob14, pea, ocup, desoc, pnea,
        tasaActividad: Math.round((pea / pob14) * 1000) / 10,
        tasaDesocupacion: Math.round((desoc / pea) * 1000) / 10,
        tasaEmpleo: Math.round((ocup / pob14) * 1000) / 10,
      });
    }
  }

  // Sort by desocupacion
  const byDesocDesc = [...municipios].sort((a, b) => b.tasaDesocupacion - a.tasaDesocupacion);
  const byDesocAsc = [...municipios].sort((a, b) => a.tasaDesocupacion - b.tasaDesocupacion);

  const result = {
    meta: {
      id: 'poblacion-economia',
      title: 'Características Económicas de la Población',
      category: 'poblacion',
      subcategory: 'economia',
      source: 'INDEC — Censo Nacional 2022. Cuadro C1.2',
      date: '2022-05-18',
    },
    kpis: [
      { id: 'pob14', label: 'Población 14+ años', value: totalRow.pob14, formatted: fmt(totalRow.pob14), unit: 'personas' },
      { id: 'pea', label: 'PEA', value: totalRow.pea, formatted: fmt(totalRow.pea), unit: 'personas' },
      { id: 'tasa-actividad', label: 'Tasa de actividad', value: 64.5, formatted: '64,5%', unit: '%' },
      { id: 'ocupados', label: 'Ocupados', value: totalRow.ocup, formatted: fmt(totalRow.ocup), unit: 'personas', status: 'good' },
      { id: 'desocupados', label: 'Desocupados', value: totalRow.desoc, formatted: fmt(totalRow.desoc), unit: 'personas', status: 'critical' },
      { id: 'tasa-desocupacion', label: 'Tasa de desocupación', value: 9.2, formatted: '9,2%', unit: '%', status: 'critical' },
      { id: 'pnea', label: 'Inactivos (PNEA)', value: totalRow.pnea, formatted: fmt(totalRow.pnea), unit: 'personas' },
      { id: 'desocup-gba', label: 'Desocupación GBA', value: 9.9, formatted: '9,9%', unit: '%', status: 'critical' },
      { id: 'desocup-interior', label: 'Desocupación interior', value: 8.1, formatted: '8,1%', unit: '%', status: 'warning' },
    ],
    charts: [
      {
        id: 'pea-pnea-donut',
        type: 'pie',
        title: 'Distribución PEA vs PNEA',
        sectionId: 'dimensionamiento',
        data: [
          { id: 'PEA (Activos)', value: totalRow.pea, label: `${fmt(totalRow.pea)} (64,5%)` },
          { id: 'PNEA (Inactivos)', value: totalRow.pnea, label: `${fmt(totalRow.pnea)} (35,5%)` },
        ],
      },
      {
        id: 'gba-vs-interior',
        type: 'bar',
        title: 'Desocupación: GBA vs Interior',
        sectionId: 'brecha-gba-interior',
        data: [
          { zona: 'GBA (24 partidos)', 'Tasa desocupación': 9.9, 'Tasa actividad': 64.6 },
          { zona: 'Interior PBA', 'Tasa desocupación': 8.1, 'Tasa actividad': 64.5 },
        ],
        config: { xAxis: 'zona', colorScheme: 'set2' },
      },
      {
        id: 'top-desocupacion',
        type: 'bar',
        title: 'Top 15 municipios — Mayor desocupación',
        sectionId: 'ranking-desocupacion',
        data: byDesocDesc.slice(0, 15).map(m => ({
          municipio: m.municipioNombre,
          'Tasa desocupación (%)': m.tasaDesocupacion,
        })),
        config: { xAxis: 'municipio', layout: 'horizontal' },
      },
      {
        id: 'bottom-desocupacion',
        type: 'bar',
        title: 'Top 10 municipios — Menor desocupación',
        sectionId: 'municipios-menor-desocupacion',
        data: byDesocAsc.slice(0, 10).map(m => ({
          municipio: m.municipioNombre,
          'Tasa desocupación (%)': m.tasaDesocupacion,
        })),
        config: { xAxis: 'municipio', layout: 'horizontal', colorScheme: 'greens' },
      },
      {
        id: 'volumen-desocupados',
        type: 'bar',
        title: 'Municipios con más desocupados (absoluto)',
        sectionId: 'volumen-desocupacion',
        data: [...municipios].sort((a, b) => b.desoc - a.desoc).slice(0, 10).map(m => ({
          municipio: m.municipioNombre,
          Desocupados: m.desoc,
        })),
        config: { xAxis: 'municipio', layout: 'horizontal' },
      },
    ],
    rankings: [
      {
        id: 'ranking-desocupacion-full',
        title: 'Ranking de desocupación por municipio',
        sectionId: 'ranking-desocupacion',
        items: byDesocDesc.map(m => ({ name: m.municipioNombre, value: m.tasaDesocupacion, municipioId: m.municipioId })),
        order: 'desc',
      },
    ],
    mapData: municipios.map(m => ({
      municipioId: m.municipioId,
      municipioNombre: m.municipioNombre,
      value: m.tasaDesocupacion,
      label: `${m.tasaDesocupacion}%`,
    })),
  };

  writeJson('poblacion/economia.json', result);
  copyReport(
    path.join(dir, fs.readdirSync(dir).find(f => f.endsWith('.md')) || ''),
    'poblacion/economia.md'
  );
}

// ═══════════════════════════════════════════════════════════════
// 1.8 FECUNDIDAD
// ═══════════════════════════════════════════════════════════════
function generateFecundidad() {
  console.log('\n📊 1.8 — Fecundidad');
  const dir = path.join(ROOT, '1- Poblacion', '8- Fecundidad');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));
  
  // C1.2: Fecundidad por municipio
  const c1File = files.find(f => f.includes('c1_2'));
  const c1Data = readSheet(path.join(dir, c1File));

  const municipios = [];
  let totalRow = null;

  for (const row of c1Data) {
    const code = String(row[0] || '').replace(/\s/g, '').trim();
    const name = String(row[1] || '').trim();
    const mujeres = num(row[1]) || num(row[1]); // col index may vary
    const ninguno = num(row[2]);
    const h1 = num(row[3]);
    const h2 = num(row[4]);
    const h3 = num(row[5]);
    const h4 = num(row[6]);
    const h5mas = num(row[7]);
    const promedio = num(row[8]);

    // Try to read mujeres from col 1
    const mujeresVal = num(row[1]);

    if (code === '06' && (name.includes('Total') || String(row[0]).includes('Total'))) {
      totalRow = { mujeres: num(row[1]), ninguno: num(row[2]), h1: num(row[3]), h2: num(row[4]), h3: num(row[5]), h4: num(row[6]), h5mas: num(row[7]), promedio: num(row[8]) };
    } else if (code.match(/^\d{5}$/)) {
      const m = num(row[1]);
      const p = num(row[8]);
      if (m && p !== null) {
        municipios.push({
          municipioId: code,
          municipioNombre: name.replace(/^\d+\s*/, '').trim(),
          mujeres: m,
          ninguno: num(row[2]),
          h1: num(row[3]),
          h2: num(row[4]),
          h3: num(row[5]),
          h4: num(row[6]),
          h5mas: num(row[7]),
          promedio: p,
          pctSinHijos: m ? Math.round((num(row[2]) / m) * 1000) / 10 : 0,
          pct5mas: m ? Math.round((num(row[7]) / m) * 1000) / 10 : 0,
        });
      }
    }
  }

  // C12.2: Fecundidad por nivel educativo
  const c12File = files.find(f => f.includes('c12'));
  const c12Data = readSheet(path.join(dir, c12File));
  
  const fertByLevel = [];
  for (const row of c12Data) {
    const age = String(row[0] || '').trim();
    const level = String(row[1] || '').trim();
    if (age === 'Total' && level !== 'Total') {
      const muj = num(row[2]);
      const hijos = num(row[3]);
      if (muj && hijos !== null) {
        fertByLevel.push({
          nivel: level.replace(/\(especialización.*\)/, '').trim(),
          mujeres: muj,
          hijos: hijos,
          promedio: Math.round((hijos / muj) * 100) / 100,
        });
      }
    }
  }

  const byPromedioDesc = [...municipios].sort((a, b) => b.promedio - a.promedio);
  const byPromedioAsc = [...municipios].sort((a, b) => a.promedio - b.promedio);

  const result = {
    meta: {
      id: 'poblacion-fecundidad',
      title: 'Fecundidad',
      category: 'poblacion',
      subcategory: 'fecundidad',
      source: 'INDEC — Censo Nacional 2022. Cuadros C1.2 y C12.2',
      date: '2022-05-18',
    },
    kpis: [
      { id: 'mujeres-14-49', label: 'Mujeres 14-49 años', value: 4668931, formatted: '4.668.931', unit: 'mujeres' },
      { id: 'promedio-hijos', label: 'Promedio hijos/mujer', value: 1.4, formatted: '1,4', unit: 'hijos/mujer' },
      { id: 'pct-sin-hijos', label: 'Sin hijos', value: 43.8, formatted: '43,8%', unit: '%' },
      { id: 'pct-5mas', label: '5+ hijos', value: 4.8, formatted: '4,8%', unit: '%', status: 'warning' },
      { id: 'min-fecundidad', label: 'Menor: Vicente López', value: 0.9, formatted: '0,9', status: 'good' },
      { id: 'max-fecundidad', label: 'Mayor: F.Varela/JCPaz', value: 1.7, formatted: '1,7', status: 'critical' },
      { id: 'brecha', label: 'Brecha máx/mín', value: 1.9, formatted: '1,9x', status: 'critical' },
    ],
    charts: [
      {
        id: 'distribucion-hijos',
        type: 'pie',
        title: 'Distribución de mujeres por cantidad de hijos',
        sectionId: 'dimensionamiento',
        data: [
          { id: 'Sin hijos', value: 2044540 },
          { id: '1 hijo', value: 778592 },
          { id: '2 hijos', value: 924829 },
          { id: '3 hijos', value: 483809 },
          { id: '4 hijos', value: 214097 },
          { id: '5 o más', value: 223064 },
        ],
      },
      {
        id: 'top-fecundidad',
        type: 'bar',
        title: 'Top 15 municipios — Mayor fecundidad',
        sectionId: 'mayor-fecundidad',
        data: byPromedioDesc.slice(0, 15).map(m => ({
          municipio: m.municipioNombre,
          'Promedio hijos': m.promedio,
        })),
        config: { xAxis: 'municipio', layout: 'horizontal' },
      },
      {
        id: 'bottom-fecundidad',
        type: 'bar',
        title: 'Top 10 municipios — Menor fecundidad',
        sectionId: 'menor-fecundidad',
        data: byPromedioAsc.slice(0, 10).map(m => ({
          municipio: m.municipioNombre,
          'Promedio hijos': m.promedio,
        })),
        config: { xAxis: 'municipio', layout: 'horizontal', colorScheme: 'greens' },
      },
      {
        id: 'fecundidad-educacion',
        type: 'bar',
        title: 'Fecundidad por nivel educativo',
        sectionId: 'fecundidad-educacion',
        data: fertByLevel.map(l => ({
          nivel: l.nivel,
          'Promedio hijos': l.promedio,
          'Mujeres': l.mujeres,
        })),
        config: { xAxis: 'nivel' },
      },
      {
        id: 'scatter-fecundidad',
        type: 'scatter',
        title: 'Fecundidad vs % sin hijos por municipio',
        sectionId: 'brecha-fecundidad',
        data: municipios.map(m => ({
          id: m.municipioNombre,
          x: m.pctSinHijos,
          y: m.promedio,
          size: m.mujeres,
        })),
        config: { xAxis: '% sin hijos', yAxis: 'Promedio hijos/mujer' },
      },
    ],
    rankings: [
      {
        id: 'ranking-fecundidad',
        title: 'Ranking de fecundidad por municipio',
        sectionId: 'mapa-fecundidad',
        items: byPromedioDesc.map(m => ({ name: m.municipioNombre, value: m.promedio, municipioId: m.municipioId })),
        order: 'desc',
      },
    ],
    mapData: municipios.map(m => ({
      municipioId: m.municipioId,
      municipioNombre: m.municipioNombre,
      value: m.promedio,
      label: `${m.promedio} hijos/mujer`,
    })),
  };

  writeJson('poblacion/fecundidad.json', result);
  copyReport(
    path.join(dir, fs.readdirSync(dir).find(f => f.endsWith('.md')) || ''),
    'poblacion/fecundidad.md'
  );
}

// ═══════════════════════════════════════════════════════════════
// 1.6 EDUCACIÓN CENSAL (Asistencia educativa)
// ═══════════════════════════════════════════════════════════════
function generateEducacionCensal() {
  console.log('\n📊 1.6 — Educación Censal (Asistencia)');
  const dir = path.join(ROOT, '1- Poblacion', '6- Educación');
  const file = fs.readdirSync(dir).find(f => f.endsWith('.xlsx'));
  const data = readSheet(path.join(dir, file));

  // Parse total rows by age
  const ageData = [];
  let inTotal = false;
  let inMujer = false;
  let inVaron = false;

  const totalByAge = {};
  const mujerByAge = {};
  const varonByAge = {};

  for (const row of data) {
    const col0 = String(row[0] || '').trim();
    const col1 = String(row[1] || '').trim();

    if (col0 === 'Total') { inTotal = true; inMujer = false; inVaron = false; continue; }
    if (col0.includes('Mujer')) { inMujer = true; inTotal = false; inVaron = false; continue; }
    if (col0.includes('Varón')) { inVaron = true; inTotal = false; inMujer = false; continue; }
    if (col0.startsWith('(')) continue;
    if (col0.startsWith('Nota')) break;

    const age = col1 || col0;
    const pob = num(row[2]);
    const asisten = num(row[3]);

    if (pob && asisten !== null && !isNaN(parseInt(age))) {
      const ageStr = String(age).trim();
      const entry = { age: ageStr, pob, asisten, tasa: Math.round((asisten / pob) * 1000) / 10 };

      if (inTotal) totalByAge[ageStr] = entry;
      else if (inMujer) mujerByAge[ageStr] = entry;
      else if (inVaron) varonByAge[ageStr] = entry;
    }
  }

  // Build the desgranamiento curve (single ages)
  const singleAges = ['6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '25'];
  const desgranamiento = singleAges
    .filter(a => totalByAge[a])
    .map(a => ({
      edad: `${a} años`,
      'Tasa asistencia (%)': totalByAge[a].tasa,
    }));

  // Gender comparison at key ages
  const genderAges = ['13', '14', '15', '16', '17', '18', '19'];
  const genderComparison = genderAges
    .filter(a => mujerByAge[a] && varonByAge[a])
    .map(a => ({
      edad: `${a} años`,
      Mujeres: mujerByAge[a].tasa,
      Varones: varonByAge[a].tasa,
    }));

  // Level distribution
  const nivelData = [
    { nivel: 'Jardín maternal (0-3)', value: 317369 },
    { nivel: 'Preescolar (4-5)', value: 427672 },
    { nivel: 'Primario', value: 1858066 },
    { nivel: 'Secundario', value: 1996891 },
    { nivel: 'Terciario', value: 425248 },
    { nivel: 'Universitario', value: 808850 },
    { nivel: 'Posgrado', value: 92852 },
  ];

  const result = {
    meta: {
      id: 'poblacion-educacion-censal',
      title: 'Asistencia Educativa de la Población',
      category: 'poblacion',
      subcategory: 'educacion-censal',
      source: 'INDEC — Censo Nacional 2022. Cuadro C2.2',
      date: '2022-05-18',
    },
    kpis: [
      { id: 'pob-total', label: 'Población PBA', value: 17408906, formatted: '17.408.906', unit: 'personas' },
      { id: 'asistentes', label: 'Asisten al sistema educativo', value: 5926948, formatted: '5.926.948', unit: 'personas' },
      { id: 'tasa-general', label: 'Tasa asistencia general', value: 34.0, formatted: '34,0%', unit: '%' },
      { id: 'cobertura-0-2', label: 'Cobertura 0-2 años', value: 22.3, formatted: '22,3%', unit: '%', status: 'critical' },
      { id: 'cobertura-4', label: 'Cobertura 4 años', value: 93.3, formatted: '93,3%', unit: '%', status: 'good' },
      { id: 'tasa-17', label: 'Asistencia 17 años', value: 87.8, formatted: '87,8%', unit: '%', status: 'warning' },
      { id: 'tasa-19', label: 'Asistencia 19 años', value: 55.7, formatted: '55,7%', unit: '%', status: 'critical' },
      { id: 'jovenes-fuera', label: 'Jóvenes 17-19 fuera', value: 240841, formatted: '240.841', unit: 'personas', status: 'critical' },
      { id: 'brecha-genero-19', label: 'Brecha género 19 años', value: 12.6, formatted: '+12,6 pp', unit: 'pp', comparison: 'Mujeres 62,1% vs Varones 49,5%' },
      { id: 'universitarios', label: 'Universitarios', value: 808850, formatted: '808.850', unit: 'personas' },
      { id: 'ratio-mujeres-superior', label: 'Mujeres/Varones superior', value: 1.73, formatted: '1,73:1' },
    ],
    charts: [
      {
        id: 'desgranamiento',
        type: 'line',
        title: 'Curva de desgranamiento: tasa de asistencia por edad',
        sectionId: 'curva-desgranamiento',
        data: desgranamiento,
        config: { xAxis: 'edad', yAxis: 'Tasa asistencia (%)' },
      },
      {
        id: 'brecha-genero',
        type: 'bar',
        title: 'Brecha de género en secundario (13-19 años)',
        sectionId: 'brecha-genero-secundario',
        data: genderComparison,
        config: { xAxis: 'edad', grouped: true },
      },
      {
        id: 'distribucion-nivel',
        type: 'pie',
        title: 'Distribución de asistentes por nivel educativo',
        sectionId: 'distribucion-nivel',
        data: nivelData.map(n => ({ id: n.nivel, value: n.value })),
      },
      {
        id: 'nivel-stacked',
        type: 'bar',
        title: 'Asistentes por nivel educativo',
        sectionId: 'distribucion-nivel',
        data: nivelData.map(n => ({ nivel: n.nivel, Asistentes: n.value })),
        config: { xAxis: 'nivel', layout: 'horizontal' },
      },
    ],
    rankings: [],
    mapData: [],
  };

  writeJson('poblacion/educacion-censal.json', result);
  copyReport(
    path.join(dir, fs.readdirSync(dir).find(f => f.endsWith('.md')) || ''),
    'poblacion/educacion-censal.md'
  );
}

// ═══════════════════════════════════════════════════════════════
// Helper: read intermediate JSON from public/data/{cat}/
// ═══════════════════════════════════════════════════════════════
function readIntermediate(relativePath) {
  const fp = path.join(OUT_DATA, relativePath);
  if (!fs.existsSync(fp)) { console.warn(`  ⚠️  Not found: ${relativePath}`); return []; }
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

// Helper: aggregate array by key
function groupBy(arr, keyFn) {
  const map = {};
  for (const item of arr) {
    const k = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
    if (!map[k]) map[k] = [];
    map[k].push(item);
  }
  return map;
}

// Helper: sum field in array
function sumField(arr, field) {
  if (!arr || !Array.isArray(arr)) return 0;
  return arr.reduce((s, r) => s + (r[field] || 0), 0);
}

// ═══════════════════════════════════════════════════════════════
// 4. SEGURIDAD — Enriched from intermediate JSONs
// ═══════════════════════════════════════════════════════════════
function generateSeguridad() {
  console.log('\n📊 4 — Seguridad (enriched)');
  const prov = readIntermediate('seguridad/provincia_panel.json');
  const dept = readIntermediate('seguridad/departamentos_panel.json');

  // --- Temporal series: total hechos por año ---
  const byYear = groupBy(prov, 'anio');
  const years = Object.keys(byYear).map(Number).sort();
  const temporalData = years.map(y => {
    const rows = byYear[y];
    return { año: y, 'Hechos delictivos': sumField(rows, 'cantidad_hechos'), 'Víctimas': sumField(rows, 'cantidad_victimas') };
  });

  // --- Distribución por tipo de delito (último año) ---
  const lastYear = years[years.length - 1];
  const lastYearProv = prov.filter(r => r.anio === lastYear);
  const byDelito = groupBy(lastYearProv, 'delito_nombre');
  const delitoDistrib = Object.entries(byDelito)
    .map(([nombre, rows]) => ({ id: nombre, value: sumField(rows, 'cantidad_hechos') }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // --- Top municipios por tasa (último año) ---
  const deptLastYear = dept.filter(r => r.anio === lastYear && r.departamento_id !== '06999');
  const byMuni = groupBy(deptLastYear, 'departamento_id');
  const muniAgg = Object.entries(byMuni).map(([id, rows]) => ({
    municipioId: id,
    municipioNombre: rows[0].departamento_nombre,
    hechos: sumField(rows, 'cantidad_hechos'),
    tasa: rows.reduce((s, r) => s + (r.tasa_hechos || 0), 0),
  }));

  // Particionar costeros turísticos: el denominador del SNIC es población residente
  // y en estos municipios la población de hecho se multiplica en verano, inflando
  // su tasa. Se los excluye del ranking principal y se reportan por separado.
  const muniAggNoCostero = muniAgg.filter(m => !COASTAL_TOURIST_MUNICIPIOS[m.municipioId]);
  const muniAggCosteros  = muniAgg
    .filter(m => COASTAL_TOURIST_MUNICIPIOS[m.municipioId])
    .map(m => {
      const t = COASTAL_TOURIST_MUNICIPIOS[m.municipioId];
      return { ...m, factorEstival: t.factorEstival, tasaAjustada: Math.round(m.tasa / t.factorEstival) };
    });

  const byTasaDesc = [...muniAggNoCostero].sort((a, b) => b.tasa - a.tasa);
  const byTasaAsc  = [...muniAggNoCostero].sort((a, b) => a.tasa - b.tasa);
  const costerosByTasaDesc = [...muniAggCosteros].sort((a, b) => b.tasa - a.tasa);

  // --- KPIs from real data ---
  const totalHechos = sumField(lastYearProv, 'cantidad_hechos');
  const totalVictimas = sumField(lastYearProv, 'cantidad_victimas');
  const homicidios = lastYearProv.filter(r => r.delito_nombre && r.delito_nombre.toLowerCase().trim() === 'homicidios dolosos');
  const totalHomicidios = sumField(homicidios, 'cantidad_hechos');

  writeJson('seguridad.json', {
    meta: { id: 'seguridad', title: 'Seguridad Ciudadana', category: 'seguridad', source: 'SNIC — Ministerio de Seguridad', date: String(lastYear) },
    kpis: [
      { id: 'hechos-total', label: `Hechos delictivos (${lastYear})`, value: totalHechos, formatted: fmt(totalHechos), unit: 'hechos', status: 'critical' },
      { id: 'victimas-total', label: `Víctimas totales (${lastYear})`, value: totalVictimas, formatted: fmt(totalVictimas), unit: 'víctimas', status: 'critical' },
      { id: 'homicidios', label: 'Homicidios dolosos', value: totalHomicidios, formatted: fmt(totalHomicidios), unit: 'casos', status: 'critical' },
      { id: 'municipios-analizados', label: 'Municipios con datos', value: muniAgg.length, formatted: String(muniAgg.length), unit: 'municipios' },
      { id: 'peor-municipio', label: `Mayor tasa (excl. costeros): ${byTasaDesc[0]?.municipioNombre || '-'}`, value: Math.round(byTasaDesc[0]?.tasa || 0), formatted: fmt(Math.round(byTasaDesc[0]?.tasa || 0)), unit: 'hechos/100k' },
      { id: 'municipios-turisticos-aparte', label: 'Municipios costeros (analizados aparte)', value: muniAggCosteros.length, formatted: String(muniAggCosteros.length), unit: 'municipios' },
    ],
    charts: [
      { id: 'delitos-temporal', type: 'line', title: 'Evolución de hechos delictivos PBA', sectionId: 'evolucion-delitos', data: temporalData, config: { xAxis: 'año' } },
      { id: 'delitos-tipo', type: 'pie', title: `Distribución por tipo de delito (${lastYear})`, sectionId: 'tipos-delitos', data: delitoDistrib },
      { id: 'top-municipios-delitos', type: 'bar', title: 'Top 15 municipios — Mayor tasa delictiva (excluye costeros turísticos)', sectionId: 'ranking-delitos', data: byTasaDesc.slice(0, 15).map(m => ({ municipio: m.municipioNombre, 'Tasa hechos': Math.round(m.tasa) })), config: { xAxis: 'municipio', layout: 'horizontal' } },
      { id: 'bottom-municipios-delitos', type: 'bar', title: 'Top 10 municipios — Menor tasa delictiva', sectionId: 'municipios-seguros', data: byTasaAsc.slice(0, 10).map(m => ({ municipio: m.municipioNombre, 'Tasa hechos': Math.round(m.tasa) })), config: { xAxis: 'municipio', layout: 'horizontal', colorScheme: 'greens' } },
    ],
    rankings: [
      { id: 'ranking-delitos-full', title: 'Ranking delictivo por municipio (excluye costeros turísticos)', sectionId: 'ranking-delitos', items: byTasaDesc.map(m => ({ name: m.municipioNombre, value: Math.round(m.tasa), municipioId: m.municipioId })), order: 'desc' },
      { id: 'ranking-costeros', title: 'Municipios costeros (ranking aparte por estacionalidad turística)', sectionId: 'municipios-turisticos', items: costerosByTasaDesc.map(m => ({ name: m.municipioNombre, value: Math.round(m.tasa), municipioId: m.municipioId, meta: `Factor estival ×${m.factorEstival} → tasa ajustada ${m.tasaAjustada}` })), order: 'desc' },
    ],
    mapData: muniAgg.map(m => {
      const t = COASTAL_TOURIST_MUNICIPIOS[m.municipioId];
      const valor = Math.round(m.tasa);
      return {
        municipioId: m.municipioId,
        municipioNombre: m.municipioNombre,
        value: valor,
        label: t
          ? `${valor} hechos/100k (turístico — ajustada ≈${Math.round(m.tasa / t.factorEstival)})`
          : `${valor} hechos/100k`,
        touristic: Boolean(t),
      };
    }),
  });
  copyReport(path.join(ROOT, '4- Seguridad', fs.readdirSync(path.join(ROOT, '4- Seguridad')).find(f => f.endsWith('.md')) || ''), 'seguridad.md');
}

// ═══════════════════════════════════════════════════════════════
// 3. SALUD — Enriched from intermediate JSONs
// ═══════════════════════════════════════════════════════════════
function generateSalud() {
  console.log('\n📊 3 — Salud (enriched)');
  const neonatal = readIntermediate('salud/defunciones_neonatal.json');
  const nacidos = readIntermediate('salud/nacidos_vivos.json');

  // --- TMI temporal: defunciones por año ---
  const neoByYear = groupBy(neonatal, 'anio');
  const neoYears = Object.keys(neoByYear).map(Number).sort();
  const tmiTemporal = neoYears.map(y => {
    const rows = neoByYear[y];
    const neo = sumField(rows.filter(r => r.clasificacion && r.clasificacion.toLowerCase().includes('neonatal') && !r.clasificacion.toLowerCase().includes('pos')), 'cantidad');
    const post = sumField(rows.filter(r => r.clasificacion && r.clasificacion.toLowerCase().includes('pos')), 'cantidad');
    return { año: y, Neonatal: neo, Posneonatal: post, Total: neo + post };
  });

  // --- Nacidos vivos por peso (último año) ---
  const nacYears = [...new Set(nacidos.map(r => r.anio))].sort();
  const nacLastYear = nacYears[nacYears.length - 1];
  const nacLast = nacidos.filter(r => r.anio === nacLastYear);
  const byPeso = groupBy(nacLast, 'intervalo_peso');
  const pesoDistrib = Object.entries(byPeso)
    .map(([peso, rows]) => ({ id: peso, value: sumField(rows, 'cantidad') }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  // --- Top municipios por defunciones neonatales (promedio últimos 3 años) ---
  const last3 = neoYears.slice(-3);
  const neo3 = neonatal.filter(r => last3.includes(r.anio) && r.municipio_id);
  const neoByMuni = groupBy(neo3, 'municipio_id');
  const muniNeo = Object.entries(neoByMuni).map(([id, rows]) => ({
    municipioId: id,
    municipioNombre: rows[0].municipio_nombre,
    promedio: Math.round(sumField(rows, 'cantidad') / last3.length),
  })).filter(m => m.promedio > 0).sort((a, b) => b.promedio - a.promedio);

  // KPIs
  const lastNeoYear = neoYears[neoYears.length - 1];
  const lastNeoRows = neoByYear[lastNeoYear] || [];
  const totalDefNeo = sumField(lastNeoRows, 'cantidad');
  const totalNacidos = sumField(nacLast, 'cantidad');

  writeJson('salud.json', {
    meta: { id: 'salud', title: 'Salud Materno-Infantil', category: 'salud', source: 'DEIS — Ministerio de Salud', date: String(lastNeoYear) },
    kpis: [
      { id: 'nacidos-vivos', label: `Nacidos vivos (${nacLastYear})`, value: totalNacidos, formatted: fmt(totalNacidos), unit: 'nacimientos' },
      { id: 'defunciones-infantiles', label: `Defunciones infantiles (${lastNeoYear})`, value: totalDefNeo, formatted: fmt(totalDefNeo), unit: 'defunciones', status: 'warning' },
      { id: 'tmi-estimada', label: 'TMI estimada', value: totalNacidos > 0 ? Math.round((totalDefNeo / totalNacidos) * 10000) / 10 : 0, formatted: totalNacidos > 0 ? `${(Math.round((totalDefNeo / totalNacidos) * 10000) / 10).toFixed(1)}‰` : '-', unit: '‰', status: 'warning' },
      { id: 'municipios-con-datos', label: 'Municipios con datos', value: muniNeo.length, formatted: String(muniNeo.length), unit: 'municipios' },
    ],
    charts: [
      { id: 'tmi-temporal', type: 'line', title: 'Evolución de defunciones infantiles', sectionId: 'evolucion-mortalidad', data: tmiTemporal, config: { xAxis: 'año' } },
      { id: 'nacidos-peso', type: 'pie', title: `Nacidos vivos por rango de peso (${nacLastYear})`, sectionId: 'peso-nacer', data: pesoDistrib },
      { id: 'defunciones-municipio', type: 'bar', title: 'Top 15 municipios — Defunciones infantiles (prom. 3 años)', sectionId: 'ranking-mortalidad', data: muniNeo.slice(0, 15).map(m => ({ municipio: m.municipioNombre, 'Promedio defunciones': m.promedio })), config: { xAxis: 'municipio', layout: 'horizontal' } },
      { id: 'bajo-peso-temporal', type: 'line', title: 'Nacidos vivos totales por año', sectionId: 'evolucion-nacidos', data: nacYears.map(y => ({ año: y, 'Nacidos vivos': sumField(nacidos.filter(r => r.anio === y), 'cantidad') })), config: { xAxis: 'año' } },
    ],
    rankings: [{ id: 'ranking-mortalidad', title: 'Defunciones infantiles por municipio', sectionId: 'ranking-mortalidad', items: muniNeo.map(m => ({ name: m.municipioNombre, value: m.promedio, municipioId: m.municipioId })), order: 'desc' }],
    mapData: muniNeo.map(m => ({ municipioId: m.municipioId, municipioNombre: m.municipioNombre, value: m.promedio, label: `${m.promedio} def/año` })),
  });
  copyReport(path.join(ROOT, '3- Salud', fs.readdirSync(path.join(ROOT, '3- Salud')).find(f => f.endsWith('.md')) || ''), 'salud.md');
}

// ═══════════════════════════════════════════════════════════════
// 2. EDUCACIÓN SECTORIAL — Enriched
// ═══════════════════════════════════════════════════════════════
function generateEducacionSectorial() {
  console.log('\n📊 2 — Educación Sectorial (enriched)');
  const trayectoria = readIntermediate('educacion/trayectoria.json');

  // Trayectoria: sobreedad por año
  const trayByYear = groupBy(trayectoria, 'anio');
  const trayYears = Object.keys(trayByYear).map(Number).sort();
  const sobreedadData = trayYears.slice(-10).map(y => {
    const rows = trayByYear[y];
    const valid = rows.filter(r => r.sobreedad_primaria !== null && r.sobreedad_primaria !== undefined);
    const avgSobreedad = valid.length > 0 ? valid.reduce((s, r) => s + (r.sobreedad_primaria || 0), 0) / valid.length : 0;
    return { año: y, 'Tasa sobreedad (%)': Math.round(avgSobreedad * 10) / 10 };
  });

  writeJson('educacion.json', {
    meta: { id: 'educacion', title: 'Análisis del Sistema Educativo', category: 'educacion', source: 'Evaluación Aprender 2024, DGCyE PBA', date: '2024' },
    kpis: [
      { id: 'matricula-total', label: 'Matrícula total PBA', value: 5001120, formatted: '5.001.120', unit: 'alumnos' },
      { id: 'aprender-lectura-prim', label: 'Lectura 3° grado (≤Nivel II)', value: 32.0, formatted: '32,0%', unit: '%', status: 'critical' },
      { id: 'aprender-lectura-prim-graves', label: 'Lectura 3° grado (graves: ≤Nivel I)', value: 12.7, formatted: '12,7%', unit: '%', status: 'critical' },
      { id: 'aprender-lengua-sec', label: 'Lengua Secundaria (≤Básico)', value: 42.7, formatted: '42,7%', unit: '%', status: 'critical' },
      { id: 'aprender-mate-sec', label: 'Matemática Secundaria (≤Básico)', value: 83.1, formatted: '83,1%', unit: '%', status: 'critical' },
    ],
    charts: [
      { id: 'aprender-primaria', type: 'bar', title: 'Evaluación Aprender 2024 — Primaria', sectionId: 'aprender', data: [
        { area: 'Lengua', 'Por debajo del básico': 10.7, 'Básico': 23.5, 'Satisfactorio': 39.7, 'Avanzado': 26.1 },
        { area: 'Matemática', 'Por debajo del básico': 14.0, 'Básico': 30.5, 'Satisfactorio': 38.2, 'Avanzado': 17.3 },
      ], config: { xAxis: 'area', stacked: true } },
      { id: 'aprender-secundaria', type: 'bar', title: 'Evaluación Aprender 2024 — Secundaria', sectionId: 'aprender', data: [
        { area: 'Lengua', 'Por debajo del básico': 22.7, 'Básico': 30.8, 'Satisfactorio': 33.6, 'Avanzado': 12.9 },
        { area: 'Matemática', 'Por debajo del básico': 40.8, 'Básico': 37.6, 'Satisfactorio': 17.2, 'Avanzado': 4.4 },
      ], config: { xAxis: 'area', stacked: true } },
      { id: 'trayectoria-sobreedad', type: 'line', title: 'Evolución de sobreedad escolar', sectionId: 'trayectoria', data: sobreedadData, config: { xAxis: 'año' } },
    ],
    rankings: [], mapData: [],
  });
  copyReport(path.join(ROOT, '2- Educacion', fs.readdirSync(path.join(ROOT, '2- Educacion')).find(f => f.endsWith('.md')) || ''), 'educacion.md');
}

// ═══════════════════════════════════════════════════════════════
// 5. ECONOMÍA FISCAL — Enriched
// ═══════════════════════════════════════════════════════════════
function generateEconomiaFiscal() {
  console.log('\n📊 5 — Economía Fiscal (enriched)');
  const recaudacion = readIntermediate('economia/recaudacion.json');
  const pbg = readIntermediate('economia/pbg.json');
  const transferencias = readIntermediate('economia/transferencias.json');
  const exportaciones = readIntermediate('economia/exportaciones.json');

  // Helper: pick last year with at least 12 months of data (full year),
  // skipping current-year partial data (e.g. enero-2026 sólo tiene 1 mes).
  function lastFullYear(rows) {
    const monthsByYear = {};
    for (const r of rows) {
      const y = r.anio; if (y == null) continue;
      monthsByYear[y] = monthsByYear[y] || new Set();
      if (r.mes != null) monthsByYear[y].add(r.mes);
    }
    const fullYears = Object.entries(monthsByYear)
      .filter(([, m]) => m.size >= 12)
      .map(([y]) => Number(y))
      .sort();
    return fullYears[fullYears.length - 1] ?? Math.max(...Object.keys(monthsByYear).map(Number));
  }

  // --- Recaudación anual (sólo años con 12 meses) ---
  const recFullLast = lastFullYear(recaudacion);
  const recByYear = groupBy(recaudacion, 'anio');
  const recYears = Object.keys(recByYear).map(Number).filter(y => y <= recFullLast).sort();
  const recTemporal = recYears.map(y => ({ año: y, 'Recaudación total': Math.round(sumField(recByYear[y], 'monto')) }));

  // --- PBG por sector (último año) ---
  const pbgYears = [...new Set(pbg.map(r => r.anio))].sort();
  const pbgLastYear = pbgYears[pbgYears.length - 1];
  const pbgLast = pbg.filter(r => r.anio === pbgLastYear && r.sector_detalle && r.sector_detalle !== '');
  const bySector = groupBy(pbgLast, 'sector_detalle');
  const pbgSectorData = Object.entries(bySector)
    .map(([sector, rows]) => ({ id: sector.length > 40 ? sector.substring(0, 40) + '...' : sector, value: Math.round(sumField(rows, 'valor_corrientes')) }))
    .filter(d => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 10);

  // --- Transferencias por municipio (último año cerrado) ---
  const transLastYear = lastFullYear(transferencias);
  const transLast = transferencias.filter(r => r.anio === transLastYear);
  const transByMuni = groupBy(transLast, 'municipio_id');
  const muniTrans = Object.entries(transByMuni)
    .map(([id, rows]) => ({ municipioId: id, municipioNombre: rows[0].municipio_nombre, total: Math.round(sumField(rows, 'monto')) }))
    .filter(m => m.total > 0).sort((a, b) => b.total - a.total);

  // --- Exportaciones por rubro (último año cerrado) ---
  const expLastYear = lastFullYear(exportaciones);
  const expLast = exportaciones.filter(r => r.anio === expLastYear);
  const byRubro = groupBy(expLast, 'grandes_rubros');
  const expRubroData = Object.entries(byRubro)
    .map(([rubro, rows]) => ({ rubro: rubro.length > 35 ? rubro.substring(0, 35) + '...' : rubro, 'Valor (USD)': Math.round(sumField(rows, 'valor')) }))
    .filter(d => d['Valor (USD)'] > 0).sort((a, b) => b['Valor (USD)'] - a['Valor (USD)']);

  const totalRec = recTemporal.length > 0 ? recTemporal[recTemporal.length - 1]['Recaudación total'] : 0;

  writeJson('economia-fiscal.json', {
    meta: { id: 'economia-fiscal', title: 'Economía y Finanzas Provinciales', category: 'economia-fiscal', source: 'Ministerio de Economía PBA, INDEC', date: String(transLastYear || '2023') },
    kpis: [
      { id: 'recaudacion-total', label: `Recaudación total (${recFullLast || ''})`, value: totalRec, formatted: fmt(totalRec), unit: '$' },
      { id: 'pbg-sectores', label: 'Sectores PBG analizados', value: pbgSectorData.length, formatted: String(pbgSectorData.length), unit: 'sectores' },
      { id: 'municipios-transfer', label: 'Municipios con transferencias', value: muniTrans.length, formatted: String(muniTrans.length), unit: 'municipios' },
      { id: 'top-transfer', label: `Mayor transfer.: ${muniTrans[0]?.municipioNombre || '-'}`, value: muniTrans[0]?.total || 0, formatted: fmt(muniTrans[0]?.total || 0), unit: '$' },
    ],
    charts: [
      { id: 'recaudacion-temporal', type: 'line', title: 'Evolución recaudación tributaria PBA', sectionId: 'recaudacion', data: recTemporal, config: { xAxis: 'año' } },
      { id: 'pbg-sectores', type: 'pie', title: `PBG por sector (${pbgLastYear || '-'})`, sectionId: 'pbg', data: pbgSectorData },
      { id: 'exportaciones-rubros', type: 'bar', title: `Exportaciones por rubro (${expLastYear || '-'})`, sectionId: 'exportaciones', data: expRubroData, config: { xAxis: 'rubro', layout: 'horizontal' } },
      { id: 'transferencias-municipio', type: 'bar', title: `Top 15 municipios — Transferencias (${transLastYear || '-'})`, sectionId: 'transferencias', data: muniTrans.slice(0, 15).map(m => ({ municipio: m.municipioNombre, 'Total transferido': m.total })), config: { xAxis: 'municipio', layout: 'horizontal' } },
    ],
    rankings: [{ id: 'ranking-transferencias', title: 'Transferencias por municipio', sectionId: 'transferencias', items: muniTrans.map(m => ({ name: m.municipioNombre, value: m.total, municipioId: m.municipioId })), order: 'desc' }],
    mapData: muniTrans.map(m => ({ municipioId: m.municipioId, municipioNombre: m.municipioNombre, value: m.total, label: `$${fmt(m.total)}` })),
  });
  copyReport(path.join(ROOT, '5- Economía y Finanzas', fs.readdirSync(path.join(ROOT, '5- Economía y Finanzas')).find(f => f.endsWith('.md')) || ''), 'economia-fiscal.md');
}

// ═══════════════════════════════════════════════════════════════
// 6. AGRICULTURA — Enriched
// ═══════════════════════════════════════════════════════════════
function generateAgricultura() {
  console.log('\n📊 6 — Agricultura (enriched)');
  const stock = readIntermediate('agricultura/stock_bovino.json');
  const estim = readIntermediate('agricultura/estimaciones_agricolas.json');
  const capturas = readIntermediate('agricultura/capturas_pesqueras.json');

  // Stock bovino temporal
  const stockByYear = groupBy(stock, 'anio');
  const stockYears = Object.keys(stockByYear).map(Number).sort();
  const stockTemporal = stockYears.map(y => ({ año: y, 'Stock bovino': sumField(stockByYear[y], 'stock') }));

  // Stock por municipio (último año)
  const stockLastYear = stockYears[stockYears.length - 1];
  const stockLast = stock.filter(r => r.anio === stockLastYear);
  const stockMuniSorted = [...stockLast].sort((a, b) => (b.stock || 0) - (a.stock || 0));

  // Producción por cultivo (última campaña)
  const campanias = [...new Set(estim.map(r => r.campania))].sort();
  const lastCamp = campanias[campanias.length - 1];
  const estimLast = estim.filter(r => r.campania === lastCamp);
  const byCultivo = groupBy(estimLast, 'cultivo');
  const cultivoData = Object.entries(byCultivo)
    .map(([cultivo, rows]) => ({ id: cultivo, value: Math.round(sumField(rows, 'produccion')) }))
    .filter(d => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 8);

  // Superficie por cultivo
  const supData = Object.entries(byCultivo)
    .map(([cultivo, rows]) => ({ id: cultivo, value: Math.round(sumField(rows, 'superficie_sembrada')) }))
    .filter(d => d.value > 0).sort((a, b) => b.value - a.value).slice(0, 8);

  // Capturas (último año)
  const captYears = [...new Set(capturas.map(r => r.anio))].sort();
  const captLastYear = captYears[captYears.length - 1];
  const captLast = capturas.filter(r => r.anio === captLastYear);
  const captData = captLast.map(r => ({ especie: r.especie, Capturas: r.cantidad })).sort((a, b) => b.Capturas - a.Capturas).slice(0, 10);

  const totalStock = sumField(stockLast, 'stock');
  const totalProd = cultivoData.reduce((s, d) => s + d.value, 0);

  writeJson('agricultura.json', {
    meta: { id: 'agricultura', title: 'Sector Agropecuario y Pesquero', category: 'agricultura', source: 'MAGyP, SENASA, SSPyA', date: String(stockLastYear || '2023') },
    kpis: [
      { id: 'stock-bovino', label: `Stock bovino (${stockLastYear || ''})`, value: totalStock, formatted: fmt(totalStock), unit: 'cabezas' },
      { id: 'produccion-total', label: `Producción total (${lastCamp || ''})`, value: totalProd, formatted: fmt(totalProd), unit: 'toneladas' },
      { id: 'cultivos-analizados', label: 'Cultivos principales', value: cultivoData.length, formatted: String(cultivoData.length), unit: 'cultivos' },
      { id: 'top-ganadero', label: `Mayor stock: ${stockMuniSorted[0]?.municipio_nombre || '-'}`, value: stockMuniSorted[0]?.stock || 0, formatted: fmt(stockMuniSorted[0]?.stock || 0), unit: 'cabezas' },
    ],
    charts: [
      { id: 'stock-bovino-temporal', type: 'line', title: 'Evolución del stock bovino PBA', sectionId: 'evolucion-stock', data: stockTemporal, config: { xAxis: 'año' } },
      { id: 'produccion-cultivo', type: 'bar', title: `Producción por cultivo (${lastCamp || '-'})`, sectionId: 'produccion', data: cultivoData.map(d => ({ cultivo: d.id, 'Producción (tn)': d.value })), config: { xAxis: 'cultivo', layout: 'horizontal' } },
      { id: 'superficie-cultivos', type: 'pie', title: `Superficie sembrada por cultivo (${lastCamp || '-'})`, sectionId: 'superficie', data: supData },
      { id: 'capturas-pesqueras', type: 'bar', title: `Capturas pesqueras (${captLastYear || '-'})`, sectionId: 'pesca', data: captData, config: { xAxis: 'especie', layout: 'horizontal' } },
    ],
    rankings: [{ id: 'ranking-stock', title: 'Stock bovino por municipio', sectionId: 'ranking-ganadero', items: stockMuniSorted.map(m => ({ name: m.municipio_nombre, value: m.stock || 0, municipioId: m.municipio_id })), order: 'desc' }],
    mapData: stockLast.map(m => ({ municipioId: m.municipio_id, municipioNombre: m.municipio_nombre, value: m.stock || 0, label: `${fmt(m.stock || 0)} cab` })),
  });
  copyReport(path.join(ROOT, '6- Agricultura y Ganaderia', fs.readdirSync(path.join(ROOT, '6- Agricultura y Ganaderia')).find(f => f.endsWith('.md')) || ''), 'agricultura.md');
}

// ═══════════════════════════════════════════════════════════════
// 7. INDUSTRIA — Enriched
// ═══════════════════════════════════════════════════════════════
function generateIndustria() {
  console.log('\n📊 7 — Industria (enriched)');
  const empresas = readIntermediate('industria/empresas.json');
  const parques = readIntermediate('industria/parques.json');

  // Empresas temporal por segmento
  const empByYear = groupBy(empresas, 'anio');
  const empYears = Object.keys(empByYear).map(Number).sort();
  const empTemporal = empYears.map(y => {
    const row = { año: y };
    const rows = empByYear[y];
    rows.forEach(r => { row[r.segmento || 'Sin segmento'] = r.empresas || 0; });
    return row;
  });

  // Distribución por segmento (último año)
  const empLastYear = empYears[empYears.length - 1];
  const empLast = empresas.filter(r => r.anio === empLastYear);
  const segmentoData = empLast.map(r => ({ id: r.segmento || 'Sin segmento', value: r.empresas || 0 })).filter(d => d.value > 0);

  // Parques por municipio
  const parquesByMuni = groupBy(parques, 'municipio_id');
  const muniParques = Object.entries(parquesByMuni)
    .map(([id, rows]) => ({ municipioId: id, municipioNombre: rows[0].municipio_nombre, cantidad: rows.length, superficie: Math.round(sumField(rows, 'superficie')) }))
    .sort((a, b) => b.cantidad - a.cantidad);

  const totalEmpresas = sumField(empLast, 'empresas');
  const totalEstab = sumField(empLast, 'establecimientos');

  writeJson('industria.json', {
    meta: { id: 'industria', title: 'Sector Industrial', category: 'industria', source: 'CEP XXI, Ministerio de Producción PBA', date: String(empLastYear || '2023') },
    kpis: [
      { id: 'empresas-total', label: `Empresas industriales (${empLastYear || ''})`, value: totalEmpresas, formatted: fmt(totalEmpresas), unit: 'empresas' },
      { id: 'establecimientos', label: 'Establecimientos', value: totalEstab, formatted: fmt(totalEstab), unit: 'establecimientos' },
      { id: 'parques-total', label: 'Parques industriales', value: parques.length, formatted: String(parques.length), unit: 'parques' },
      { id: 'municipios-parques', label: 'Municipios con parques', value: muniParques.length, formatted: String(muniParques.length), unit: 'municipios' },
    ],
    charts: [
      { id: 'empresas-temporal', type: 'line', title: 'Evolución de empresas industriales', sectionId: 'evolucion-empresas', data: empTemporal.map(r => ({ año: r.año, Empresas: Object.entries(r).filter(([k]) => k !== 'año').reduce((s, [, v]) => s + v, 0) })), config: { xAxis: 'año' } },
      { id: 'empresas-segmento', type: 'pie', title: `Empresas por segmento (${empLastYear || '-'})`, sectionId: 'segmentos', data: segmentoData },
      { id: 'parques-municipio', type: 'bar', title: 'Municipios con más parques industriales', sectionId: 'parques', data: muniParques.slice(0, 15).map(m => ({ municipio: m.municipioNombre, Parques: m.cantidad })), config: { xAxis: 'municipio', layout: 'horizontal' } },
    ],
    rankings: [{ id: 'ranking-parques', title: 'Parques industriales por municipio', sectionId: 'parques', items: muniParques.map(m => ({ name: m.municipioNombre, value: m.cantidad, municipioId: m.municipioId })), order: 'desc' }],
    mapData: muniParques.map(m => ({ municipioId: m.municipioId, municipioNombre: m.municipioNombre, value: m.cantidad, label: `${m.cantidad} parques` })),
  });
  copyReport(path.join(ROOT, '7- Industria', fs.readdirSync(path.join(ROOT, '7- Industria')).find(f => f.endsWith('.md')) || ''), 'industria.md');
}

// ═══════════════════════════════════════════════════════════════
// STUBS para subgrupos poblacionales restantes
// (se completarán con datos cuando se procesen los Excel)
// ═══════════════════════════════════════════════════════════════
function generatePoblacionStubs() {
  // 1.1 Estructura
  console.log('\n📊 1.1 — Estructura Poblacional');
  writeJson('poblacion/estructura.json', {
    meta: { id: 'poblacion-estructura', title: 'Estructura por Sexo y Edad', category: 'poblacion', subcategory: 'estructura', source: 'INDEC — Censo 2022. Cuadros C1-C5', date: '2022-05-18' },
    kpis: [
      { id: 'pob-total', label: 'Población total PBA', value: 17523996, formatted: '17.523.996', unit: 'personas' },
      { id: 'mujeres', label: 'Mujeres', value: 9053427, formatted: '9.053.427', unit: '51,7%' },
      { id: 'varones', label: 'Varones', value: 8470569, formatted: '8.470.569', unit: '48,3%' },
      { id: 'indice-masc', label: 'Índice de masculinidad', value: 93.6, formatted: '93,6', unit: 'varones/100 mujeres' },
      { id: 'pob-65-mas', label: 'Población 65+ años', value: 2058624, formatted: '2.058.624', unit: '11,7%' },
      { id: 'mediana-edad', label: 'Mediana de edad', value: 33, formatted: '33 años', unit: 'años' },
    ],
    charts: [
      {
        id: 'piramide', type: 'pyramid', title: 'Pirámide poblacional PBA 2022', sectionId: 'piramide',
        data: [
          { grupo: '0-4', mujeres: 519688, varones: 533718 },
          { grupo: '5-9', mujeres: 673163, varones: 695050 },
          { grupo: '10-14', mujeres: 692196, varones: 714855 },
          { grupo: '15-19', mujeres: 678031, varones: 689507 },
          { grupo: '20-24', mujeres: 650447, varones: 642915 },
          { grupo: '25-29', mujeres: 663239, varones: 633539 },
          { grupo: '30-34', mujeres: 664450, varones: 628463 },
          { grupo: '35-39', mujeres: 638533, varones: 603143 },
          { grupo: '40-44', mujeres: 654967, varones: 612238 },
          { grupo: '45-49', mujeres: 582675, varones: 538415 },
          { grupo: '50-54', mujeres: 506689, varones: 465209 },
          { grupo: '55-59', mujeres: 446821, varones: 402033 },
          { grupo: '60-64', mujeres: 408891, varones: 356947 },
          { grupo: '65-69', mujeres: 365257, varones: 303487 },
          { grupo: '70-74', mujeres: 313810, varones: 242925 },
          { grupo: '75-79', mujeres: 240930, varones: 166778 },
          { grupo: '80-84', mujeres: 161618, varones: 94653 },
          { grupo: '85-89', mujeres: 95251, varones: 46219 },
          { grupo: '90+', mujeres: 58831, varones: 23325 },
        ],
      },
    ],
    rankings: [], mapData: [],
  });
  copyReport(
    path.join(ROOT, '1- Poblacion', '1- Estructura por sexo y edad de la población',
    fs.readdirSync(path.join(ROOT, '1- Poblacion', '1- Estructura por sexo y edad de la población')).find(f => f.endsWith('.md')) || ''),
    'poblacion/estructura.md'
  );

  // 1.2 Habitacional Personas
  console.log('\n📊 1.2 — Condiciones Habitacionales (Personas)');
  writeJson('poblacion/habitacional-personas.json', {
    meta: { id: 'poblacion-hab-personas', title: 'Condiciones Habitacionales de la Población', category: 'poblacion', subcategory: 'habitacional-personas', source: 'INDEC — Censo 2022', date: '2022-05-18' },
    kpis: [
      { id: 'pob-viviendas', label: 'Población en viviendas particulares', value: 17408906, formatted: '17.408.906', unit: 'personas' },
      { id: 'hacinamiento', label: 'Hacinamiento crítico', value: 4.2, formatted: '4,2%', unit: '%', status: 'critical' },
      { id: 'sin-agua-red', label: 'Sin agua de red', value: 15.8, formatted: '15,8%', unit: '%', status: 'critical' },
      { id: 'sin-cloacas', label: 'Sin desagüe cloacal', value: 42.3, formatted: '42,3%', unit: '%', status: 'critical' },
    ],
    charts: [], rankings: [], mapData: [],
  });
  copyReport(
    path.join(ROOT, '1- Poblacion', '2- Condiciones habitacionales de la población',
    fs.readdirSync(path.join(ROOT, '1- Poblacion', '2- Condiciones habitacionales de la población')).find(f => f.endsWith('.md')) || ''),
    'poblacion/habitacional-personas.md'
  );

  // 1.3 Salud y Previsión Social
  console.log('\n📊 1.3 — Salud y Previsión Social');
  writeJson('poblacion/salud-prevision.json', {
    meta: { id: 'poblacion-salud', title: 'Salud y Previsión Social', category: 'poblacion', subcategory: 'salud-prevision', source: 'INDEC — Censo 2022', date: '2022-05-18' },
    kpis: [
      { id: 'sin-cobertura', label: 'Sin cobertura de salud', value: 35.1, formatted: '35,1%', unit: '%', status: 'critical' },
      { id: 'obra-social-prepaga', label: 'Obra social o prepaga (incluye PAMI)', value: 62.3, formatted: '62,3%', unit: '%' },
      { id: 'plan-estatal', label: 'Programas o planes estatales de salud', value: 2.6, formatted: '2,6%', unit: '%' },
      { id: 'sin-cobertura-abs', label: 'Sin cobertura (absoluto)', value: 6111393, formatted: '6.111.393', unit: 'personas', status: 'critical' },
    ],
    charts: [], rankings: [], mapData: [],
  });
  copyReport(
    path.join(ROOT, '1- Poblacion', '3- Salud y previsión social',
    fs.readdirSync(path.join(ROOT, '1- Poblacion', '3- Salud y previsión social')).find(f => f.endsWith('.md')) || ''),
    'poblacion/salud-prevision.md'
  );

  // 1.4 Habitacional Hogares
  console.log('\n📊 1.4 — Condiciones Habitacionales (Hogares)');
  writeJson('poblacion/habitacional-hogares.json', {
    meta: { id: 'poblacion-hab-hogares', title: 'Condiciones Habitacionales de los Hogares', category: 'poblacion', subcategory: 'habitacional-hogares', source: 'INDEC — Censo 2022', date: '2022-05-18' },
    kpis: [
      { id: 'hogares-total', label: 'Total hogares PBA', value: 6051550, formatted: '6.051.550', unit: 'hogares' },
      { id: 'calmat-1', label: 'CALMAT I (calidad satisfactoria)', value: 64.2, formatted: '64,2%', unit: '%', status: 'good' },
      { id: 'calmat-4', label: 'CALMAT IV (calidad insuficiente)', value: 2.8, formatted: '2,8%', unit: '%', status: 'critical' },
      { id: 'sin-gas-red', label: 'Sin gas de red', value: 38.5, formatted: '38,5%', unit: '%', status: 'warning' },
    ],
    charts: [], rankings: [], mapData: [],
  });
  copyReport(
    path.join(ROOT, '1- Poblacion', '4- Condiciones habitacionales de los hogares',
    fs.readdirSync(path.join(ROOT, '1- Poblacion', '4- Condiciones habitacionales de los hogares')).find(f => f.endsWith('.md')) || ''),
    'poblacion/habitacional-hogares.md'
  );

  // 1.5 Viviendas
  console.log('\n📊 1.5 — Viviendas');
  writeJson('poblacion/viviendas.json', {
    meta: { id: 'poblacion-viviendas', title: 'Stock Habitacional', category: 'poblacion', subcategory: 'viviendas', source: 'INDEC — Censo 2022. Cuadros C1-C3', date: '2022-05-18' },
    kpis: [
      { id: 'viviendas-total', label: 'Total viviendas PBA', value: 6749094, formatted: '6.749.094', unit: 'viviendas' },
      { id: 'ocupadas', label: 'Viviendas ocupadas', value: 5970702, formatted: '5.970.702', unit: '88,5%' },
      { id: 'desocupadas', label: 'Viviendas desocupadas', value: 774963, formatted: '774.963', unit: '11,5%', status: 'warning' },
      { id: 'temporales', label: 'Uso temporal', value: 236801, formatted: '236.801', unit: 'viviendas' },
      { id: 'casillas-ranchos', label: 'Casillas + ranchos', value: 131211, formatted: '131.211', unit: '2,2%', status: 'critical' },
    ],
    charts: [
      {
        id: 'ocupacion-viviendas', type: 'pie', title: 'Condición de ocupación', sectionId: 'ocupacion',
        data: [
          { id: 'Ocupadas con personas', value: 5963078 },
          { id: 'Desocupadas', value: 538162 },
          { id: 'Uso temporal', value: 236801 },
        ],
      },
    ],
    rankings: [], mapData: [],
  });
  copyReport(
    path.join(ROOT, '1- Poblacion', '5- Viviendas',
    fs.readdirSync(path.join(ROOT, '1- Poblacion', '5- Viviendas')).find(f => f.endsWith('.md')) || ''),
    'poblacion/viviendas.md'
  );
}

// ═══════════════════════════════════════════════════════════════
// EXPLORER DATA — Clean tabular JSONs for Data Explorer
// ═══════════════════════════════════════════════════════════════
function generateExplorerData() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  GENERACIÓN DE EXPLORER/*.JSON');
  console.log('═══════════════════════════════════════════════════');

  const explorerDir = path.join(OUT_DATA, 'explorer');
  if (!fs.existsSync(explorerDir)) fs.mkdirSync(explorerDir, { recursive: true });

  function writeExplorer(filename, data) {
    const fp = path.join(explorerDir, filename);
    fs.writeFileSync(fp, JSON.stringify(data), 'utf8');
    const sz = Math.round(fs.statSync(fp).size / 1024);
    console.log('  ✅ explorer/' + filename + ' (' + sz + 'KB) — ' + data.rows.length + ' rows, ' + data.columns.length + ' cols');
  }

  function inferType(values) {
    const sample = values.filter(v => v !== null && v !== undefined && v !== '').slice(0, 20);
    if (sample.length === 0) return 'string';
    if (sample.every(v => typeof v === 'number' || (!isNaN(Number(v)) && v !== ''))) return 'number';
    return 'string';
  }

  function buildExplorer(id, title, source, rawRows, opts = {}) {
    if (!rawRows || rawRows.length === 0) return;
    const { exclude = [], maxRows = 5000 } = opts;
    const cols = Object.keys(rawRows[0]).filter(c => !exclude.includes(c));
    const columns = cols.map(c => ({
      name: c,
      type: inferType(rawRows.slice(0, 50).map(r => r[c])),
      label: c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    }));
    const rows = rawRows.slice(0, maxRows).map(r => {
      const row = {};
      cols.forEach(c => { row[c] = r[c] !== undefined ? r[c] : null; });
      return row;
    });
    // Extract unique municipios if present
    const muniCol = cols.find(c => c.includes('municipio_nombre') || c.includes('departamento_nombre'));
    const municipios = muniCol ? [...new Set(rows.map(r => r[muniCol]).filter(Boolean))].sort() : [];

    writeExplorer(id + '.json', { id, title, source, columns, rows, municipios, totalRows: rawRows.length });
  }

  // 1. Seguridad — aggregated by municipio+año (from 64MB → ~500KB)
  const deptPanel = readIntermediate('seguridad/departamentos_panel.json');
  if (deptPanel.length > 0) {
    const aggSeg = {};
    for (const r of deptPanel) {
      const key = r.departamento_id + '|' + r.anio;
      if (!aggSeg[key]) aggSeg[key] = { anio: r.anio, departamento_id: r.departamento_id, departamento_nombre: r.departamento_nombre, hechos: 0, victimas: 0, tasa_hechos: 0 };
      aggSeg[key].hechos += r.cantidad_hechos || 0;
      aggSeg[key].victimas += r.cantidad_victimas || 0;
      aggSeg[key].tasa_hechos = Math.max(aggSeg[key].tasa_hechos, r.tasa_hechos || 0);
    }
    buildExplorer('seguridad', 'Hechos Delictivos por Municipio', 'SNIC — Ministerio de Seguridad', Object.values(aggSeg));
  }

  // 2. Salud — nacidos vivos (already ~7MB, aggregate by municipio+año)
  const nacidos = readIntermediate('salud/nacidos_vivos.json');
  if (nacidos.length > 0) {
    const aggNac = {};
    for (const r of nacidos) {
      const key = (r.municipio_id || 'total') + '|' + r.anio;
      if (!aggNac[key]) aggNac[key] = { anio: r.anio, municipio_id: r.municipio_id, municipio_nombre: r.municipio_nombre, nacidos_vivos: 0 };
      aggNac[key].nacidos_vivos += r.cantidad || 0;
    }
    buildExplorer('salud-nacidos', 'Nacidos Vivos por Municipio', 'DEIS — Ministerio de Salud', Object.values(aggNac));
  }

  // 3. Salud — defunciones neonatales
  const neonatal = readIntermediate('salud/defunciones_neonatal.json');
  if (neonatal.length > 0) {
    buildExplorer('salud-defunciones', 'Defunciones Neonatales', 'DEIS — Ministerio de Salud', neonatal, { maxRows: 5000 });
  }

  // 4. Economía — Transferencias (40MB → aggregate by municipio+año)
  const trans = readIntermediate('economia/transferencias.json');
  if (trans.length > 0) {
    const aggTrans = {};
    for (const r of trans) {
      const key = (r.municipio_id || 'total') + '|' + r.anio;
      if (!aggTrans[key]) aggTrans[key] = { anio: r.anio, municipio_id: r.municipio_id, municipio_nombre: r.municipio_nombre, monto_total: 0, conceptos: 0 };
      aggTrans[key].monto_total += r.monto || 0;
      aggTrans[key].conceptos++;
    }
    buildExplorer('economia-transferencias', 'Transferencias a Municipios', 'Ministerio de Economía PBA', Object.values(aggTrans));
  }

  // 5. Economía — Exportaciones
  const exp = readIntermediate('economia/exportaciones.json');
  if (exp.length > 0) {
    buildExplorer('economia-exportaciones', 'Exportaciones por Rubro', 'INDEC', exp, { maxRows: 5000 });
  }

  // 6. Economía — Recaudación
  const rec = readIntermediate('economia/recaudacion.json');
  if (rec.length > 0) {
    buildExplorer('economia-recaudacion', 'Recaudación Tributaria PBA', 'Ministerio de Economía PBA', rec);
  }

  // 7. Economía — PBG
  const pbg = readIntermediate('economia/pbg.json');
  if (pbg.length > 0) {
    buildExplorer('economia-pbg', 'Producto Bruto Geográfico', 'INDEC', pbg);
  }

  // 8. Agricultura — Estimaciones agrícolas (13MB → aggregate by cultivo+campaña)
  const estim = readIntermediate('agricultura/estimaciones_agricolas.json');
  if (estim.length > 0) {
    const aggEst = {};
    for (const r of estim) {
      const key = (r.cultivo || '') + '|' + (r.campania || '') + '|' + (r.municipio_id || '');
      if (!aggEst[key]) aggEst[key] = { cultivo: r.cultivo, campania: r.campania, municipio_id: r.municipio_id, municipio_nombre: r.municipio_nombre, superficie_sembrada: 0, superficie_cosechada: 0, produccion: 0, rendimiento: 0 };
      aggEst[key].superficie_sembrada += r.superficie_sembrada || 0;
      aggEst[key].superficie_cosechada += r.superficie_cosechada || 0;
      aggEst[key].produccion += r.produccion || 0;
      aggEst[key].rendimiento = r.rendimiento || aggEst[key].rendimiento;
    }
    buildExplorer('agricultura-estimaciones', 'Estimaciones Agrícolas', 'MAGyP', Object.values(aggEst), { maxRows: 5000 });
  }

  // 9. Agricultura — Stock bovino
  const stock = readIntermediate('agricultura/stock_bovino.json');
  if (stock.length > 0) {
    buildExplorer('agricultura-stock', 'Stock Bovino por Municipio', 'SENASA', stock);
  }

  // 10. Agricultura — Capturas pesqueras
  const capt = readIntermediate('agricultura/capturas_pesqueras.json');
  if (capt.length > 0) {
    buildExplorer('agricultura-capturas', 'Capturas Pesqueras', 'SSPyA', capt);
  }

  // 11. Industria — Empresas
  const emp = readIntermediate('industria/empresas.json');
  if (emp.length > 0) {
    buildExplorer('industria-empresas', 'Empresas Industriales', 'CEP XXI', emp);
  }

  // 12. Industria — Parques
  const parq = readIntermediate('industria/parques.json');
  if (parq.length > 0) {
    buildExplorer('industria-parques', 'Parques Industriales', 'Ministerio de Producción PBA', parq);
  }

  // 13. Educación — Trayectoria
  const tray = readIntermediate('educacion/trayectoria.json');
  if (tray.length > 0) {
    buildExplorer('educacion-trayectoria', 'Trayectoria Escolar', 'DGCyE PBA', tray, { maxRows: 5000 });
  }

  // Generate index file listing all explorer datasets
  const indexFiles = fs.readdirSync(explorerDir).filter(f => f.endsWith('.json') && f !== 'index.json');
  const index = indexFiles.map(f => {
    const d = JSON.parse(fs.readFileSync(path.join(explorerDir, f), 'utf8'));
    return { id: d.id, title: d.title, source: d.source, rows: d.totalRows || d.rows.length, columns: d.columns.length, municipios: d.municipios.length, file: f };
  });
  fs.writeFileSync(path.join(explorerDir, 'index.json'), JSON.stringify(index, null, 2), 'utf8');
  console.log('\n  📋 explorer/index.json — ' + index.length + ' datasets indexed');
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════
console.log('═══════════════════════════════════════════════════');
console.log('  GENERACIÓN DE DATA.JSON — Dashboard PBA');
console.log('═══════════════════════════════════════════════════');

try {
  generatePoblacionStubs();     // 1.1 - 1.5 (con KPIs, charts parciales)
  generateEducacionCensal();    // 1.6 (con datos del Excel)
  generateEconomia();           // 1.7 (con datos del Excel)
  generateFecundidad();         // 1.8 (con datos del Excel)
  generateEducacionSectorial(); // 2 (enriched from trayectoria.json)
  generateSalud();              // 3 (enriched from neonatal/nacidos)
  generateSeguridad();          // 4 (enriched from departamentos_panel)
  generateEconomiaFiscal();     // 5 (enriched from recaudacion/pbg/transferencias)
  generateAgricultura();        // 6 (enriched from stock/estimaciones/capturas)
  generateIndustria();          // 7 (enriched from empresas/parques)
  generateExplorerData();       // Explorer datasets

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  ✅ COMPLETADO — 14 data.json + 14 reports + explorer');
  console.log('═══════════════════════════════════════════════════');

  // Summary
  const dataFiles = [];
  function scanDir(dir) {
    for (const f of fs.readdirSync(dir)) {
      const fp = path.join(dir, f);
      if (fs.statSync(fp).isDirectory()) scanDir(fp);
      else if (f.endsWith('.json')) dataFiles.push({ path: fp.replace(ROOT + path.sep, ''), size: Math.round(fs.statSync(fp).size / 1024) });
    }
  }
  scanDir(OUT_DATA);
  console.log('\nArchivos generados:');
  for (const f of dataFiles) console.log(`  ${f.size}KB | ${f.path}`);
  console.log(`\nTotal: ${dataFiles.length} JSONs, ${dataFiles.reduce((s, f) => s + f.size, 0)} KB`);

} catch (err) {
  console.error('❌ Error:', err.message);
  console.error(err.stack);
  process.exit(1);
}
