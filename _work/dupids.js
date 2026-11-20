const fs = require('fs');
const h = fs.readFileSync('index.html', 'utf8');
const ids = [...h.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
const dups = [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))];
console.log('ids', ids.length, 'dups', JSON.stringify(dups));
