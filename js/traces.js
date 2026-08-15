/*
 * trace.js — JS "song sinh" của 18 solution Python.
 * Mỗi hàm mô phỏng đúng thuật toán, nhưng thay vì mutate mảng thật nó
 * ghi LẠI từng thao tác (đọc, ghi, so sánh, hoán đổi, di chuyển con trỏ)
 * thành một chuỗi step để trình duyệt dựng animation. Dùng chung cho
 * cả 18 nút "▶ Chạy từng bước" trong tutorial.
 *
 * Mảng hiển thị trong HTML là hộp ảo: các bước luôn có {display} — snapshot
 * sau khi áp thao tác — nên lời giải thích bên dưới hộp luôn khớp với
 * những gì người học nhìn thấy.
 *
 * Mỗi step:
 *   note      chuỗi tiếng Việt mô tả bước
 *   read      {target: [i,j], value}      các ô vừa đọc để so sánh
 *   write     {dest, value, colored?}     thao tác ghi (một hoặc nhiều)
 *   swap      [a, b]                      trao đổi hai ô
 *   ptr       {name, pos}                 vị trí con trỏ sau bước
 *   line      {label, start, end}         vạch phạm vi (two-pointer)
 *   array     snapshot dùng làm dữ liệu thật
 *   display   snapshot hiển thị (đã đánh dấu hoặc đã reshape)
 *   end       step cuối: k = kết quả của bài
 */

function at(arr, i) { return { target: [i], value: arr[i] }; }

/* ============================== #88 Merge Sorted Array ============================== */

function snapmerge(a, m, b, n, k) {
  const arr = a.slice(0, m).concat(b.slice(0, n));
  const cells = [];
  for (let i = 0; i < m + n; i++) {
    const dead = i >= m && i < m + n ? '#393f55' : null;
    cells.push({ value: arr[i], dead, write: i >= m && i < m + n ? 1 : 0 });
  }
  return { k, arr, cells };
}

function trace_merge_backwards(input) {
  const { nums1, m, nums2, n } = input;
  // Hai nguồn ĐỘC LẬP như Python thật: a = nums1 (với ô trống ở đuôi),
  // b = nums2. Ghi kết quả vào a từ phải qua trái.
  const a = nums1.slice();
  const b = nums2.slice();
  const steps = [];
  let i = m - 1, j = n - 1, w = m + n - 1;

  const push = (note, patch, end) => {
    // "written" mô tả ô đuôi đã được w đi qua (đã ghi) hay vẫn trống
    const cells = a.map((v, idx) => ({ value: v, zone: idx >= m ? 'tail' : 'main', written: idx < m || idx > w }));
    steps.push(Object.assign({ note, cells, array: a.slice() }, patch, end ? { end: true, k: m + n } : {}));
  };

  push('Bắt đầu: ba con trỏ tại cuối các vùng — i cuối nums1, j cuối nums2, w ô trống cuối cùng.',
    { ptr: { i, j, w }, aux: { label: 'nums2', values: b.slice() } });
  while (j >= 0) {
    if (i >= 0 && a[i] > b[j]) {
      const v = a[i];
      a[w] = v;
      i -= 1; w -= 1;
      push(`So sánh ${v} > ${b[j + 1]} (nums2): lấy ${v} (bên nums1) ghi vào ô trống ${w + 1}.`,
        { read: [at(a, i + 1), at(b, j + 1)], write: { dest: w + 1, value: v, colored: 1, src: i + 1 }, ptr: { i, j, w }, aux: { label: 'nums2', values: b.slice() } });
    } else {
      const v = b[j];
      a[w] = v;
      j -= 1; w -= 1;
      push(`So sánh ${a[i] !== undefined && a[i] > v ? '·' : ''}lấy ${v} (bên nums2) ghi vào ô trống ${w + 1} — nhánh này không lệ thuộc vào i, nên dù i < 0 vẫn chạy.`,
        { read: [i >= 0 ? at(a, i) : null, at(b, j + 1)].filter(Boolean), write: { dest: w + 1, value: v, colored: 1, src: null }, ptr: { i, j, w }, aux: { label: 'nums2', values: b.slice() } });
    }
  }
  push('Xong! j < 0 — mọi phần tử mảng 2 đã nằm đúng chỗ, phần nums1 gốc còn lại vốn đã ở đúng vị trí.',
    { ptr: { i, j, w } }, true);
  return steps;
}


