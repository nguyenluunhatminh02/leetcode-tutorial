/*
 * build.js — sinh các file HTML nhóm từ gen/engine.html + gen/problems/*.json.
 *   node gen/build.js
 * Sinh ra: groups/<file>.html cho từng nhóm, index.html tại gốc.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const engine = fs.readFileSync(path.join(__dirname, 'engine.html'), 'utf8');
const tracesOld = fs.readFileSync(path.join(ROOT, 'js', 'traces.js'), 'utf8');
const traces150 = fs.readFileSync(path.join(ROOT, 'js', 'traces150.js'), 'utf8');
const TRACES_OLD = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'problems', '.traces-cache.json'), 'utf8')); } catch { return null; } })();
const groupsDef = JSON.parse(fs.readFileSync(path.join(__dirname, 'groups.json'), 'utf8'));
const indexDef = JSON.parse(fs.readFileSync(path.join(__dirname, 'index.json'), 'utf8'));

function readGroup(name) {
  const file = path.join(__dirname, 'problems', name + '.json');
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function buildGroup(g) {
  const data = readGroup(g.file);
  if (!data) {
    console.log('  - bỏ qua (chưa có dữ liệu):', g.file);
    return null;
  }
  // resolve trace theo tham chiếu: 'ref' từ traces150, 'id' từ bản gốc; fallback cache tracer
  const resolveTrace = (ap) => {
    const steps = (() => {
      if (!ap.trace) return null;
      if (ap.trace.startsWith('ref:')) {
        const key = ap.trace.slice(4);
        const fn = TRACES150_CFG[key] && TRACES150_CFG[key].fn;
        return fn ? fn(JSON.parse(JSON.stringify(TRACES150_CFG[key].input))) : null;
      }
      return traceCache[ap.trace] || null;
    })();
    if (steps) return { steps, anim: true, tcex: ap.tcex };
    // chưa có trace tay → trace tự động (gen/tracer.py --all)
    const auto = autoTraceCache[`${ap._pno}::${ap.name}`];
    if (auto && auto.steps) {
      ap.steps = auto.steps;
      // phải delete ap.trace vì trace là khoá thô; nhưng để renderer nhận biết tcex
      return { steps: auto.steps, anim: true, tcex: ap.tcex };
    }
    return null;
  };
  data.problems.forEach(p => p.approaches = p.approaches.map(ap => { ap._pno = p.no; const r = resolveTrace(ap); if (r) { ap.steps = r.steps; ap.anim = true; }
    // fallback static: danh sách note các bước thuật toán (không animate)
    if (!ap.steps && Array.isArray(ap.static)) {
      ap.steps = ap.static.map(s => ({ note: s }));
      ap.anim = false;
    }
    // nối narrative (explain) vào steps animate nếu cache có
    if (ap.steps && ap.anim) {
      const exp = explainCache[`${p.no}::${ap.name}`];
      if (Array.isArray(exp)) {
        exp.forEach((e, k) => { if (ap.steps[k] && e) ap.steps[k].explain = e; });
      }
    }
    return ap; }));
  // loại bỏ khoá trace thô khỏi payload (tránh JSON dư)
  data.problems.forEach(p => p.approaches.forEach(ap => delete ap.trace));
  const payload = JSON.stringify({ group: { title: g.name, count: data.problems.length, desc: data.desc }, problems: data.problems });
  // dùng function replacement — chuỗi thay thế chứa $ (vd r'\S+$', s) bị replace diễn giải thành $&/$' nếu truyền kiểu string
  const html = engine.replace('const DATA = /*__DATA__*/ null', () => 'const DATA = ' + payload)
    .replace('/*__TRACES150__*/', () => traces150);
  const out = path.join(ROOT, 'groups', g.file + '.html');
  fs.writeFileSync(out, html);
  console.log('  ✓', g.file + '.html', '(' + (html.length / 1024).toFixed(0) + ' KB)');
  return { file: g.file, title: g.name, count: data.problems.length, icon: g.icon, done: data.problems.filter(p => p.done !== false).length };
}

// 0) trace cũ (6 bài gốc) chạy qua node rồi lưu cache
function loadTraceCache() {
  const dir = path.join(__dirname, 'problems');
  const cacheFile = path.join(dir, '.traces-cache.json');
  if (fs.existsSync(cacheFile)) {
    const t = Date.parse(fs.statSync(cacheFile).mtime);
    const s = Math.min(
      ...['traces.js','problems/*.json'].map(p => fs.existsSync(path.join(ROOT,'js',p.replace('problems/*.json',''))) ? Date.parse(fs.statSync(path.join(ROOT,'js','traces.js')).mtime) : Infinity),
      Date.parse(fs.statSync(cacheFile).mtime)
    );
    if (s <= t) return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  }
  // chạy node để gen cache (file tạm tránh vấn đề quoting)
  const tmp = path.join(__dirname, '.gen-cache.cjs');
  fs.writeFileSync(tmp, `
    const { TRACES } = require(${JSON.stringify(path.join(ROOT, 'js', 'traces.js'))});
    const out = {};
    for (const k of Object.keys(TRACES)) out[k] = TRACES[k].fn(JSON.parse(JSON.stringify(TRACES[k].input)));
    process.stdout.write(JSON.stringify(out));
  `);
  const out = require('child_process').execFileSync('node', [tmp], { encoding: 'utf8' });
  fs.unlinkSync(tmp);
  const cache = JSON.parse(out);
  fs.writeFileSync(cacheFile, JSON.stringify(cache));
  return cache;
}
const traceCache = loadTraceCache();

