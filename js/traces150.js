/*
 * traces150.js — trace animation cho các bài ngoài 6 bài gốc (Top Interview 150).
 * Nguyên tắc như traces.js: mỗi hàm nhận input, trả mảng step {note, cells, array, read, write, swap, ptr, ptrNames, end}.
 * Bước 1 làm quen với 4 thuật toán kinh điển.
 */
'use strict';

function at150(arr, i) { return { target: [i], value: arr[i] }; }

/* ============ 121 Best Time to Buy and Sell Stock ============ */
function trace_stock(input) {
  const { prices } = input;
  const steps = [];
  let buy = prices[0], profit = 0;
  const push = (note, patch, end) => {
    const cells = prices.map((v, idx) => ({ value: v, keep: idx === 0 ? false : false }));
    steps.push(Object.assign({ note, cells, array: prices.slice() }, patch, end ? { end: true, answer: profit } : {}));
  };
  push(`init: buy = prices[0] = ${buy}, max profit = 0. Duyệt từ ngày 1.`, { ptr: { buy: 0, i: 0 } });
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] < buy) {
      buy = prices[i];
      push(`prices[${i}] = ${prices[i]} < buy ${prices[i - 1] > prices[i] ? '(giảm so với trước)' : ''} → cập nhật buy = ${prices[i]} (mua rẻ hơn, bỏ qua mức lời cũ chưa tốt hơn).`,
        { read: at150(prices, i), ptr: { buy: i, i }, ptrNames: ['buy', 'i'] });
    } else {
      const p = prices[i] - buy;
      const better = p > profit;
      profit = Math.max(profit, p);
      push(`prices[${i}] = ${prices[i]} ≥ buy ${buy} → lời nếu bán ở đây = ${p}. ${better ? 'Cập nhật max profit = ' + p + '!' : 'Chưa hơn max profit hiện tại (' + profit + ').'}`,
        { read: at150(prices, i), ptr: { buy: i, i }, ptrNames: ['buy', 'i'] });
    }
  }
  push(`Xong: max profit = ${profit} (mua ở ${buy}, các ngày sau là nơi bán tối ưu).`, {}, true);
  return steps;
}

/* ============ 122 Best Time to Buy and Sell Stock II ============ */
function trace_stock_ii(input) {
  const { prices } = input;
  const steps = [];
  let profit = 0, last = prices[0];
  const push = (note, patch, end) => {
    const cells = prices.map((v) => ({ value: v }));
    steps.push(Object.assign({ note, cells, array: prices.slice() }, patch, end ? { end: true, answer: profit } : {}));
  };
  push(`init: profit = 0, last = prices[0] = ${last}.`, { ptr: { last: 0, i: 0 } });
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > last) {
      profit += prices[i] - last;
      push(`prices[${i}] = ${prices[i]} > ${last} → gom ${prices[i] - last} (bán ngay lập tức). profit = ${profit}.`,
        { read: at150(prices, i), ptr: { last: i, i }, ptrNames: ['last', 'i'] });
    } else {
      push(`prices[${i}] = ${prices[i]} ≤ ${last} → không giao dịch (chờ giá lên).`,
        { read: at150(prices, i), ptr: { last: i, i }, ptrNames: ['last', 'i'] });
    }
    last = prices[i];
  }
  push(`Xong: tổng lợi nhuận ${profit} — cộng dồn MỌI bước tăng liên tiếp.`, {}, true);
  return steps;
}

