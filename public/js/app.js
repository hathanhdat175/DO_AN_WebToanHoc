/* =====================================================================
   Giao diện Góc Tứ Giác (một trang, không cần framework)
   - 6 màn hình học sinh: Đăng nhập, Lý thuyết, Vẽ hình, Luyện tập, Kiểm tra, Tiến độ
   - 4 màn hình quản lý: Bài học, Bài tập, Bài kiểm tra, Học sinh và tài khoản
   Mọi dữ liệu lấy từ máy chủ qua Api (api.js); công thức hình học nằm ở geometry.js.
   ===================================================================== */
const { fmt } = Geometry;
const app = document.getElementById('app');
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const when = t => { const d = new Date(t); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const clock = s => `${pad(Math.floor(s / 60))}:${pad(Math.floor(s % 60))}`;

const ROLE = { hs: 'Học sinh', gv: 'Giáo viên', qt: 'Quản trị viên' };
const LEVEL = { 1: 'Nhận biết', 2: 'Thông hiểu', 3: 'Vận dụng' };
const VIEWS = [
  { id: 'lythuyet', label: 'Lý thuyết', group: 'Học tập' },
  { id: 'hinhve', label: 'Vẽ hình', group: 'Học tập' },
  { id: 'luyentap', label: 'Luyện tập', group: 'Học tập' },
  { id: 'kiemtra', label: 'Kiểm tra', group: 'Học tập' },
  { id: 'tiendo', label: 'Tiến độ', group: 'Học tập' },
  { id: 'ql-baihoc', label: 'Bài học', group: 'Quản lý', roles: ['gv', 'qt'] },
  { id: 'ql-baitap', label: 'Bài tập', group: 'Quản lý', roles: ['gv', 'qt'] },
  { id: 'ql-kiemtra', label: 'Bài kiểm tra', group: 'Quản lý', roles: ['gv', 'qt'] },
  { id: 'ql-hocsinh', label: 'Học sinh', group: 'Quản lý', roles: ['gv', 'qt'] },
];
const BOARD = { W: 12, H: 9, fitW: 10, fitH: 7 }, U = 40;

// Trạng thái của giao diện. S.data là dữ liệu máy chủ trả về cho màn hình đang mở.
const S = {
  me: null, topics: [], view: 'lythuyet', data: null, error: '', alert: '', flash: '', ticket: 0,
  authTab: 'dangnhap', authErr: '',
  topic: 'hinh-binh-hanh', lesson: null, q: '', search: null,
  tool: { type: 'hinh-binh-hanh', vals: { ...Geometry.SHAPES['hinh-binh-hanh'].def }, pts: [], k: 1, err: '' },
  ex: { topic: '', level: '', open: null, fb: null, err: '' },
  exam: null, examResult: null,
  form: null, confirm: null, editProfile: false, cypher: null, manageTopic: '',
};

/* ---------- Tải dữ liệu cho từng màn hình ---------- */
const LOAD = {
  async lythuyet() {
    const [topics, pack] = await Promise.all([Api.get('/topics'), Api.get(`/topics/${S.topic}/lessons`)]);
    S.topics = topics;
    return pack;
  },
  hinhve: async () => ({}),
  luyentap: () => Api.get(`/exercises?topic=${encodeURIComponent(S.ex.topic)}&level=${encodeURIComponent(S.ex.level)}`),
  kiemtra: () => Api.get('/tests'),
  tiendo: () => Api.get('/me/progress'),
  'ql-baihoc': () => Api.get('/manage/lessons'),
  'ql-baitap': () => Api.get('/manage/exercises?topic=' + encodeURIComponent(S.manageTopic)),
  'ql-kiemtra': async () => {
    const [tests, exercises] = await Promise.all([Api.get('/manage/tests'), Api.get('/manage/exercises')]);
    return { tests, exercises };
  },
  'ql-hocsinh': async () => {
    const d = await Api.get('/manage/students');
    if (S.me.role === 'qt') [d.users, d.stats] = await Promise.all([Api.get('/admin/users'), Api.get('/admin/stats')]);
    return d;
  },
};
const viewOf = id => VIEWS.find(v => v.id === id) || VIEWS[0];
const allowed = v => !v.roles || v.roles.includes(S.me.role);

// Phiên hết hạn hoặc tài khoản bị xóa: quay về màn hình đăng nhập.
function expired(e) {
  if (e.status !== 401) return false;
  Api.setToken(''); S.me = null; S.exam = null; S.examResult = null; S.authErr = e.message; render();
  return true;
}
async function refresh() {
  const ticket = ++S.ticket, view = viewOf(S.view);
  if (!allowed(view)) { S.data = null; render(); return; }
  try {
    if (!S.topics.length) S.topics = await Api.get('/topics');
    const data = await LOAD[view.id]();
    if (ticket !== S.ticket) return;
    S.data = data; S.error = '';
  } catch (e) {
    if (ticket !== S.ticket || expired(e)) return;
    S.data = null; S.error = e.message;
  }
  render();
}
async function go(view) {
  S.view = view; S.flash = ''; S.alert = ''; S.error = ''; S.form = null; S.confirm = null; S.editProfile = false; S.data = null; S.cypher = null;
  try { history.replaceState(null, '', '#' + view); } catch (e) {}
  render();
  await refresh();
}

/* ---------- Hình vẽ ---------- */
const GLYPH = { 'tu-giac': '12,24 70,10 90,62 26,88', 'hinh-thang': '30,26 64,26 92,76 8,76', 'hinh-binh-hanh': '30,26 95,26 70,76 5,76', 'hinh-chu-nhat': '8,26 92,26 92,76 8,76', 'hinh-thoi': '50,16 94,50 50,84 6,50', 'hinh-vuong': '20,20 80,20 80,80 20,80' };
GLYPH['tu-do'] = GLYPH['tu-giac'];
const glyph = (k, size = 28) => `<svg class="glyph" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true"><polygon points="${GLYPH[k] || GLYPH['tu-giac']}"/></svg>`;
const KIND = {
  'hinh-vuong': ['hình vuông', 'bốn góc vuông và bốn cạnh bằng nhau'], 'hinh-chu-nhat': ['hình chữ nhật', 'bốn góc vuông'],
  'hinh-thoi': ['hình thoi', 'bốn cạnh bằng nhau'], 'hinh-binh-hanh': ['hình bình hành', 'các cạnh đối song song'],
  'hinh-thang-can': ['hình thang cân', 'hai cạnh đối song song và hai góc kề một đáy bằng nhau'],
  'hinh-thang-vuong': ['hình thang vuông', 'hai cạnh đối song song và có một góc vuông'],
  'hinh-thang': ['hình thang', 'chỉ một cặp cạnh đối song song'], 'tu-giac-loi': ['tứ giác lồi', 'không có cặp cạnh đối nào song song'],
  'tu-giac-lom': ['tứ giác lõm', 'có một góc lớn hơn 180°'],
};
// Hình mẫu cho từng chủ đề, vẽ trên giấy 10 × 7 ô
const SAMPLE = {
  'tu-giac': [[2, 5.5], [7, 6], [8.5, 2], [1.5, 1]], 'hinh-thang': [[3, 5.5], [6.5, 5.5], [8.5, 1.5], [1.5, 1.5]],
  'hinh-binh-hanh': [[3, 5.5], [8.5, 5.5], [7, 1.5], [1.5, 1.5]], 'hinh-chu-nhat': [[2, 5.5], [8, 5.5], [8, 1.5], [2, 1.5]],
  'hinh-thoi': [[5, 6.5], [8.5, 3.5], [5, 0.5], [1.5, 3.5]], 'hinh-vuong': [[3, 5.5], [7, 5.5], [7, 1.5], [3, 1.5]],
};
// Vẽ tứ giác ABCD: cạnh, đường chéo, dấu góc vuông, vạch cạnh bằng nhau, nhãn đỉnh, số đo cạnh, chấm kéo đỉnh
function figure(pts, o) {
  const k = o.k || 1, P = pts.map(p => ({ x: p.x / k * U, y: (o.H - p.y / k) * U }));
  const c = { x: P.reduce((s, p) => s + p.x, 0) / 4, y: P.reduce((s, p) => s + p.y, 0) / 4 };
  const unit = (a, b) => { const d = Math.hypot(a.x - b.x, a.y - b.y) || 1; return { x: (a.x - b.x) / d, y: (a.y - b.y) / d }; };
  const n1 = x => x.toFixed(1), ok = Geometry.isSimple(pts);
  let s = `<polygon class="fig-poly${ok ? '' : ' bad'}" points="${P.map(p => n1(p.x) + ',' + n1(p.y)).join(' ')}"/>`;
  if (ok) {
    if (o.diag && Geometry.isConvex(pts)) {
      s += `<line class="fig-diag" x1="${n1(P[0].x)}" y1="${n1(P[0].y)}" x2="${n1(P[2].x)}" y2="${n1(P[2].y)}"/><line class="fig-diag" x1="${n1(P[1].x)}" y1="${n1(P[1].y)}" x2="${n1(P[3].x)}" y2="${n1(P[3].y)}"/>`;
      if (o.center) s += `<text class="fig-v" x="${n1(c.x)}" y="${n1(c.y + 20)}">O</text>`;
    }
    Geometry.angles(pts).forEach((a, i) => {
      if (Math.abs(a - 90) > 0.01) return;
      const v = P[i], u1 = unit(P[(i + 3) % 4], v), u2 = unit(P[(i + 1) % 4], v), r = 11;
      s += `<path class="fig-right" d="M${n1(v.x + u1.x * r)} ${n1(v.y + u1.y * r)}L${n1(v.x + (u1.x + u2.x) * r)} ${n1(v.y + (u1.y + u2.y) * r)}L${n1(v.x + u2.x * r)} ${n1(v.y + u2.y * r)}"/>`;
    });
    const len = Geometry.sides(pts), used = [false, false, false, false]; let group = 0;
    for (let i = 0; i < 4; i++) {
      if (used[i]) continue;
      const g = [i]; for (let j = i + 1; j < 4; j++) if (!used[j] && Math.abs(len[i] - len[j]) < 1e-7 * Math.max(...len)) g.push(j);
      if (g.length < 2) continue;
      group++;
      g.forEach(gi => {
        used[gi] = true;
        const a = P[gi], b = P[(gi + 1) % 4], m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, t = unit(b, a), n = { x: -t.y, y: t.x };
        for (let q = 0; q < group; q++) { const off = (q - (group - 1) / 2) * 5; s += `<line class="fig-tick" x1="${n1(m.x + t.x * off - n.x * 6)}" y1="${n1(m.y + t.y * off - n.y * 6)}" x2="${n1(m.x + t.x * off + n.x * 6)}" y2="${n1(m.y + t.y * off + n.y * 6)}"/>`; }
      });
    }
    if (o.lens) len.forEach((L, i) => {
      const a = P[i], b = P[(i + 1) % 4], m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, t = unit(b, a); let n = { x: -t.y, y: t.x };
      if ((m.x - c.x) * n.x + (m.y - c.y) * n.y < 0) n = { x: -n.x, y: -n.y };
      s += `<text class="fig-len" x="${n1(m.x + n.x * 20)}" y="${n1(m.y + n.y * 17)}">${fmt(L)}</text>`;
    });
  }
  P.forEach((p, i) => { const d = unit(p, c); s += `<text class="fig-v" x="${n1(p.x + d.x * 20)}" y="${n1(p.y + d.y * 20)}">${'ABCD'[i]}</text>`; });
  if (o.handles) P.forEach((p, i) => { s += `<circle class="fig-dot" cx="${n1(p.x)}" cy="${n1(p.y)}" r="6.5"/><circle class="handle" data-i="${i}" cx="${n1(p.x)}" cy="${n1(p.y)}" r="24"/>`; });
  return s;
}
const board = (id, W, H, inner, label) => `<div class="board"><svg id="${id}" viewBox="0 0 ${W * U} ${H * U}" role="img" aria-label="${esc(label)}"><defs><pattern id="${id}-g" width="${U}" height="${U}" patternUnits="userSpaceOnUse"><path class="grid-line" d="M${U} 0H0V${U}"/></pattern></defs><rect class="grid-bg" width="100%" height="100%"/><rect width="100%" height="100%" fill="url(#${id}-g)"/><g id="${id}-in">${inner}</g></svg></div>`;

/* ---------- Thành phần dùng chung ---------- */
const field = (id, label, control, hint) => `<div class="field"><label for="${id}">${label}</label>${control}${hint ? `<small>${hint}</small>` : ''}</div>`;
const lvl = n => `<span class="lvl">${[1, 2, 3].map(i => `<i${i <= n ? ' class="on"' : ''}></i>`).join('')}<span>${LEVEL[n] || ''}</span></span>`;
const topicOptions = (sel, all) => (all ? `<option value="">${all}</option>` : '') + S.topics.map(t => `<option value="${t.id}"${t.id === sel ? ' selected' : ''}>${esc(t.name)}</option>`).join('');
const ansText = ex => ex.kind === 'chon' ? 'ABCD'[ex.answer] : `${fmt(ex.answer)}${ex.unit === '°' ? '°' : ex.unit ? ' ' + ex.unit : ''}`;
const givenText = (kind, raw) => raw === '' || raw == null ? 'bỏ trống' : kind === 'chon' ? ('ABCD'[+raw] || String(raw)) : String(raw);
const delBtn = (key, id, act = 'del', kind = '') => S.confirm === key
  ? `<button class="btn danger sm" data-act="${act}" data-id="${id}" data-kind="${kind}">Chắc chắn xóa</button> <button class="btn ghost sm" data-act="unconfirm">Giữ lại</button>`
  : `<button class="btn ghost sm" data-act="confirm" data-key="${key}">Xóa</button>`;
const logo = `<svg width="30" height="26" viewBox="0 0 30 26" aria-hidden="true"><polygon points="9,4 27,4 21,22 3,22"/><circle cx="9" cy="4" r="2.4"/><circle cx="27" cy="4" r="2.4"/><circle cx="21" cy="22" r="2.4"/><circle cx="3" cy="22" r="2.4"/></svg>`;
const flashLine = () => S.flash ? `<p class="okmsg" role="status">${esc(S.flash)}</p>` : '';

/* ---------- Màn hình 1: Đăng nhập / Đăng ký ---------- */
function viewAuth() {
  const login = S.authTab === 'dangnhap';
  return `<div class="auth">
    <section class="auth-intro">
      <div class="brand">${logo}<span>Góc Tứ Giác</span></div>
      <h1>Học tứ giác bằng cách vẽ, đo và thử.</h1>
      <p class="lede">Dành cho học sinh lớp 6 đến lớp 9: lý thuyết sáu loại tứ giác, công cụ vẽ hình trên giấy ô li, bài tập có lời giải và bài kiểm tra chấm điểm ngay.</p>
      <div class="glyph-row">${Object.keys(SAMPLE).map(k => glyph(k, 44)).join('')}</div>
    </section>
    <section class="auth-card card">
      <div class="tabs" role="tablist">
        <button role="tab" aria-selected="${login}" data-act="authTab" data-tab="dangnhap">Đăng nhập</button>
        <button role="tab" aria-selected="${!login}" data-act="authTab" data-tab="dangky">Đăng ký</button>
      </div>
      ${S.authErr ? `<p class="err" role="alert">${esc(S.authErr)}</p>` : ''}
      ${login ? `<form class="form" data-form="login" novalidate>
        ${field('li-email', 'Email', '<input id="li-email" name="email" type="email" autocomplete="username">')}
        ${field('li-pass', 'Mật khẩu', '<input id="li-pass" name="password" type="password" autocomplete="current-password">')}
        <button class="btn">Đăng nhập</button>
      </form>` : `<form class="form" data-form="register" novalidate>
        ${field('rg-name', 'Họ và tên', '<input id="rg-name" name="name" type="text" autocomplete="name">')}
        ${field('rg-email', 'Email', '<input id="rg-email" name="email" type="email" autocomplete="email">')}
        <div class="row">${field('rg-pass', 'Mật khẩu', '<input id="rg-pass" name="password" type="password" autocomplete="new-password">', 'Ít nhất 6 ký tự')}
        ${field('rg-lop', 'Lớp', '<input id="rg-lop" name="lop" type="text" placeholder="8A">')}</div>
        <button class="btn">Tạo tài khoản học sinh</button>
        <p class="cap">Tài khoản mới luôn là học sinh. Quyền giáo viên do quản trị viên cấp.</p>
      </form>`}
      <div class="demo">
        <p class="cap">Tài khoản mẫu (có sau khi chạy <code>npm run seed</code>), mật khẩu chung là 123456:</p>
        <div class="actions">
          <button class="btn ghost sm" data-act="demo" data-email="an@hocsinh.example">Học sinh</button>
          <button class="btn ghost sm" data-act="demo" data-email="lan@giaovien.example">Giáo viên</button>
          <button class="btn ghost sm" data-act="demo" data-email="admin@truong.example">Quản trị viên</button>
        </div>
      </div>
    </section>
  </div>`;
}

/* ---------- Màn hình 2: Lý thuyết ---------- */
const wide = matchMedia('(min-width: 1100px)');
// Ngắt một nhãn thành hai dòng cân nhau
function twoLines(text) {
  const w = text.split(' '); let best = 1, diff = Infinity;
  for (let i = 1; i < w.length; i++) { const d = Math.abs(w.slice(0, i).join(' ').length - w.slice(i).join(' ').length); if (d < diff) { diff = d; best = i; } }
  return w.length < 2 ? [text] : [w.slice(0, best).join(' '), w.slice(best).join(' ')];
}
function familyGraph() {
  const H = wide.matches;
  const pos = H
    ? { 'tu-giac': [64, 145], 'hinh-thang': [254, 145], 'hinh-binh-hanh': [444, 145], 'hinh-chu-nhat': [644, 62], 'hinh-thoi': [644, 228], 'hinh-vuong': [872, 145] }
    : { 'tu-giac': [190, 50], 'hinh-thang': [190, 170], 'hinh-binh-hanh': [190, 290], 'hinh-chu-nhat': [85, 420], 'hinh-thoi': [295, 420], 'hinh-vuong': [190, 570] };
  // Vị trí vẽ từng mũi tên "hình tổng quát > hình đặc biệt": [điểm đầu, điểm cuối, x nhãn, y nhãn, neo, số dòng]
  const place = H ? {
    'tu-giac>hinh-thang': [[120, 145], [198, 145], 159, 118, 'middle', 2],
    'hinh-thang>hinh-binh-hanh': [[310, 145], [388, 145], 349, 118, 'middle', 2],
    'hinh-binh-hanh>hinh-chu-nhat': [[500, 132], [588, 76], 538, 90, 'end', 1],
    'hinh-binh-hanh>hinh-thoi': [[500, 160], [588, 216], 538, 214, 'end', 1],
    'hinh-chu-nhat>hinh-vuong': [[700, 76], [816, 132], 764, 90, 'start', 1],
    'hinh-thoi>hinh-vuong': [[700, 216], [816, 160], 764, 214, 'start', 1],
  } : {
    'tu-giac>hinh-thang': [[190, 98], [190, 126], 202, 116, 'start', 1],
    'hinh-thang>hinh-binh-hanh': [[190, 218], [190, 246], 202, 236, 'start', 1],
    'hinh-binh-hanh>hinh-chu-nhat': [[165, 338], [108, 376], 124, 352, 'end', 1],
    'hinh-binh-hanh>hinh-thoi': [[215, 338], [272, 376], 258, 346, 'start', 2],
    'hinh-chu-nhat>hinh-vuong': [[108, 468], [165, 526], 120, 502, 'end', 2],
    'hinh-thoi>hinh-vuong': [[272, 468], [215, 526], 260, 509, 'start', 1],
  };
  let s = '';
  // Các cạnh lấy từ quan hệ IS_A trong Neo4j: (hình đặc biệt)-[:IS_A {condition}]->(hình tổng quát)
  S.topics.forEach(t => (t.isA || []).forEach(rel => {
    const p = place[`${rel.to}>${t.id}`]; if (!p) return;
    const [a, b, lx, ly, anchor, nLines] = p;
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / d, uy = (b[1] - a[1]) / d, base = [b[0] - ux * 9, b[1] - uy * 9];
    const lines = nLines === 2 ? twoLines(rel.condition || '') : [rel.condition || ''];
    s += `<line class="fam-edge" x1="${a[0]}" y1="${a[1]}" x2="${base[0].toFixed(1)}" y2="${base[1].toFixed(1)}"/>`;
    s += `<polygon class="fam-arrow" points="${b[0]},${b[1]} ${(base[0] - uy * 4.5).toFixed(1)},${(base[1] + ux * 4.5).toFixed(1)} ${(base[0] + uy * 4.5).toFixed(1)},${(base[1] - ux * 4.5).toFixed(1)}"/>`;
    s += `<text class="fam-lab" text-anchor="${anchor}" x="${lx}" y="${ly}">${lines.map((x, i) => `<tspan x="${lx}" dy="${i ? 14 : 0}">${esc(x)}</tspan>`).join('')}</text>`;
  }));
  S.topics.forEach(t => {
    if (!pos[t.id]) return;
    const [x, y] = pos[t.id];
    s += `<g class="fam-node${t.id === S.topic ? ' sel' : ''}" data-act="topic" data-id="${t.id}" role="button" tabindex="0" aria-pressed="${t.id === S.topic}" aria-label="${esc(t.name)}${t.studied ? ', đã học' : ''}">
      <rect x="${x - 54}" y="${y - 44}" width="108" height="90" rx="10"/>
      <g transform="translate(${x - 28},${y - 40}) scale(.56)"><polygon points="${GLYPH[t.id]}"/></g>
      <text x="${x}" y="${y + 36}">${esc(t.name)}</text>
      ${t.studied ? `<circle class="done" cx="${x + 42}" cy="${y - 32}" r="8"/><text class="done-t" x="${x + 42}" y="${y - 32}">✓</text>` : ''}
    </g>`;
  });
  return `<div class="fam${H ? '' : ' tall'}"><svg viewBox="0 0 ${H ? '940 290' : '380 625'}" role="group" aria-label="Sơ đồ quan hệ giữa các loại tứ giác">${s}</svg></div>
    <p class="cap">Mũi tên đi từ hình tổng quát đến hình đặc biệt, kèm điều kiện cần thêm. Chọn một hình để xem bài học.</p>`;
}
function lessonBlock() {
  const topic = S.topics.find(t => t.id === S.topic) || { name: '' }, lessons = S.data.lessons || [], up = S.data.ancestors || [];
  if (!lessons.length) return `<div class="lesson"><p class="lede">Chủ đề ${esc(topic.name)} chưa có bài học. Giáo viên có thể thêm trong mục Quản lý.</p></div>`;
  const l = lessons.find(x => x.id === S.lesson) || lessons[0], pts = (SAMPLE[S.topic] || SAMPLE['tu-giac']).map(([x, y]) => ({ x, y }));
  const list = (title, items, cls) => items && items.length ? `<section><h3>${title}</h3><ul${cls ? ` class="${cls}"` : ''}>${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></section>` : '';
  const names = up.map(a => a.name.toLowerCase());
  const chain = names.length > 1 ? names.slice(0, -1).join(', ') + ' và ' + names[names.length - 1] : names[0];
  return `<article class="lesson">
    <div class="block">${board('lessonFig', 10, 7, figure(pts, { H: 7, diag: !['tu-giac', 'hinh-thang'].includes(S.topic), center: true }), 'Hình minh họa ' + topic.name)}
      <p class="cap">Vạch trên cạnh đánh dấu các cạnh bằng nhau, ô vuông đỏ đánh dấu góc vuông.</p></div>
    <div class="lesson-text">
      ${lessons.length > 1 ? `<div class="tabs">${lessons.map(x => `<button aria-pressed="${x.id === l.id}" data-act="lesson" data-id="${x.id}">${esc(x.title)}</button>`).join('')}</div>` : ''}
      <div><p class="eyebrow">${esc(topic.name)}${l.grade ? ' · ' + esc(l.grade) : ''}</p><h2>${esc(l.title)}</h2></div>
      <section><h3>Định nghĩa</h3><p>${esc(l.definition)}</p></section>
      ${list('Tính chất', l.traits)}${list('Dấu hiệu nhận biết', l.signs)}${list('Công thức', l.formulas, 'formulas')}
      ${names.length ? `<p class="cap">Theo quan hệ IS_A trong đồ thị, ${esc(topic.name.toLowerCase())} cũng là ${esc(chain)}.</p>` : ''}
      <div class="actions">
        ${l.studied ? '<span class="pill ok">Đã học</span>' : `<button class="btn" data-act="studied" data-id="${l.id}">Đánh dấu đã học</button>`}
        <button class="btn ghost" data-act="toTool">Vẽ hình này</button>
        <button class="btn ghost" data-act="toPractice">Luyện tập chủ đề này</button>
      </div>
    </div>
  </article>`;
}
function theoryBody() {
  if (S.search) {
    const { q, items, err } = S.search;
    if (err) return `<p class="err" role="alert">${esc(err)}</p>`;
    if (!items.length) return `<p class="lede">Không có bài học nào khớp với “${esc(q)}”. Thử từ khóa khác như “song song” hoặc “đường chéo”.</p>`;
    return `<p class="cap">${items.length} bài học khớp với “${esc(q)}”</p><ul class="results">${items.map(l => `<li><button data-act="openLesson" data-id="${l.id}" data-topic="${l.topicId}">${glyph(l.topicId, 34)}<span><b>${esc(l.title)}</b><small>${esc(l.definition.slice(0, 110))}${l.definition.length > 110 ? '…' : ''}</small></span></button></li>`).join('')}</ul>`;
  }
  return familyGraph() + lessonBlock();
}
function viewTheory() {
  return `<header class="vhead"><div><h1>Lý thuyết tứ giác</h1><p class="lede">Sáu chủ đề, đi từ tứ giác bất kì đến hình vuông.</p></div>
    ${field('q', 'Tìm bài học', `<input id="q" type="search" placeholder="Ví dụ: đường chéo, góc vuông" value="${esc(S.q)}" data-live="search">`)}</header>
    <div id="theoryBody" class="block" style="gap:18px">${theoryBody()}</div>`;
}
let searchTimer = null;
async function doSearch() {
  const q = S.q.trim();
  if (!q) S.search = null;
  else {
    try { S.search = { q, items: await Api.get('/lessons?q=' + encodeURIComponent(q)) }; }
    catch (e) { if (expired(e)) return; S.search = { q, items: [], err: e.message }; }
    if (q !== S.q.trim()) return; // người dùng đã gõ tiếp
  }
  const body = $('#theoryBody'); if (body) body.innerHTML = theoryBody();
}

/* ---------- Màn hình 3: Vẽ hình và tính toán (chạy hoàn toàn ở trình duyệt, dùng geometry.js) ---------- */
function toolRecalc() {
  const t = S.tool; if (t.type === 'tu-do') { t.err = ''; return; }
  const r = Geometry.build(t.type, t.vals, BOARD); t.err = r.error || '';
  if (!r.error) { t.pts = r.pts; t.k = r.k; t.v = r.v; }
}
function toolInputs() {
  const t = S.tool, types = [...Object.keys(Geometry.SHAPES), 'tu-do'];
  const name = k => k === 'tu-do' ? 'Tự do' : Geometry.SHAPES[k].name;
  return `<div class="field"><span class="lab">Loại tứ giác</span><div class="seg">${types.map(k => `<button aria-pressed="${k === t.type}" data-act="toolType" data-type="${k}">${glyph(k, 22)}${name(k)}</button>`).join('')}</div></div>
    ${t.type === 'tu-do' ? '<p class="cap">Chế độ tự do: kéo bốn đỉnh trên giấy, hệ thống đo cạnh, góc và nhận dạng loại hình.</p>'
      : `<div class="row">${Geometry.SHAPES[t.type].fields.map(([k, label]) => field('tv-' + k, label, `<div class="unit"><input id="tv-${k}" type="text" inputmode="decimal" value="${esc(t.vals[k] ?? '')}" data-live="tool" data-key="${k}"><span>cm</span></div>`)).join('')}</div>`}`;
}
function toolOut() {
  const t = S.tool;
  if (t.err) return `<p class="err" role="alert">${esc(t.err)}</p>`;
  const val = (x, u) => `<b>${Geometry.isRound(x) ? '=' : '≈'} ${fmt(x)} ${u}</b>`;
  if (t.type !== 'tu-do') return `<dl class="calc">${Geometry.measure(t.type, t.v).map(([n, ex, x, u]) => `<div><dt>${n}</dt><dd>${ex} ${val(x, u)}</dd></div>`).join('')}</dl>`;
  const kind = Geometry.classify(t.pts);
  if (kind === 'khong-hop-le') return '<p class="err" role="alert">Bốn điểm này không tạo thành tứ giác: có hai cạnh cắt nhau hoặc ba đỉnh thẳng hàng. Kéo một đỉnh ra chỗ khác.</p>';
  const s = Geometry.sides(t.pts), a = Geometry.angles(t.pts), d = Geometry.diagonals(t.pts), names = ['AB', 'BC', 'CD', 'DA'];
  return `<div><p class="eyebrow">Nhận dạng từ tọa độ</p><p class="kind">Đây là ${KIND[kind][0]}</p><p class="cap">Vì hình có ${KIND[kind][1]}.</p></div>
    <div class="meas">${s.map((x, i) => `<span><em>${names[i]}</em>${fmt(x)} cm</span><span><em>Góc ${'ABCD'[i]}</em>${fmt(a[i])}°</span>`).join('')}
      <span><em>AC</em>${fmt(d[0])} cm</span><span><em>BD</em>${fmt(d[1])} cm</span></div>
    <dl class="calc">
      <div><dt>Tổng bốn góc</dt><dd><b>= ${fmt(a.reduce((x, y) => x + y, 0))}°</b></dd></div>
      <div><dt>Chu vi</dt><dd>P = AB + BC + CD + DA ${val(Geometry.perimeter(t.pts), 'cm')}</dd></div>
      <div><dt>Diện tích</dt><dd>S = S(ABC) + S(ACD) ${val(Geometry.area(t.pts), 'cm²')}</dd></div>
    </dl>`;
}
function drawTool() {
  const t = S.tool, g = $('#toolFig-in'); if (!g) return;
  g.innerHTML = figure(t.pts, { H: BOARD.H, k: t.k, lens: true, diag: true, handles: true });
  $('#toolOut').innerHTML = toolOut();
  $('#toolHint').textContent = `1 ô = ${fmt(t.k)} cm. Kéo các đỉnh A, B, C, D để đổi hình; đỉnh bám vào nửa ô.`;
}
function viewTool() {
  toolRecalc();
  return `<header class="vhead"><div><h1>Vẽ hình và tính toán</h1><p class="lede">Chọn loại tứ giác, nhập dữ kiện để xem hình, kết quả và công thức. Hoặc kéo các đỉnh để tự tạo hình.</p></div></header>
    <div class="tool">
      <div class="tool-fig">${board('toolFig', BOARD.W, BOARD.H, '', 'Hình tứ giác trên giấy ô li')}<p class="cap" id="toolHint"></p></div>
      <div class="tool-panel"><div id="toolInputs" class="block">${toolInputs()}</div><div id="toolOut" class="block" aria-live="polite"></div></div>
    </div>`;
}

/* ---------- Màn hình 4: Luyện tập ---------- */
function answerControl(ex, idp, value, disabled, attr) {
  if (ex.kind === 'chon') return `<fieldset class="choices"${disabled ? ' disabled' : ''}>${ex.choices.map((c, i) => `<label><input type="radio" id="${idp}-${i}" name="${idp}" value="${i}"${String(value) === String(i) ? ' checked' : ''} ${attr}><span><b>${'ABCD'[i]}.</b> ${esc(c)}</span></label>`).join('')}</fieldset>`;
  return `<div class="unit" style="max-width:220px"><input type="text" inputmode="decimal" id="${idp}" name="${idp}" aria-label="Đáp án" placeholder="Đáp án" value="${esc(value ?? '')}"${disabled ? ' disabled' : ''} ${attr}><span>${esc(ex.unit)}</span></div>`;
}
function viewPractice() {
  const { items, done, total } = S.data;
  const item = x => {
    const open = S.ex.open === x.id, state = x.status || '', fb = S.ex.fb && S.ex.fb.id === x.id ? S.ex.fb : null;
    return `<li class="ex">
      <button class="ex-head" data-act="exOpen" data-id="${x.id}" aria-expanded="${open}">
        <span class="mark ${state}" title="${state === 'ok' ? 'Đã làm đúng' : state === 'bad' ? 'Đã làm, chưa đúng' : 'Chưa làm'}">${state === 'ok' ? '✓' : state === 'bad' ? '✕' : ''}</span>
        <span class="ex-stem">${esc(x.stem)}</span>
        <span class="ex-meta"><span>${esc(x.topicName || '')}</span>${lvl(x.level)}</span>
      </button>
      ${open ? `<form class="ex-body" data-form="answer" data-id="${x.id}" novalidate>
        ${answerControl(x, 'answer', fb ? fb.given : '', !!fb, '')}
        ${S.ex.err ? `<p class="err" role="alert">${esc(S.ex.err)}</p>` : ''}
        ${fb ? `<p class="${fb.correct ? 'okmsg' : 'err'}" role="status">${fb.correct ? 'Đúng rồi.' : 'Chưa đúng. Đáp án đúng: ' + esc(fb.answerText) + '.'}</p>
          ${fb.solution ? `<div class="solution"><h3>Lời giải</h3><p>${esc(fb.solution)}</p></div>` : ''}
          <div class="actions"><button type="button" class="btn ghost" data-act="exRetry">Làm lại</button></div>`
          : '<div class="actions"><button class="btn">Gửi đáp án</button></div>'}
      </form>` : ''}
    </li>`;
  };
  return `<header class="vhead"><div><h1>Luyện tập</h1><p class="lede">Đã làm đúng ${done} trên ${total} bài. Chọn một bài để làm, gửi đáp án rồi xem lời giải.</p></div></header>
    <div class="filters">
      ${field('f-topic', 'Chủ đề', `<select id="f-topic" data-change="exTopic">${topicOptions(S.ex.topic, 'Tất cả chủ đề')}</select>`)}
      ${field('f-level', 'Mức độ', `<select id="f-level" data-change="exLevel"><option value="">Tất cả mức độ</option>${[1, 2, 3].map(i => `<option value="${i}"${+S.ex.level === i ? ' selected' : ''}>${LEVEL[i]}</option>`).join('')}</select>`)}
    </div>
    ${items.length ? `<ul class="exlist">${items.map(item).join('')}</ul>` : '<p class="lede">Chưa có bài tập nào với bộ lọc này. Hãy chọn chủ đề hoặc mức độ khác.</p>'}`;
}

/* ---------- Màn hình 5: Kiểm tra ---------- */
function remark(score) {
  return score >= 8 ? 'Giỏi. Em nắm bài rất chắc.' : score >= 6.5 ? 'Khá. Em xem lại các câu sai nhé.' : score >= 5 ? 'Đạt. Em cần luyện tập thêm.' : 'Chưa đạt. Em xem lại lý thuyết rồi làm lại nhé.';
}
function viewExam() {
  if (S.examResult) {
    const { result: r, review } = S.examResult;
    return `<header class="vhead"><div><p class="eyebrow">Kết quả bài kiểm tra</p><h1>${esc(r.testName)}</h1></div></header>
      <div class="scorebox"><div class="score num">${fmt(r.score)}</div>
        <div class="scoretext"><p class="remark">${remark(r.score)}</p><p>Đúng ${r.correct} trên ${r.total} câu, làm trong ${clock(r.seconds)}. Thang điểm 10.</p></div></div>
      <ol class="qs">${review.map(x => `<li><p>${esc(x.stem)}</p>
        <p><span class="pill ${x.correct ? 'ok' : 'bad'}">${x.correct ? 'Đúng' : 'Sai'}</span> Em trả lời: ${esc(givenText(x.kind, x.given))}${x.correct ? '' : `. Đáp án đúng: ${esc(x.answerText)}`}</p>
        ${x.solution ? `<div class="solution"><p>${esc(x.solution)}</p></div>` : ''}</li>`).join('')}</ol>
      <div class="actions"><button class="btn" data-act="examClose">Về danh sách bài kiểm tra</button></div>`;
  }
  if (S.exam) {
    const { test: t, questions: qs, answers } = S.exam, left = qs.filter(x => (answers[x.id] ?? '') === '').length;
    return `<div class="exambar"><div><b>${esc(t.name)}</b><small id="answered">Đã trả lời ${qs.length - left}/${qs.length} câu</small></div>
        <div class="timer" id="timer" aria-label="Thời gian còn lại">${clock(Math.max(0, (S.exam.endsAt - Date.now()) / 1000))}</div>
        <button class="btn" data-act="examAsk">Nộp bài</button></div>
      ${S.exam.confirm ? `<div class="notice" role="alertdialog"><p>${left ? `Còn ${left} câu chưa trả lời. ` : ''}Nộp bài rồi sẽ không sửa được nữa.</p><div class="actions"><button class="btn" data-act="examSubmit">Nộp bài</button><button class="btn ghost" data-act="examBack">Làm tiếp</button></div></div>` : ''}
      <ol class="qs">${qs.map(x => `<li><p>${esc(x.stem)}</p>${answerControl(x, 'q-' + x.id, answers[x.id] ?? '', false, `data-exam="${x.id}"`)}</li>`).join('')}</ol>`;
  }
  const tests = S.data;
  return `<header class="vhead"><div><h1>Kiểm tra</h1><p class="lede">Bài kiểm tra có giới hạn thời gian và được chấm ngay khi nộp, theo thang điểm 10.</p></div></header>
    ${tests.length ? `<ul class="testlist">${tests.map(t => `<li><div><b>${esc(t.name)}</b><small>${t.questions} câu · ${t.minutes} phút${t.myTries ? ` · đã làm ${t.myTries} lần, điểm cao nhất ${fmt(t.myBest)}` : ' · chưa làm'}</small></div>
        <button class="btn${t.myTries ? ' ghost' : ''}" data-act="examStart" data-id="${t.id}">${t.myTries ? 'Làm lại' : 'Bắt đầu làm bài'}</button></li>`).join('')}</ul>` : '<p class="lede">Hiện chưa có bài kiểm tra nào được công bố.</p>'}`;
}
async function finishExam() {
  const x = S.exam; if (!x || x.sending) return;
  x.sending = true;
  try {
    S.examResult = await Api.post(`/tests/${x.test.id}/results`, { answers: x.answers, seconds: Math.round((Date.now() - x.startedAt) / 1000) });
    S.exam = null;
  } catch (e) {
    if (expired(e)) return;
    x.sending = false; x.confirm = false; S.alert = 'Chưa nộp được bài: ' + e.message + ' Bài làm vẫn còn, hãy thử nộp lại.';
    x.endsAt = Math.max(x.endsAt, Date.now() + 30000); // cho thêm 30 giây để nộp lại
  }
  render();
  if (S.view === 'kiemtra') scrollTo(0, 0);
}

/* ---------- Màn hình 6: Tiến độ và hồ sơ ---------- */
function viewProgress() {
  const d = S.data, me = S.me;
  return `<header class="vhead"><div><h1>Tiến độ học tập</h1></div></header>
    ${S.editProfile ? `<form class="card form" data-form="profile" novalidate><h2>Sửa hồ sơ</h2>
        <div class="row">${field('pf-name', 'Họ và tên', `<input id="pf-name" name="name" type="text" value="${esc(me.name)}">`)}${field('pf-lop', 'Lớp', `<input id="pf-lop" name="lop" type="text" value="${esc(me.lop)}">`)}</div>
        <div class="actions"><button class="btn">Lưu hồ sơ</button><button type="button" class="btn ghost" data-act="profileCancel">Hủy</button></div></form>`
      : `<div class="profile card"><div><b>${esc(me.name)}</b><div class="cap">${esc(me.email)} · ${ROLE[me.role]}${me.lop ? ' · lớp ' + esc(me.lop) : ''}</div></div><button class="btn ghost sm" data-act="profileEdit">Sửa hồ sơ</button></div>`}
    <div class="stats">
      <div class="stat"><b>${d.lessons.done}<small>/${d.lessons.total}</small></b><span>bài học đã học</span></div>
      <div class="stat"><b>${d.exercises.done}<small>/${d.exercises.total}</small></b><span>bài tập làm đúng</span></div>
      <div class="stat"><b>${d.tests.average === null ? '–' : fmt(d.tests.average)}</b><span>${d.tests.count ? `điểm trung bình ${d.tests.count} bài kiểm tra` : 'chưa làm bài kiểm tra'}</span></div>
    </div>
    ${d.suggestions.length ? `<section class="block"><h3>Gợi ý luyện tiếp</h3><p class="cap">Bài tập thuộc chủ đề đã học lý thuyết mà bạn chưa làm đúng.</p>
      <ul class="suggest">${d.suggestions.map(x => `<li><button data-act="suggest" data-id="${x.id}" data-topic="${x.topicId}">${glyph(x.topicId, 30)}<span><span>${esc(x.stem)}</span>${lvl(x.level)}</span></button></li>`).join('')}</ul></section>` : ''}
    <section class="block"><h3>Theo chủ đề</h3><ul class="tprog">${d.topics.map(t => `<li>${glyph(t.id, 26)}<span><b>${esc(t.name)}</b><br><small>${t.learned ? 'Đã học lý thuyết' : 'Chưa học lý thuyết'}</small></span>
        <div class="bar" role="img" aria-label="Làm đúng ${t.done} trên ${t.total} bài tập"><i style="width:${t.total ? t.done / t.total * 100 : 0}%"></i></div><small>${t.done}/${t.total} bài</small></li>`).join('')}</ul></section>
    <section class="block"><h3>Lịch sử gần đây</h3>${d.history.length ? `<ul class="hist">${d.history.map(x => `<li><time>${when(x.at)}</time><span${x.bad ? ' class="bad"' : ''}>${esc(x.text)}</span></li>`).join('')}</ul>` : '<p class="lede">Chưa có hoạt động nào. Bắt đầu với một bài học trong mục Lý thuyết.</p>'}</section>`;
}

/* ---------- Quản lý 1: Bài học ---------- */
const formHead = title => `<h2>${title}</h2>${S.form.err ? `<p class="err" role="alert">${esc(S.form.err)}</p>` : ''}`;
const formActions = label => `<div class="actions"><button class="btn">${label}</button><button type="button" class="btn ghost" data-act="formCancel">Hủy</button></div>`;
function viewLessons() {
  const d = S.form && S.form.kind === 'lesson' ? S.form.data : null;
  return `<header class="vhead"><div><h1>Quản lý bài học</h1><p class="lede">Thêm, sửa hoặc xóa bài lý thuyết của từng chủ đề.</p></div>${d ? '' : '<button class="btn" data-act="formNew" data-kind="lesson">Thêm bài học</button>'}</header>
    ${flashLine()}
    ${d ? `<form class="card form" data-form="lesson" id="formTop" novalidate>${formHead(S.form.id ? 'Sửa bài học' : 'Thêm bài học')}
      <div class="row">${field('lf-title', 'Tiêu đề', `<input id="lf-title" name="title" type="text" value="${esc(d.title)}">`)}
        ${field('lf-topic', 'Chủ đề', `<select id="lf-topic" name="topic">${topicOptions(d.topic)}</select>`, 'Chủ đề quyết định hình minh họa')}
        ${field('lf-grade', 'Khối lớp', `<input id="lf-grade" name="grade" type="text" value="${esc(d.grade)}" placeholder="Lớp 8">`)}</div>
      ${field('lf-def', 'Định nghĩa', `<textarea id="lf-def" name="definition">${esc(d.definition)}</textarea>`)}
      ${field('lf-prop', 'Tính chất', `<textarea id="lf-prop" name="traits">${esc(d.traits)}</textarea>`, 'Mỗi dòng một tính chất')}
      ${field('lf-sign', 'Dấu hiệu nhận biết', `<textarea id="lf-sign" name="signs">${esc(d.signs)}</textarea>`, 'Mỗi dòng một dấu hiệu, có thể để trống')}
      ${field('lf-form', 'Công thức', `<textarea id="lf-form" name="formulas">${esc(d.formulas)}</textarea>`, 'Mỗi dòng một công thức')}
      ${formActions('Lưu bài học')}</form>` : ''}
    <div class="tablewrap"><table><thead><tr><th>Bài học</th><th>Chủ đề</th><th>Khối lớp</th><th class="n">Lượt học</th><th></th></tr></thead><tbody>
      ${S.data.map(l => `<tr><td><b>${esc(l.title)}</b></td><td>${esc(l.topicName)}</td><td>${esc(l.grade)}</td><td class="n">${l.views}</td>
        <td class="act"><button class="btn ghost sm" data-act="formEdit" data-kind="lesson" data-id="${l.id}">Sửa</button> ${delBtn('l' + l.id, l.id, 'del', 'lessons')}</td></tr>`).join('') || '<tr><td colspan="5">Chưa có bài học nào.</td></tr>'}
    </tbody></table></div>`;
}

/* ---------- Quản lý 2: Bài tập (ngân hàng câu hỏi) ---------- */
function viewExercises() {
  const d = S.form && S.form.kind === 'exercise' ? S.form.data : null;
  return `<header class="vhead"><div><h1>Quản lý bài tập</h1><p class="lede">Ngân hàng câu hỏi dùng chung cho mục Luyện tập và các bài kiểm tra.</p></div>${d ? '' : '<button class="btn" data-act="formNew" data-kind="exercise">Thêm bài tập</button>'}</header>
    ${flashLine()}
    ${d ? `<form class="card form" data-form="exercise" id="formTop" novalidate>${formHead(S.form.id ? 'Sửa bài tập' : 'Thêm bài tập')}
      <div class="row">${field('xf-topic', 'Chủ đề', `<select id="xf-topic" name="topic">${topicOptions(d.topic)}</select>`)}
        ${field('xf-level', 'Mức độ', `<select id="xf-level" name="level">${[1, 2, 3].map(i => `<option value="${i}"${+d.level === i ? ' selected' : ''}>${LEVEL[i]}</option>`).join('')}</select>`)}
        ${field('xf-kind', 'Dạng câu hỏi', `<select id="xf-kind" name="kind" data-change="formKind"><option value="so"${d.kind !== 'chon' ? ' selected' : ''}>Nhập đáp số</option><option value="chon"${d.kind === 'chon' ? ' selected' : ''}>Trắc nghiệm 4 phương án</option></select>`)}</div>
      ${field('xf-stem', 'Đề bài', `<textarea id="xf-stem" name="stem">${esc(d.stem)}</textarea>`)}
      ${d.kind === 'chon' ? `<div class="field"><span class="lab">Phương án (đánh dấu phương án đúng)</span>${[0, 1, 2, 3].map(i => `<div class="unit"><input type="radio" id="xf-r${i}" name="correct" value="${i}" aria-label="Phương án ${'ABCD'[i]} là đáp án đúng"${String(d.correct) === String(i) ? ' checked' : ''}><b>${'ABCD'[i]}</b><input type="text" id="xf-c${i}" name="c${i}" aria-label="Nội dung phương án ${'ABCD'[i]}" value="${esc(d['c' + i])}"></div>`).join('')}</div>`
        : `<div class="row">${field('xf-ans', 'Đáp số', `<input id="xf-ans" name="answer" type="text" inputmode="decimal" value="${esc(d.answer)}">`, 'Chấp nhận sai lệch 0,01')}${field('xf-unit', 'Đơn vị', `<input id="xf-unit" name="unit" type="text" value="${esc(d.unit)}" placeholder="cm, cm², °">`)}</div>`}
      ${field('xf-sol', 'Lời giải', `<textarea id="xf-sol" name="solution">${esc(d.solution)}</textarea>`, 'Hiện ra sau khi học sinh gửi đáp án')}
      ${formActions('Lưu bài tập')}</form>` : ''}
    <div class="filters">${field('m-topic', 'Lọc theo chủ đề', `<select id="m-topic" data-change="manageTopic">${topicOptions(S.manageTopic, 'Tất cả chủ đề')}</select>`)}</div>
    <div class="tablewrap"><table><thead><tr><th>Đề bài</th><th>Chủ đề</th><th>Mức độ</th><th>Đáp án</th><th class="n">Dùng trong</th><th></th></tr></thead><tbody>
      ${S.data.map(x => `<tr><td class="stem">${esc(x.stem)}</td><td>${esc(x.topicName)}</td><td>${lvl(x.level)}</td><td class="num">${esc(ansText(x))}</td><td class="n">${x.usedIn} bài KT</td>
        <td class="act"><button class="btn ghost sm" data-act="formEdit" data-kind="exercise" data-id="${x.id}">Sửa</button> ${delBtn('x' + x.id, x.id, 'del', 'exercises')}</td></tr>`).join('') || '<tr><td colspan="6">Chưa có bài tập nào trong chủ đề này.</td></tr>'}
    </tbody></table></div>`;
}

/* ---------- Quản lý 3: Bài kiểm tra ---------- */
function viewTests() {
  const d = S.form && S.form.kind === 'test' ? S.form.data : null, picked = d ? [].concat(d.q || []) : [];
  return `<header class="vhead"><div><h1>Quản lý bài kiểm tra</h1><p class="lede">Chọn câu hỏi từ ngân hàng, đặt thời gian rồi công bố cho học sinh.</p></div>${d ? '' : '<button class="btn" data-act="formNew" data-kind="test">Tạo bài kiểm tra</button>'}</header>
    ${flashLine()}
    ${d ? `<form class="card form" data-form="test" id="formTop" novalidate>${formHead(S.form.id ? 'Sửa bài kiểm tra' : 'Tạo bài kiểm tra')}
      <div class="row">${field('tf-name', 'Tên bài kiểm tra', `<input id="tf-name" name="name" type="text" value="${esc(d.name)}">`)}
        ${field('tf-min', 'Thời gian làm bài', `<div class="unit"><input id="tf-min" name="minutes" type="text" inputmode="numeric" value="${esc(d.minutes)}"><span>phút</span></div>`)}</div>
      <div class="field"><span class="lab">Câu hỏi (đã chọn ${picked.length})</span><div class="checks">${S.data.exercises.map(x => `<label><input type="checkbox" id="tf-q-${x.id}" name="q" value="${x.id}"${picked.includes(x.id) ? ' checked' : ''}><span>${esc(x.stem)}<small>${esc(x.topicName)} · ${LEVEL[x.level] || ''}</small></span></label>`).join('')}</div>
        <small>Mỗi câu có điểm bằng nhau; tổng điểm quy về thang 10.</small></div>
      <label class="unit"><input type="checkbox" id="tf-pub" name="published"${d.published === 'on' ? ' checked' : ''}> <span style="color:inherit">Công bố ngay cho học sinh</span></label>
      ${formActions('Lưu bài kiểm tra')}</form>` : ''}
    <div class="tablewrap"><table><thead><tr><th>Bài kiểm tra</th><th class="n">Số câu</th><th class="n">Thời gian</th><th>Trạng thái</th><th class="n">Lượt làm</th><th></th></tr></thead><tbody>
      ${S.data.tests.map(t => `<tr><td><b>${esc(t.name)}</b></td><td class="n">${t.questionIds.length}</td><td class="n">${t.minutes} phút</td>
        <td>${t.published ? '<span class="pill ok">Đã công bố</span>' : '<span class="pill mute">Bản nháp</span>'}</td><td class="n">${t.tries}</td>
        <td class="act"><button class="btn ghost sm" data-act="publish" data-id="${t.id}">${t.published ? 'Thu hồi' : 'Công bố'}</button> <button class="btn ghost sm" data-act="formEdit" data-kind="test" data-id="${t.id}">Sửa</button> ${delBtn('t' + t.id, t.id, 'del', 'tests')}</td></tr>`).join('') || '<tr><td colspan="6">Chưa có bài kiểm tra nào.</td></tr>'}
    </tbody></table></div>`;
}

/* ---------- Quản lý 4: Học sinh, tài khoản, sao lưu ---------- */
function viewStudents() {
  const d = S.data, admin = S.me.role === 'qt';
  return `<header class="vhead"><div><h1>${admin ? 'Học sinh và tài khoản' : 'Kết quả học sinh'}</h1><p class="lede">Tiến độ và điểm kiểm tra của học sinh.${admin ? ' Quản trị viên còn cấp vai trò và sao lưu dữ liệu.' : ''}</p></div></header>
    ${flashLine()}
    <div class="tablewrap"><table><thead><tr><th>Học sinh</th><th>Lớp</th><th class="n">Bài học</th><th class="n">Bài tập đúng</th><th class="n">Điểm TB</th><th class="n">Hoạt động gần nhất</th></tr></thead><tbody>
      ${d.students.map(s => `<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.lop)}</td><td class="n">${s.studied}/${d.lessonTotal}</td><td class="n">${s.done}/${d.exerciseTotal}</td><td class="n">${s.average === null ? '–' : fmt(s.average)}</td><td class="n">${s.last ? when(s.last) : '–'}</td></tr>`).join('') || '<tr><td colspan="6">Chưa có học sinh nào.</td></tr>'}
    </tbody></table></div>
    <section class="block"><h3>Bài kiểm tra đã nộp gần đây</h3><div class="tablewrap"><table><thead><tr><th>Học sinh</th><th>Bài kiểm tra</th><th class="n">Điểm</th><th class="n">Số câu đúng</th><th class="n">Thời gian làm</th><th class="n">Nộp lúc</th></tr></thead><tbody>
      ${d.recent.map(r => `<tr><td>${esc(r.student)}</td><td>${esc(r.testName)}</td><td class="n"><span class="pill ${r.score >= 5 ? 'ok' : 'bad'}">${fmt(r.score)}</span></td><td class="n">${r.correct}/${r.total}</td><td class="n">${clock(r.seconds)}</td><td class="n">${when(r.at)}</td></tr>`).join('') || '<tr><td colspan="6">Chưa có bài nào được nộp.</td></tr>'}
    </tbody></table></div></section>
    ${admin ? `<section class="block"><h3>Tài khoản và phân quyền</h3><div class="tablewrap"><table><thead><tr><th>Họ tên</th><th>Email</th><th>Vai trò</th><th></th></tr></thead><tbody>
      ${d.users.map(u => `<tr><td><b>${esc(u.name)}</b>${u.id === S.me.id ? ' <span class="pill">bạn</span>' : ''}</td><td>${esc(u.email)}</td>
        <td><select id="role-${u.id}" aria-label="Vai trò của ${esc(u.name)}" data-change="role" data-id="${u.id}"${u.id === S.me.id ? ' disabled' : ''}>${Object.entries(ROLE).map(([k, v]) => `<option value="${k}"${u.role === k ? ' selected' : ''}>${v}</option>`).join('')}</select></td>
        <td class="act">${u.id === S.me.id ? '' : delBtn('u' + u.id, u.id, 'delUser')}</td></tr>`).join('')}
    </tbody></table></div></section>
    <section class="block"><h3>Sao lưu dữ liệu đồ thị</h3>
      <p class="cap">Nút: ${d.stats.nodes.map(x => `${esc(x.label)} ${x.total}`).join(' · ')}<br>Quan hệ: ${d.stats.rels.map(x => `${esc(x.relType)} ${x.total}`).join(' · ')}</p>
      <div class="actions"><button class="btn ghost" data-act="cypher">${S.cypher === null ? 'Xuất bản sao lưu Cypher' : 'Ẩn bản sao lưu'}</button></div>
      ${S.cypher === null ? '' : `<textarea class="cypher" id="cypherOut" readonly aria-label="Lệnh Cypher sao lưu">${esc(S.cypher)}</textarea><div class="actions"><button class="btn" data-act="copyCypher">Sao chép</button><span class="cap" id="copyMsg">Dán vào Neo4j Browser trên một database trống để dựng lại toàn bộ dữ liệu.</span></div>`}
      <p class="cap">Muốn quay về dữ liệu mẫu ban đầu, chạy <code>npm run seed</code> trong Terminal.</p>
    </section>` : ''}`;
}

