"""
gen/tracer.py — Tracer tự động cho mọi cách giải Top Interview 150.

Chạy CHÍNH code Python của từng approach trên input mẫu, theo dõi từng dòng
đang thi hành (sys.settrace) + từng thay đổi trên proxy dữ liệu (TList/TNode),
rồi xuất mảng `steps` theo schema engine.html (Player v2):

  step = {
    note, line,
    array: [v..],                     // 1D
    mat:   [[v..]..],                 // 2D (mỗi dòng có thể có read/write/set con trỏ)
    tree: {root, nodes:{id:{value,left,right,state}}},
    ll:   {head, nodes:{id:{value,next}}},
    read:  [{target:[i]|[r,c]|{node:id}, value}],
    write: {dest:[i]|[r,c]|{node:id,field}, value},
    swap:  [[a,b]...],
    ptr:   {name: pos},  // pos: index | [r,c] | node-id
    end, answer | k
  }

  python3 gen/tracer.py --selftest
  python3 gen/tracer.py --all            # chạy --all (đọc problems/*.json, mỗi ap có tcex)
"""
from __future__ import annotations
import sys, os, io, json, re, ast, copy, math, types, traceback, textwrap, dataclasses

PROBLEMS_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_FILE = os.path.join(PROBLEMS_DIR, 'problems', '.steps-cache.json')
REPORT_FILE = os.path.join(PROBLEMS_DIR, 'TRACE-REPORT.json')

# =============================== proxy dữ liệu ==============================

class TList(list):
    __slots__ = ('writer',)
    def __init__(self, it=()):
        super().__init__(it)
        self.writer = None
    def _log(self, kind, *a):
        w = self.writer
        if w is not None:
            w.proxy_ev(self, kind, *a)
    def __getitem__(self, i):
        if not isinstance(i, slice):
            self._log('read', i)
        v = super().__getitem__(i)
        if isinstance(i, slice):
            self._log('read', f'slice[{i.start}:{i.stop}]')
        return v
    def __setitem__(self, i, v):
        if isinstance(i, slice):
            vals = list(v) if isinstance(v, (list, tuple, TList)) else v
            self._log('write', f'slice[{i.start}:{i.stop}]', vals)
        else:
            self._log('write', i, v)
        super().__setitem__(i, v)
    def append(self, v):
        self._log('append', None, v)
        super().append(v)
    def pop(self, i=-1):
        v = super().__getitem__(i)
        self._log('pop', i, v)
        super().__delitem__(i)
        return v
    def insert(self, i, v):
        self._log('insert', i, v)
        super().insert(i, v)
    def extend(self, it):
        lst = list(it)
        self._log('extend', None, lst)
        super().extend(lst)
    def __delitem__(self, i):
        if isinstance(i, slice):
            self._log('pop', 'slice')
        else:
            self._log('pop', i, super().__getitem__(i))
        super().__delitem__(i)


SLOT_FIELDS = ('value', 'left', 'right', 'next')


class TNode:
    """Node dùng chung: linked list / cây / đồ thị. Ghi lại read/write các field."""
    __slots__ = ('value', 'left', 'right', 'next', 'state', 'id', 'writer', 'neighbors', 'random', 'visited')
    def __init__(self, value=0, writer=None, **kw):
        object.__setattr__(self, 'writer', writer)
        object.__setattr__(self, 'value', value)
        object.__setattr__(self, 'left', None)
        object.__setattr__(self, 'right', None)
        object.__setattr__(self, 'next', None)
        object.__setattr__(self, 'state', None)
        object.__setattr__(self, 'id', None)
        object.__setattr__(self, 'neighbors', None)
        object.__setattr__(self, 'random', None)
        object.__setattr__(self, 'visited', None)
        for k, v in kw.items():
            if k == 'next' and v is not None:
                object.__setattr__(self, 'next', v)
            elif k == 'val':
                object.__setattr__(self, 'value', v)
    def __getattribute__(self, name):
        if name in SLOT_FIELDS:
            w = object.__getattribute__(self, 'writer')
            if w is not None:
                w.node_ev(self, 'read', name)
        return object.__getattribute__(self, name)
    def __setattr__(self, name, val):
        if name == 'val':
            name = 'value'
        if name in SLOT_FIELDS:
            w = object.__getattribute__(self, 'writer')
            if w is not None:
                w.node_ev(self, 'write', name, val)
        object.__setattr__(self, name, val)
    def __getattr__(self, name):
        if name == 'val':
            return object.__getattribute__(self, 'value')
        raise AttributeError(name)
    def __repr__(self):
        return f'TNode({object.__getattribute__(self, "value")})'


