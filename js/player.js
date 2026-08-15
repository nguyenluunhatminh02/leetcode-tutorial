/*
 * player.js v2 — trình phát animation đa cấu trúc.
 * Nhận trace (array các step), tự quyết định cách vẽ theo nội dung step:
 *   - array  : dãy ô ngang, highlight read/write/swap + con trỏ tên
 *   - mat    : lưới 2 chiều, read/write [r,c], con trỏ giá trị
 *   - tree   : cây nhị phân (nodes id/value/left/right), highlight node
 *   - ll     : linked list ngang nút (→ next)
 *   - stack  : ngăn xếp dọc (append từ trên)
 *   - hash   : bảng băm (caption + giá trị)
 *   - cPick  : browser picker cho `step.pick`/`step.choose`
 * Điều khiển bằng tay: ⏮ ◀ ▶ ⏭ + thanh trượt; không auto-play.
 * Bàn phím trong phạm vi player: ← → Home End.
 */
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

function pickObject(step) {
  if (step.array !== undefined) return { kind: 'array', data: step.array, mk: v => String(v) };
  if (step.mat !== undefined) return { kind: 'mat', data: step.mat, cells: step.mat.flat(), mk: v => String(v) };
  if (step.ll !== undefined) return { kind: 'll', data: step.ll };
  if (step.tree !== undefined) return { kind: 'tree', data: step.tree };
  if (step.stack !== undefined) return { kind: 'stack', data: step.stack };
  if (step.hash !== undefined) return { kind: 'hash', data: step.hash };
  if (step.mtx !== undefined) return { kind: 'mat', data: step.mtx };
  return null;
}

function isNodeTarget(t) { return t && typeof t === 'object' && 'node' in t; }

class Player {
  constructor(host, steps, cfg) {
    this.host = host;
    this.steps = steps;
    this.cfg = cfg || {};
    this.idx = 0;

    this.ctl = el('div', 'ctl');
    this.note = el('p', 'note');
    this.wrap = el('div', 'cells-wrap');
    this.box = el('div', 'cells');
    this.ptrLayer = el('div', 'ptrs');
    this.wrap.appendChild(this.box);
    this.wrap.appendChild(this.ptrLayer);
    this.auxBox = el('div', 'aux');
    this.auxBox.style.display = 'none';

    this.cellEls = [];
    this.ptrEls = new Map();

    const first = steps[0];
    const po = pickObject(first) || { kind: 'array', data: [], mk: String };
    this.kind = po.kind;
    this.mkvalue = po.mk;

    this.buildCells(po);
    this.buildPtrs();
    this.buildControls();
    this.stepTo(0);

    host.appendChild(this.ctl);
    host.appendChild(this.note);
    host.appendChild(this.wrap);
    host.appendChild(this.auxBox);
  }

  /* ---------- dựng khung ---------- */
  buildCells(po) {
    const kind = this.kind;
    if (kind === 'mat') {
      const m = po.data;
      m.forEach((row, r) => {
        const rowDiv = el('div', 'mrow');
        row.forEach((v, c) => {
          const d = el('div', 'cell mcell');
          d.appendChild(el('span', 'cv', this.mkvalue(v)));
          d.appendChild(el('span', 'ci', `${r},${c}`));
          rowDiv.appendChild(d);
          this.cellEls.push(d);
        });
        this.box.appendChild(rowDiv);
      });
      this.box.classList.add('mat');
      return;
    }
    if (kind === 'll' || kind === 'tree') {
      return; // vẽ trong stepTo (theo nodes)
    }
    if (kind === 'stack') {
      const arr = po.data;
      arr.forEach(v => {
        const d = el('div', 'cell scol');
        d.appendChild(el('span', 'cv', this.mkvalue(v)));
        this.cellEls.push(d);
        this.box.appendChild(d);
      });
      this.box.classList.add('stack');
      return;
    }
    if (kind === 'hash') {
      // dựng từ chính step đầu: data = [ [k,v], ... ] hoặc object
      const pairs = Array.isArray(po.data) ? po.data : Object.entries(po.data || {});
      pairs.forEach(([k, v]) => {
        const d = el('div', 'hpair');
        d.appendChild(el('span', 'hk', String(k)));
        d.appendChild(el('span', 'hv', String(v)));
        this.cellEls.push(d); // để highlight
        this.box.appendChild(d);
      });
      this.box.classList.add('hash');
      return;
    }
    // array (mặc định)
    (po.data || []).forEach((v, i) => {
      const d = el('div', 'cell');
      d.appendChild(el('span', 'cv', this.mkvalue(v)));
      d.appendChild(el('span', 'ci', String(i)));
      this.cellEls.push(d);
      this.box.appendChild(d);
    });
  }

