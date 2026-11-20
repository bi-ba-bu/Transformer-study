const { execSync } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');

const oldHtml = execSync('git show HEAD:index.html', { encoding: 'utf8' });
const newHtml = fs.readFileSync('index.html', 'utf8');

function blocks(html) {
  const out = {};
  const marker = '<div class="anim-block" data-scene="';
  let pos = 0;
  while ((pos = html.indexOf(marker, pos)) !== -1) {
    const nameStart = pos + marker.length;
    const nameEnd = html.indexOf('"', nameStart);
    const name = html.slice(nameStart, nameEnd);
    let i = pos;
    let depth = 0;
    while (i < html.length) {
      const open = html.indexOf('<div', i);
      const close = html.indexOf('</div>', i);
      if (close === -1) break;
      if (open !== -1 && open < close) {
        depth++;
        i = open + 4;
      } else {
        depth--;
        i = close + 6;
        if (depth === 0) break;
      }
    }
    const block = html.slice(pos, i);
    out[name] = crypto.createHash('sha1').update(block).digest('hex');
    pos = i;
  }
  return out;
}

const a = blocks(oldHtml);
const b = blocks(newHtml);
const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
let bad = 0;
for (const k of keys) {
  if (a[k] !== b[k]) {
    console.log('DIFF', k, a[k], b[k]);
    bad++;
  }
}
console.log('compared', keys.size, 'diffs', bad);