def build_ll(writer, arr, pos=-1):
    """Dựng linked list từ mảng value; pos ≥ 0 → nối đuôi về nút thứ pos (tạo vòng)."""
    nodes = {}; head = None; prev = None
    for i, v in enumerate(arr):
        n = TNode(v, writer); n.id = i; nodes[i] = n
        if prev is None:
            head = n
        else:
            prev.next = n
        prev = n
    if pos >= 0 and head is not None and pos < len(arr):
        prev.next = nodes[pos]
    return head, nodes


def build_tree(writer, arr):
    nodes = {}
    if not arr or arr[0] is None:
        return None, nodes
    root = TNode(arr[0], writer); root.id = 0; nodes[0] = root
    q = [root]; idx = 1; nid = 1
    while q and idx < len(arr):
        cur = q.pop(0)
        if idx < len(arr) and arr[idx] is not None:
            nd = TNode(arr[idx], writer); nd.id = nid; nodes[nid] = nd; cur.left = nd; q.append(nd); nid += 1
        idx += 1
        if idx < len(arr) and arr[idx] is not None:
            nd = TNode(arr[idx], writer); nd.id = nid; nodes[nid] = nd; cur.right = nd; q.append(nd); nid += 1
        idx += 1
    return root, nodes


def build_graph(writer, adj, n=None):
    allv = set()
    for u, vs in (adj or {}).items():
        allv.add(u); allv.update(vs)
    for i in range(n or 0):
        allv.add(i)
    nodes = {}
    for i in sorted(allv):
        nd = TNode(i, None); nd.id = i; nodes[i] = nd
    for u, vs in (adj or {}).items():
        if u in nodes:
            object.__setattr__(nodes[u], 'neighbors', [nodes[v] for v in vs if v in nodes])
    return nodes


# ================================== tracer ==================================

@dataclasses.dataclass
class Ev:
    line: int
    kind: str      # read | write | append | pop | ptr | node | snap
    data: tuple = ()


def _fmt(v):
    if v is None:
        return '∅'
    if isinstance(v, bool):
        return 'True' if v else 'False'
    if isinstance(v, float):
        return f'{v:g}'
    if hasattr(v, 'value'):  # node
        return str(v.value)
    return str(v)


def self_serialize(node):
    """Serialize TNode thành list giá trị (BFS) — để JSON hoá an toàn."""
    if node is None:
        return []
    if not isinstance(node, TNode):
        return node
    order = []
    q = [node]
    seen = set()
    while q:
        nd = q.pop(0)
        if nd is None:
            continue
        seen.add(id(nd))
        order.append(object.__getattribute__(nd, 'value'))
        for f in ('left', 'right', 'next'):
            ch = object.__getattribute__(nd, f)
            if isinstance(ch, TNode) and id(ch) not in seen:
                q.append(ch)
    return order


def _js(v):
    """Chuyển giá trị Python → JSON-safe (node → value, list → list, khác → nguyên)."""
    if v is None or isinstance(v, (bool, int, float, str)):
        return v
    if isinstance(v, TNode):
        return object.__getattribute__(v, 'value')
    if isinstance(v, (list, tuple)):
        return [_js(x) for x in v]
    return v