/* ---------- Khung trang ---------- */
const RENDER = { lythuyet: viewTheory, hinhve: viewTool, luyentap: viewPractice, kiemtra: viewExam, tiendo: viewProgress, 'ql-baihoc': viewLessons, 'ql-baitap': viewExercises, 'ql-kiemtra': viewTests, 'ql-hocsinh': viewStudents };
function render() {
  const me = S.me;
  if (!me) { app.innerHTML = `<header class="top"><div class="brand">${logo}<span>Góc Tứ Giác</span></div></header>${viewAuth()}`; return; }
  const view = viewOf(S.view), ok = allowed(view);
  const groups = ['Học tập', 'Quản lý'].map(g => [g, VIEWS.filter(v => v.group === g && allowed(v))]).filter(([, vs]) => vs.length);
  const body = !ok ? '<h1>Không có quyền truy cập</h1><p class="lede">Trang này dành cho giáo viên và quản trị viên. Tài khoản của bạn là học sinh.</p>'
    : S.error ? `<p class="err" role="alert">${esc(S.error)}</p><div class="actions"><button class="btn" data-act="retry">Thử lại</button></div>`
    : S.data === null ? '<p class="loading">Đang tải…</p>'
    : RENDER[view.id]();
  app.innerHTML = `<header class="top"><div class="brand">${logo}<span>Góc Tứ Giác</span></div>
      <div class="who"><b>${esc(me.name)}</b><span class="pill">${ROLE[me.role]}</span><button class="btn ghost sm" data-act="logout">Đăng xuất</button></div></header>
    <div class="layout"><nav class="nav" aria-label="Điều hướng chính">${groups.map(([g, vs]) => `<div class="nav-group"><span class="nav-label">${g}</span>${vs.map(v => `<button data-act="go" data-view="${v.id}"${v.id === view.id ? ' aria-current="page"' : ''}>${v.id === 'ql-hocsinh' && me.role === 'qt' ? 'Học sinh, tài khoản' : v.label}${v.id === 'kiemtra' && S.exam ? ' ●' : ''}</button>`).join('')}</div>`).join('')}</nav>
      <main id="main">${S.alert ? `<p class="err" role="alert">${esc(S.alert)}</p>` : ''}${body}</main></div>`;
  if (view.id === 'hinhve' && ok && S.data !== null && !S.error) drawTool();
}
async function done(message) { S.form = null; S.confirm = null; S.flash = message; await refresh(); }

