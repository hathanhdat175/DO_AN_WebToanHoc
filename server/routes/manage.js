// Chức năng của giáo viên (và quản trị viên): quản lý bài học, bài tập, bài kiểm tra, xem kết quả học sinh
// (FR-18, FR-24 đến FR-27).
const { randomUUID } = require('crypto');
const { h, bad, notFound, text, lines } = require('../http');
const { parseNum } = require('../../public/js/geometry');

module.exports = (r, { repo, auth, allow }) => {
  const staff = [auth, allow('gv', 'qt')];

  /* ----- Bài học ----- */
  r.get('/manage/lessons', staff, h(async (req, res) => res.json(await repo.allLessons())));

  async function lessonInput(body) {
    const b = body || {};
    const props = { title: text(b.title), grade: text(b.grade), definition: text(b.definition), traits: lines(b.traits), signs: lines(b.signs), formulas: lines(b.formulas) };
    if (!props.title) bad('Hãy nhập tiêu đề bài học.');
    if (!props.definition) bad('Hãy nhập phần định nghĩa.');
    if (!(await repo.topicExists(text(b.topic)))) bad('Hãy chọn chủ đề.');
    return { props, topic: text(b.topic) };
  }
  r.post('/lessons', staff, h(async (req, res) => {
    const { props, topic } = await lessonInput(req.body);
    res.status(201).json({ id: await repo.saveLesson(null, randomUUID(), props, topic) });
  }));
  r.put('/lessons/:id', staff, h(async (req, res) => {
    const { props, topic } = await lessonInput(req.body);
    res.json({ id: await repo.saveLesson(req.params.id, null, props, topic) });
  }));
  r.delete('/lessons/:id', staff, h(async (req, res) => { await repo.remove('lesson', req.params.id); res.json({ ok: true }); }));

  /* ----- Bài tập (ngân hàng câu hỏi) ----- */
  r.get('/manage/exercises', staff, h(async (req, res) => {
    res.json(await repo.listExercises({ topic: text(req.query.topic) || null, level: null }, req.user.id));
  }));

  async function exerciseInput(body) {
    const b = body || {};
    const props = { level: [1, 2, 3].includes(Number(b.level)) ? Number(b.level) : 1, kind: b.kind === 'chon' ? 'chon' : 'so', stem: text(b.stem), solution: text(b.solution), unit: '', choices: [], answer: 0 };
    if (!(await repo.topicExists(text(b.topic)))) bad('Hãy chọn chủ đề.');
    if (!props.stem) bad('Hãy nhập đề bài.');
    if (props.kind === 'so') {
      const n = parseNum(b.answer);
      if (n === null) bad('Đáp án phải là một số, ví dụ 12 hoặc 12,5.');
      props.answer = n; props.unit = text(b.unit);
    } else {
      props.choices = (Array.isArray(b.choices) ? b.choices : []).slice(0, 4).map(text);
      if (props.choices.length !== 4 || props.choices.some(x => !x)) bad('Hãy nhập đủ bốn phương án A, B, C, D.');
      if (![0, 1, 2, 3].includes(Number(b.answer)) || b.answer === '' || b.answer === null || b.answer === undefined) bad('Hãy đánh dấu phương án đúng.');
      props.answer = Number(b.answer);
    }
    return { props, topic: text(b.topic) };
  }
  r.post('/exercises', staff, h(async (req, res) => {
    const { props, topic } = await exerciseInput(req.body);
    res.status(201).json({ id: await repo.saveExercise(null, randomUUID(), props, topic) });
  }));
  r.put('/exercises/:id', staff, h(async (req, res) => {
    if (!(await repo.getExercise(req.params.id))) notFound('Không tìm thấy bài tập.');
    const { props, topic } = await exerciseInput(req.body);
    res.json({ id: await repo.saveExercise(req.params.id, null, props, topic) });
  }));
  r.delete('/exercises/:id', staff, h(async (req, res) => { await repo.remove('exercise', req.params.id); res.json({ ok: true }); }));

  /* ----- Bài kiểm tra ----- */
  r.get('/manage/tests', staff, h(async (req, res) => res.json(await repo.listTests(req.user.id, false))));

  async function testInput(body) {
    const b = body || {}, name = text(b.name), minutes = parseNum(b.minutes);
    const questionIds = [...new Set((Array.isArray(b.questionIds) ? b.questionIds : []).map(text).filter(Boolean))];
    if (!name) bad('Hãy nhập tên bài kiểm tra.');
    if (minutes === null || minutes < 1 || minutes > 90 || minutes % 1) bad('Thời gian làm bài là số nguyên từ 1 đến 90 phút.');
    if (!questionIds.length) bad('Hãy chọn ít nhất một câu hỏi.');
    const found = await repo.existingExerciseIds(questionIds);
    if (found.length !== questionIds.length) bad('Có câu hỏi không còn trong ngân hàng. Hãy tải lại trang và chọn lại.');
    return { props: { name, minutes, published: !!b.published }, questionIds };
  }
  r.post('/tests', staff, h(async (req, res) => {
    const { props, questionIds } = await testInput(req.body);
    res.status(201).json({ id: await repo.saveTest(null, randomUUID(), props, questionIds) });
  }));
  r.put('/tests/:id', staff, h(async (req, res) => {
    if (!(await repo.getTest(req.params.id))) notFound('Không tìm thấy bài kiểm tra.');
    const { props, questionIds } = await testInput(req.body);
    res.json({ id: await repo.saveTest(req.params.id, null, props, questionIds) });
  }));
  r.put('/tests/:id/publish', staff, h(async (req, res) => {
    if (!(await repo.getTest(req.params.id))) notFound('Không tìm thấy bài kiểm tra.');
    await repo.setPublished(req.params.id, !!(req.body || {}).published);
    res.json({ ok: true });
  }));
  r.delete('/tests/:id', staff, h(async (req, res) => { await repo.remove('test', req.params.id); res.json({ ok: true }); }));

  /* ----- Kết quả học sinh ----- */
  r.get('/manage/students', staff, h(async (req, res) => {
    const [students, recent, c] = await Promise.all([repo.students(), repo.recentResults(), repo.counts(req.user.id)]);
    res.json({
      lessonTotal: c.lessonTotal, exerciseTotal: c.exerciseTotal, recent,
      students: students.map(s => ({
        id: s.id, name: s.name, lop: s.lop || '', studied: s.studied, done: s.done, tests: s.tests,
        average: s.average === null || s.average === undefined ? null : Math.round(s.average * 10) / 10,
        last: Math.max(0, s.lastStudy || 0, s.lastTry || 0, s.lastTest || 0) || null,
      })),
    });
  }));
};