function trace_merge_copy_front(input) {
  const { nums1, m, nums2, n } = input;
  const steps = [];
  const left0 = nums1.slice(0, m);
  let i = 0, j = 0, w = 0;

  const push = (note, patch, end) => {
    const cells = nums1.map((v, idx) => ({ value: v }));
    const s = Object.assign({ note, array: nums1.slice(), cells }, patch, end ? { end: true } : {});
    steps.push(s);
  };

  push('Copy phần thật của nums1 (m phần tử đầu) sang mảng phụ left — nums1 giờ bị “xóa” để tái sử dụng.',
    { ptr: { i, j, w }, aux: { label: 'left', values: left0 } });

  while (i < m && j < n) {
    if (left0[i] <= nums2[j]) {
      const d = w;
      nums1[w] = left0[i];
      i += 1; w += 1;
      push(`So sánh left[${i - 1}] = ${left0[i - 1]} ≤ nums2[${j}] = ${nums2[j]} → ghi ${left0[i - 1]} vào nums1[${d}].`,
        { read: at(left0, i - 1), write: { dest: d, value: left0[i - 1] }, ptr: { i, j, w }, aux: { label: 'left', values: left0 } });
    } else {
      const d = w;
      nums1[w] = nums2[j];
      j += 1; w += 1;
      push(`So sánh: left[${i}] = ${left0[i]} > nums2[${j - 1}] = ${nums2[j - 1]} → ghi ${nums2[j - 1]} vào nums1[${d}].`,
        { read: [at(left0, i), at(nums2, j - 1)], write: { dest: d, value: nums2[j - 1] }, ptr: { i, j, w }, aux: { label: 'left', values: left0 } });
    }
  }
  while (i < m) {
    const d = w;
    nums1[w] = left0[i];
    i += 1; w += 1;
    push(`left còn ${left0[i - 1]} → dốc nốt vào nums1[${d}].`,
      { write: { dest: d, value: left0[i - 1] }, ptr: { i, j, w }, aux: { label: 'left', values: left0 } });
  }
  while (j < n) {
    const d = w;
    nums1[w] = nums2[j];
    j += 1; w += 1;
    push(`nums2 còn ${nums2[j - 1]} → dốc nốt vào nums1[${d}].`,
      { write: { dest: d, value: nums2[j - 1] }, ptr: { i, j, w }, aux: { label: 'left', values: left0 } });
  }
  push('Xong! Ba mảng đã được trộn đúng thứ tự — kết quả là phần trộn của left và nums2.', {}, true);
  return steps;
}

function trace_merge_sorted(input) {
  const { nums1, m, nums2, n } = input;
  const steps = [];
  const sw = nums1.slice(0, m).concat(nums2.slice(0, n)); // minh hoạ sort trên bản sao

  const push = (note, patch, end) => {
    const cells = sw.map((v, idx) => ({ value: v, dead: idx >= m && idx < m + n ? '#393f55' : null, write: idx >= m && idx < m + n ? 1 : 0 }));
    steps.push(Object.assign({ note, array: sw.slice(), cells }, patch, end ? { end: true, k: m + n } : {}));
  };

  push('Nối nums2 vào sau phần thật của nums1 (các ô xám là ô trống được “lấp đầy”): nums1[m:] = nums2[:n].');
  push('Gọi nums1.sort() — ngôn ngữ tự sắp toàn bộ (Python: Timsort, O((m+n)·log(m+n))).',
    { std: { code: 'nums1[m:] = nums2[:n]\nnums1.sort()' } });

  // mô phỏng bubble-sort để người học THẤY vì sao sort() ra kết quả đúng
  const seen = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    for (let idx = 0; idx < sw.length - 1; idx++) {
      if (sw[idx] > sw[idx + 1]) {
        [sw[idx], sw[idx + 1]] = [sw[idx + 1], sw[idx]];
        changed = true;
        const key = sw.join(',');
        if (!seen.has(key)) {
          seen.add(key);
          const cells = sw.map((v, cidx) => ({ value: v, dead: cidx >= m && cidx < m + n ? '#393f55' : null, active: cidx === idx || cidx === idx + 1 }));
          steps.push({ note: `(mô phỏng) sort() hoán đổi ${sw[idx]?.toString() ?? ''} và ${sw[idx + 1]?.toString() ?? ''}...`, array: sw.slice(), cells });
        }
      }
    }
  }
  push('Xong — nums1 đã thành mảng sắp xếp hoàn chỉnh. (Thực tế Timsort nhanh hơn mô phỏng này nhiều.)',
    { std: { code: 'nums1[m:] = nums2[:n]\nnums1.sort()' } }, true);
  return steps;
}

