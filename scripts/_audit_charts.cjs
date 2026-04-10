const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..');

function slugify(text) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const reports = [
  { name: 'agricultura', json: 'public/data/agricultura.json', md: 'public/reports/agricultura.md' },
  { name: 'economia-fiscal', json: 'public/data/economia-fiscal.json', md: 'public/reports/economia-fiscal.md' },
  { name: 'educacion', json: 'public/data/educacion.json', md: 'public/reports/educacion.md' },
  { name: 'industria', json: 'public/data/industria.json', md: 'public/reports/industria.md' },
  { name: 'salud', json: 'public/data/salud.json', md: 'public/reports/salud.md' },
  { name: 'seguridad', json: 'public/data/seguridad.json', md: 'public/reports/seguridad.md' },
  { name: 'poblacion/economia', json: 'public/data/poblacion/economia.json', md: 'public/reports/poblacion/economia.md' },
  { name: 'poblacion/educacion-censal', json: 'public/data/poblacion/educacion-censal.json', md: 'public/reports/poblacion/educacion-censal.md' },
  { name: 'poblacion/estructura', json: 'public/data/poblacion/estructura.json', md: 'public/reports/poblacion/estructura.md' },
  { name: 'poblacion/fecundidad', json: 'public/data/poblacion/fecundidad.json', md: 'public/reports/poblacion/fecundidad.md' },
  { name: 'poblacion/habitacional-hogares', json: 'public/data/poblacion/habitacional-hogares.json', md: 'public/reports/poblacion/habitacional-hogares.md' },
  { name: 'poblacion/habitacional-personas', json: 'public/data/poblacion/habitacional-personas.json', md: 'public/reports/poblacion/habitacional-personas.md' },
  { name: 'poblacion/salud-prevision', json: 'public/data/poblacion/salud-prevision.json', md: 'public/reports/poblacion/salud-prevision.md' },
  { name: 'poblacion/viviendas', json: 'public/data/poblacion/viviendas.json', md: 'public/reports/poblacion/viviendas.md' },
];

const stopWords = new Set(['los', 'las', 'del', 'por', 'con', 'una', 'que', 'mas', 'entre', 'sin']);

function findMatch(sectionId, headingSlugs) {
  for (const hs of headingSlugs) {
    if (hs === sectionId) return { slug: hs, type: 'EXACT' };
    if (hs.includes(sectionId)) return { slug: hs, type: 'SUBSTRING' };
    
    const chartWords = sectionId.split('-').filter(w => w.length > 2 && !stopWords.has(w));
    const sectionWords = hs.split('-').filter(w => w.length > 2 && !stopWords.has(w));
    const overlap = chartWords.filter(w => sectionWords.includes(w));
    
    if (chartWords.length <= 2 && overlap.length >= chartWords.length) return { slug: hs, type: 'WORD_MATCH' };
    if (overlap.length >= 2 && overlap.length >= chartWords.length * 0.5) return { slug: hs, type: 'WORD_MATCH' };
  }
  return null;
}

let issues = 0;

for (const r of reports) {
  const jsonPath = path.join(BASE, r.json);
  const mdPath = path.join(BASE, r.md);
  
  if (!fs.existsSync(jsonPath)) { console.log(`SKIP ${r.name} (no JSON)`); continue; }
  
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const charts = data.charts || [];
  
  if (charts.length === 0) { console.log(`${r.name}: NO CHARTS`); continue; }
  
  // Get headings from MD
  let headingSlugs = [];
  if (fs.existsSync(mdPath)) {
    const md = fs.readFileSync(mdPath, 'utf-8');
    const headings = md.split('\n').filter(l => l.startsWith('## ')).map(l => l.replace(/^## /, ''));
    headingSlugs = headings.map(h => slugify(h));
  }
  
  console.log(`\n=== ${r.name} (${charts.length} charts, ${headingSlugs.length} headings) ===`);
  
  for (const chart of charts) {
    const sid = chart.sectionId || '';
    const match = findMatch(sid, headingSlugs);
    if (match) {
      console.log(`  ✅ ${chart.id} [${sid}] -> ${match.type} on "${match.slug}"`);
    } else {
      console.log(`  ❌ ${chart.id} [${sid}] -> NO MATCH`);
      issues++;
    }
  }
}

console.log(`\n${'='.repeat(50)}`);
console.log(`Total issues: ${issues}`);
