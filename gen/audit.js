// gen/audit.js — kiểm tra cấu trúc toàn bộ groups/*.html
// Yêu cầu: MỌI approach phải có steps (anim:true hoặc static danh sách note),
// DATA JSON hợp lệ, index.html trỏ đúng 20 nhóm, trace không lỗi.
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'groups');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html')).sort();
let TP = 0, TA = 0, TANIM = 0, TSTATIC = 0;
const issues = [];
for (const f of files) {
  const h = fs.readFileSync(path.join(dir, f), 'utf8');
  const i = h.indexOf('const DATA = ');
  if (i < 0) { issues.push(f + ': không có DATA'); continue; }
  const j = h.indexOf('\n\nfunction el', i); // engine code bắt đầu ngay sau DATA line
  let raw = h.slice(i + 'const DATA = '.length, j > 0 ? j : h.indexOf('</script>', i)).trim().replace(/;\s*$/, '');
  let d;
  try { d = JSON.parse(raw); }
  catch (e) { issues.push(f + ': DATA không phải JSON hợp lệ — ' + e.message); continue; }
  TP += d.problems.length;
  for (const p of d.problems) {
    TA += p.approaches.length;
    if (!p.thinking) issues.push(`${f} / ${p.no} ${p.title}: thiếu thinking`);
    for (const ap of p.approaches) {
      if (ap.code && !/def |class /.test(ap.code)) issues.push(`${f} / ${p.no} ${p.title} (${ap.name}): code thiếu def/class`);
      if (!ap.steps) issues.push(`${f} / ${p.no} ${p.title} (${ap.name}): KHÔNG CÓ steps`);
      else if (ap.anim) TANIM++;
      else TSTATIC++;
      if (ap.trace) issues.push(`${f} / ${p.no} ${p.title}: trace chưa resolve`);
      if (ap.steps && ap.steps.length === 0) issues.push(`${f} / ${p.no} ${p.title} (${ap.name}): steps rỗng`);
    }
  }
  console.log(f.padEnd(24), d.problems.length + ' bài,', d.problems.reduce((s, p) => s + p.approaches.length, 0), 'cách');
}
console.log('TỔNG:', TP, 'bài /', TA, 'cách /', TANIM, 'animation /', TSTATIC, 'static');
console.log(issues.length ? 'ISSUES:\n' + issues.slice(0, 40).join('\n') : 'OK — không có vấn đề cấu trúc');
process.exit(issues.length ? 1 : 0);
