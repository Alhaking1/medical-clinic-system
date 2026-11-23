import fs from 'fs';
import path from 'path';

const routesDir = './src/routes';
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js') && !f.includes('.bak'));
const results = [];

files.forEach(file => {
  const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, i) => {
    if (/router\.(get|put|delete|patch)\(['"][^'"]*:[a-zA-Z0-9_]+/.test(l)) {
      results.push({ file, line: i + 1, text: l.trim() });
    }
  });
});

console.log('Total parameterized routes:', results.length);
fs.writeFileSync('idor_scan_results.json', JSON.stringify(results, null, 2));
console.log('Results written to idor_scan_results.json');