/* ============================== #27 Remove Element ============================== */

function trace_remove_twopointer(input) {
  const { nums, val } = input;
  const steps = [];
  let w = 0;

  const push = (note, patch, end) => {
    const cells = nums.map((v, idx) => ({ value: v, keep: idx < w }));
    steps.push(Object.assign({ note, cells, array: nums.slice() }, patch, end ? { end: true, k: w } : {}));
  };

  push('w (slow) = 0: vị trí sẽ ghi, r (fast) chạy từng phần tử.');
  for (let r = 0; r < nums.length; r++) {
    if (nums[r] !== val) {
      const d = w;
      nums[w] = nums[r];
      w += 1;
      push(`nums[${r}] = ${nums[r]} ≠ ${val} → ghi ${nums[r]} vào nums[${d}], tăng w.`,
        { read: at(nums, r), write: { dest: d, value: nums[r] }, ptr: { w, r }, ptrNames: ['w', 'r'] });
    } else {
      push(`nums[${r}] = ${val} = val → BỎ QUA, không ghi.`,
        { read: at(nums, r), ptr: { w, r }, ptrNames: ['w', 'r'] });
    }
  }
  push(`Xong! w = ${w} — đó chính là số phần tử ≠ val (k).`, { ptr: { w, r: nums.length - 1 }, ptrNames: ['w', 'r'] }, true);
  return steps;
}

function trace_remove_swap(input) {
  const { nums, val } = input;
  const steps = [];
  let l = 0, r = nums.length - 1;

  const push = (note, patch, end) => {
    const cells = nums.map((v, idx) => ({ value: v, keep: idx < l }));
    steps.push(Object.assign({ note, cells, array: nums.slice() }, patch, end ? { end: true, k: l } : {}));
  };

  push('Hai con trỏ: l duyệt từ trái, r là “bức tường” cuối mảng.');
  while (l <= r) {
    if (l === r) {
      // ô cuối cùng còn lại: swap với chính nó vô nghĩa — thuật toán vẫn thu hẹp r
      if (nums[l] === val) {
        r -= 1;
        push(`nums[${l}] = ${val} = val (ô cuối) → loại khỏi vùng giữ lại, r thu hẹp.`,
          { read: at(nums, l), ptr: { l, r }, ptrNames: ['l', 'r'] });
      } else {
        l += 1;
        push(`nums[${l - 1}] = ${nums[l - 1]} ≠ val (ô cuối) → giữ lại, l tiến.`,
          { read: at(nums, l - 1), ptr: { l, r }, ptrNames: ['l', 'r'] });
      }
    } else if (nums[l] === val) {
      const r0 = r;
      [nums[l], nums[r]] = [nums[r], nums[l]];
      r -= 1;
      push(`nums[${l}] = ${val} = val → đổi chỗ với nums[${r0}] = ${nums[l]} rồi thu hẹp r (l giữ nguyên để kiểm tra giá trị mới).`,
        { read: [at(nums, l), at(nums, r0)], swap: [l, r0], ptr: { l, r }, ptrNames: ['l', 'r'] });
    } else {
      push(`nums[${l}] = ${nums[l]} ≠ val → l tiến lên (giữ lại).`, { read: at(nums, l), ptr: { l: l + 1, r }, ptrNames: ['l', 'r'] });
      l += 1;
    }
  }
  push(`Xong! l = ${l} chính là k. Thứ tự tương đối không được giữ — bài toán không yêu cầu.`, { ptr: { l, r }, ptrNames: ['l', 'r'] }, true);
  return steps;
}

