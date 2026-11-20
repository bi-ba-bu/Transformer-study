const fs = require('fs');
const h = fs.readFileSync('index.html', 'utf8');
const count = (re) => (h.match(re) || []).length;
console.log('case', count(/class="case"/g));
console.log('plain', count(/class="plain"/g));
console.log('sections', count(/<section class="chapter"/g));
console.log('anim', count(/class="anim-block"/g));
console.log('closing sections', count(/<\/section>/g));
console.log('open divs', count(/<div\b/g));
console.log('close divs', count(/<\/div>/g));

// 章节顺序与每章是否有 case/plain
const chapters = [...h.matchAll(/<section class="chapter" data-num="(\d{2})"[\s\S]*?<\/section>/g)];
for (const m of chapters) {
  const num = m[1];
  const body = m[0];
  if (!body.includes('class="case"')) console.log('NO CASE', num);
  if (!body.includes('class="plain"')) console.log('NO PLAIN', num);
}