/* ============ 15 3Sum ============ */
function trace_3sum(input) {
  const { nums } = input;
  const a = nums.slice().sort((x, y) => x - y);
  const res = [];
  const steps = [];
  const push = (note, patch, end) => {
    const cells = a.map((v) => ({ value: v }));
    steps.push(Object.assign({ note, cells, array: a.slice() }, patch, end ? { end: true, answer: res.length + ' bộ ba' } : {}));
  };
  push('Sắp xếp mảng để dùng hai con trỏ.', {});
  for (let i = 0; i < a.length - 2; i++) {
    if (i > 0 && a[i] === a[i - 1]) { push(`a[${i}] = ${a[i]} trùng a[${i - 1}] → bỏ qua để tránh bộ ba trùng.`, { ptr: { i }, ptrNames: ['i'] }); continue; }
    let lo = i + 1, hi = a.length - 1;
    push(`Cố định a[${i}] = ${a[i]}; lo = ${lo}, hi = ${hi}. Tìm cặp (lo, hi) sao cho tổng = 0.`, { ptr: { i, lo, hi }, ptrNames: ['i', 'lo', 'hi'] });
    while (lo < hi) {
      const s = a[i] + a[lo] + a[hi];
      if (s === 0) {
        res.push([a[i], a[lo], a[hi]]);
        push(`tổng ${a[i]} + ${a[lo]} + ${a[hi]} = 0 → ghi nhận bộ ba.`, { read: [at150(a, i), at150(a, lo), at150(a, hi)], ptr: { i, lo, hi }, ptrNames: ['i', 'lo', 'hi'] });
        const x = a[lo], y = a[hi];
        while (lo < hi && a[lo] === x) lo++;
        while (lo < hi && a[hi] === y) hi--;
        push(`Nhảy qua các giá trị trùng (lo → ${lo}, hi → ${hi}) để không lặp bộ ba.`, { ptr: { i, lo, hi }, ptrNames: ['i', 'lo', 'hi'] });
      } else if (s < 0) {
        lo++;
        push(`tổng = ${s} < 0 → tăng lo lên ${lo} (cần tổng lớn hơn).`, { read: [at150(a, lo - 1)], ptr: { i, lo, hi }, ptrNames: ['i', 'lo', 'hi'] });
      } else {
        hi--;
        push(`tổng = ${s} > 0 → giảm hi xuống ${hi} (cần tổng nhỏ hơn).`, { read: [at150(a, hi + 1)], ptr: { i, lo, hi }, ptrNames: ['i', 'lo', 'hi'] });
      }
    }
  }
  push(`Xong: ${res.length} bộ ba`, {}, true);
  return steps;
}

/* ============ 11 Container With Most Water ============ */
function trace_container(input) {
  const { height } = input;
  const steps = [];
  let l = 0, r = height.length - 1, best = 0;
  const push = (note, patch, end) => {
    const cells = height.map((v) => ({ value: v }));
    steps.push(Object.assign({ note, cells, array: height.slice() }, patch, end ? { end: true, answer: best } : {}));
  };
  push(`Hai con trỏ: l = ${l}, r = ${r}. Diện tích = chiều cao thấp hơn × khoảng cách.`, { ptr: { l, r }, ptrNames: ['l', 'r'] });
  while (l < r) {
    const w = r - l;
    const area = Math.min(height[l], height[r]) * w;
    best = Math.max(best, area);
    const goLeft = height[l] < height[r];
    push(`Cặp (${l}, ${r}): diện tích = ${Math.min(height[l], height[r])} × ${w} = ${area} → best = ${best}. ${goLeft ? 'Cạnh trái thấp hơn → dịch l++' : 'Cạnh phải thấp hơn → dịch r--'} (giữ cạnh cao hơn để còn triển vọng).`,
      { read: [at150(height, l), at150(height, r)], ptr: { l: l + (goLeft ? 1 : 0), r: r - (goLeft ? 0 : 1) }, ptrNames: ['l', 'r'] });
    if (goLeft) l++; else r--;
  }
  push(`Xong: thể tích nước tối đa = ${best}.`, {}, true);
  return steps;
}

/* ============ 3 Longest Substring Without Repeating Characters ============ */
function trace_longest_substr(input) {
  const { s } = input;
  const steps = [];
  let l = 0, best = 0;
  const seen = new Map();
  const push = (note, patch, end) => {
    const cells = s.split('').map((v) => ({ value: v }));
    steps.push(Object.assign({ note, cells, array: s.split('') }, patch, end ? { end: true, answer: best } : {}));
  };
  push(`Cửa sổ [l, r): ký tự trong cửa sổ đều là duy nhất. best = 0.`, { ptr: { l, r: 0 }, ptrNames: ['l', 'r'] });
  for (let r = 0; r < s.length; r++) {
    const c = s[r];
    if (seen.has(c) && seen.get(c) >= l) {
      const old = l;
      l = seen.get(c) + 1;
      push(`Gặp '${c}' đã xuất hiện ở vị trí ${seen.get(c)} (đang trong cửa sổ) → dịch l từ ${old} lên ${l}.`,
        { read: at150(s.split(''), r), ptr: { l, r }, ptrNames: ['l', 'r'] });
    }
    seen.set(c, r);
    best = Math.max(best, r - l + 1);
    push(`Thêm '${c}' vào cửa sổ [${l}, ${r}]. best = ${best} (đoạn dài nhất không trùng).`,
      { read: at150(s.split(''), r), ptr: { l, r }, ptrNames: ['l', 'r'] });
  }
  push(`Xong: độ dài lớn nhất = ${best}.`, {}, true);
  return steps;
}