function trace_remove_filter(input) {
  const { nums, val } = input;
  const steps = [];
  const kept = [];

  const push = (note, patch, end) => {
    const cells = nums.map((v, idx) => ({ value: v, keep: idx < kept.length }));
    steps.push(Object.assign({ note, cells, array: nums.slice() }, patch, end ? { end: true, k: kept.length } : {}));
  };

  push('Dùng list comprehension duyệt qua từng phần tử; giữ lại những cái ≠ val.');
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] !== val) {
      const was = kept.length;
      kept.push(nums[i]);
      push(`nums[${i}] = ${nums[i]} ≠ ${val} → đưa vào mảng mới (vị trí ${was}).`,
        { read: at(nums, i), write: { dest: i, value: nums[i], bake: 'kept' } });
    } else {
      push(`nums[${i}] = ${val} = val → loại bỏ.`, { read: at(nums, i) });
    }
  }
  nums.splice(0, nums.length, ...kept);
  push(`Gán nums[:] = kept — mảng gốc bị thay bằng mảng đã lọc. k = ${kept.length}.`, {}, true);
  return steps;
}

/* ============================== #26 Remove Duplicates I ============================== */

function trace_dupes_twopointer(input) {
  const vis = input.nums.slice(); // mảng làm việc thật (ghi đè dần)
  if (!vis.length) return [{ note: 'Mảng rỗng → trả về 0.', end: true, k: 0 }];
  const steps = [];
  let w = 1; // ô đầu tiên giữ nguyên — vùng "đã ghi" nén từ đây

  const push = (note, patch, end) => {
    const cells = vis.map((v, idx) => ({ value: v, keep: idx < w }));
    steps.push(Object.assign({ note, cells, array: vis.slice() }, patch, end ? { end: true, k: w } : {}));
  };

  push('w = 1 (ô 0 của mảng đã nén giữ nguyên). r duyệt từ 1.');
  for (let r = 1; r < vis.length; r++) {
    const same = vis[r] === vis[w - 1];
    push(`So sánh nums[${r}] = ${vis[r]} với nums[${w - 1}] = ${vis[w - 1]} (phần tử khác biệt cuối cùng đã giữ) → ${same ? 'trùng' : 'khác'}.`,
      { read: [at(vis, r), at(vis, w - 1)], ptr: { w, r }, ptrNames: ['w', 'r'] });
    if (!same) {
      const d = w;
      vis[w] = vis[r];
      w += 1;
      push(`Khác nhau → ghi ${vis[r]} vào nums[${d}], tăng w.`, { write: { dest: d, value: vis[r] }, ptr: { w, r }, ptrNames: ['w', 'r'] });
    }
  }
  push(`Xong! w = ${w} — số phần tử duy nhất.`, { ptr: { w, r: vis.length - 1 }, ptrNames: ['w', 'r'] }, true);
  return steps;
}

function trace_dupes_compress(input) {
  const { nums } = input;
  const steps = [];
  const kept = [];
  let prev = null, first = true;

  const push = (note, patch, end) => {
    const cells = nums.map((v, idx) => ({ value: v, keep: idx < kept.length }));
    steps.push(Object.assign({ note, cells, array: nums.slice() }, patch, end ? { end: true, k: kept.length } : {}));
  };

  push('Xây mảng kept bằng cách chỉ thêm phần tử khác phần tử liền trước.');
  for (let i = 0; i < nums.length; i++) {
    if (first || nums[i] !== prev) {
      const was = kept.length;
      kept.push(nums[i]);
      push(`nums[${i}] = ${nums[i]} khác ${prev} → thêm vào kept (vị trí ${was}).`,
        { read: at(nums, i), write: { dest: was, value: nums[i], bake: 'kept' } });
    } else {
      push(`nums[${i}] = ${nums[i]} trùng ${prev} → bỏ qua.`, { read: at(nums, i) });
    }
    prev = nums[i]; first = false;
  }
  nums.splice(0, nums.length, ...kept);
  push(`Xong — ghi đè nums[:] = kept, k = ${kept.length}.`, {}, true);
  return steps;
}

