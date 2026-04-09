const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', '1- Poblacion', '6- Educación');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx')).sort();
const out = [];

for (const file of files) {
  const fp = path.join(dir, file);
  const wb = XLSX.readFile(fp);
  const sizeKB = Math.round(fs.statSync(fp).size / 1024);
  out.push(`\n${'═'.repeat(80)}`);
  out.push(`FILE: ${file.substring(0,80)}... (${sizeKB}KB) | Sheets: ${wb.SheetNames.join(', ')}`);
  out.push(`${'═'.repeat(80)}\n`);

  for (const sn of wb.SheetNames) {
    if (['Carátula', 'Índice', 'Caratula', 'Indice'].includes(sn)) continue;
    const ws = wb.Sheets[sn];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    out.push(`  --- Sheet: ${sn} (${data.length} rows) ---`);
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const nonEmpty = row.map((c, j) => `[${j}]${String(c).trim()}`).filter(c => !c.endsWith(']'));
      if (nonEmpty.length > 0) {
        out.push(`    R${String(i).padStart(3,'0')}: ${nonEmpty.join(' | ')}`);
      }
    }
    out.push('');
  }
}

const outPath = path.join(__dirname, 'educacion-censo-output.txt');
fs.writeFileSync(outPath, out.join('\n'), 'utf8');
console.log(`Done! ${out.length} lines written to ${outPath}`);
console.log(`Files processed: ${files.length}`);
console.log(`Sheets found: ${files.map(f => {
  const wb = XLSX.readFile(path.join(dir, f));
  return wb.SheetNames.join(', ');
}).join(' | ')}`);
