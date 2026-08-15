# DESIGN — Tracer tự động + Renderer đa cấu trúc + Eval (v2.0)

Mục tiêu: **mọi cách giải của 150 bài đều có animation từng bước khớp code**,
thay cho kn-hoặc danh-sách-tĩnh. Cơ chế: chạy CHÍNH code Python của từng cách
giải trên input mẫu, bắt sự đổi trạng thái (đọc/ghi/đổi chỗ/trỏ/đệ quy) và xuất
mảng `steps` theo schema Player. Thêm mục "Tư duy" (quy nạp ngược / quy nạp tiến)
và `traceInput` mẫu cho từng bài.

## 1. Step schema (extension của Player hiện tại)

```js
{
  note: "…",                 // câu tiếng Việt ngắn — sinh tự động từ sự kiện
  // MỘT trong các nguồn hiển thị:
  array: [1,2,3],                 // mảng 1D
  mat:   [[1,2],[3,4]],           // ma trận (r×c)
  tree:  { root: 3 /*id*/, nodes: {id:{value,left,right,state}} },
  ll:    { head: 1 /*id*/, nodes: {id:{value,next}} },
  stack: [a,b,c],                 // ngăn xếp: kẻ dọc
  // đánh dấu (mỗi step có thể có nhiều loại):
  read:  [{target:[i], value}] | [{target:{node:3}}] | [{target:[r,c]}],
  write: {dest:[i]|{node:3}|[r,c], value},
  swap:  [a,b] | [{node:a},{node:b}],
  ptr:   { r: 3, cand: 2 },       // tên trỏ → index / node id / giá trị
  aux:   { label:"nums2", values:[...] },
  end:   true, answer…, k…
}
```

- Cấu trúc dữ liệu là **proxy**: mảng là subclass của `list`, node cây/list là class
  có `__slots__` + property ghi lại truy cập → renderer tự biết cách vẽ.
- `read`/`write`/`swap` dùng **đích có dạng mảng 1D, mảng 2D, hoặc node-id** để
  renderer tô ô / tô nút.

## 2. Tracer (gen/tracer.py)

Pipeline: `code` + `tcex config` + `input` → exec qua proxy + settrace → `steps`.

### 2.1 Bắt sự kiện — hai lớp cùng lúc
- **Proxy dữ liệu** (`TList(list)`, `TDict(dict)`, `TreeNode`, `ListNode`): ghi
  đọc/ghi/đổi chỗ/append/pop/đổi trường val-next-left-right. Ký hiệu mảng Python
  `nums[i]=x`, `a,b=b,a`, `stack.append`, `node.val` … chạy nguyên si trên proxy.
- **sys.settrace**: bắt từng dòng, diff `locals()` trên các biến được khai báo
  trong `ptrs` → sự kiện "con trỏ r chuyển 2→5". Cũng bắt call/return để ghi chú
  đệ quy và bắt giá trị trả về (→ step cuối `end:true, answer`).

### 2.2 Gom sự kiện thành step
- Mỗi dòng thật sự có tác dụng = một step (note mẫu theo loại sự kiện, kèm giá trị
  thực: "Đọc nums[r]=4", "Ghi 7 vào ô w=3", "Đổi chỗ ô l=0 và r=4", "Con trỏ j=5").
- Đọc+ghi cùng dòng → gộp một step.
- `end:true` ở step cuối (giá trị trả về) trừ khi đúng bằng expected → antispoiler.

### 2.3 Input
- Mỗi bài/cách khai `tcex.input` = object `{<param>: <giá trị>}`. VD:
  `{"nums":[2,2,1,1,1,2,2]}`. Cho deterministic, small (~5–8 phần tử), và ưu tiên
  dùng đúng ví dụ trong `examples` khi hợp.
- Per-approach `tcex` ghi đè problem-level `tcex` (đa số chia sẻ).

### 2.4 Hạn chế và fallback
- Với thuật toán mà việc bắt bước tự động khó (VD: đệ quy sâu trên cây, BFS/DFS
  nặng trạng thái — `kind: none`): fallback = danh sách static `steps` (ghi chú
  từng bước do content agent viết) hoặc chỉ note giải thích. Audit yêu cầu *mọi*
  cách phải có `steps` (anim hoặc static), mục tiêu 100%.