function trace_dupes_groupby(input) {
  const vis = input.nums.slice();
  const steps = [];
  let w = 0;

  const push = (note, patch, end) => {
    const cells = vis.map((v, idx) => ({ value: v, keep: idx < w }));
    steps.push(Object.assign({ note, cells, array: vis.slice() }, patch, end ? { end: true, k: w } : {}));
  };

  push('groupby(nums) gom các giá trị liên tiếp giống nhau thành từng nhóm (run).');
  let i = 0;
  while (i < vis.length) {
    const start = i;
    const v = vis[i];
    while (i < vis.length && vis[i] === v) i++;
    const grp = i - start;
    const d = w;
    vis[w] = v;
    w += 1;
    push(`Run [${start}..${i - 1}]: giá trị ${v} lặp ${grp} lần. Chỉ giữ lại MỘT phần tử đại diện → ghi vào nums[${d}].`,
      { read: at(vis, start), write: { dest: d, value: v }, ptr: { w, r: i - 1 }, ptrNames: ['w', 'r'] });
  }
  push(`Xong! groupby đã nén mọi run liên tiếp — w = ${w}.`, { ptr: { w, r: vis.length - 1 }, ptrNames: ['w', 'r'] }, true);
  return steps;
}

/* ============================== #80 Remove Duplicates II ============================== */

function trace_dupes2_counter(input) {
  const { nums } = input;
  const steps = [];
  let w = 0, run = 0, last;
  let first = true;

  const push = (note, patch, end) => {
    const cells = nums.map((v, idx) => ({ value: v, keep: idx < w }));
    steps.push(Object.assign({ note, cells, array: nums.slice() }, patch, end ? { end: true, k: w } : {}));
  };

  push('w = vị trí ghi; run = số lần giá trị hiện tại đã xuất hiện liên tiếp.');
  for (let i = 0; i < nums.length; i++) {
    const x = nums[i];
    const isNew = first || x !== last;
    run = isNew ? 1 : run + 1;
    last = x; first = false;
    if (run <= 2) {
      const d = w;
      nums[w] = x;
      w += 1;
      push(`nums[${i}] = ${x} (lần thứ ${run} liên tiếp) ≤ 2 → ghi vào nums[${d}].`, { read: at(nums, i), write: { dest: d, value: x }, ptr: { w, i }, ptrNames: ['w', 'i'] });
    } else {
      push(`nums[${i}] = ${x} — lần thứ ${run} liên tiếp > 2 → BỎ QUA.`, { read: at(nums, i), ptr: { w, i }, ptrNames: ['w', 'i'] });
    }
  }
  push(`Xong! w = ${w}.`, { ptr: { w, i: nums.length - 1 }, ptrNames: ['w', 'i'] }, true);
  return steps;
}

function trace_dupes2_trick(input) {
  const { nums } = input;
  const steps = [];
  let w = 0;

  const push = (note, patch, end) => {
    const cells = nums.map((v, idx) => ({ value: v, keep: idx < w }));
    steps.push(Object.assign({ note, cells, array: nums.slice() }, patch, end ? { end: true, k: w } : {}));
  };

  push('Mẹo: ghi nums[r] trừ khi nums[r] === nums[w - 2] — tức đã có 2 bản của giá trị đó trong vùng đã ghi.');
  for (let r = 0; r < nums.length; r++) {
    if (w < 2) {
      const d = w;
      nums[w] = nums[r];
      w += 1;
      push(`w = ${d} < 2 → ghi thẳng ${nums[r]} vào nums[${d}].`, { read: at(nums, r), write: { dest: d, value: nums[r] }, ptr: { w, r }, ptrNames: ['w', 'r'] });
    } else if (nums[r] !== nums[w - 2]) {
      const d = w;
      nums[w] = nums[r];
      w += 1;
      push(`nums[${r}] = ${nums[r]} ≠ nums[${d - 2}] = ${nums[r - 1]} (giá trị cách 2 ô về trước trong vùng đã ghi) → chưa đủ 2 bản, ghi vào nums[${d}].`,
        { read: [at(nums, r), at(nums, r - 2)], write: { dest: d, value: nums[r] }, ptr: { w, r }, ptrNames: ['w', 'r'] });
    } else {
      push(`nums[${r}] = ${nums[r]} === nums[${r - 2}] → đã có 2 bản ${nums[r]}, BỎ QUA.`,
        { read: [at(nums, r), at(nums, r - 2)], ptr: { w, r }, ptrNames: ['w', 'r'] });
    }
  }
  push(`Xong! w = ${w}.`, { ptr: { w, r: nums.length - 1 }, ptrNames: ['w', 'r'] }, true);
  return steps;
}