class Tracer:
    def __init__(self, code, tcex):
        self.code = textwrap.dedent(code).strip('\n')
        self.lines = self.code.split('\n')
        self.tcex = tcex
        self.kind = tcex.get('kind', 'array')
        self.display = tcex.get('display')
        self.aux = tcex.get('aux') or []
        self.ptrs = tcex.get('ptrs') or []
        self.expected = tcex.get('expected')
        self.cur = None
        self.events = []
        self.ready = False
        self.depth = 0
        self.fn_name = None
        self.ret_value = None
        self._disp = None          # object chính để snapshot
        self._tree_nodes = None    # {id: TNode} nếu kind tree (để tra value theo id)
        self._disp_tree = None     # (root, nodes) nếu kind tree/ll
        self._row_map = {}         # id(row TList) -> r  (kind mat)
        self._snap = None          # snapshot hiện tại (replay)
        self._line_snap = {}       # line -> snapshot cuối tại dòng đó
        self._stack_last = None    # (kind stack) nội dung st ở dòng trước

    # ---------- settrace ----------
    def trace(self, frame, event, arg):
        fname = getattr(frame.f_code, 'co_filename', '')
        if fname != '<approach>':
            return None
        if event == 'call':
            self.depth += 1
            return self.trace
        if event == 'return':
            self.depth -= 1
            if self.depth == 0 and self.ready:
                self.ret_value = arg
            return None
        if event == 'line' and self.ready:
            ln = frame.f_lineno
            self.cur = (frame, ln)
            self._collect(frame, ln)
        return self.trace

    def _collect(self, frame, ln):
        # snapshot hiện tại (trạng thái TRƯỚC khi dòng này chạy) → sự kiện snap
        snap = self._snapshot()
        self.events.append(Ev(ln, 'snap', (snap,)))
        # ds nội bộ (stack / hash / set): đọc biến cục bộ theo display
        if self.kind in ('stack', 'hash', 'set'):
            v = frame.f_locals.get(self.display, frame.f_globals.get(self.display))
            if v is not None:
                if self.kind == 'stack':
                    # log khi NỘI DUNG đổi (append/pop mutate cùng list)
                    cur = list(v) if isinstance(v, (list, tuple)) else v
                    if cur != self._stack_last:
                        self.events.append(Ev(ln, 'stk', (cur,)))
                        self._stack_last = cur
                elif self.kind == 'hash':
                    sentry = object()
                    cur = v is not self._stack_last
                    self._stack_last = v
                    if cur:
                        self.events.append(Ev(ln, 'hsh', (dict(v),)))
                elif self.kind == 'set':
                    if v is not self._stack_last:
                        self.events.append(Ev(ln, 'set', (sorted(v),)))
                        self._stack_last = v
        # con trỏ
        changed = []
        for name in self.ptrs:
            v = frame.f_locals.get(name, frame.f_globals.get(name))
            if v is not None:
                changed.append((name, v))
        if changed:
            self.events.append(Ev(ln, 'ptr', tuple(changed)))

    def _snapshot(self):
        if self.kind == 'mat' and isinstance(self._disp, list):
            return {'mat': [list(r) for r in self._disp]}
        if self.kind == 'stack' and self._disp is not None:
            return {'stack': list(self._disp)}
        if self.kind in ('tree', 'll') and self._disp is not None:
            nodes = {}
            root = self._root
            def _val_expand(v):
                if isinstance(v, TNode):
                    return v.id if v.id is not None else -1
                if isinstance(v, list):
                    return [_val_expand(x) for x in v]
                return v
            stack = [root]
            seen = set()
            while stack:
                nd = stack.pop()
                if nd is None or nd.id is None or nd.id in seen:
                    continue
                seen.add(nd.id)
                nodes[nd.id] = {}
                for f in SLOT_FIELDS:
                    try:
                        nodes[nd.id][f] = _val_expand(object.__getattribute__(nd, f))
                    except AttributeError:
                        nodes[nd.id][f] = None
                nodes[nd.id]['state'] = object.__getattribute__(nd, 'state')
                for f in SLOT_FIELDS:
                    ch = object.__getattribute__(nd, f)
                    if isinstance(ch, TNode):
                        stack.append(ch)
            return {self.kind: {'root': root.id if root else None, 'nodes': nodes}}
        if isinstance(self._disp, TList):
            return {'array': list(list.__iter__(self._disp))}
        return {'array': []}

    # ---------- proxy callbacks ----------
    def proxy_ev(self, tlist, kind, idx, val=None):
        if not self.ready:
            return
        ln = self.cur[1] if self.cur else 0
        # chuyển index: mat → [r,c]
        rid = id(tlist)
        if self.kind == 'mat' and rid in self._row_map and not isinstance(idx, str):
            idx = [self._row_map[rid], idx]
        if kind == 'read':
            if isinstance(idx, str) or isinstance(idx, slice):
                v = val
            elif isinstance(idx, list):
                v = list.__getitem__(tlist, idx[1])
            else:
                v = list.__getitem__(tlist, idx)
            self.events.append(Ev(ln, 'read', (idx, v)))
        elif kind in ('write', 'append'):
            self.events.append(Ev(ln, kind, (idx, val)))
        elif kind == 'pop':
            self.events.append(Ev(ln, 'pop', (idx, val)))

    def node_ev(self, node, kind, name, val=None):
        if not self.ready:
            return
        ln = self.cur[1] if self.cur else 0
        # đặt state tạm trên node để snapshot hiển thị node đang tương tác
        try:
            object.__setattr__(node, 'state', 'rd' if kind == 'read' else 'wr')
        except Exception:
            pass
        if kind == 'read':
            self.events.append(Ev(ln, 'node', ('read', node.id if node.id is not None else -1, name, _js(object.__getattribute__(node, name)))))
        else:
            self.events.append(Ev(ln, 'node', ('write', node.id if node.id is not None else -1, name, val)))

    # ---------- namespace & chạy ----------
    def _make_ns(self):
        import builtins
        from collections import defaultdict, Counter, deque
        ns = {
            '__builtins__': builtins,
            'TList': TList, 'TNode': TNode,
            'ListNode': TNode, 'TreeNode': TNode, 'Node': TNode,
            'print': lambda *a, **k: None,
            'defaultdict': defaultdict, 'Counter': Counter, 'deque': deque,
        }
        for mod in ('re', 'bisect', 'itertools', 'heapq', 'math', 'typing', 'functools', 'operator', 'string'):
            try:
                ns[mod] = __import__(mod)
            except Exception:
                pass
        return ns

    def run(self, input_dict):
        ns = self._make_ns()
        try:
            exec(compile(self.code, '<approach>', 'exec'), ns)
        except Exception:
            return self._err('exec', traceback.format_exc())
        fns = [(k, v) for k, v in ns.items()
               if isinstance(v, types.FunctionType)
               and getattr(v, '__code__', None).co_filename == '<approach>'
               and not k.startswith('_')]
        if not fns:
            return self._err('nofunc', 'không tìm thấy def trong code')
        want = self.tcex.get('func')
        chosen = next((v for k, v in fns if k == want), None) or fns[0][1]
        self.fn_name = chosen.__name__

        params = chosen.__code__.co_varnames[:chosen.__code__.co_argcount]
        callargs = {}
        self._root = None; self._disp = None
        try:
            for p in params:
                if p not in input_dict:
                    continue
                callargs[p] = self._conv(p, input_dict[p])
        except Exception:
            return self._err('input', traceback.format_exc())
        if self._disp is None:
            # mặc định: tham số đầu tiên là display
            for p in params:
                if p in callargs and isinstance(callargs[p], (TList, TNode)):
                    self._disp = callargs[p]
                    if not self.display:
                        self.display = p
                    break
        if self._disp is None:
            # kind stack/hash/set: display là biến NỘI BỘ (đọc qua _collect từ locals),
            # kind none: không animate → không cần display
            if self.kind not in ('stack', 'hash', 'set', 'none'):
                return self._err('display', 'không tìm thấy biến display (tcex.display cần đúng tên)')

        self._roots = []
        for p in params:
            if p in callargs and isinstance(callargs[p], TNode) and callargs[p] is not self._disp:
                self._roots.append(callargs[p])

        self.events = []
        self.ready = True
        self.depth = 0
        self.ret_value = None
        try:
            with io.StringIO() as buf:
                old = sys.stdout
                sys.stdout = buf
                try:
                    sys.settrace(self.trace)
                    r = chosen(**callargs)
                finally:
                    sys.settrace(None)
                    sys.stdout = old
            if self.ret_value is None:
                self.ret_value = r
        except Exception:
            return self._err('run', traceback.format_exc())
        self.ready = False
        return self._build_steps()

    def _conv(self, name, v):
        ptype = (self.tcex.get('param_kinds') or {}).get(name)
        if ptype == 'll' or (self.kind == 'll' and not self._disp and name == self.display):
            pos = -1
            if isinstance(v, dict) and 'values' in v:
                pos = int(v.get('pos', -1)); v = v['values']
            head, nodes = build_ll(self, v, pos)
            self._root = head; self._disp = head
            return head
        if ptype == 'tree' or (self.kind == 'tree' and not self._disp and name == self.display):
            root, nodes = build_tree(self, v)
            self._root = root; self._disp = root
            self._tree_nodes = nodes
            return root
        if ptype == 'graph':
            nodes = build_graph(self, v.get('adj') if isinstance(v, dict) else v, v.get('n') if isinstance(v, dict) else None)
            self._disp = nodelist = sorted(nodes.values(), key=lambda x: (x.id or 0))
            self._disp = nodelist
            return nodelist
        if v is None:
            return None
        if isinstance(v, list):
            if self.kind == 'mat' and not self._disp:
                rows = []
                for r, row in enumerate(v):
                    tl = TList(row); tl.writer = self
                    self._row_map[id(tl)] = r
                    rows.append(tl)
                self._disp = rows
                return rows
            tl = TList(v); tl.writer = self
            if name == self.display:
                self._disp = tl
            return tl
        return v

    # ---------- xuất steps ----------
    def _build_steps(self):
        steps = []
        ordered = []
        for ev in self.events:
            if not ordered or ordered[-1][0] != ev.line:
                ordered.append([ev.line, []])
            ordered[-1][1].append(ev)
        for ln, evs in ordered:
            st = self._step_from_events(ln, evs)
            if st:
                # snapshot: lấy snapshot TRƯỚC của dòng này (snap đầu tiên trong evs)
                snap = next((e.data[0] for e in evs if e.kind == 'snap'), None)
                if snap and self.kind != 'none':
                    st.update(snap)
                # các cấu trúc nội bộ (stack/hash/set) — gắn snapshot riêng nếu có
                for ek in ('stk', 'hsh', 'set'):
                    ev = next((e for e in evs if e.kind == ek), None)
                    if ev:
                        field = {'stk': 'stack', 'hsh': 'hash', 'set': 'set'}[ek]
                        safe = list(ev.data[0]) if field == 'set' else ev.data[0]
                        if isinstance(safe, dict):
                            items = sorted(safe.items(), key=lambda kv: str(kv[0]))
                            st[field] = {str(k): v for k, v in items}
                        else:
                            st[field] = safe
                steps.append(st)
        if not steps:
            steps.append({'note': '(không có sự kiện — kiểm tra tcex/input)', **({'array': self._snapshot().get('array', [])} if self._snapshot() else {})})

        # answer cuối
        ans = self.ret_value
        exp = self.tcex.get('expected')
        if isinstance(ans, TNode):
            serialized = self._serialize_node(ans)
            good = (exp is not None and serialized == exp)
            ans_s = '→ '.join(str(x) for x in serialized)
            ans_for_step = {'tcex_serialized': serialized}
            self.ret_value = serialized
        else:
            good = (exp is not None and ans == exp)
            ans_s = _fmt(ans) if not isinstance(ans, (list, tuple)) else ('[' + ', '.join(str(x) for x in ans) + ']')
            ans_for_step = ans
        if good:
            last_note = f'Kết thúc — đáp án: {ans_s} ✓ (khớp kỳ vọng)'
        else:
            last_note = f'Kết thúc — đáp án: {ans_s}'
        last = steps[-1]
        last['end'] = True
        last['answer'] = ans_for_step
        last['note'] = last.get('note') and (last['note'] + ' — ' + last_note) or last_note
        return steps

    def _step_from_events(self, ln, evs):
        if ln > len(self.lines):
            return None
        src = self.lines[ln - 1].strip()
        reads = [e for e in evs if e.kind == 'read']
        writes = [e for e in evs if e.kind == 'write']
        pops = [e for e in evs if e.kind == 'pop']
        nodes = [e for e in evs if e.kind == 'node']
        ptrs = [e for e in evs if e.kind == 'ptr']
        stks = [e for e in evs if e.kind == 'stk']
        swaps = self._detect_swaps(evs)

        note_bits = []
        st = {}
        if swaps:
            a, b = swaps[0]
            st['swap'] = [[a, b]]
            note_bits.append(f'Đổi chỗ ô {a} ↔ {b}')
            # swap highlight: loại khỏi read/write có trong step để không tô thừa
            reads = [e for e in reads if e.data[0] not in (a, b)]
            writes = [e for e in writes if not isinstance(e.data[0], list) and e.data[0] not in (a, b)]
        if reads:
            st['read'] = [{'target': list(r.data[0]) if isinstance(r.data[0], tuple) else r.data[0], 'value': r.data[1]} for r in reads if r.data[0] not in (None, 'slice')]
            if len(reads) >= 2 and not swaps and any(not isinstance(r.data[1], (list, tuple)) for r in reads):
                vals = [r.data[1] for r in reads]
                note_bits.append('So sánh ' + ' vs '.join(_fmt(v) for v in vals[:2]))
            else:
                note_bits.append('; '.join(f'Đọc {_fmt(r.data[1])}' for r in reads))
        if writes:
            ws = [(_fmt_widx(w.data[0]), w.data[1]) for w in writes]
            note_bits.append('; '.join(f'ghi {_fmt(v)} vào {i}' for i, v in ws))
            w = writes[0]
            if len(writes) == 1:
                st['write'] = {'dest': w.data[0], 'value': w.data[1]}
        if pops:
            note_bits.append(f'Lấy {_fmt(pops[0].data[1])} khỏi cấu trúc')
            if len(pops) == 1:
                st['pop'] = pops[0].data[0]
        if stks:
            st['stk'] = stks[-1].data[0]
            if not note_bits:
                note_bits.append(f'Stack: {stks[-1].data[0]}')
        if nodes:
            rw = nodes[0].data
            # hiển thị bằng GIÁ TRỊ node (khớp với cây hiển thị) thay vì id BFS
            nodeid = rw[1]
            nval = None
            if self._tree_nodes and nodeid in self._tree_nodes:
                nval = object.__getattribute__(self._tree_nodes[nodeid], 'value')
            ntxt = f'(nút {_fmt(nval)})' if nval is not None else f'#{nodeid}'
            if rw[0] == 'read':
                valtxt = f' = {_fmt(rw[3])}' if len(rw) > 3 and rw[3] is not None else ''
                note_bits.append(f'Đọc {ntxt}.{rw[2]}{valtxt}')
                st['read'] = (st.get('read') or []) + [{'target': {'node': nodeid}, 'value': rw[3] if len(rw) > 3 else None, 'field': rw[2]}]
            else:
                note_bits.append(f'node #{rw[1]}.{rw[2]} ← {_fmt(rw[3])}')
                st['write'] = {'dest': {'node': rw[1], 'field': rw[2]}, 'value': _js(rw[3])}
        if ptrs:
            st['ptr'] = {name: _js(val) for name, val in ptrs[0].data}
            note_bits.append('; '.join(f'{name}→{_fmt(v)}' for name, v in ptrs[0].data[:2]))

        if not note_bits:
            note = src if src and src != ':' else '(rẽ nhánh / vòng lặp)'
        else:
            note = '; '.join(note_bits) + (' — ' + src if src and src not in note_bits else '')
            if len(note) > 230:
                note = note[:227] + '…'
        st['note'] = note
        st['line'] = ln
        return st

    @staticmethod
    def _detect_swaps(evs):
        reads = [e for e in evs if e.kind == 'read' and not isinstance(e.data[0], str) and not isinstance(e.data[0], slice)]
        writes = [e for e in evs if e.kind == 'write' and not isinstance(e.data[0], str) and not isinstance(e.data[0], (slice, list))]
        if len(reads) >= 2 and len(writes) == 2:
            ra, rb = reads[0].data[0], reads[1].data[0]
            wa, wb = writes[0].data[0], writes[1].data[0]
            if isinstance(ra, int) and isinstance(rb, int) and ra != rb and {wa, wb} == {ra, rb}:
                return [(ra, rb)]
        return []

    def _err(self, stage, msg):
        return {'error': stage, 'trace': msg[-3000:]}

    def _serialize_node(self, head):
        """Tuần tự hoá head theo kind (tree → BFS, ll → chuỗi next).
        Quan trọng: phân biệt bằng self.kind, KHÔNG bằng việc left có None hay không
        (cây sau flatten có thể toàn left=None nhưng vẫn là cây)."""
        # Phân biệt cây hay list: kind ưu tiên, nhưng nếu kind không phải tree
        # mà node có left/right thật (vd 654 trả cây với kind=array), vẫn BFS.
        l = object.__getattribute__(head, 'left') if hasattr(head, 'left') else None
        r = object.__getattribute__(head, 'right') if hasattr(head, 'right') else None
        is_tree = (self.kind == 'tree') or (l is not None or r is not None)
        if is_tree:
            order = []
            q = [head]; vi = set()
            while q:
                nd = q.pop(0)
                if nd is None:
                    continue
                vi.add(id(nd))
                order.append(object.__getattribute__(nd, 'value'))
                l = object.__getattribute__(nd, 'left'); r = object.__getattribute__(nd, 'right')
                q.append(l)
                q.append(r)
            return order
        # kind ll (hoặc default): chuỗi next
        order = []
        seen = set()
        cur = head
        while cur is not None and id(cur) not in seen:
            seen.add(id(cur))
            order.append(object.__getattribute__(cur, 'value'))
            cur = object.__getattribute__(cur, 'next')
        return order


