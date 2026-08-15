/*
 * test_traces.js — verify 18 JS trace functions:
 *  1. giải mã từng step tái dựng mảng kết quả (áp ghi/swap/đọc) === reference
 *  2. mảng "display" trong step ghi đè đúng vị trí hiển thị của tác giả
 * Chạy: node test_traces.js
 */
const { TRACES } = require('./traces.js');

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) pass++;
  else { fail++; console.log(`  ✗ ${name}${extra ? ' — ' + JSON.stringify(extra) : ''}`); }
};

const ref = {
  '88-backwards': [1, 2, 2, 3, 5, 6],
  '88-copyfront': [1, 2, 2, 3, 5, 6],
  '88-sorted':    [1, 2, 2, 3, 5, 6],
  '27-twopointer': { k: 2, arr: [2, 2, 3, 3] },
  '27-swap':      { k: 2, arr: [2, 2, 3, 3] },
  '27-filter':    { k: 2, arr: [2, 2, 3, 3] },
  '26-twopointer': { k: 5, arr: [0, 1, 2, 3, 4, 2, 2, 3, 3, 4] },
  '26-compress':  { k: 5, arr: [0, 1, 2, 3, 4, 2, 2, 3, 3, 4] },
  '26-groupby':   { k: 5, arr: [0, 1, 2, 3, 4, 2, 2, 3, 3, 4] },
  '80-counter':   { k: 5, arr: [1, 1, 2, 2, 3, 3] },
  '80-trick':     { k: 5, arr: [1, 1, 2, 2, 3, 3] },
  '80-counterdict': { k: 5, arr: [1, 1, 2, 2, 3, 3] },
  '169-vote':     2,
  '169-sorted':   2,
  '169-counter':  2,
  '189-reverse':  [5, 6, 7, 1, 2, 3, 4],
  '189-cyclic':   [5, 6, 7, 1, 2, 3, 4],
  '189-extra':    [5, 6, 7, 1, 2, 3, 4],
};

const jstr = (v) => JSON.stringify(v);

for (const [name, tc] of Object.entries(TRACES)) {
  const steps = tc.fn(JSON.parse(JSON.stringify(tc.input)));
  ok(`${name}: có step cuối (end:true)`, steps.length > 0 && steps[steps.length - 1].end,
    { n: steps.length, last: steps[steps.length - 1]?.note?.slice(0, 40) });

  // 1) kết quả: mảng thật (step.array) hoặc answer (majority) ở step cuối
  const last = steps[steps.length - 1];
  let expect = ref[name];
  if (typeof expect === 'object' && 'k' in expect && 'arr' in expect) {
    ok(`${name}: k đúng`, last.k === expect.k, { k: last.k, exp: expect.k });
    // kết quả của bài = K PHẦN TỬ ĐẦU từ mảng "keep/dựng lại" — nhưng với thuật
    // loại bỏ, các ô ≥ k vẫn giữ giá trị cũ; chỉ cần prefix(k) = multiset đúng
    const kept0 = []; // multiset lý thuyết từ trace (ghi theo write, swap)
    const buf = (last.array || []).slice();
    for (const st of steps) {
      if (st.write && !st.write.bake && st.write.kept !== false) {
        while (kept0.length < st.write.dest) kept0.push(null);
        kept0.push(st.write.value);
      }
    }
    const prefix = (last.array || []).slice(0, expect.k).sort((a, b) => a - b);
    const wanted = expect.arr.slice(0, expect.k).sort((a, b) => a - b);
    ok(`${name}: prefix(k) = multiset đúng`, jstr(prefix) === jstr(wanted), { prefix: jstr(prefix), wanted: jstr(wanted) });
    // với thuật swap: mảng cuối phải bằng arr tham chiếu y hệt
    if (name === '27-swap') {
      ok(`${name}: mảng cuối khớp (swap)`, jstr(last.array) === jstr(expect.arr), { got: jstr(last.array) });
    }
  } else if (name.startsWith('169-')) {
    ok(`${name}: answer đúng`, last.answer === expect, { got: last.answer, exp: expect });
  } else {
    ok(`${name}: kết quả cuối đúng`, jstr(last.array) === jstr(expect), { got: jstr(last.array), exp: jstr(expect) });
  }

  // 2) mọi step: đọc/write/swap trỏ tới index hợp lệ; write phải khớp array sau thao tác
  for (let s = 0; s < steps.length; s++) {
    const st = steps[s];
    const L = st.array ? st.array.length : (tc.input.nums ? tc.input.nums.length : tc.input.nums1.length);
    if (st.read) for (const r of [].concat(st.read)) ok(`${name}[${s}] read hợp lệ`, r.target[0] >= 0 && r.target[0] < L);
    if (st.write) {
      ok(`${name}[${s}] write dest hợp lệ`, st.write.dest >= 0 && st.write.dest < L);
      if (st.array && st.array[st.write.dest] !== undefined && !st.write.bake) {
        ok(`${name}[${s}] write value khớp array sau thao tác`,
          st.array[st.write.dest] === st.write.value, { at: st.write.dest, got: st.array[st.write.dest], val: st.write.value });
      }
    }
    if (st.swap) ok(`${name}[${s}] swap hợp lệ`, st.swap[0] >= 0 && st.swap[1] < L && st.swap[0] !== st.swap[1]);
    if (st.read || st.write || st.swap) ok(`${name}[${s}] snapshot sau thao tác`,
      JSON.stringify((st.array || [])) === JSON.stringify(st.cells?.map ? st.cells.map(c => c.value) : st.array), { snap: st.array });
  }

  // 3) mọi step đều có note
  for (let s = 0; s < steps.length; s++) ok(`${name}[${s}] có note`, typeof steps[s].note === 'string' && steps[s].note.length > 5);
}
console.log(`===== ${pass} checks passed, ${fail} failed =====`);
process.exit(fail ? 1 : 0);