/* ============ 209 Minimum Size Subarray Sum ============ */
function trace_min_subarray(input) {
  const { nums, target } = input;
  const steps = [];
  let l = 0, sum = 0, best = Infinity;
  const push = (note, patch, end) => {
    const cells = nums.map((v) => ({ value: v }));
    steps.push(Object.assign({ note, cells, array: nums.slice() }, patch, end ? { end: true, answer: best === Infinity ? 0 : best } : {}));
  };
  push(`Cửa sổ [l, r): sum = tổng trong cửa sổ. Mở rộng r khi sum < ${target}, thu hẹp l khi sum ≥ ${target}.`, { ptr: { l, r: 0 }, ptrNames: ['l', 'r'] });
  for (let r = 0; r < nums.length; r++) {
    sum += nums[r];
    push(`Thêm nums[${r}] = ${nums[r]} → sum = ${sum}.`, { read: at150(nums, r), ptr: { l, r }, ptrNames: ['l', 'r'] });
    while (sum >= target && l <= r) {
      const len = r - l + 1;
      best = Math.min(best, len);
      const removed = nums[l];
      push(`sum ${sum} ≥ ${target} → cửa sổ [${l}, ${r}] dài ${len} hợp lệ. best = ${best}. Thu hẹp l (bỏ ${removed}).`,
        { read: at150(nums, l), ptr: { l: l + 1, r }, ptrNames: ['l', 'r'] });
      sum -= removed;
      l++;
    }
  }
  push(`Xong: chiều dài ngắn nhất = ${best === Infinity ? 0 : best}.`, {}, true);
  return steps;
}

/* ============ 238 Product of Array Except Self ============ */
function trace_product_except_self(input) {
  const { nums } = input;
  const steps = [];
  const n = nums.length;
  const res = new Array(n).fill(1);
  const push = (note, patch, end) => {
    const cells = nums.map((v) => ({ value: v }));
    steps.push(Object.assign({ note, cells, array: nums.slice(), aux: { label: 'ans', values: res.slice() } }, patch, end ? { end: true, answer: res.slice() } : {}));
  };
  push('Ý tưởng: ans[i] = tích các phần tử bên trái × tích các phần tử bên phải. Duyệt 2 lần.', { aux: { label: 'ans', values: res.slice() } });
  let left = 1;
  for (let i = 0; i < n; i++) {
    res[i] = left;
    push(`Lượt trái: ans[${i}] = tích các phần tử nhỏ hơn ${i} = ${left}.`, { read: at150(nums, i), aux: { label: 'ans', values: res.slice() } });
    left *= nums[i];
  }
  let right = 1;
  for (let i = n - 1; i >= 0; i--) {
    res[i] *= right;
    push(`Lượt phải: ans[${i}] *= tích các phần tử lớn hơn ${i} = ${right} → ${res[i]}.`, { read: at150(nums, i), aux: { label: 'ans', values: res.slice() } });
    right *= nums[i];
  }
  push(`Xong: ans = ${res.join(', ')}. Mỗi ans[i] = tích mọi phần tử trừ nums[i] — O(1) phụ.`, {}, true);
  return steps;
}

/* ============ 125 Valid Palindrome ============ */
function trace_valid_palindrome(input) {
  const { s } = input;
  const text = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const steps = [];
  const push = (note, patch, end) => {
    const cells = text.split('').map((v) => ({ value: v }));
    steps.push(Object.assign({ note, cells, array: text.split('') }, patch, end ? { end: true, answer: true } : {}));
  };
  push(`Lọc chuỗi: giữ chữ & số, viết thường → '${text}'. Giờ kiểm tra palindrome bằng hai con trỏ.`,
    { ptr: { l: 0, r: text.length - 1 }, ptrNames: ['l', 'r'] });
  let l = 0, r = text.length - 1;
  while (l < r) {
    if (text[l] !== text[r]) {
      push(`'${text[l]}' ≠ '${text[r]}' → KHÔNG phải palindrome.`, { read: [at150(text.split(''), l), at150(text.split(''), r)], ptr: { l, r }, ptrNames: ['l', 'r'] }, true);
      steps[steps.length - 1].answer = false;
      return steps;
    }
    push(`'${text[l]}' = '${text[r]}' → tiếp tục thu hẹp.`, { read: [at150(text.split(''), l), at150(text.split(''), r)], ptr: { l: l + 1, r: r - 1 }, ptrNames: ['l', 'r'] });
    l++; r--;
  }
  push('Hai con trỏ gặp nhau → chuỗi là palindrome.', {}, true);
  return steps;
}

