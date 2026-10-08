/* =====================================================================
   1) geometry.js — thư viện công thức tứ giác (Người 3)
   Hàm thuần, không đụng tới giao diện, có thể tách thành file riêng để test bằng Jest.
   ===================================================================== */
const Geometry = (() => {
  const sub = (p, q) => ({ x: p.x - q.x, y: p.y - q.y });
  const cross = (u, v) => u.x * v.y - u.y * v.x;
  const dot = (u, v) => u.x * v.x + u.y * v.y;
  const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);

  // Số Việt: dấu phẩy thập phân, tối đa 2 chữ số sau dấu phẩy
  const fmt = x => { const r = Math.round(x * 100) / 100; return String(r === 0 ? 0 : r).replace('.', ','); };
  const isRound = x => Math.abs(x - Math.round(x * 100) / 100) < 1e-9;
  // Nhận "12,5", "12.5", "12,5 cm", "100°"; trả null nếu không phải số
  const parseNum = s => {
    const m = /^\s*(-?\d+(?:[.,]\d+)?)\s*(?:cm²|cm2|cm|°|độ)?\s*$/i.exec(String(s ?? ''));
    return m ? parseFloat(m[1].replace(',', '.')) : null;
  };

  const signedArea = pts => pts.reduce((s, p, i) => s + cross(p, pts[(i + 1) % pts.length]), 0) / 2;
  const area = pts => Math.abs(signedArea(pts));           // công thức tọa độ
  const sides = pts => pts.map((p, i) => dist(p, pts[(i + 1) % pts.length]));
  const perimeter = pts => sides(pts).reduce((a, b) => a + b, 0);
  const diagonals = pts => [dist(pts[0], pts[2]), dist(pts[1], pts[3])];

  const crosses = (a, b, c, d) => {
    const ab = sub(b, a), cd = sub(d, c);
    return cross(ab, sub(c, a)) * cross(ab, sub(d, a)) < 0 && cross(cd, sub(a, c)) * cross(cd, sub(b, c)) < 0;
  };
  // Bốn điểm có tạo thành tứ giác không: không có ba đỉnh thẳng hàng, không có hai cạnh cắt nhau
  function isSimple(pts) {
    const size = Math.max(...sides(pts));
    if (!(size > 0)) return false;
    const tol = 1e-9 * size * size;
    for (let i = 0; i < 4; i++) {
      const a = pts[i], b = pts[(i + 1) % 4], c = pts[(i + 2) % 4];
      if (Math.abs(cross(sub(b, a), sub(c, b))) <= tol) return false;
    }
    return !crosses(pts[0], pts[1], pts[2], pts[3]) && !crosses(pts[1], pts[2], pts[3], pts[0]);
  }
  // Góc trong tại từng đỉnh (độ); góc lõm cho giá trị lớn hơn 180
  function angles(pts) {
    const o = Math.sign(signedArea(pts));
    return pts.map((v, i) => {
      const p = pts[(i + 3) % 4], n = pts[(i + 1) % 4];
      const a = Math.atan2(Math.abs(cross(sub(p, v), sub(n, v))), dot(sub(p, v), sub(n, v))) * 180 / Math.PI;
      const turn = Math.sign(cross(sub(v, p), sub(n, v)));
      return turn === o || turn === 0 ? a : 360 - a;
    });
  }
  const isConvex = pts => angles(pts).every(a => a < 180);

  // Nhận dạng loại tứ giác từ tọa độ bốn đỉnh A, B, C, D (theo thứ tự)
  function classify(pts) {
    if (!isSimple(pts)) return 'khong-hop-le';
    const [A, B, C, D] = pts, s = sides(pts), scale = Math.max(...s);
    const near = (x, y) => Math.abs(x - y) < 1e-7 * scale;
    const par = (u, v) => Math.abs(cross(u, v)) < 1e-7 * Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y);
    const AB = sub(B, A), BC = sub(C, B), CD = sub(D, C), DA = sub(A, D);
    const p1 = par(AB, CD), p2 = par(BC, DA);
    if (p1 && p2) {
      const eq = near(s[0], s[1]), rt = Math.abs(dot(AB, BC)) < 1e-7 * s[0] * s[1];
      return eq && rt ? 'hinh-vuong' : rt ? 'hinh-chu-nhat' : eq ? 'hinh-thoi' : 'hinh-binh-hanh';
    }
    if (p1 || p2) {
      const legs = p1 ? [s[1], s[3]] : [s[0], s[2]];
      if (near(legs[0], legs[1])) return 'hinh-thang-can';
      if (angles(pts).some(a => Math.abs(a - 90) < 1e-6)) return 'hinh-thang-vuong';
      return 'hinh-thang';
    }
    return isConvex(pts) ? 'tu-giac-loi' : 'tu-giac-lom';
  }

  // Dữ kiện cần nhập cho từng loại hình: [khóa, nhãn, tên trong câu]
  const SHAPES = {
    'hinh-vuong':     { name: 'Hình vuông',      fields: [['a', 'Cạnh a', 'cạnh a']], def: { a: 4 } },
    'hinh-chu-nhat':  { name: 'Hình chữ nhật',   fields: [['a', 'Chiều dài a', 'chiều dài a'], ['b', 'Chiều rộng b', 'chiều rộng b']], def: { a: 8, b: 6 } },
    'hinh-thoi':      { name: 'Hình thoi',       fields: [['d1', 'Đường chéo AC (d₁)', 'đường chéo AC'], ['d2', 'Đường chéo BD (d₂)', 'đường chéo BD']], def: { d1: 6, d2: 8 } },
    'hinh-binh-hanh': { name: 'Hình bình hành',  fields: [['a', 'Cạnh đáy a', 'cạnh đáy a'], ['b', 'Cạnh bên b', 'cạnh bên b'], ['h', 'Chiều cao h', 'chiều cao h']], def: { a: 6, b: 5, h: 4 } },
    'hinh-thang':     { name: 'Hình thang cân',  fields: [['a', 'Đáy lớn a', 'đáy lớn a'], ['b', 'Đáy nhỏ b', 'đáy nhỏ b'], ['h', 'Chiều cao h', 'chiều cao h']], def: { a: 9, b: 3, h: 4 } },
  };
  const SCALES = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];

  // Kiểm tra dữ kiện và dựng bốn đỉnh (đơn vị cm). k = số cm ứng với một ô trên giấy.
  function build(type, raw, board = { W: 12, H: 9, fitW: 10, fitH: 7 }) {
    const def = SHAPES[type], v = {};
    for (const [key, label, inText] of def.fields) {
      const s = String(raw[key] ?? '').trim();
      if (!s) return { error: `Hãy nhập ${inText}.` };
      const n = parseNum(s);
      if (n === null || !(n > 0)) return { error: `${label} phải là một số lớn hơn 0.` };
      v[key] = n;
    }
    if (type === 'hinh-binh-hanh' && v.h > v.b) return { error: 'Chiều cao h không thể lớn hơn cạnh bên b.' };
    if (type === 'hinh-thang' && v.b >= v.a) return { error: 'Đáy lớn a phải dài hơn đáy nhỏ b.' };
    let w, h, local;
    if (type === 'hinh-vuong') { w = h = v.a; local = [[-w / 2, h / 2], [w / 2, h / 2], [w / 2, -h / 2], [-w / 2, -h / 2]]; }
    else if (type === 'hinh-chu-nhat') { w = v.a; h = v.b; local = [[-w / 2, h / 2], [w / 2, h / 2], [w / 2, -h / 2], [-w / 2, -h / 2]]; }
    else if (type === 'hinh-thoi') { w = v.d2; h = v.d1; local = [[0, h / 2], [w / 2, 0], [0, -h / 2], [-w / 2, 0]]; }
    else if (type === 'hinh-binh-hanh') { const s = Math.sqrt(v.b * v.b - v.h * v.h); w = v.a + s; h = v.h; local = [[-w / 2 + s, h / 2], [w / 2, h / 2], [w / 2 - s, -h / 2], [-w / 2, -h / 2]]; }
    else { w = v.a; h = v.h; local = [[-v.b / 2, h / 2], [v.b / 2, h / 2], [w / 2, -h / 2], [-w / 2, -h / 2]]; }
    const fits = k => w / k <= board.fitW && h / k <= board.fitH;
    let k = SCALES.find(k => k >= 1 && fits(k));
    if (Math.max(w, h) < 2) k = SCALES.find(fits);
    if (!k) return { error: 'Số đo quá lớn để vẽ. Hãy nhập số nhỏ hơn 7000.' };
    const cx = board.W / 2 * k, cy = board.H / 2 * k;
    return { v, k, pts: local.map(([x, y]) => ({ x: cx + x, y: cy + y })) };
  }

  // Kết quả kèm công thức và phép thay số: [tên, biểu thức, giá trị, đơn vị]
  function measure(type, v) {
    const f = fmt;
    if (type === 'hinh-vuong') return [
      ['Chu vi', `P = 4 · a = 4 · ${f(v.a)}`, 4 * v.a, 'cm'],
      ['Diện tích', `S = a² = ${f(v.a)}²`, v.a * v.a, 'cm²'],
      ['Đường chéo', `d = a · √2 = ${f(v.a)} · √2`, v.a * Math.SQRT2, 'cm']];
    if (type === 'hinh-chu-nhat') return [
      ['Chu vi', `P = 2 · (a + b) = 2 · (${f(v.a)} + ${f(v.b)})`, 2 * (v.a + v.b), 'cm'],
      ['Diện tích', `S = a · b = ${f(v.a)} · ${f(v.b)}`, v.a * v.b, 'cm²'],
      ['Đường chéo', `d = √(a² + b²) = √(${f(v.a)}² + ${f(v.b)}²)`, Math.hypot(v.a, v.b), 'cm']];
    if (type === 'hinh-thoi') { const c = Math.hypot(v.d1 / 2, v.d2 / 2); return [
      ['Diện tích', `S = d₁ · d₂ : 2 = ${f(v.d1)} · ${f(v.d2)} : 2`, v.d1 * v.d2 / 2, 'cm²'],
      ['Cạnh', `a = √((d₁ : 2)² + (d₂ : 2)²) = √(${f(v.d1 / 2)}² + ${f(v.d2 / 2)}²)`, c, 'cm'],
      ['Chu vi', `P = 4 · a = 4 · ${f(c)}`, 4 * c, 'cm']]; }
    if (type === 'hinh-binh-hanh') return [
      ['Diện tích', `S = a · h = ${f(v.a)} · ${f(v.h)}`, v.a * v.h, 'cm²'],
      ['Chu vi', `P = 2 · (a + b) = 2 · (${f(v.a)} + ${f(v.b)})`, 2 * (v.a + v.b), 'cm']];
    const c = Math.hypot(v.h, (v.a - v.b) / 2);
    return [
      ['Diện tích', `S = (a + b) · h : 2 = (${f(v.a)} + ${f(v.b)}) · ${f(v.h)} : 2`, (v.a + v.b) * v.h / 2, 'cm²'],
      ['Cạnh bên', `c = √(h² + ((a − b) : 2)²) = √(${f(v.h)}² + ${f((v.a - v.b) / 2)}²)`, c, 'cm'],
      ['Chu vi', `P = a + b + 2 · c = ${f(v.a)} + ${f(v.b)} + 2 · ${f(c)}`, v.a + v.b + 2 * c, 'cm'],
      ['Đường trung bình', `m = (a + b) : 2 = (${f(v.a)} + ${f(v.b)}) : 2`, (v.a + v.b) / 2, 'cm']];
  }

  return { fmt, isRound, parseNum, dist, area, sides, perimeter, diagonals, angles, isSimple, isConvex, classify, SHAPES, build, measure };
})();
if (typeof module !== 'undefined') module.exports = Geometry;