- Giới hạn step/approach (60) để không tràn; nếu quá dài → tự động rút gọn bằng
  cách bỏ các step "chỉ di chuyển con trỏ không đổi dữ liệu" ở giữa.

## 3. tcex config — nơi để metadata (thêm vào JSON)

```json
"tcex": {
  "input": {"nums":[2,2,1,1,1,2,2]},
  "kind": "array",        // array|mat|ll|tree|stack|graph|none
  "display": "nums",      // tên biến chính
  "ptrs": ["cand","votes"],
  "aux": ["nums2"],
  "expected": 2,          // để xác minh (optional)
  "note": "…"             // note ngữ nghĩa động (optional, nối vào note tự sinh)
}
```

Kế thừa: approach thiếu `tcex` → dùng `tcex` cấp bài.

## 4. Renderer (engine.html — Player v2)

- Giữ schema Player cũ (array, aux, ptr) làm mặc định → không vỡ trace cũ.
- Thêm `mat` (lưới 2D, con trỏ [r,c]), `tree` (cây B-2 đẹp bằng CSS grid + layout
  thuật toán, nút tròn có id), `ll` (ô + mũi tên), `stack` (kẻ dọc, top ở trên).
- `ptr` hiển thị trên ô (index) hoặc trên nút (node id) hoặc dạng badge giá trị.
- Tự đặt vị trí label trỏ ≥ ô dưới cùng hàng → không tràn ngang.
- **Bàn phím**: trong vùng animation, phím `←`/`→`/`Home`/`End` điều khiển step
  (lắng nghe trên host, dừng hẳn khi rời khỏi vùng) — thay cho việc ấn nút liên tục.
- Giao diện nổi bật hơn: nút lớn hơn, highlight step hiện tại, mảng phụ có nhãn.

## 5. Content schema (thêm vào mỗi problem)

```json
"thinking": {
  "forward":  "Quy nạp tiến: …",   // bạn có gì → bước kế đến được cái gì
  "reverse":  "Quy nạp ngược: …"   // cần đáp án → phải có' cái gì ở bước trước
},
"note": "Chú giải: …(điều kiện biên, tại sao O(1) bộ nhớ…)",
"tcex": { … },                     // như trên
```

## 6. Build & Audit

- `gen/tracer.py --all` → chạy mọi approach có `tcex`, ghi `gen/problems/.steps-cache.json`
  + báo cáo `TRACE-REPORT.json` (ok/fail, số step, list lỗi). Lặp sửa đến khô.
- `build.js` đọc cache → gắn `steps` + `anim:true` (nếu renderer hỗ trợ kind).
  Ưu tiên track tay hiện có (ref-traces) — giữ nguyên chất lượng.
- `audit.js` nâng: **mọi** approach phải có steps (anim:true hoặc static≥1) —
  nếu thiếu → ISSUE. Đếm: bài có anim, tổng step, đúng kind.
- `eval.js` (mới): chạy lại từng trace 1 lần trong Node, kiểm tra cấu trúc step
  (not bị sau `end`, `read/write` hợp lệ, `array/mat/ll/tree` khớp nhau mỗi step,
  expected đúng) → điểm 0–100 mỗi cách.

## 7. Phản biện thiết kế (open items từ review)

- [ ] Cách xử lý tuple-assign `nums[l],nums[r]=nums[r],nums[l]` (đọc 2 ô rồi mới ghi) —
      đảm bảo note "đổi chỗ" chỉ sau khi cả 2 phép ghi xong.
- [ ] `TList` có slice `nums[1:]` (đọc), `nums[:]=kept` (ghi) — bắt đúng số lượng ô.
- [ ] Namespace: chích sẵn các hàm hay dùng `re/collections/bisect/itertools/heapq/…`
      + `TreeNode/ListNode` + vô hiệu `print`. import của chính solution chạy OK.
- [ ] Đệ quy: settrace call/return → note "gọi đệ quy depth+1" (có depth).
- [ ] Anti-spoiler: bỏ step cuối nếu == expected; `end:true` luôn kèm answer.
- [ ] Input có class đặc biệt `ListNode/TreeNode` dựng từ mảng (tracer cấp).
