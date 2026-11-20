const { execSync } = require('child_process');
const fs = require('fs');

const url = 'file:///D:/workFire/LLmStaduy/%E5%AD%A6%E4%B9%A0%E8%B5%84%E6%96%99/Transformer%E5%8A%A8%E7%94%BB%E6%95%99%E7%A8%8B/index.html';
const profile = process.env.TEMP + '\\codex-chrome-check';
const dom = execSync(
  `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --headless=new --no-sandbox --disable-gpu --user-data-dir="${profile}" --virtual-time-budget=6000 --dump-dom "${url}"`,
  { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }
);
fs.writeFileSync('_work/dom-check.html', dom, 'utf8');

const ids = new Set([...dom.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
const hrefs = [...dom.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
const missing = [...new Set(hrefs.filter((h) => !ids.has(h)))];
console.log('ids', ids.size, 'hash links', hrefs.length, 'missing', missing.length);
console.log(missing.slice(0, 20));
