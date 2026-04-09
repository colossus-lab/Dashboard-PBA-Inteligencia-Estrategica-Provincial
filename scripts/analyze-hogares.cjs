const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const DIR = path.join(__dirname, '..', '1- Poblacion', '4- Condiciones habitacionales de los hogares');
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.xlsx')).sort();
const output = [];

for (const f of files) {
  const wb = XLSX.readFile(path.join(DIR, f));
  output.push(`\n${'═'.repeat(80)}`);
  output.push(`FILE: ${f} (${Math.round(fs.statSync(path.join(DIR,f)).size/1024)}KB) | Sheets: ${wb.SheetNames.join(', ')}`);
  output.push('═'.repeat(80));
  for (const sn of wb.SheetNames) {
    if (sn.toLowerCase().includes('ndice') || sn.toLowerCase().includes('tula')) continue;
    const ws = wb.Sheets[sn];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    output.push(`\n  --- Sheet: ${sn} (${data.length} rows) ---`);
    // For large sheets with municipal data, capture first 10 rows + provincial totals
    const maxRows = data.length > 200 ? 40 : Math.min(200, data.length);
    for (let i = 0; i < maxRows; i++) {
      const cells = data[i].map((c, ci) => {
        if (c === '' || c === null || c === undefined) return null;
        const val = typeof c === 'number' ? c.toLocaleString('es-AR') : String(c).replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim().slice(0,160);
        return `[${ci}]${val}`;
      }).filter(Boolean);
      if (cells.length > 0) output.push(`    R${String(i).padStart(2,'0')}: ${cells.join(' | ')}`);
    }
    if (data.length > 200) output.push(`    ... (${data.length - maxRows} more rows with municipal data) ...`);
  }
}

fs.writeFileSync(path.join(__dirname, 'hogares-output.txt'), output.join('\n'), 'utf8');
console.log(`Done. ${output.length} lines written to hogares-output.txt`);
