/*
 * test_traces150.js — verify các trace animation của Top150.
 * Chạy: node js/test_traces150.js
 */
const { TRACES150 } = require('./traces150.js');

let pass = 0, fail = 0;
const ok = (name, cond, extra) => { if (cond) pass++; else { fail++; console.log(`  ✗ ${name}${extra ? ' — ' + JSON.stringify(extra) : ''}`); } };

const REF = {
  '125-valid-palindrome': { answer: true },
  '392-is-subsequence': { answer: true },
  '167-two-sum-ii-input-array-is-sorted': { answer: [1, 2] },
  '121-best-time-to-buy-and-sell-stock': { final: [7, 1, 5, 3, 6, 4], answer: 5 },
  '122-best-time-to-buy-and-sell-stock-ii': { final: [7, 1, 5, 3, 6, 4], answer: 7 },
  '15-3sum': { answer: '2 bộ ba' },
  '11-container-with-most-water': { answer: 49 },
  '3-longest-substring-without-repeating-characters': { answer: 3 },
  '209-minimum-size-subarray-sum': { answer: 2 },
  '238-product-of-array-except-self': { answer: [24, 12, 8, 6] },
};

for (const [name, tc] of Object.entries(TRACES150)) {
  const steps = tc.fn(JSON.parse(JSON.stringify(tc.input)));
  ok(`${name}: có ${steps.length} bước`, steps.length > 1);
  ok(`${name}: step cuối có end`, steps[steps.length - 1].end);
  const last = steps[steps.length - 1];
  ok(`${name}: end có answer`, last.answer !== undefined);
  // chạy lại thuật toán thật để xác minh answer
  let real;
  const inp = tc.input;
  if (name.startsWith('121')) {
    let b = inp.prices[0], p = 0;
    for (const x of inp.prices.slice(1)) { if (x < b) b = x; else p = Math.max(p, x - b); }
    real = p;
  } else if (name.startsWith('122')) {
    let p = 0; for (let i = 1; i < inp.prices.length; i++) if (inp.prices[i] > inp.prices[i - 1]) p += inp.prices[i] - inp.prices[i - 1];
    real = p;
  } else if (name.startsWith('15')) {
    const a = inp.nums.slice().sort((x, y) => x - y);
    const r = new Set();
    for (let i = 0; i < a.length - 2; i++) { let lo = i + 1, hi = a.length - 1; while (lo < hi) { const s = a[i] + a[lo] + a[hi]; if (s === 0) { r.add([a[i], a[lo], a[hi]].join(',')); while (lo < hi && a[lo] === a[lo + 1]) lo++; while (lo < hi && a[hi] === a[hi - 1]) hi--; lo++; hi--; } else if (s < 0) lo++; else hi--; } }
    real = r.size + ' bộ ba';
  } else if (name.startsWith('11')) {
    let l = 0, r = inp.height.length - 1, best = 0;
    while (l < r) { best = Math.max(best, Math.min(inp.height[l], inp.height[r]) * (r - l)); if (inp.height[l] < inp.height[r]) l++; else r--; }
    real = best;
  } else if (name.startsWith('3-')) {
    let l = 0, best = 0; const seen = new Map();
    for (let r = 0; r < inp.s.length; r++) { const c = inp.s[r]; if (seen.has(c) && seen.get(c) >= l) l = seen.get(c) + 1; seen.set(c, r); best = Math.max(best, r - l + 1); }
    real = best;
  } else if (name.startsWith('209')) {
    let l = 0, sum = 0, best = Infinity;
    for (let r = 0; r < inp.nums.length; r++) { sum += inp.nums[r]; while (sum >= inp.target && l <= r) { best = Math.min(best, r - l + 1); sum -= inp.nums[l]; l++; } }
    real = best === Infinity ? 0 : best;
  } else if (name.startsWith('238')) {
    const n = inp.nums.length; const res = new Array(n).fill(1);
    let L = 1; for (let i = 0; i < n; i++) { res[i] = L; L *= inp.nums[i]; }
    let R = 1; for (let i = n - 1; i >= 0; i--) { res[i] *= R; R *= inp.nums[i]; }
    real = res;
  }
  const expect = REF[name].answer;
  let realOK;
  const inp2 = tc.input;
  if (name.startsWith('125-')) {
    const text = inp2.s.toLowerCase().replace(/[^a-z0-9]/g, '');
    realOK = text === text.split('').reverse().join('');
  } else if (name.startsWith('392-')) {
    let ii = 0;
    for (const ch of inp2.t) if (ii < inp2.s.length && inp2.s[ii] === ch) ii++;
    realOK = ii === inp2.s.length;
  } else if (name.startsWith('167-')) {
    let a = 0, b = inp2.numbers.length - 1, res = [-1, -1];
    while (a < b) {
      const s = inp2.numbers[a] + inp2.numbers[b];
      if (s === inp2.target) { res = [a + 1, b + 1]; break; }
      else if (s < inp2.target) a++;
      else b--;
    }
    realOK = res;
  } else realOK = real;
  ok(`${name}: answer = thuật toán thật`, String(last.answer) === String(realOK), { got: last.answer, real: realOK });
  // read/write hợp lệ
  for (let s = 0; s < steps.length; s++) {
    const st = steps[s];
    const L = st.array ? st.array.length : 0;
    if (st.read) for (const r of [].concat(st.read)) if (r && r.target) ok(`${name}[${s}] read`, r.target[0] >= 0 && r.target[0] < L);
    if (st.write && st.write.dest !== undefined) ok(`${name}[${s}] write dest`, st.write.dest >= 0 && st.write.dest < L);
  }
}
console.log(`===== ${pass} passed, ${fail} failed =====`);
process.exit(fail ? 1 : 0);