// --- tracer tự động (gen/tracer.py) ---
const STEPS_CACHE = path.join(__dirname, 'problems', '.steps-cache.json');
function loadAutoTraceCache() {
  // chạy --all nếu cache lỗi / chưa từng chạy / có fail trước đó
  let cache = null;
  try {
    cache = JSON.parse(fs.readFileSync(STEPS_CACHE, 'utf8'));
  } catch { cache = null; }
  const reportFile = path.join(__dirname, 'TRACE-REPORT.json');
  let report = null;
  try { report = JSON.parse(fs.readFileSync(reportFile, 'utf8')); } catch { report = null; }
  // nếu chưa từng chạy hoặc có fail → chạy lại
  if (!report || report.fail > 0 || !cache) {
    console.log('  tracer: chạy gen/tracer.py --all…');
    const out = require('child_process').execFileSync('python3', [path.join(__dirname, 'tracer.py'), '--all'], { encoding: 'utf8' });
    console.log('  ' + out.trim().split('\n').pop());
  }
  return JSON.parse(fs.readFileSync(STEPS_CACHE, 'utf8'));
}
const autoTraceCache = loadAutoTraceCache();

// narrative "biết dạy" (explain) — do agents viết cho từng step
const EXPLAIN_CACHE = path.join(__dirname, 'problems', '.explain-cache.json');
const explainCache = (() => {
  try { return JSON.parse(fs.readFileSync(EXPLAIN_CACHE, 'utf8')); }
  catch { return {}; }
})();

// 1) các nhóm
console.log('Buiding groups…');
const TRACES150_CFG = (() => {
  const t = require(path.join(ROOT, 'js', 'traces150.js')).TRACES150;
  // không chạy trace trong node? — vì trace dùng cho trình duyệt; ở đây chỉ lấy cấu hình input để chạy ref
  return t;
})();
const built = groupsDef.map(buildGroup).filter(Boolean);

// 2) index.html
const cards = built.map(b => {
  const desc = (indexDef.groups[b.file] || {}).desc || '';
  return `<a class="grp" href="groups/${b.file}.html"><span class="ic">${b.icon}</span><span><b>${b.title}</b><small>${b.count} bài · đã xong ${b.done} · ${desc}</small></span></a>`;
}).join('\n');
const total150 = built.reduce((s, b) => s + b.count, 0);
const totalDone = built.reduce((s, b) => s + b.done, 0);
const index = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Top Interview 150 — Học theo nhóm</title>
<style>
:root{--bg:#0d1017;--panel:#141926;--ink:#eaf0f8;--mut:#8f9ab2;--line:#242c3e;--acc:#7aa2ff;--acc2:#38d3f0;--ok:#3ddc97}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background-image:radial-gradient(#1d2434 1px,transparent 1px);background-size:26px 26px}
.wrap{max-width:1000px;margin:0 auto;padding:30px 20px}
.hero h1{font-size:27px;margin:8px 0;text-wrap:balance}
.hero p{color:var(--mut);max-width:820px}
.chip{display:inline-block;padding:3px 12px;border-radius:999px;font-size:12.5px;border:1px solid var(--line);color:var(--mut);margin:2px 6px 0 0}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;margin-top:22px}
.grp{text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:14px;background:var(--panel);padding:13px 14px;display:flex;gap:12px;transition:border-color .15s}
.grp:hover{border-color:var(--acc)}
.grp .ic{font-size:22px}
.grp b{font-size:15px}
.grp small{display:block;color:var(--mut);font-size:12px;margin-top:2px}
</style>
</head>
<body><div class="wrap">
<div class="hero">
  <div><span class="chip">Top Interview 150</span><span class="chip">${totalDone}/${total150} bài đã có tutorial</span><span class="chip">Python · tiếng Việt</span></div>
  <h1>Top Interview 150 — học theo nhóm</h1>
  <p>${indexDef.desc}</p>
</div>
<div class="cards">
${cards}
</div>
</div></body></html>`;
fs.writeFileSync(path.join(ROOT, 'index.html'), index);
console.log('✓ index.html (' + (index.length / 1024).toFixed(0) + ' KB) — ' + totalDone + '/' + total150 + ' bài');