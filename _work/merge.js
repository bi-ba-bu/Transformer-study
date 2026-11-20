const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

const files = fs.readdirSync(__dirname)
  .filter((f) => /^ch\d{2}\.html$/.test(f))
  .sort();

let replaced = 0;
for (const file of files) {
  const num = file.slice(2, 4);
  const snippet = fs.readFileSync(path.join(__dirname, file), 'utf8').trim();
  const pattern = new RegExp(
    '<section class="chapter" data-num="' + num + '"[\\s\\S]*?<\\/section>'
  );
  if (!pattern.test(html)) {
    console.error('MISSING section', num);
    process.exitCode = 1;
    continue;
  }
  html = html.replace(pattern, snippet);
  replaced++;
}

fs.writeFileSync(indexPath, html, 'utf8');

const nums = [...html.matchAll(/<section class="chapter" data-num="(\d{2})"/g)]
  .map((m) => m[1]);
console.log('replaced:', replaced);
console.log('sections:', nums.length);
console.log('nums:', nums.join(','));
console.log('duplicates:', nums.filter((n, i) => nums.indexOf(n) !== i));