def _fmt_widx(i):
    if isinstance(i, str):
        return i
    if isinstance(i, list):
        return f'[{i[0]},{i[1]}]'
    if isinstance(i, slice):
        return 'slice'
    return str(i)


# =============================== selftest ==================================

SELF_SWAP = """
def remove_element(nums, val):
    l, r = 0, len(nums) - 1
    while l <= r:
        if nums[l] == val:
            nums[l], nums[r] = nums[r], nums[l]
            r -= 1
        else:
            l += 1
    return l
"""

SELF_MAT = """
def transpose(grid):
    m, n = len(grid), len(grid[0])
    out = [[0] * m for _ in range(n)]
    for i in range(m):
        for j in range(n):
            out[j][i] = grid[i][j]
    return out
"""

SELF_LL = """
def rev(head):
    prev = None
    cur = head
    while cur:
        nxt = cur.next
        cur.next = prev
        prev = cur
        cur = nxt
    return prev
"""

SELF_TREE = """
def inorder(root):
    out = []
    def dfs(node):
        if not node:
            return
        dfs(node.left)
        out.append(node.value)
        dfs(node.right)
    dfs(root)
    return out
"""

SELF_HASH = """
def two_sum(nums, target):
    seen = {}
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i
    return []
"""


def selftest():
    # 1) swap
    tr = Tracer(SELF_SWAP, {'kind': 'array', 'display': 'nums', 'ptrs': ['l', 'r'], 'expected': 2})
    steps = tr.run({'nums': [3, 2, 2, 3], 'val': 3})
    assert not isinstance(steps, dict), steps
    assert any('Đổi chỗ' in s['note'] for s in steps), 'thiếu note swap'
    assert all(s.get('array') is not None for s in steps), 'thiếu snapshot array'
    print(f'[1] swap OK ({len(steps)} step)')
    # 2) mat
    tr2 = Tracer(SELF_MAT, {'kind': 'mat', 'display': 'grid', 'ptrs': ['i', 'j']})
    steps2 = tr2.run({'grid': [[1, 2], [3, 4]]})
    assert not isinstance(steps2, dict), steps2
    print(f'[2] mat OK ({len(steps2)} step)')
    # 3) linked list
    tr3 = Tracer(SELF_LL, {'kind': 'll', 'display': 'head', 'param_kinds': {'head': 'll'}})
    steps3 = tr3.run({'head': [1, 2, 3, 4]})
    assert not isinstance(steps3, dict), steps3
    assert all('ll' in s for s in steps3), 'thiếu snapshot ll'
    print(f'[3] ll OK ({len(steps3)} step)')
    # 4) tree (in-order) — đệ quy: mong đợi snapshot tree tồn tại (đệ quy vẫn chụp)
    tr4 = Tracer(SELF_TREE, {'kind': 'tree', 'display': 'root', 'param_kinds': {'root': 'tree'}})
    steps4 = tr4.run({'root': [4, 2, 6, 1, 3]})
    assert not isinstance(steps4, dict), steps4
    # 5) hash (two_sum với seen dict) — có snapshot hash?
    tr5 = Tracer(SELF_HASH, {'kind': 'hash', 'display': 'seen', 'ptrs': ['i', 'x'], 'expected': [0, 1]})
    steps5 = tr5.run({'nums': [2, 7, 11, 15], 'target': 9})
    assert not isinstance(steps5, dict), steps5
    has_hash = any('hash' in s for s in steps5)
    print(f'[4] tree OK ({len(steps4)} step) | [5] hash OK ({len(steps5)} step, hash-snap={has_hash})')
    print('SELFTEST OK')
    return 0


