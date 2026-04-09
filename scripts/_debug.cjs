const fs = require('fs');
const d = JSON.parse(fs.readFileSync('public/data/poblacion/fecundidad.json', 'utf8'));
console.log('=== KPIs:', d.kpis?.length);
console.log('=== Charts:', d.charts?.length);
d.charts?.forEach(function(c, i) {
  console.log('\n--- Chart', i, '---');
  console.log('  id:', c.id);
  console.log('  title:', c.title);
  console.log('  type:', c.type);
  console.log('  sectionId:', c.sectionId);
  console.log('  data count:', c.data?.length);
  if (c.data && c.data[0]) {
    console.log('  keys:', Object.keys(c.data[0]));
    console.log('  data[0]:', JSON.stringify(c.data[0]).substring(0, 150));
  }
  if (c.config) console.log('  config:', JSON.stringify(c.config));
});