// Mở form thêm/sửa với dữ liệu lấy từ danh sách đang hiển thị
function openForm(kind, id) {
  const list = kind === 'test' ? S.data.tests : S.data, n = id ? list.find(x => x.id === id) : null, topic = n ? n.topicId : (S.manageTopic || S.topic);
  const data = kind === 'lesson' ? { title: n ? n.title : '', topic, grade: n ? n.grade : 'Lớp 8', definition: n ? n.definition : '', traits: n ? (n.traits || []).join('\n') : '', signs: n ? (n.signs || []).join('\n') : '', formulas: n ? (n.formulas || []).join('\n') : '' }
    : kind === 'exercise' ? { topic, level: n ? n.level : 1, kind: n ? n.kind : 'so', stem: n ? n.stem : '', solution: n ? n.solution : '', answer: n && n.kind === 'so' ? fmt(n.answer) : '', unit: n ? n.unit : 'cm', correct: n && n.kind === 'chon' ? n.answer : '', c0: n ? n.choices[0] || '' : '', c1: n ? n.choices[1] || '' : '', c2: n ? n.choices[2] || '' : '', c3: n ? n.choices[3] || '' : '' }
    : { name: n ? n.name : '', minutes: n ? n.minutes : 15, published: n && n.published ? 'on' : '', q: n ? n.questionIds : [] };
  S.form = { kind, id: id || null, data, err: '' }; S.flash = ''; S.confirm = null; render();
  requestAnimationFrame(() => { const f = $('#formTop'); if (f) f.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
}
function readForm(f) { const o = {}; new FormData(f).forEach((v, k) => { o[k] = k in o ? [].concat(o[k], v) : v; }); return o; }
// Gửi form quản lý lên máy chủ: POST khi thêm mới, PUT khi sửa
async function saveForm(path, d, body, message) {
  try { await (S.form.id ? Api.put(`${path}/${S.form.id}`, body) : Api.post(path, body)); }
  catch (e) {
    if (expired(e)) return;
    S.form.data = { ...S.form.data, ...d, q: d.q || [], published: d.published || '' }; S.form.err = e.message; render(); return;
  }
  await done(message);
}
async function enter(resp) { Api.setToken(resp.token); S.me = resp.user; S.authErr = ''; S.topics = []; await go('lythuyet'); }

/* ---------- Sự kiện ---------- */
const ACT = {
  go: d => go(d.view),
  retry: () => refresh(),
  logout() { Api.setToken(''); S.me = null; S.exam = null; S.examResult = null; S.authErr = ''; S.authTab = 'dangnhap'; S.data = null; render(); },
  authTab: d => { S.authTab = d.tab; S.authErr = ''; render(); },
  async demo(d) { try { await enter(await Api.post('/auth/login', { email: d.email, password: '123456' })); } catch (e) { S.authErr = e.status === 401 ? 'Chưa có tài khoản mẫu. Hãy chạy "npm run seed" rồi thử lại.' : e.message; render(); } },
  async topic(d) { S.topic = d.id; S.lesson = null; await refresh(); },
  lesson: d => { S.lesson = d.id; render(); },
  async openLesson(d) { S.topic = d.topic || S.topic; S.lesson = d.id; S.q = ''; S.search = null; await refresh(); },
  async studied(d) { await Api.post(`/lessons/${d.id}/studied`); await refresh(); },
  toTool() { ACT.toolType({ type: S.topic === 'tu-giac' ? 'tu-do' : S.topic }, true); return go('hinhve'); },
  toPractice() { S.ex = { topic: S.topic, level: '', open: null, fb: null, err: '' }; return go('luyentap'); },
  suggest: d => { S.ex = { topic: d.topic, level: '', open: d.id, fb: null, err: '' }; return go('luyentap'); },
  toolType(d, silent) {
    const t = S.tool; t.type = d.type;
    if (d.type === 'tu-do') { if (silent || !t.pts.length) { t.pts = [[3, 7], [9, 6], [10, 2], [2, 1.5]].map(([x, y]) => ({ x, y })); t.k = 1; } }
    else t.vals = { ...Geometry.SHAPES[d.type].def };
    if (!silent) { toolRecalc(); $('#toolInputs').innerHTML = toolInputs(); drawTool(); }
  },
  exOpen: d => { S.ex.open = S.ex.open === d.id ? null : d.id; S.ex.fb = null; S.ex.err = ''; render(); },
  exRetry() { S.ex.fb = null; S.ex.err = ''; render(); },
  async examStart(d) {
    const t = await Api.get('/tests/' + d.id);
    S.exam = { test: t, questions: t.questions, answers: {}, startedAt: Date.now(), endsAt: Date.now() + t.minutes * 60000, confirm: false };
    S.examResult = null; render(); scrollTo(0, 0);
  },
  examAsk() { S.exam.confirm = true; render(); },
  examBack() { S.exam.confirm = false; render(); },
  examSubmit: () => finishExam(),
  async examClose() { S.examResult = null; S.data = null; render(); await refresh(); },
  profileEdit() { S.editProfile = true; render(); },
  profileCancel() { S.editProfile = false; render(); },
  formNew: d => openForm(d.kind),
  formEdit: d => openForm(d.kind, d.id),
  formCancel() { S.form = null; render(); },
  confirm: d => { S.confirm = d.key; render(); },
  unconfirm() { S.confirm = null; render(); },
  async del(d) { await Api.del(`/${d.kind}/${d.id}`); await done('Đã xóa.'); },
  async delUser(d) { await Api.del('/admin/users/' + d.id); await done('Đã xóa tài khoản.'); },
  async publish(d) {
    const t = S.data.tests.find(x => x.id === d.id);
    await Api.put(`/tests/${d.id}/publish`, { published: !t.published });
    await done(t.published ? 'Đã thu hồi, học sinh không còn thấy bài này.' : 'Đã công bố bài kiểm tra cho học sinh.');
  },
  async cypher() { S.cypher = S.cypher === null ? (await Api.get('/admin/backup')).cypher : null; render(); },
  copyCypher() {
    const ta = $('#cypherOut'), msg = $('#copyMsg'), ok = () => { msg.textContent = 'Đã sao chép.'; }, manual = () => { ta.focus(); ta.select(); msg.textContent = 'Đã bôi đen toàn bộ, nhấn Ctrl+C để sao chép.'; };
    try { navigator.clipboard.writeText(ta.value).then(ok, manual); } catch (e) { manual(); }
  },
};
const FORM = {
  async login(d) { try { await enter(await Api.post('/auth/login', d)); } catch (e) { S.authErr = e.message; render(); } },
  async register(d) { try { await enter(await Api.post('/auth/register', d)); } catch (e) { S.authErr = e.message; render(); } },
  async profile(d) { S.me = await Api.put('/me', d); S.editProfile = false; render(); },
  async answer(d, f) {
    const id = f.dataset.id;
    try {
      const r = await Api.post(`/exercises/${id}/attempts`, { answer: d.answer ?? '' });
      S.ex.err = ''; S.ex.fb = { id, given: d.answer, ...r };
      const it = S.data.items.find(x => x.id === id);
      if (it && r.correct && it.status !== 'ok') { it.status = 'ok'; S.data.done++; } else if (it && !r.correct && it.status !== 'ok') it.status = 'bad';
    } catch (e) { if (expired(e)) return; S.ex.err = e.message; S.ex.fb = null; }
    render();
  },
  lesson: d => saveForm('/lessons', d, d, 'Đã lưu bài học.'),
  exercise: d => saveForm('/exercises', d, { topic: d.topic, level: d.level, kind: d.kind, stem: d.stem, solution: d.solution, unit: d.unit, answer: d.kind === 'chon' ? d.correct ?? '' : d.answer, choices: [d.c0, d.c1, d.c2, d.c3] }, 'Đã lưu bài tập.'),
  test: d => saveForm('/tests', d, { name: d.name, minutes: d.minutes, published: d.published === 'on', questionIds: [].concat(d.q || []) }, 'Đã lưu bài kiểm tra.'),
};
const CHANGE = {
  exTopic: v => { S.ex.topic = v; S.ex.open = null; S.ex.fb = null; return refresh(); },
  exLevel: v => { S.ex.level = v; S.ex.open = null; S.ex.fb = null; return refresh(); },
  manageTopic: v => { S.manageTopic = v; return refresh(); },
  formKind: (v, el) => { S.form.data = { ...S.form.data, ...readForm(el.form) }; S.form.err = ''; render(); },
  async role(v, el) { await Api.put(`/admin/users/${el.dataset.id}/role`, { role: v }); await done('Đã đổi vai trò.'); },
};
// Chạy một thao tác; lỗi từ máy chủ hiện thành dòng thông báo đỏ ở đầu trang.
function run(fn) {
  S.alert = '';
  Promise.resolve().then(fn).catch(e => { if (expired(e)) return; S.alert = e.message; S.confirm = null; render(); });
}
app.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b && ACT[b.dataset.act]) run(() => ACT[b.dataset.act](b.dataset)); });
app.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('g[data-act]')) { e.preventDefault(); run(() => ACT[e.target.dataset.act](e.target.dataset)); } });
app.addEventListener('submit', e => { e.preventDefault(); const f = e.target; if (FORM[f.dataset.form]) run(() => FORM[f.dataset.form](readForm(f), f)); });
app.addEventListener('change', e => { const el = e.target; if (el.dataset.change && CHANGE[el.dataset.change]) run(() => CHANGE[el.dataset.change](el.value, el)); });
app.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.live === 'search') { S.q = el.value; clearTimeout(searchTimer); searchTimer = setTimeout(doSearch, 250); }
  else if (el.dataset.live === 'tool') { S.tool.vals[el.dataset.key] = el.value; toolRecalc(); drawTool(); }
  else if (el.dataset.exam && S.exam) {
    S.exam.answers[el.dataset.exam] = el.value.trim();
    const qs = S.exam.questions, n = qs.filter(x => (S.exam.answers[x.id] ?? '') !== '').length, a = $('#answered');
    if (a) a.textContent = `Đã trả lời ${n}/${qs.length} câu`;
  }
});
// Kéo đỉnh trên giấy ô li
let drag = null;
app.addEventListener('pointerdown', e => {
  const h = e.target.closest('.handle'); if (!h) return;
  e.preventDefault(); drag = { i: +h.dataset.i, svg: h.ownerSVGElement };
  try { drag.svg.setPointerCapture(e.pointerId); } catch (err) {}
});
addEventListener('pointermove', e => {
  if (!drag) return;
  const t = S.tool, pt = drag.svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
  const q = pt.matrixTransform(drag.svg.getScreenCTM().inverse()), snap = v => Math.round(v * 2) / 2;
  const x = Math.min(BOARD.W - 0.5, Math.max(0.5, snap(q.x / U))) * t.k, y = Math.min(BOARD.H - 0.5, Math.max(0.5, snap(BOARD.H - q.y / U))) * t.k;
  if (t.pts[drag.i].x === x && t.pts[drag.i].y === y) return;
  t.pts = t.pts.map((p, i) => i === drag.i ? { x, y } : p);
  if (t.type !== 'tu-do') { t.type = 'tu-do'; t.err = ''; $('#toolInputs').innerHTML = toolInputs(); }
  drawTool();
});
addEventListener('pointerup', () => { drag = null; });
addEventListener('pointercancel', () => { drag = null; });
wide.addEventListener('change', () => { if (S.view === 'lythuyet' && S.me && S.data) render(); });
// Người dùng sửa phần #... trên thanh địa chỉ hoặc bấm nút Quay lại của trình duyệt
addEventListener('hashchange', () => { const h = location.hash.slice(1); if (S.me && h !== S.view && VIEWS.some(v => v.id === h)) run(() => go(h)); });
// Đồng hồ bài kiểm tra: tự nộp khi hết giờ
setInterval(() => {
  if (!S.exam || S.exam.sending) return;
  const left = (S.exam.endsAt - Date.now()) / 1000;
  if (left <= 0) return finishExam();
  const el = $('#timer'); if (el) { el.textContent = clock(left); el.classList.toggle('low', left < 60); }
}, 500);

/* ---------- Khởi động ---------- */
(async () => {
  toolRecalc();
  const h = location.hash.slice(1); if (VIEWS.some(v => v.id === h)) S.view = h;
  if (Api.hasToken()) {
    try { S.me = await Api.get('/me'); }
    catch (e) { if (e.status === 401) Api.setToken(''); else S.authErr = e.message; }
  }
  if (S.me) await go(S.view); else render();
})();
