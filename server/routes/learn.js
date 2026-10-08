// Các chức năng của người học: lý thuyết, luyện tập, kiểm tra, tiến độ (FR-05 đến FR-23).
const { randomUUID } = require('crypto');
const { h, bad, notFound, text } = require('../http');
const { grade, answerText, score10 } = require('../grade');

// Bỏ dấu tiếng Việt để tìm kiếm không cần gõ dấu: "duong cheo" khớp với "đường chéo".
const fold = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
// Câu hỏi gửi cho học sinh không được chứa đáp án và lời giải.
const forStudent = e => ({ id: e.id, stem: e.stem, kind: e.kind, level: e.level, unit: e.unit, choices: e.choices || [] });

module.exports = (r, { repo, auth }) => {
  // GET /api/topics — sáu chủ đề, quan hệ IS_A và cờ đã học
  r.get('/topics', auth, h(async (req, res) => res.json(await repo.listTopics(req.user.id))));

  // GET /api/topics/:id/lessons — bài học của chủ đề + các hình tổng quát hơn (đi theo IS_A)
  r.get('/topics/:id/lessons', auth, h(async (req, res) => {
    if (!(await repo.topicExists(req.params.id))) notFound('Không tìm thấy chủ đề.');
    const [lessons, ancestors] = await Promise.all([repo.lessonsOfTopic(req.params.id, req.user.id), repo.ancestors(req.params.id)]);
    res.json({ lessons, ancestors });
  }));

  // GET /api/lessons?q=tu-khoa — tìm bài học theo tên hoặc từ khóa
  r.get('/lessons', auth, h(async (req, res) => {
    const q = fold(text(req.query.q));
    const all = await repo.allLessons();
    const found = !q ? all : all.filter(l => fold([l.title, l.topicName, l.definition, ...(l.traits || []), ...(l.signs || []), ...(l.formulas || [])].join(' ')).includes(q));
    res.json(found.map(l => ({ id: l.id, title: l.title, definition: l.definition, topicId: l.topicId, topicName: l.topicName })));
  }));

  // POST /api/lessons/:id/studied — đánh dấu đã học
  r.post('/lessons/:id/studied', auth, h(async (req, res) => {
    if (!(await repo.markStudied(req.user.id, req.params.id))) notFound('Không tìm thấy bài học.');
    res.json({ ok: true });
  }));

  // GET /api/exercises?topic=&level= — danh sách bài tập kèm trạng thái của người học
  r.get('/exercises', auth, h(async (req, res) => {
    const topic = text(req.query.topic) || null, level = Number(req.query.level) || null;
    const [list, c] = await Promise.all([repo.listExercises({ topic, level }, req.user.id), repo.counts(req.user.id)]);
    res.json({
      done: c.done, total: c.exerciseTotal,
      items: list.map(e => ({ ...forStudent(e), topicId: e.topicId, topicName: e.topicName, status: e.rights > 0 ? 'ok' : e.tries > 0 ? 'bad' : null })),
    });
  }));

  // POST /api/exercises/:id/attempts  { answer } — chấm và lưu một lần làm bài
  r.post('/exercises/:id/attempts', auth, h(async (req, res) => {
    const ex = await repo.getExercise(req.params.id);
    if (!ex) notFound('Không tìm thấy bài tập.');
    const raw = (req.body || {}).answer, g = grade(ex, raw);
    if (g.invalid) bad(ex.kind === 'chon' ? 'Hãy chọn một phương án trước khi gửi.' : 'Đáp án phải là một số, ví dụ 12 hoặc 12,5.');
    await repo.recordAttempt(req.user.id, ex.id, text(raw), g.correct);
    res.json({ correct: g.correct, answerText: answerText(ex), solution: ex.solution || '' });
  }));

  // GET /api/tests — bài kiểm tra đã công bố
  r.get('/tests', auth, h(async (req, res) => {
    const tests = await repo.listTests(req.user.id, true);
    res.json(tests.filter(t => t.questionIds.length).map(t => ({ id: t.id, name: t.name, minutes: t.minutes, questions: t.questionIds.length, myTries: t.myTries, myBest: t.myBest })));
  }));

  // GET /api/tests/:id — đề bài (không có đáp án)
  r.get('/tests/:id', auth, h(async (req, res) => {
    const t = await repo.getTest(req.params.id);
    if (!t || (!t.published && req.user.role === 'hs')) notFound('Không tìm thấy bài kiểm tra.');
    res.json({ id: t.id, name: t.name, minutes: t.minutes, questions: (await repo.testQuestions(t.id)).map(forStudent) });
  }));

  // POST /api/tests/:id/results  { answers: { <id câu hỏi>: <trả lời> }, seconds } — nộp bài, chấm theo thang điểm 10
  r.post('/tests/:id/results', auth, h(async (req, res) => {
    const t = await repo.getTest(req.params.id);
    if (!t || (!t.published && req.user.role === 'hs')) notFound('Không tìm thấy bài kiểm tra.');
    const qs = await repo.testQuestions(t.id);
    if (!qs.length) bad('Bài kiểm tra này chưa có câu hỏi.');
    const b = req.body || {}, answers = b.answers && typeof b.answers === 'object' ? b.answers : {};
    const review = qs.map(ex => {
      const given = text(answers[ex.id]);
      return { stem: ex.stem, kind: ex.kind, given, correct: !!grade(ex, given).correct, answerText: answerText(ex), solution: ex.solution || '' };
    });
    const correct = review.filter(x => x.correct).length;
    const seconds = Math.max(0, Math.min(Math.round(Number(b.seconds) || 0), t.minutes * 60));
    const result = { id: randomUUID(), score: score10(correct, qs.length), correct, total: qs.length, seconds, testName: t.name };
    await repo.saveResult(req.user.id, t.id, result);
    res.status(201).json({ result, review });
  }));

  // GET /api/me/progress — thống kê, tiến độ theo chủ đề, lịch sử và gợi ý luyện tiếp
  r.get('/me/progress', auth, h(async (req, res) => {
    const uid = req.user.id;
    const [c, topics, hist, suggestions] = await Promise.all([repo.counts(uid), repo.topicProgress(uid), repo.history(uid), repo.suggestions(uid)]);
    const history = [
      ...hist.studied.map(x => ({ at: x.at, text: 'Học bài ' + x.title })),
      ...hist.attempts.map(x => ({ at: x.at, bad: !x.correct, text: (x.correct ? 'Làm đúng: ' : 'Làm sai: ') + x.stem })),
      ...hist.results.map(x => ({ at: x.at, text: `Nộp bài “${x.testName}”, đạt ${String(x.score).replace('.', ',')} điểm` })),
    ].sort((a, b) => b.at - a.at).slice(0, 12);
    const scores = hist.results.map(x => x.score);
    res.json({
      lessons: { done: c.studied, total: c.lessonTotal },
      exercises: { done: c.done, total: c.exerciseTotal },
      tests: { count: scores.length, average: scores.length ? Math.round(scores.reduce((a, x) => a + x, 0) / scores.length * 10) / 10 : null },
      topics, history, suggestions,
    });
  }));
};
