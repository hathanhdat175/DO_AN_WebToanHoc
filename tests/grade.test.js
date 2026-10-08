// Kiểm thử phần chấm đáp án và xuất bản sao lưu (không cần Neo4j).
const { grade, answerText, score10 } = require('../server/grade');
const { toCypher } = require('../server/routes/admin');

const numeric = { kind: 'so', answer: 50, unit: 'cm²', choices: [] };
const angle = { kind: 'so', answer: 115, unit: '°', choices: [] };
const choice = { kind: 'chon', answer: 1, unit: '', choices: ['Một', 'Hai', 'Ba', 'Bốn'] };

describe('Chấm câu nhập đáp số', () => {
  test('đúng khi nhập số, có thể kèm đơn vị hoặc dấu phẩy', () => {
    expect(grade(numeric, '50').correct).toBe(true);
    expect(grade(numeric, '50,0 cm²').correct).toBe(true);
    expect(grade(numeric, '50.005').correct).toBe(true);
  });
  test('sai khi lệch quá 0,01', () => {
    expect(grade(numeric, '50,5').correct).toBe(false);
    expect(grade(angle, '65').correct).toBe(false);
  });
  test('không hợp lệ khi bỏ trống hoặc không phải số', () => {
    expect(grade(numeric, '').invalid).toBe(true);
    expect(grade(numeric, 'năm mươi').invalid).toBe(true);
  });
});

describe('Chấm câu trắc nghiệm', () => {
  test('so sánh vị trí phương án', () => {
    expect(grade(choice, '1').correct).toBe(true);
    expect(grade(choice, 1).correct).toBe(true);
    expect(grade(choice, '0').correct).toBe(false);
  });
  test('chưa chọn phương án là không hợp lệ', () => {
    expect(grade(choice, '').invalid).toBe(true);
    expect(grade(choice, undefined).invalid).toBe(true);
  });
});

describe('Hiển thị đáp án và tính điểm', () => {
  test('answerText', () => {
    expect(answerText(numeric)).toBe('50 cm²');
    expect(answerText(angle)).toBe('115°');
    expect(answerText(choice)).toBe('B. Hai');
  });
  test('thang điểm 10, một chữ số thập phân', () => {
    expect(score10(6, 6)).toBe(10);
    expect(score10(3, 4)).toBe(7.5);
    expect(score10(5, 6)).toBe(8.3);
    expect(score10(0, 4)).toBe(0);
  });
});

describe('Xuất bản sao lưu Cypher', () => {
  test('viết đúng nút, quan hệ và ký tự đặc biệt', () => {
    const out = toCypher({
      nodes: [{ label: 'Topic', props: { id: 'tu-giac', name: "Tứ giác 'thường'", pos: 1 } }, { label: 'Lesson', props: { id: 'bai-1', traits: ['a', 'b'], grade: null } }],
      rels: [{ fromId: 'bai-1', relType: 'BELONGS_TO', toId: 'tu-giac', props: {} }],
    });
    expect(out).toContain("CREATE (:Topic {id: 'tu-giac', name: 'Tứ giác \\'thường\\'', pos: 1});");
    expect(out).toContain("CREATE (:Lesson {id: 'bai-1', traits: ['a', 'b']});");
    expect(out).toContain("MATCH (a {id: 'bai-1'}), (b {id: 'tu-giac'}) CREATE (a)-[:BELONGS_TO]->(b);");
  });
});
