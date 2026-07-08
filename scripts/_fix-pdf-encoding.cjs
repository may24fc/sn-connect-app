const fs = require('fs');
let c = fs.readFileSync('apps/web/src/lib/expenses/monthly-report-pdf.ts', 'utf8');

const replacements = [
  ['\u00e2\u20ac\u201c', '-'],
  ['\u00e2\u20ac\u201d', '-'],
  ['\u00e2\u20ac\u0153', "'"],
  ['\u00e2\u20ac\u2122', "'"],
  ['\u00c2\u00b7', '|'],
  ['\u00e2\u20ac\u00a6', '...'],
  ['\u00e2\u2020\u2019', '->'],
  ['\u00e2\u20ac', '-'],
  ['\u00c2\u00a0', ' '],
];

for (const [bad, good] of replacements) {
  while (c.includes(bad)) {
    c = c.split(bad).join(good);
  }
}

// Also remove duplicate const scopeStr line (the original corrupted one, keep the clean one)
// The duplicated old scopeStr has backtick template literal with corruption
const lines = c.split('\n');
const cleaned = [];
let seenScopeStr = false;
for (const line of lines) {
  if (line.trim().startsWith('const scopeStr =') && line.includes('|  Prior:') && !line.includes('`')) {
    // This is the clean concatenated one — keep it
    cleaned.push(line);
    seenScopeStr = true;
  } else if (line.trim().startsWith('const scopeStr =') && seenScopeStr) {
    // Duplicate — skip
    continue;
  } else {
    cleaned.push(line);
  }
}

// Remove the old drawKpiCards function (lines between "// KPI cards" and next "// ---" block)
const result = cleaned.join('\n');
const remaining = (result.match(/\u00e2\u20ac/g) || []).length;
console.log('Remaining corrupted sequences:', remaining);
fs.writeFileSync('apps/web/src/lib/expenses/monthly-report-pdf.ts', result, 'utf8');
console.log('Done. Lines:', result.split('\n').length);