function trace_dupes2_counterdict(input) {
  const { nums } = input;
  const steps = [];
  const freq = new Map();
  for (const x of nums) freq.set(x, (freq.get(x) || 0) + 1);
  let w = 0;

  const push = (note, patch, end) => {
    const cells = nums.map((v, idx) => ({ value: v, keep: idx < w }));
    steps.push(Object.assign({ note, cells, array: nums.slice() }, patch, end ? { end: true, k: w } : {}));
  };

  push(`Đếm tần suất bằng từ điển: ${[...freq.entries()].map(([k, v]) => `${k} × ${v}`).join(', ')}.`);
  for (const [x, c] of freq) {
    const take = Math.min(c, 2);
    const d0 = w;
    for (let t = 0; t < take; t++) { nums[w] = x; w++; }
    push(`Giá trị ${x} xuất hiện ${c} lần → giữ tối đa 2, ghi ${take} bản vào nums[${d0}..${w - 1}].`,
      { read: at(nums, d0), write: { dest: d0, value: x, count: take }, ptr: { w } });
  }
  push(`Xong! w = ${w}.`, {}, true);
  return steps;
}

/* ============================== #169 Majority Element ============================== */

function trace_majority_vote(input) {
  const { nums } = input;
  const steps = [];
  let cand = null, votes = 0;

  const push = (note, patch, end) => {
    const cells = nums.map((v, idx) => ({ value: v }));
    steps.push(Object.assign({ note, cells, array: nums.slice() }, patch, end ? { end: true, answer: cand } : {}));
  };

  push('Boyer–Moore: candidate là “ứng viên”, votes là số phiếu tán thành ròng của candidate đó.');
  for (let i = 0; i < nums.length; i++) {
    const x = nums[i];
    if (votes === 0) {
      cand = x;
      push(`votes = 0 → chọn candidate = ${x}.`, { read: at(nums, i), vote: { cand, votes }, ptr: { i }, ptrNames: ['i'] });
    }
    votes += x === cand ? 1 : -1;
    push(`nums[${i}] = ${x} ${x === cand ? 'trùng' : 'khác'} candidate ${cand} → votes ${x === cand ? '+1' : '−1'} = ${votes}.`,
      { read: at(nums, i), vote: { cand, votes }, ptr: { i }, ptrNames: ['i'] });
  }
  push(`Duyệt xong. Vì phần tử đa số xuất hiện > n/2 lần, nó thắng mọi “cuộc chiến phiếu” → candidate = ${cand} chính là đáp án.`,
    { vote: { cand, votes } }, true);
  return steps;
}

function trace_majority_sorted(input) {
  const { nums } = input;
  const steps = [];
  const arr = nums.slice();

  const push = (note, patch, end) => {
    const cells = arr.map((v, idx) => ({ value: v, mid: idx === Math.floor(arr.length / 2) }));
    steps.push(Object.assign({ note, cells, array: arr.slice() }, patch, end ? { end: true, answer: arr[Math.floor(arr.length / 2)] } : {}));
  };

  push('Sort mảng. Phần tử đa số chiếm hơn n/2 vị trí → chắc chắn chiếm cả vị trí giữa.', {});
  arr.sort((a, b) => a - b);
  push('Mảng đã sắp xếp. Bất kể mọi thứ xoay quanh thế nào, phần tử giữa luôn là phần tử đa số.',
    { midv: arr[Math.floor(arr.length / 2)] });
  push(`Trả về nums[n // 2] = ${arr[Math.floor(arr.length / 2)]} — chính là đa số.`,
    { midv: arr[Math.floor(arr.length / 2)] }, true);
  return steps;
}

function trace_majority_counter(input) {
  const { nums } = input;
  const steps = [];
  const freq = new Map();
  for (const x of nums) freq.set(x, (freq.get(x) || 0) + 1);
  let best = null, bestC = -1;
  for (const [k, v] of freq) if (v > bestC) { bestC = v; best = k; }

  const push = (note, patch, end) => {
    const cells = nums.map((v, idx) => ({ value: v }));
    steps.push(Object.assign({ note, cells, array: nums.slice(), freq: [...freq.entries()] }, patch, end ? { end: true, answer: best } : {}));
  };

  push(`Đếm tần suất: ${[...freq.entries()].map(([k, v]) => `${k} × ${v}`).join(', ')}.`);
  push(`Phần tử xuất hiện nhiều nhất là ${best} với ${bestC} lần (> n/2) → đáp án.`, { freq: [...freq.entries()], best }, true);
  return steps;
}

