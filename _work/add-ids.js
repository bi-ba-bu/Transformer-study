const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(
  /(<section class="chapter" data-num="(\d{2})")(?![^>]*\bid=)([^>]*>)/g,
  (m, head, num, tail) => `${head} id="ch-${num}"${tail}`
);
fs.writeFileSync('index.html', html, 'utf8');
console.log('ids added');
