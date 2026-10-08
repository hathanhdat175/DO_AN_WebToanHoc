// Chấm đáp án. Dùng chung hàm đọc số với giao diện (public/js/geometry.js).
const { parseNum, fmt } = require('../public/js/geometry');

// Trả { invalid: true } nếu câu trả lời không hợp lệ, ngược lại { correct: true/false }.
function grade(exercise, raw) {
  if (exercise.kind === 'chon') {
    if (raw === '' || raw === null || raw === undefined) return { invalid: true };
    return { correct: Number(raw) === exercise.answer };
  }
  const n = parseNum(raw);
  return n === null ? { invalid: true } : { correct: Math.abs(n - exercise.answer) <= 0.011 };
}

// Đáp án đúng ở dạng chữ để hiển thị, ví dụ "50 cm²" hoặc "B. Tứ giác có ...".
function answerText(exercise) {
  if (exercise.kind === 'chon') return `${'ABCD'[exercise.answer]}. ${exercise.choices[exercise.answer]}`;
  const unit = exercise.unit === '°' ? '°' : exercise.unit ? ' ' + exercise.unit : '';
  return fmt(exercise.answer) + unit;
}

// Thang điểm 10, làm tròn một chữ số thập phân.
const score10 = (correct, total) => (total ? Math.round(correct / total * 100) / 10 : 0);

module.exports = { grade, answerText, score10 };