/* ============================== #189 Rotate Array ============================== */

function trace_rotate_reverse(input) {
  const { nums, k } = input;
  const n = nums.length;
  const kk = ((k % n) + n) % n;
  const steps = [];
  const arr = nums.slice();

  const push = (note, patch, end) => {
    const cells = arr.map((v, idx) => ({ value: v }));
    steps.push(Object.assign({ note, cells, array: arr.slice() }, patch, end ? { end: true } : {}));
  };

  push(`k = ${k} → quy về k' = ${kk} (mod n). Bây giờ xoay PHẢI ${kk} bước.`, {});
  if (kk === 0) return push(`k' = 0 → không cần làm gì, mảng giữ nguyên.`, {}, true);

  const rev = (lo, hi, tag) => {
    while (lo < hi) {
      push(`(Đảo ${tag}) đổi chỗ nums[${lo}] ↔ nums[${hi}].`, { swap: [lo, hi], ptr: { lo, hi }, ptrNames: ['lo', 'hi'] });
      [arr[lo], arr[hi]] = [arr[hi], arr[lo]];
      lo++; hi--;
    }
  };

  push(`Bước 1 — đảo TOÀN BỘ mảng [0..${n - 1}]: các phần tử cuối (sẽ đi đầu) chui lên phía trước.`, {});
  rev(0, n - 1, 'toàn bộ');

  push(`Bước 2 — đảo nửa trái [0..${kk - 1}]: trả các phần tử sẽ đứng đầu về đúng thứ tự.`, {});
  rev(0, kk - 1, 'nửa trái');

  push(`Bước 3 — đảo nửa phải [${kk}..${n - 1}]: trả phần còn lại về đúng thứ tự.`, {});
  rev(kk, n - 1, 'nửa phải');
  push('Xong! Đảo 3 lần cho ra đúng mảng xoay phải k bước.', {}, true);
  return steps;
}

function trace_rotate_cyclic(input) {
  const { nums, k } = input;
  const n = nums.length;
  const kk = ((k % n) + n) % n;
  const steps = [];
  const arr = nums.slice();

  const push = (note, patch, end) => {
    const cells = arr.map((v, idx) => ({ value: v }));
    steps.push(Object.assign({ note, cells, array: arr.slice() }, patch, end ? { end: true } : {}));
  };

  push(`k' = ${kk}. Ý tưởng: mỗi phần tử chuyển đến vị trí (i + k) % n — đi theo từng “xích” (cycle) và không ghi đè dữ liệu chưa xử lý.`, {});
  if (kk === 0 || n < 2) return push('Không cần xoay — mảng nhỏ hơn 2 hoặc k bội của n.', {}, true);

  let placed = 0, start = 0;
  while (placed < n) {
    let cur = start, carry = arr[start];
    push(`Mở xích mới từ vị trí ${start}: cầm giá trị ${carry}, đến nơi thì “trả” nó vào chỗ trống của phần tử kế.`, { ptr: { start, cur }, ptrNames: ['start', 'cur'] });
    do {
      const nxt = (cur + kk) % n;
      push(`Đặt giá trị đang cầm ${carry} vào vị trí ${nxt} (đúng (${cur} + ${kk}) % ${n} = ${nxt}); nhận lại ${arr[nxt]} để tiếp tục đi.`,
        { ptr: { start, cur: nxt }, ptrNames: ['start', 'cur'], move: { from: cur, to: nxt, value: carry } });
      const tmp = arr[nxt];
      arr[nxt] = carry;
      carry = tmp;
      cur = nxt;
      placed++;
    } while (cur !== start);
    push(`Xích khép kín (quay lại ${start}). Đã đặt ${placed}/${n} phần tử.`, { ptr: { start: start + 1, cur }, ptrNames: ['start', 'cur'] });
    start++;
  }
  push('Xong — mọi phần tử đã đi đúng vị trí, mỗi phần tử chỉ được ghi ĐÚNG 1 lần.', {}, true);
  return steps;
}

