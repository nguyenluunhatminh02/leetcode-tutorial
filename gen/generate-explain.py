#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen/generate-explain.py — sinh narrative "biết dạy" cho mọi approach animate.

Đọc groups/*.html (đã build), với mỗi approach animate chưa có explain trong
gen/problems/.explain-cache.json, sinh lời giải thích TỪNG BƯỚC theo:
  - loại sự kiện (đọc/ghi/đổi chỗ/con trỏ/trả về)
  - dòng code nguồn (để nói "dòng này đang làm gì")
  - giá trị + index cụ thể trong step
  - ngữ cảnh bài (title → cụm diễn giải riêng cho hành động phổ biến)
Output: gen/problems/.explain-cache.json (JSON, key "<no>::<name>", value mảng explain)
"""
from __future__ import annotations
import json, os, re, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GROUPS = os.path.join(ROOT, 'groups')
CACHE = os.path.join(ROOT, 'gen', 'problems', '.explain-cache.json')

def parse_data(path):
    h = open(path, encoding='utf8').read()
    i = h.find('const DATA = ')
    if i < 0:
        return None
    j = h.find('\n\nfunction el', i)
    raw = h[i + len('const DATA = '): j if j > 0 else h.find('</script>', i)].strip().rstrip(';')
    return json.loads(raw)

# --- cụm diễn giải theo ngữ cảnh hành động phổ biến ---
def fmt(v):
    if isinstance(v, list):
        return '[' + ','.join(str(x) for x in v) + ']'
    return str(v)

# templates giàu ngữ nghĩa theo TÊN BÀI + hành động
def action_text(title, apname, kind_action, a=None, b=None, v=None, i=None, n=None, val=None):
    t = (title or '').lower()
    # hai con trỏ / sliding window
    if 'two pointer' in apname.lower() or 'hai con trỏ' in apname.lower() or 'cửa sổ' in apname.lower() or 'sliding' in apname.lower():
        if kind_action == 'swap':
            return f'Đổi chỗ ô {a} ↔ {b}: đưa phần tử về đúng phía khi hai con trỏ gặp điều kiện'
        if kind_action == 'write':
            return f'Ghi {fmt(v)} vào ô {i}: vùng kết quả được mở rộng (con trỏ ghi tiến lên)'
        if kind_action == 'read':
            return f'So sánh/phân tích phần tử {fmt(v)} để quyết định dịch con trỏ'
        if kind_action == 'ptr':
            return f'Dịch con trỏ {n} → {val}: thu hẹp phạm vi, vẫn giữ bất biến vùng đã xử lý'
        if kind_action == 'append':
            return f'Thêm {fmt(v)} vào kết quả — đây là phần tử đạt điều kiện'
    # DP
    if 'dp' in apname.lower() or 'bảng' in apname.lower() or 'quy hoạch' in apname.lower():
        if kind_action == 'write':
            return f'Điền dp[{i}] = {fmt(v)} — tối ưu bài toán con tại vị trí {i}'
        if kind_action == 'read':
            return f'Đọc {fmt(v)}: so sánh lựa chọn để chọn phương án tối ưu'
        if kind_action == 'ptr':
            return f'Duyệt tới vị trí {val} — mỗi bước mở rộng bài toán con'
    # merge / gộp
    if 'merge' in apname.lower() or 'gộp' in apname.lower():
        if kind_action == 'write':
            return f'Ghi {fmt(v)} vào ô {i}: phần tử nhỏ hơn được chọn để gộp trước'
        if kind_action == 'read':
            return f'So {fmt(v)} với đầu mảng kia để lấy phần tử nhỏ hơn'
        if kind_action == 'swap':
            return f'Hoán {a} ↔ {b}: đưa phần tử này về đúng vị trí'
    # greedy
    if 'greedy' in apname.lower() or 'tham lam' in apname.lower() or 'kadane' in apname.lower():
        if kind_action == 'write':
            return f'Cập nhật {i} = {fmt(v)}: chọn lựa chọn tham lam tốt nhất tới nay'
        if kind_action == 'read':
            return f'Xét {fmt(v)}: quyết định theo chiến lược cục bộ tối ưu'
    # default
    if kind_action == 'swap':
        return f'Đổi chỗ ô {a} ↔ {b}: hoán hai phần tử về đúng vị trí'
    if kind_action == 'write':
        return f'Ghi {fmt(v)} vào {i} — kết quả dần hoàn thiện'
    if kind_action == 'read':
        return f'Đọc/so sánh {fmt(v)} để quyết định bước đi'
    if kind_action == 'ptr':
        return f'Con trỏ {n} → {val}'
    if kind_action == 'append':
        return f'Thêm {fmt(v)} — một phần kết quả được xác nhận'
    if kind_action == 'pop':
        return f'Lấy {fmt(v)} — phần tử này đã xử lý xong'
    return str(v)

def make_explain(p, ap):
    """Sinh explain theo pattern-aware cho approach animate."""
    steps = ap.get('steps') or []
    code = ap.get('code') or ''
    lines = code.split('\n')
    title = p.get('title', '')
    apname = ap.get('name', '')
    out = []
    for k, s in enumerate(steps):
        note = s.get('note', '')
        ln = s.get('line')
        src = ''
        if ln and ln <= len(lines):
            src = lines[ln - 1].strip()
        bits = []
        if s.get('swap'):
            a, b = (s['swap'][0] if isinstance(s['swap'][0], list) else s['swap'])
            bits.append(action_text(title, apname, 'swap', a, b))
        elif s.get('write'):
            d = s['write'].get('dest', '?')
            v = s['write'].get('value', '?')
            if isinstance(d, list):
                bits.append(action_text(title, apname, 'write', v=v, i=d))
            elif isinstance(d, dict):
                bits.append(f'Ghi vào node {d} giá trị {fmt(v)}')
            else:
                bits.append(action_text(title, apname, 'write', v=v, i=d))
        elif s.get('read'):
            reads = [r for r in s['read'] if isinstance(r, dict)]
            vals = [r.get('value') for r in reads if r.get('value') is not None]
            if len(vals) >= 2:
                bits.append(f'So sánh {fmt(vals[0])} vs {fmt(vals[1])} để chọn hướng xử lý')
            elif vals:
                bits.append(action_text(title, apname, 'read', v=vals[0]))
        has_action = (s.get('swap') or s.get('write') or s.get('read') or s.get('append') or s.get('pop'))
        if s.get('end'):
            ans = s.get('answer')
            if ans is None:
                bits.append('→ Đáp án: thay đổi được thực hiện tại chỗ (in-place, hàm không trả về)')
            else:
                bits.append(f'→ Đáp án: {fmt(ans)}')
        if not has_action and not s.get('end'):
            # step không hành động: ưu tiên note hiện có nếu đã mô tả tốt (>40 ký tự).
            if note and len(note) > 40 and not re.match(r'^(Đọc|ghi|So sánh)', note):
                out.append(note)
            elif src and re.search(r'(append|pop|put|get|max|min|\+=|-=|\*=|//=|\.push|\.add|\.remove)', src):
                out.append(f'{src[:70]} — thao tác này làm thay đổi trạng thái chính.')
            elif s.get('ptr'):
                names = list(s['ptr'].keys())
                vals = list(s['ptr'].values())
                if names:
                    out.append(f'Con trỏ {names[0]} dịch tới {fmt(vals[0])} — phạm vi xét được thu hẹp')
                else:
                    out.append('')
            elif src:
                # bước điều hướng (loop head / if / return): mô tả dòng code đang thực thi
                lmsg = 'Duyệt' if re.match(r'(for |while )', src) else ('Kiểm tra điều kiện' if src.startswith('if ') else ('Trả về kết quả' if src.startswith('return') else 'Đang thực thi'))
                out.append(f'{lmsg}: {src[:60]}')
            else:
                out.append('')
            continue
        if s.get('ptr'):
            names = list(s['ptr'].keys())
            vals = list(s['ptr'].values())
            if names:
                bits.append(f'{names[0]}={fmt(vals[0])}')
        txt = ' '.join(bits) if bits else (note[:70] or '(bước rẽ)')
        if len(txt) > 140:
            txt = txt[:137] + '…'
        out.append(txt)
    return out

def main():
    import sys
    force = '--force' in sys.argv
    cache = {}
    if os.path.exists(CACHE):
        cache = json.load(open(CACHE, encoding='utf8'))
    tot = 0
    added = 0
    for f in sorted(glob.glob(os.path.join(GROUPS, '*.html'))):
        d = parse_data(f)
        if not d:
            continue
        for p in d.get('problems', []):
            no = str(p['no'])
            for ap in p.get('approaches', []):
                if not ap.get('anim'):
                    continue
                key = f'{no}::{ap["name"]}'
                tot += 1
                if not force and key in cache:
                    continue
                exp = make_explain(p, ap)
                cache[key] = exp
                added += 1
    os.makedirs(os.path.dirname(CACHE), exist_ok=True)
    json.dump(cache, open(CACHE, 'w', encoding='utf8'), ensure_ascii=False)
    print(f'Tổng approach animate: {tot} | có explain: {len(cache)} | mới thêm: {added}')

if __name__ == '__main__':
    main()