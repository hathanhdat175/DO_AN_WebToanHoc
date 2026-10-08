// Kiểm tra nhanh toàn bộ API trên máy chủ đang chạy (cần Neo4j đã nạp dữ liệu mẫu).
// Cách dùng: mở một Terminal chạy "npm start", mở Terminal thứ hai chạy "npm run smoke".
// Script tự tạo một học sinh tạm và một số nội dung tạm, rồi xóa hết khi xong.
const BASE = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
let pass = 0, fail = 0;

async function call(method, path, body, token) {
  const res = await fetch(BASE + '/api' + path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch (e) {}
  return { status: res.status, data };
}
async function check(name, fn) {
  try {
    const detail = await fn();
    pass++; console.log('  ✓', name, detail ? `(${detail})` : '');
  } catch (e) {
    fail++; console.log('  ✗', name, '\n      →', e.message);
  }
}
function expect(cond, message) { if (!cond) throw new Error(message); }
const okStatus = (r, code = 200) => expect(r.status === code, `mong đợi mã ${code}, nhận ${r.status}: ${JSON.stringify(r.data)}`);

(async () => {
  console.log(`Kiểm tra API tại ${BASE}\n`);
  try { okStatus(await call('GET', '/health')); }
  catch (e) { console.log('Không gọi được máy chủ. Hãy chạy "npm start" ở một Terminal khác trước.\n', e.message); process.exit(1); }

  const email = `smoke-${Date.now()}@kiemtra.example`;
  let hs, gv, qt, tempId, lessonId, exerciseId, testId;

  console.log('Đăng nhập và phân quyền');
  await check('Đăng nhập giáo viên mẫu', async () => { const r = await call('POST', '/auth/login', { email: 'lan@giaovien.example', password: '123456' }); okStatus(r); gv = r.data.token; });
  await check('Đăng nhập quản trị viên mẫu', async () => { const r = await call('POST', '/auth/login', { email: 'admin@truong.example', password: '123456' }); okStatus(r); qt = r.data.token; });
  await check('Sai mật khẩu bị từ chối', async () => okStatus(await call('POST', '/auth/login', { email: 'lan@giaovien.example', password: 'sai' }), 401));
  await check('Đăng ký học sinh tạm', async () => { const r = await call('POST', '/auth/register', { name: 'Học sinh tạm', email, password: 'matkhau1', lop: '8C' }); okStatus(r, 201); hs = r.data.token; tempId = r.data.user.id; expect(r.data.user.role === 'hs', 'vai trò phải là hs'); });
  await check('Đăng ký trùng email bị từ chối', async () => okStatus(await call('POST', '/auth/register', { name: 'X', email, password: 'matkhau1' }), 400));
  await check('Chưa đăng nhập thì không xem được', async () => okStatus(await call('GET', '/topics'), 401));
  await check('Học sinh không vào được trang quản lý', async () => okStatus(await call('GET', '/manage/lessons', null, hs), 403));
  await check('Giáo viên không vào được trang quản trị', async () => okStatus(await call('GET', '/admin/users', null, gv), 403));
  await check('Xem và sửa hồ sơ', async () => { okStatus(await call('GET', '/me', null, hs)); const r = await call('PUT', '/me', { name: 'Học sinh tạm 2', lop: '8D' }, hs); okStatus(r); expect(r.data.lop === '8D', 'lớp chưa đổi'); });

  console.log('\nLý thuyết');
  await check('Sáu chủ đề và quan hệ IS_A', async () => { const r = await call('GET', '/topics', null, hs); okStatus(r); expect(r.data.length === 6, `có ${r.data.length} chủ đề`); const v = r.data.find(t => t.id === 'hinh-vuong'); expect(v && v.isA.length === 2, 'hình vuông phải IS_A hai hình'); return '6 chủ đề'; });
  await check('Bài học của hình vuông và 5 hình tổng quát hơn', async () => { const r = await call('GET', '/topics/hinh-vuong/lessons', null, hs); okStatus(r); expect(r.data.lessons.length >= 1, 'thiếu bài học'); expect(r.data.ancestors.length === 5, `có ${r.data.ancestors.length} hình tổng quát`); lessonId = r.data.lessons[0].id; return r.data.ancestors.map(a => a.name).join(', '); });
  await check('Tìm kiếm không dấu "duong cheo"', async () => { const r = await call('GET', '/lessons?q=' + encodeURIComponent('duong cheo'), null, hs); okStatus(r); expect(r.data.length > 0, 'không tìm thấy bài nào'); return r.data.length + ' bài'; });
  await check('Đánh dấu đã học', async () => { okStatus(await call('POST', `/lessons/${lessonId}/studied`, {}, hs)); const r = await call('GET', '/topics', null, hs); expect(r.data.find(t => t.id === 'hinh-vuong').studied === true, 'cờ đã học chưa bật'); });

  console.log('\nLuyện tập và kiểm tra');
  await check('Danh sách bài tập không lộ đáp án', async () => { const r = await call('GET', '/exercises', null, hs); okStatus(r); expect(r.data.items.length >= 15, `có ${r.data.items.length} bài`); expect(!('answer' in r.data.items[0]) && !('solution' in r.data.items[0]), 'danh sách đang lộ đáp án'); return r.data.items.length + ' bài'; });
  await check('Lọc theo chủ đề và mức độ', async () => { const r = await call('GET', '/exercises?topic=hinh-thang&level=1', null, hs); okStatus(r); expect(r.data.items.length === 1 && r.data.items[0].id === 'bt-03', 'kết quả lọc sai'); });
  await check('Gửi đáp án đúng (bt-03 = 50)', async () => { const r = await call('POST', '/exercises/bt-03/attempts', { answer: '50' }, hs); okStatus(r); expect(r.data.correct === true, 'phải được chấm đúng'); });
  await check('Gửi đáp án sai', async () => { const r = await call('POST', '/exercises/bt-04/attempts', { answer: '65' }, hs); okStatus(r); expect(r.data.correct === false && r.data.answerText === '115°', 'chấm sai hoặc thiếu đáp án'); });
  await check('Đáp án không phải số bị từ chối', async () => okStatus(await call('POST', '/exercises/bt-03/attempts', { answer: 'abc' }, hs), 400));
  await check('Trạng thái bài tập được cập nhật', async () => { const r = await call('GET', '/exercises?topic=hinh-thang', null, hs); const m = Object.fromEntries(r.data.items.map(x => [x.id, x.status])); expect(m['bt-03'] === 'ok' && m['bt-04'] === 'bad' && m['bt-05'] === null, JSON.stringify(m)); });
  await check('Danh sách bài kiểm tra chỉ gồm bài đã công bố', async () => { const r = await call('GET', '/tests', null, hs); okStatus(r); expect(r.data.some(t => t.id === 'kt-2') && !r.data.some(t => t.id === 'kt-3'), 'danh sách sai'); });
  await check('Học sinh không mở được bản nháp', async () => okStatus(await call('GET', '/tests/kt-3', null, hs), 404));
  await check('Lấy đề kt-2 theo đúng thứ tự', async () => { const r = await call('GET', '/tests/kt-2', null, hs); okStatus(r); expect(r.data.questions.map(q => q.id).join() === 'bt-01,bt-04,bt-08,bt-02', r.data.questions.map(q => q.id).join()); });
  await check('Nộp bài và chấm thang điểm 10', async () => { const r = await call('POST', '/tests/kt-2/results', { answers: { 'bt-01': '100', 'bt-04': '115', 'bt-08': '90' }, seconds: 42 }, hs); okStatus(r, 201); expect(r.data.result.score === 5 && r.data.result.correct === 2, JSON.stringify(r.data.result)); return 'điểm ' + r.data.result.score; });
  await check('Tiến độ, lịch sử và gợi ý', async () => { const r = await call('GET', '/me/progress', null, hs); okStatus(r); const d = r.data; expect(d.lessons.done === 1 && d.exercises.done === 1 && d.tests.count === 1 && d.tests.average === 5, JSON.stringify([d.lessons, d.exercises, d.tests])); expect(d.topics.length === 6 && d.history.length === 4, `topics ${d.topics.length}, history ${d.history.length}`); expect(d.suggestions.length > 0 && d.suggestions.every(s => s.topicId === 'hinh-vuong'), 'gợi ý phải thuộc chủ đề đã học'); });

  console.log('\nGiáo viên quản lý nội dung');
  let newLesson, newExercise;
  await check('Thêm bài học', async () => { const r = await call('POST', '/lessons', { title: 'Bài học thử', topic: 'hinh-thoi', grade: 'Lớp 8', definition: 'Định nghĩa thử.', traits: 'Một\nHai', signs: '', formulas: 'S = 1' }, gv); okStatus(r, 201); newLesson = r.data.id; });
  await check('Thiếu tiêu đề bị từ chối', async () => okStatus(await call('POST', '/lessons', { title: '', topic: 'hinh-thoi', definition: 'x' }, gv), 400));
  await check('Sửa bài học và đổi chủ đề', async () => { okStatus(await call('PUT', `/lessons/${newLesson}`, { title: 'Bài học thử (đã sửa)', topic: 'hinh-vuong', grade: 'Lớp 9', definition: 'Định nghĩa mới.', traits: ['Một'], signs: [], formulas: [] }, gv)); const r = await call('GET', '/manage/lessons', null, gv); const l = r.data.find(x => x.id === newLesson); expect(l && l.topicId === 'hinh-vuong' && l.title.includes('đã sửa') && l.traits.length === 1, JSON.stringify(l)); });
  await check('Xóa bài học', async () => { okStatus(await call('DELETE', `/lessons/${newLesson}`, null, gv)); const r = await call('GET', '/manage/lessons', null, gv); expect(!r.data.some(x => x.id === newLesson), 'bài học vẫn còn'); });
  await check('Thêm bài tập trắc nghiệm', async () => { const r = await call('POST', '/exercises', { topic: 'tu-giac', level: 2, kind: 'chon', stem: 'Câu hỏi thử?', choices: ['A1', 'B1', 'C1', 'D1'], answer: '2', solution: 'Vì thế.' }, gv); okStatus(r, 201); newExercise = r.data.id; });
  await check('Sửa bài tập thành dạng nhập số', async () => { okStatus(await call('PUT', `/exercises/${newExercise}`, { topic: 'tu-giac', level: 3, kind: 'so', stem: 'Câu hỏi thử số?', answer: '12,5', unit: 'cm', solution: '' }, gv)); const r = await call('GET', '/manage/exercises?topic=tu-giac', null, gv); const x = r.data.find(e => e.id === newExercise); expect(x && x.answer === 12.5 && x.level === 3 && x.kind === 'so', JSON.stringify(x)); });
  await check('Tạo bài kiểm tra nháp', async () => { const r = await call('POST', '/tests', { name: 'Bài kiểm tra thử', minutes: '10', published: false, questionIds: ['bt-01', newExercise] }, gv); okStatus(r, 201); testId = r.data.id; okStatus(await call('GET', `/tests/${testId}`, null, hs), 404); });
  await check('Thời gian không hợp lệ bị từ chối', async () => okStatus(await call('POST', '/tests', { name: 'X', minutes: '0', questionIds: ['bt-01'] }, gv), 400));
  await check('Công bố rồi học sinh thấy bài', async () => { okStatus(await call('PUT', `/tests/${testId}/publish`, { published: true }, gv)); const r = await call('GET', `/tests/${testId}`, null, hs); okStatus(r); expect(r.data.questions.length === 2 && r.data.questions[1].id === newExercise, 'thứ tự câu hỏi sai'); });
  await check('Sửa bài kiểm tra', async () => { okStatus(await call('PUT', `/tests/${testId}`, { name: 'Bài kiểm tra thử 2', minutes: 20, published: true, questionIds: ['bt-02'] }, gv)); const r = await call('GET', '/manage/tests', null, gv); const t = r.data.find(x => x.id === testId); expect(t && t.minutes === 20 && t.questionIds.join() === 'bt-02', JSON.stringify(t)); });
  await check('Xóa bài kiểm tra và bài tập tạm', async () => { okStatus(await call('DELETE', `/tests/${testId}`, null, gv)); okStatus(await call('DELETE', `/exercises/${newExercise}`, null, gv)); });
  await check('Bảng kết quả học sinh', async () => { const r = await call('GET', '/manage/students', null, gv); okStatus(r); const me = r.data.students.find(s => s.id === tempId); expect(me && me.studied === 1 && me.done === 1 && me.average === 5 && me.last > 0, JSON.stringify(me)); expect(r.data.recent.length > 0 && r.data.recent[0].student === 'Học sinh tạm 2', 'bài nộp gần nhất sai'); return r.data.students.length + ' học sinh'; });

  console.log('\nQuản trị viên');
  await check('Danh sách tài khoản', async () => { const r = await call('GET', '/admin/users', null, qt); okStatus(r); expect(r.data.some(u => u.id === tempId) && !('pass' in r.data[0]), 'thiếu tài khoản hoặc lộ mật khẩu'); return r.data.length + ' tài khoản'; });
  await check('Cấp quyền giáo viên rồi thu lại', async () => { okStatus(await call('PUT', `/admin/users/${tempId}/role`, { role: 'gv' }, qt)); okStatus(await call('GET', '/manage/lessons', null, hs)); okStatus(await call('PUT', `/admin/users/${tempId}/role`, { role: 'hs' }, qt)); okStatus(await call('GET', '/manage/lessons', null, hs), 403); });
  await check('Thống kê đồ thị', async () => { const r = await call('GET', '/admin/stats', null, qt); okStatus(r); const n = Object.fromEntries(r.data.nodes.map(x => [x.label, x.total])); expect(n.Topic === 6 && n.User >= 6, JSON.stringify(n)); return r.data.nodes.map(x => `${x.label} ${x.total}`).join(', '); });
  await check('Xuất bản sao lưu Cypher', async () => { const r = await call('GET', '/admin/backup', null, qt); okStatus(r); expect(r.data.cypher.includes("CREATE (:Topic {") && r.data.cypher.includes('-[:IS_A {'), 'bản sao lưu thiếu nội dung'); return r.data.cypher.split('\n').length + ' dòng'; });
  await check('Xóa học sinh tạm cùng dữ liệu của bạn ấy', async () => { okStatus(await call('DELETE', `/admin/users/${tempId}`, null, qt)); okStatus(await call('GET', '/me', null, hs), 401); const r = await call('GET', '/manage/students', null, gv); expect(!r.data.students.some(s => s.id === tempId) && !r.data.recent.some(x => x.student === 'Học sinh tạm 2'), 'dữ liệu tạm vẫn còn'); });

  console.log(`\nKết quả: ${pass} đạt, ${fail} lỗi.`);
  if (fail) console.log('Hãy xem cửa sổ Terminal đang chạy "npm start" để biết câu Cypher nào báo lỗi.');
  process.exit(fail ? 1 : 0);
})();