function trace_rotate_extra(input) {
  const { nums, k } = input;
  const n = nums.length;
  const kk = ((k % n) + n) % n;
  const steps = [];
  const arr = nums.slice();
  const rotated = new Array(n);

  const push = (note, patch, end) => {
    const cells = arr.map((v, idx) => ({ value: v }));
    steps.push(Object.assign({ note, cells, array: arr.slice() }, patch, end ? { end: true } : {}));
  };

  push(`k' = ${kk}. Dùng mảng phụ rotated cùng độ dài; mỗi phần tử nums[i] về vị trí (i + ${kk}) % ${n} trong rotated.`, {});
  if (kk === 0) return push('k bội của n → giữ nguyên.', {}, true);

  for (let i = 0; i < n; i++) {
    const dest = (i + kk) % n;
    rotated[dest] = arr[i];
    push(`Đặt nums[${i}] = ${arr[i]} vào rotated[${dest}] = (${i} + ${kk}) % ${n}.`, { write: { dest, value: arr[i], bake: 'rotated' }, read: at(arr, i), aux: { label: 'rotated', values: rotated.slice() } });
  }
  push('Sao chép rotated về nums — ra đúng mảng xoay.', { aux: { label: 'rotated', values: rotated.slice() } });
  for (let i = 0; i < n; i++) arr[i] = rotated[i];
  push('Xong! Cách dễ hiểu nhất về mặt toán — nhưng tốn O(n) bộ nhớ phụ.', {}, true);
  return steps;
}

/* ============================== registry ============================== */

const TRACES = {
  '88-backwards': { fn: trace_merge_backwards, input: { nums1: [1, 2, 3, 0, 0, 0], m: 3, nums2: [2, 5, 6], n: 3 } },
  '88-copyfront': { fn: trace_merge_copy_front, input: { nums1: [1, 2, 3, 0, 0, 0], m: 3, nums2: [2, 5, 6], n: 3 } },
  '88-sorted':    { fn: trace_merge_sorted, input: { nums1: [1, 2, 3, 0, 0, 0], m: 3, nums2: [2, 5, 6], n: 3 } },
  '27-twopointer':{ fn: trace_remove_twopointer, input: { nums: [3, 2, 2, 3], val: 3 } },
  '27-swap':      { fn: trace_remove_swap, input: { nums: [3, 2, 2, 3], val: 3 } },
  '27-filter':    { fn: trace_remove_filter, input: { nums: [3, 2, 2, 3], val: 3 } },
  '26-twopointer':{ fn: trace_dupes_twopointer, input: { nums: [0, 0, 1, 1, 1, 2, 2, 3, 3, 4] } },
  '26-compress':  { fn: trace_dupes_compress, input: { nums: [0, 0, 1, 1, 1, 2, 2, 3, 3, 4] } },
  '26-groupby':   { fn: trace_dupes_groupby, input: { nums: [0, 0, 1, 1, 1, 2, 2, 3, 3, 4] } },
  '80-counter':   { fn: trace_dupes2_counter, input: { nums: [1, 1, 1, 2, 2, 3], val: 2 } },
  '80-trick':     { fn: trace_dupes2_trick, input: { nums: [1, 1, 1, 2, 2, 3], val: 2 } },
  '80-counterdict':{ fn: trace_dupes2_counterdict, input: { nums: [1, 1, 1, 2, 2, 3], val: 2 } },
  '169-vote':     { fn: trace_majority_vote, input: { nums: [2, 2, 1, 1, 1, 2, 2] } },
  '169-sorted':   { fn: trace_majority_sorted, input: { nums: [2, 2, 1, 1, 1, 2, 2] } },
  '169-counter':  { fn: trace_majority_counter, input: { nums: [2, 2, 1, 1, 1, 2, 2] } },
  '189-reverse':  { fn: trace_rotate_reverse, input: { nums: [1, 2, 3, 4, 5, 6, 7], k: 3 } },
  '189-cyclic':   { fn: trace_rotate_cyclic, input: { nums: [1, 2, 3, 4, 5, 6, 7], k: 3 } },
  '189-extra':    { fn: trace_rotate_extra, input: { nums: [1, 2, 3, 4, 5, 6, 7], k: 3 } },
};

if (typeof module !== 'undefined' && module.exports) module.exports = { TRACES, trace_merge_backwards };
globalThis.TRACES = TRACES; // chung cho browser / player.js / node