def main():
    arg = sys.argv[1] if len(sys.argv) > 1 else ''
    if arg == '--selftest':
        sys.exit(selftest())
    if arg == '--all':
        run_all()
        return
    print('usage: python3 gen/tracer.py --selftest | --all')
    sys.exit(2)


def run_all():
    import glob
    cache = {}
    report = {'ok': 0, 'fail': 0, 'total_steps': 0, 'errors': []}
    files = sorted(glob.glob(os.path.join(PROBLEMS_DIR, 'problems', '*.json')))
    for f in files:
        try:
            data = json.load(open(f, encoding='utf8'))
        except Exception as e:
            report['errors'].append(f'{os.path.basename(f)}: đọc lỗi {e}')
            continue
        for p in data.get('problems', []):
            for ap in p.get('approaches', []):
                tcex = ap.get('tcex')
                if not tcex or not isinstance(tcex.get('input'), dict):
                    continue
                tr = Tracer(ap['code'], tcex)
                steps = tr.run(tcex['input'])
                key = f'{p.get("no")}::{ap.get("name")}'
                if isinstance(steps, dict) and 'error' in steps:
                    report['fail'] += 1
                    report['errors'].append(f'{key}: {steps["error"]} — {steps.get("trace", "")[:200]}'.replace('\n', ' '))
                    cache[key] = {'error': steps['error'], 'trace': steps.get('trace', '')}
                elif isinstance(steps, list) and len(steps) > 0:
                    # chuẩn hoá answer: node → giá trị/chuỗi serialize (tránh TNode không json hóa)
                    try:
                        clean = []
                        for st in steps:
                            s2 = dict(st)
                            a = s2.get('answer')
                            if isinstance(a, TNode):
                                s2['answer'] = self_serialize(a)
                            elif isinstance(a, list):
                                s2['answer'] = [self_serialize(x) if isinstance(x, TNode) else x for x in a]
                            clean.append(s2)
                        json.dumps({'steps': clean})  # kiểm tra serialize được
                        steps = clean
                    except Exception:
                        report['fail'] += 1
                        report['errors'].append(f'{key}: answer không serialize được')
                        continue
                    report['ok'] += 1
                    report['total_steps'] += len(steps)
                    cache[key] = {'steps': steps, 'kind': tcex.get('kind', 'array'),
                                  'anim': tcex.get('anim', True)}
                else:
                    report['fail'] += 1
                    report['errors'].append(f'{key}: steps rỗng')
    os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
    json.dump(cache, open(CACHE_FILE, 'w', encoding='utf8'), ensure_ascii=False)
    json.dump(report, open(REPORT_FILE, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print(f'TRACE: ok={report["ok"]} fail={report["fail"]} steps={report["total_steps"]}')
    for e in report['errors'][:40]:
        print('  !', e)


if __name__ == '__main__':
    main()