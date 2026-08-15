# LeetCode Tutorial — tiếng Việt

Bộ hướng dẫn giải LeetCode bằng tiếng Việt, **mỗi bài có nhiều cách giải** kèm **animation từng bước** bám sát code Python thật.

## Hiện có

- **300 bài** LeetCode (Top Interview 150 + Top 100 Liked + bài phỏng vấn nổi tiếng), chia theo nhóm chủ đề.
- Mỗi bài: đề bài, ý tưởng chính, **quy nạp tiến/ngược**, **3+ cách giải**, mỗi cách có code Python kèm **minh hoạ animation** mô phỏng từng dòng chạy thật (tracer tự động).

## Xem thử

Mở `index.html` bằng trình duyệt (mọi thứ chạy offline, không cần server).

## Cấu trúc

```
index.html            — trang chủ (tổng hợp các nhóm)
groups/*.html         — một nhóm chủ đề, mỗi file chứa nhiều bài + Player animation
gen/problems/*.json   — dữ liệu bài (đề, cách giải, tcex input, static notes)
gen/engine.html       — lõi Player (hiển thị mảng/cây/list/stack/hash + animation)
gen/tracer.py         — tracer tự động: chạy code Python thật → các bước animation
gen/build.js          — build: đọc problems/*.json → xuất groups/*.html
gen/audit.js          — kiểm tra cấu trúc toàn bộ
```

## Build

```bash
node gen/build.js     # build lại groups/*.html + index.html
python3 gen/tracer.py --all   # chạy tracer cho mọi approach có tcex
node gen/audit.js     # kiểm tra cấu trúc
```