/* ============ 392 Is Subsequence ============ */
function trace_is_subsequence(input) {
  const { s, t } = input;
  const steps = [];
  let i = 0, j = 0;
  const push = (note, patch, end) => {
    const cells = t.split('').map((v) => ({ value: v }));
    steps.push(Object.assign({ note, cells, array: t.split('') }, patch, end ? { end: true, answer: i === s.length } : {}));
  };
  push(`Tìm ${s.length ? "mọi ký tự của '"+s+"'" : 'chuỗi rỗng'} trong '${t}' theo thứ tự. i = con trỏ s, j = con trỏ t.`,
    { ptr: { i, j }, ptrNames: ['i', 'j'] });
  while (i < s.length && j < t.length) {
    if (s[i] === t[j]) {
      push(`s[${i}] = '${s[i]}' trùng t[${j}] → khớp! i++, j++.`, { read: at150(t.split(''), j), ptr: { i: i + 1, j: j + 1 }, ptrNames: ['i', 'j'] });
      i++; j++;
    } else {
      push(`s[${i}] = '${s[i]}' ≠ t[${j}] = '${t[j]}' → chỉ tăng j (bỏ qua ký tự trong t).`,
        { read: at150(t.split(''), j), ptr: { i, j: j + 1 }, ptrNames: ['i', 'j'] });
      j++;
    }
  }
  push(i === s.length ? `Đã khớp toàn bộ '${s}' → subsequence.` : `Hết t trước khi khớp hết → không phải subsequence.`, {}, true);
  return steps;
}

/* ============ 167 Two Sum II - Input Array Is Sorted ============ */
function trace_two_sum_ii(input) {
  const { numbers, target } = input;
  const steps = [];
  let l = 0, r = numbers.length - 1;
  const push = (note, patch, end) => {
    const cells = numbers.map((v) => ({ value: v }));
    steps.push(Object.assign({ note, cells, array: numbers.slice() }, patch, end ? { end: true, answer: [l + 1, r + 1] } : {}));
  };
  push(`Mảng đã sắp tăng → bắt đầu l = 0, r = ${r}. Tổng hiện tại: ${numbers[l] + numbers[r]}.`, { ptr: { l, r }, ptrNames: ['l', 'r'] });
  while (l < r) {
    const s = numbers[l] + numbers[r];
    if (s === target) {
      push(`Tổng ${numbers[l]} + ${numbers[r]} = ${target} → đáp án 1-indexed: [${l + 1}, ${r + 1}].`,
        { read: [at150(numbers, l), at150(numbers, r)], ptr: { l, r }, ptrNames: ['l', 'r'] }, true);
      return steps;
    } else if (s < target) {
      l++;
      push(`Tổng ${s} < ${target} → tăng l lên ${l} (cần tổng lớn hơn; mảng tăng nên chỉ còn hướng này).`,
        { read: [at150(numbers, l - 1)], ptr: { l, r }, ptrNames: ['l', 'r'] });
    } else {
      r--;
      push(`Tổng ${s} > ${target} → giảm r xuống ${r}.`,
        { read: [at150(numbers, r + 1)], ptr: { l, r }, ptrNames: ['l', 'r'] });
    }
  }
  push('Không tìm thấy cặp.', {}, true);
  return steps;
}

/* ============ EXPORT ============ */
const TRACES150 = {
  '125-valid-palindrome': { fn: trace_valid_palindrome, input: { s: 'A man, a plan, a canal: Panama' } },
  '392-is-subsequence': { fn: trace_is_subsequence, input: { s: 'abc', t: 'ahbgdc' } },
  '167-two-sum-ii-input-array-is-sorted': { fn: trace_two_sum_ii, input: { numbers: [2, 7, 11, 15], target: 9 } },
  '121-best-time-to-buy-and-sell-stock': { fn: trace_stock, input: { prices: [7, 1, 5, 3, 6, 4] } },
  '122-best-time-to-buy-and-sell-stock-ii': { fn: trace_stock_ii, input: { prices: [7, 1, 5, 3, 6, 4] } },
  '15-3sum': { fn: trace_3sum, input: { nums: [-1, 0, 1, 2, -1, -4] } },
  '11-container-with-most-water': { fn: trace_container, input: { height: [1, 8, 6, 2, 5, 4, 8, 3, 7] } },
  '3-longest-substring-without-repeating-characters': { fn: trace_longest_substr, input: { s: 'abcabcbb' } },
  '209-minimum-size-subarray-sum': { fn: trace_min_subarray, input: { nums: [2, 3, 1, 2, 4, 3], target: 7 } },
  '238-product-of-array-except-self': { fn: trace_product_except_self, input: { nums: [1, 2, 3, 4] } },
};
if (typeof module !== 'undefined' && module.exports) module.exports = { TRACES150 };
globalThis.TRACES150 = TRACES150;