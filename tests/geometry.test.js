// Kiểm thử thư viện công thức (NFR-06: công thức và phép tính phải chính xác).
// Chạy: npm test
const G = require('../public/js/geometry');

const P = list => list.map(([x, y]) => ({ x, y }));

describe('Đọc và viết số kiểu Việt Nam', () => {
  test('parseNum nhận dấu phẩy, dấu chấm và đơn vị', () => {
    expect(G.parseNum('12,5')).toBe(12.5);
    expect(G.parseNum('12.5')).toBe(12.5);
    expect(G.parseNum(' 50 cm² ')).toBe(50);
    expect(G.parseNum('100°')).toBe(100);
  });
  test('parseNum trả null khi không phải số', () => {
    expect(G.parseNum('')).toBeNull();
    expect(G.parseNum('abc')).toBeNull();
    expect(G.parseNum('1,2,3')).toBeNull();
  });
  test('fmt dùng dấu phẩy thập phân và làm tròn 2 chữ số', () => {
    expect(G.fmt(12.5)).toBe('12,5');
    expect(G.fmt(5.6568)).toBe('5,66');
    expect(G.fmt(10)).toBe('10');
  });
});

describe('Đo tứ giác từ tọa độ', () => {
  const rect = P([[0, 3], [4, 3], [4, 0], [0, 0]]);
  test('diện tích, chu vi, đường chéo của hình chữ nhật 4 × 3', () => {
    expect(G.area(rect)).toBeCloseTo(12, 9);
    expect(G.perimeter(rect)).toBeCloseTo(14, 9);
    expect(G.diagonals(rect)[0]).toBeCloseTo(5, 9);
    expect(G.diagonals(rect)[1]).toBeCloseTo(5, 9);
  });
  test('tổng bốn góc luôn bằng 360°, kể cả tứ giác lõm', () => {
    const sum = pts => G.angles(pts).reduce((a, b) => a + b, 0);
    expect(sum(rect)).toBeCloseTo(360, 6);
    expect(sum(P([[3, 7], [9, 6], [10, 2], [2, 1.5]]))).toBeCloseTo(360, 6);
    expect(sum(P([[0, 4], [2, 1], [4, 4], [2, 0]]))).toBeCloseTo(360, 6);
  });
});

describe('Nhận dạng loại tứ giác', () => {
  const cases = [
    ['hinh-vuong', [[0, 4], [4, 4], [4, 0], [0, 0]]],
    ['hinh-chu-nhat', [[0, 3], [4, 3], [4, 0], [0, 0]]],
    ['hinh-thoi', [[0, 3], [4, 0], [0, -3], [-4, 0]]],
    ['hinh-binh-hanh', [[3, 4], [9, 4], [6, 0], [0, 0]]],
    ['hinh-thang-can', [[3, 4], [6, 4], [9, 0], [0, 0]]],
    ['hinh-thang-vuong', [[0, 4], [5, 4], [9, 0], [0, 0]]],
    ['hinh-thang', [[1, 4], [5, 4], [9, 0], [0, 0]]],
    ['tu-giac-loi', [[3, 7], [9, 6], [10, 2], [2, 1.5]]],
    ['tu-giac-lom', [[0, 4], [2, 1], [4, 4], [2, 0]]],
  ];
  cases.forEach(([kind, pts]) => test(kind, () => expect(G.classify(P(pts))).toBe(kind)));

  test('bốn điểm không tạo thành tứ giác', () => {
    expect(G.classify(P([[0, 0], [4, 4], [4, 0], [0, 4]]))).toBe('khong-hop-le'); // hai cạnh cắt nhau
    expect(G.classify(P([[0, 0], [2, 0], [4, 0], [0, 4]]))).toBe('khong-hop-le'); // ba đỉnh thẳng hàng
  });
});

describe('Dựng hình từ dữ kiện và tính theo công thức', () => {
  const value = (rows, name) => rows.find(r => r[0] === name)[2];

  test('hình dựng ra đúng loại, công thức khớp với số đo trên hình', () => {
    for (const type of Object.keys(G.SHAPES)) {
      const built = G.build(type, G.SHAPES[type].def);
      expect(built.error).toBeUndefined();
      expect(G.classify(built.pts)).toBe(type === 'hinh-thang' ? 'hinh-thang-can' : type);
      const rows = G.measure(type, built.v);
      expect(value(rows, 'Diện tích')).toBeCloseTo(G.area(built.pts), 9);
      expect(value(rows, 'Chu vi')).toBeCloseTo(G.perimeter(built.pts), 9);
    }
  });
  test('các kết quả quen thuộc', () => {
    expect(value(G.measure('hinh-chu-nhat', { a: 8, b: 6 }), 'Đường chéo')).toBeCloseTo(10, 9);
    expect(value(G.measure('hinh-thoi', { d1: 6, d2: 8 }), 'Cạnh')).toBeCloseTo(5, 9);
    expect(value(G.measure('hinh-thoi', { d1: 10, d2: 24 }), 'Diện tích')).toBeCloseTo(120, 9);
    expect(value(G.measure('hinh-thang', { a: 12, b: 8, h: 5 }), 'Diện tích')).toBeCloseTo(50, 9);
    expect(value(G.measure('hinh-thang', { a: 14, b: 8, h: 4 }), 'Cạnh bên')).toBeCloseTo(5, 9);
    expect(value(G.measure('hinh-vuong', { a: 9 }), 'Diện tích')).toBeCloseTo(81, 9);
  });
  test('báo lỗi khi dữ kiện thiếu hoặc sai', () => {
    expect(G.build('hinh-vuong', { a: '' }).error).toMatch(/Hãy nhập/);
    expect(G.build('hinh-vuong', { a: 'abc' }).error).toMatch(/lớn hơn 0/);
    expect(G.build('hinh-vuong', { a: '-3' }).error).toMatch(/lớn hơn 0/);
    expect(G.build('hinh-binh-hanh', { a: '6', b: '3', h: '4' }).error).toMatch(/Chiều cao/);
    expect(G.build('hinh-thang', { a: '3', b: '5', h: '2' }).error).toMatch(/Đáy lớn/);
  });
  test('hình lớn được thu nhỏ theo tỉ lệ để vừa giấy', () => {
    expect(G.build('hinh-chu-nhat', { a: '120', b: '2,5' }).k).toBe(20);
    expect(G.build('hinh-vuong', { a: '4' }).k).toBe(1);
  });
});
