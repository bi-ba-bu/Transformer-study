const fs = require('fs');
const h = fs.readFileSync('index.html', 'utf8');
const re = /<div class="plain">([\s\S]*?)<\/div>/g;
let m;
let i = 0;
while ((m = re.exec(h))) {
  i++;
  const text = m[1].replace(/<[^>]+>/g, '').trim();
  const n = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  if (n < 60 || n > 220) console.log('LEN', i, n);
}
console.log('plain blocks', i);
