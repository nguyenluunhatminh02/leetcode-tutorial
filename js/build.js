/*
 * build.js — đóng gói tutorial: nhúng TRACES + PLAYER vào template tutorial.html
 * thành một file HTML DUY NHẤT (double-click là chạy, không cần server).
 *   node js/build.js   →  leetcode-tutorial.html  (tại gốc ổ E)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'tutorial.html'), 'utf8');
const traces = fs.readFileSync(path.join(ROOT, 'js', 'traces.js'), 'utf8');
const player = fs.readFileSync(path.join(ROOT, 'js', 'player.js'), 'utf8');

if (!html.includes('/*__TRACES__*/') || !html.includes('/*__PLAYER__*/')) {
  console.error('Thiếu placeholder /*__TRACES__*/ hoặc /*__PLAYER__*/ trong tutorial.html');
  process.exit(1);
}

const out = html
  .replace('/*__TRACES__*/', traces)
  .replace('/*__PLAYER__*/', player);

const dest = path.join(ROOT, 'leetcode-tutorial.html');
fs.writeFileSync(dest, out);
console.log(`✓ Đã đóng gói → ${dest} (${(out.length / 1024).toFixed(0)} KB)`);