  buildPtrs() {
    const names = new Set();
    for (const s of this.steps) {
      if (s.ptr) Object.keys(s.ptr).forEach(x => names.add(x));
    }
    names.forEach(name => {
      const p = el('span', 'ptr', name);
      p.style.display = 'none';
      this.ptrLayer.appendChild(p);
      this.ptrEls.set(name, p);
    });
  }

  buildControls() {
    const bar = this.ctl;
    const mk = (t, fn, title) => { const b = el('button', 'btn', t); b.title = title || ''; b.onclick = fn; bar.appendChild(b); return b; };
    mk('⏮', () => this.stepTo(0), 'Về đầu');
    mk('◀', () => this.stepTo(this.idx - 1), 'Lùi 1 bước');
    mk('>', () => this.stepTo(this.idx + 1), 'Tiến 1 bước');
    mk('⏭', () => this.stepTo(this.steps.length - 1), 'Tới cuối');
    this.counter = el('span', 'sp', '');
    bar.appendChild(this.counter);
    this.range = el('input', 'rng');
    this.range.type = 'range';
    this.range.min = 0;
    this.range.max = Math.max(0, this.steps.length - 1);
    this.range.value = 0;
    this.range.oninput = () => this.stepTo(+this.range.value);
    bar.appendChild(this.range);

    // bàn phím
    this.keydown = e => {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.key === 'ArrowLeft') { this.stepTo(this.idx - 1); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { this.stepTo(this.idx + 1); e.preventDefault(); }
      else if (e.key === 'Home') { this.stepTo(0); e.preventDefault(); }
      else if (e.key === 'End') { this.stepTo(this.steps.length - 1); e.preventDefault(); }
    };
    this.host.addEventListener('keydown', this.keydown);
    this.host.tabIndex = 0;
  }
  next() { this.stepTo(this.idx + 1); }

  /* ---------- render ---------- */
  stepTo(i) {
    this.idx = Math.max(0, Math.min(this.steps.length - 1, i));
    const s = this.steps[this.idx];
    if (this.kind === 'll' || this.kind === 'tree') this.renderNodes(s);
    else this.renderCells(s);
    this.renderAux(s);
    this.renderNote(s);
    this.counter.textContent = (this.idx + 1) + ' / ' + this.steps.length;
    this.range.value = this.idx;
  }

  posToTarget(readTarget, idx) {
    // chuyển read target ([i] / [r,c] / {node}) thành index cell
    const t = readTarget;
    if (Array.isArray(t)) {
      if (this.kind === 'mat') { const [r, c] = t; return r * this.width() + c; }
      return t[0];
    }
    if (isNodeTarget(t)) return t.node;
    return -1;
  }
  width() { // số cột hiện tại (mat)
    const m = this.firstMat && this.firstMat.length || 1;
    return this._w || 1;
  }

  cellsBase(step) {
    // flat dữ liệu + đánh dấu read/write/swap
    let flat = [], blues = [];
    const arrLike = step.array || (this.kind === 'mat' && step.mat);
    if (arrLike) flat = arrLike.flat();
    else if (step.stack) flat = step.stack;
    else if (step.hash) flat = step.hash;
    else if (step.cells) flat = step.cells.map(c => (c && c.value !== undefined ? c.value : c));
    else if (this.firstCells) flat = this.firstCells;
    // map index → highlight
    const hl = {};
    if (sIndex(step.read)) step.read.forEach(r => { const p = this.posToTarget(r, idxPos(r)); if (p >= 0) hl[p] = 'rd'; });
    // ...
    return { flat, hl, blue: blues };
  }
}