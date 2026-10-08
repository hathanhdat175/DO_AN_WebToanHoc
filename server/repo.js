// Toàn bộ câu Cypher của ứng dụng nằm trong file này (tầng truy cập dữ liệu).
// Mỗi hàm chạy một hoặc vài câu Cypher và trả về object/mảng thường cho các route.
//
// Mô hình đồ thị:
//   (:User)-[:STUDIED {at}]->(:Lesson)-[:BELONGS_TO]->(:Topic)-[:IS_A {condition}]->(:Topic)
//   (:User)-[:ATTEMPTED {answer, correct, at}]->(:Exercise)-[:BELONGS_TO]->(:Topic)
//   (:User)-[:TOOK]->(:Result)-[:OF]->(:Test)-[:CONTAINS {pos}]->(:Exercise)
const { run, write, int } = require('./db');

const one = async (cypher, params) => (await run(cypher, params))[0] || null;
const LABEL = { lesson: 'Lesson', exercise: 'Exercise', test: 'Test' };

/* ---------------- Người dùng ---------------- */

async function findUserByEmail(email) {
  const row = await one('MATCH (u:User {email: $email}) RETURN u AS user', { email });
  return row && row.user;
}

async function findUserById(id) {
  const row = await one('MATCH (u:User {id: $id}) RETURN u AS user', { id });
  return row && row.user;
}

async function createUser(user) {
  const row = await one('CREATE (u:User $props) SET u.createdAt = timestamp() RETURN u AS user', { props: user });
  return row.user;
}

async function updateProfile(id, { name, lop }) {
  const row = await one('MATCH (u:User {id: $id}) SET u.name = $name, u.lop = $lop RETURN u AS user', { id, name, lop });
  return row && row.user;
}

async function listUsers() {
  const rows = await run('MATCH (u:User) RETURN u AS user ORDER BY u.role, u.name');
  return rows.map(r => r.user);
}

async function setRole(id, role) {
  await run('MATCH (u:User {id: $id}) SET u.role = $role', { id, role });
}

// Xóa tài khoản cùng các kết quả kiểm tra của tài khoản đó.
async function deleteUser(id) {
  await run(`
    MATCH (u:User {id: $id})
    OPTIONAL MATCH (u)-[:TOOK]->(r:Result)
    DETACH DELETE r, u`, { id });
}

/* ---------------- Chủ đề và bài học ---------------- */

// Sáu chủ đề kèm quan hệ IS_A và cờ "đã học" của người dùng hiện tại.
async function listTopics(uid) {
  return run(`
    MATCH (t:Topic)
    OPTIONAL MATCH (t)-[r:IS_A]->(p:Topic)
    WITH t, collect(CASE WHEN p IS NULL THEN null ELSE {to: p.id, condition: r.condition} END) AS isA
    OPTIONAL MATCH (:User {id: $uid})-[s:STUDIED]->(:Lesson)-[:BELONGS_TO]->(t)
    WITH t, isA, count(s) > 0 AS studied
    RETURN t.id AS id, t.name AS name, isA, studied
    ORDER BY t.pos`, { uid });
}

async function topicExists(id) {
  return !!(await one('MATCH (t:Topic {id: $id}) RETURN t.id AS id', { id }));
}

// Truy vấn đường đi độ dài bất kỳ: mọi hình tổng quát hơn chủ đề này.
// Ví dụ hình vuông -> hình chữ nhật, hình thoi, hình bình hành, hình thang, tứ giác.
async function ancestors(topicId) {
  return run(`
    MATCH (:Topic {id: $topicId})-[:IS_A*1..]->(a:Topic)
    WITH DISTINCT a
    RETURN a.id AS id, a.name AS name
    ORDER BY a.pos DESC`, { topicId });
}

async function lessonsOfTopic(topicId, uid) {
  const rows = await run(`
    MATCH (l:Lesson)-[:BELONGS_TO]->(:Topic {id: $topicId})
    OPTIONAL MATCH (:User {id: $uid})-[s:STUDIED]->(l)
    WITH l, count(s) > 0 AS studied
    RETURN l AS lesson, studied
    ORDER BY l.createdAt, l.title`, { topicId, uid });
  return rows.map(r => ({ ...r.lesson, studied: r.studied }));
}

// Tất cả bài học kèm chủ đề và số lượt học (dùng cho tìm kiếm và trang quản lý).
async function allLessons() {
  const rows = await run(`
    MATCH (l:Lesson)-[:BELONGS_TO]->(t:Topic)
    OPTIONAL MATCH (:User)-[s:STUDIED]->(l)
    WITH l, t, count(s) AS views
    RETURN l AS lesson, t.id AS topicId, t.name AS topicName, views
    ORDER BY t.pos, l.title`);
  return rows.map(r => ({ ...r.lesson, topicId: r.topicId, topicName: r.topicName, views: r.views }));
}

async function markStudied(uid, lessonId) {
  const row = await one(`
    MATCH (u:User {id: $uid}), (l:Lesson {id: $lessonId})
    MERGE (u)-[s:STUDIED]->(l)
    ON CREATE SET s.at = timestamp()
    RETURN l.id AS id`, { uid, lessonId });
  return !!row;
}

// Tạo mới (id = null) hoặc cập nhật một nút có quan hệ BELONGS_TO tới chủ đề.
async function saveWithTopic(label, id, newId, props, topicId) {
  if (!id) {
    await run(`
      MATCH (t:Topic {id: $topicId})
      CREATE (n:${label} $props)-[:BELONGS_TO]->(t)
      SET n.createdAt = timestamp()`, { topicId, props: { ...props, id: newId } });
    return newId;
  }
  await write(async q => {
    await q(`MATCH (n:${label} {id: $id})-[old:BELONGS_TO]->(:Topic) DELETE old`, { id });
    await q(`
      MATCH (n:${label} {id: $id}), (t:Topic {id: $topicId})
      SET n += $props
      CREATE (n)-[:BELONGS_TO]->(t)`, { id, topicId, props });
  });
  return id;
}

const saveLesson = (id, newId, props, topicId) => saveWithTopic('Lesson', id, newId, props, topicId);

/* ---------------- Bài tập ---------------- */

// Danh sách bài tập theo bộ lọc, kèm số lần người dùng đã làm (tries), số lần đúng (rights)
// và số bài kiểm tra đang dùng bài này (usedIn).
async function listExercises({ topic = null, level = null }, uid) {
  const rows = await run(`
    MATCH (e:Exercise)-[:BELONGS_TO]->(t:Topic)
    WHERE ($topic IS NULL OR t.id = $topic) AND ($level IS NULL OR e.level = $level)
    OPTIONAL MATCH (:User {id: $uid})-[a:ATTEMPTED]->(e)
    WITH e, t, count(a) AS tries, sum(CASE WHEN a.correct THEN 1 ELSE 0 END) AS rights
    OPTIONAL MATCH (:Test)-[c:CONTAINS]->(e)
    WITH e, t, tries, rights, count(c) AS usedIn
    RETURN e AS exercise, t.id AS topicId, t.name AS topicName, tries, rights, usedIn
    ORDER BY t.pos, e.level, e.stem`, { topic, level: level === null ? null : int(level), uid });
  return rows.map(r => ({ ...r.exercise, topicId: r.topicId, topicName: r.topicName, tries: r.tries, rights: r.rights, usedIn: r.usedIn }));
}

async function getExercise(id) {
  const row = await one('MATCH (e:Exercise {id: $id}) RETURN e AS exercise', { id });
  return row && row.exercise;
}

async function existingExerciseIds(ids) {
  const rows = await run('MATCH (e:Exercise) WHERE e.id IN $ids RETURN e.id AS id', { ids });
  return rows.map(r => r.id);
}

async function recordAttempt(uid, exerciseId, answer, correct) {
  await run(`
    MATCH (u:User {id: $uid}), (e:Exercise {id: $exerciseId})
    CREATE (u)-[:ATTEMPTED {answer: $answer, correct: $correct, at: timestamp()}]->(e)`, { uid, exerciseId, answer, correct });
}

const saveExercise = (id, newId, props, topicId) =>
  saveWithTopic('Exercise', id, newId, { ...props, level: int(props.level) }, topicId);

// Bốn con số tổng quan cho một người học.
async function counts(uid) {
  const [lessons, exercises, studied, done] = await Promise.all([
    one('MATCH (l:Lesson) RETURN count(l) AS total'),
    one('MATCH (e:Exercise) RETURN count(e) AS total'),
    one('MATCH (:User {id: $uid})-[:STUDIED]->(l:Lesson) RETURN count(DISTINCT l) AS total', { uid }),
    one('MATCH (:User {id: $uid})-[a:ATTEMPTED]->(e:Exercise) WHERE a.correct = true RETURN count(DISTINCT e) AS total', { uid }),
  ]);
  return { lessonTotal: lessons.total, exerciseTotal: exercises.total, studied: studied.total, done: done.total };
}

/* ---------------- Bài kiểm tra ---------------- */

async function listTests(uid, publishedOnly) {
  const rows = await run(`
    MATCH (t:Test)
    WHERE NOT $publishedOnly OR t.published = true
    OPTIONAL MATCH (t)-[c:CONTAINS]->(e:Exercise)
    WITH t, c, e ORDER BY c.pos
    WITH t, collect(e.id) AS questionIds
    OPTIONAL MATCH (:User {id: $uid})-[:TOOK]->(mine:Result)-[:OF]->(t)
    WITH t, questionIds, count(mine) AS myTries, max(mine.score) AS myBest
    OPTIONAL MATCH (r:Result)-[:OF]->(t)
    WITH t, questionIds, myTries, myBest, count(r) AS tries
    RETURN t AS test, questionIds, myTries, myBest, tries
    ORDER BY t.createdAt, t.name`, { uid, publishedOnly });
  return rows.map(r => ({ ...r.test, questionIds: r.questionIds, myTries: r.myTries, myBest: r.myBest, tries: r.tries }));
}

async function getTest(id) {
  const row = await one('MATCH (t:Test {id: $id}) RETURN t AS test', { id });
  return row && row.test;
}

async function testQuestions(id) {
  const rows = await run(`
    MATCH (:Test {id: $id})-[c:CONTAINS]->(e:Exercise)
    RETURN e AS exercise
    ORDER BY c.pos`, { id });
  return rows.map(r => r.exercise);
}

async function saveTest(id, newId, props, questionIds) {
  const testId = id || newId;
  const data = { ...props, minutes: int(props.minutes) };
  await write(async q => {
    if (id) {
      await q('MATCH (t:Test {id: $id}) SET t += $props', { id, props: data });
      await q('MATCH (:Test {id: $id})-[c:CONTAINS]->(:Exercise) DELETE c', { id });
    } else {
      await q('CREATE (t:Test $props) SET t.createdAt = timestamp()', { props: { ...data, id: newId } });
    }
    await q(`
      UNWIND range(0, size($questionIds) - 1) AS i
      MATCH (t:Test {id: $testId}), (e:Exercise {id: $questionIds[i]})
      CREATE (t)-[:CONTAINS {pos: i + 1}]->(e)`, { testId, questionIds });
  });
  return testId;
}

async function setPublished(id, published) {
  await run('MATCH (t:Test {id: $id}) SET t.published = $published', { id, published });
}

async function saveResult(uid, testId, result) {
  const props = { ...result, correct: int(result.correct), total: int(result.total), seconds: int(result.seconds) };
  await run(`
    MATCH (u:User {id: $uid}), (t:Test {id: $testId})
    CREATE (u)-[:TOOK]->(r:Result $props)-[:OF]->(t)
    SET r.at = timestamp()`, { uid, testId, props });
}

// Xóa bài học, bài tập hoặc bài kiểm tra cùng mọi quan hệ của nó.
async function remove(kind, id) {
  await run(`MATCH (n:${LABEL[kind]} {id: $id}) DETACH DELETE n`, { id });
}

/* ---------------- Tiến độ ---------------- */

async function topicProgress(uid) {
  return run(`
    MATCH (t:Topic)
    OPTIONAL MATCH (e:Exercise)-[:BELONGS_TO]->(t)
    OPTIONAL MATCH (:User {id: $uid})-[a:ATTEMPTED {correct: true}]->(e)
    WITH t, count(DISTINCT e) AS total, count(DISTINCT CASE WHEN a IS NULL THEN null ELSE e END) AS done
    OPTIONAL MATCH (:User {id: $uid})-[s:STUDIED]->(:Lesson)-[:BELONGS_TO]->(t)
    WITH t, total, done, count(s) > 0 AS learned
    RETURN t.id AS id, t.name AS name, total, done, learned
    ORDER BY t.pos`, { uid });
}

async function history(uid) {
  const [studied, attempts, results] = await Promise.all([
    run('MATCH (:User {id: $uid})-[s:STUDIED]->(l:Lesson) RETURN s.at AS at, l.title AS title', { uid }),
    run(`MATCH (:User {id: $uid})-[a:ATTEMPTED]->(e:Exercise)
         RETURN a.at AS at, a.correct AS correct, e.stem AS stem
         ORDER BY a.at DESC LIMIT 30`, { uid }),
    run('MATCH (:User {id: $uid})-[:TOOK]->(r:Result) RETURN r AS result ORDER BY r.at DESC', { uid }),
  ]);
  return { studied, attempts, results: results.map(r => r.result) };
}

// Gợi ý luyện tiếp: bài tập thuộc các chủ đề đã học lý thuyết mà người học chưa làm đúng lần nào.
async function suggestions(uid) {
  return run(`
    MATCH (u:User {id: $uid})-[:STUDIED]->(:Lesson)-[:BELONGS_TO]->(t:Topic)<-[:BELONGS_TO]-(e:Exercise)
    WHERE NOT (u)-[:ATTEMPTED {correct: true}]->(e)
    WITH DISTINCT e, t
    RETURN e.id AS id, e.stem AS stem, e.level AS level, t.id AS topicId, t.name AS topicName
    ORDER BY e.level, t.pos
    LIMIT 3`, { uid });
}

/* ---------------- Giáo viên và quản trị ---------------- */

async function students() {
  return run(`
    MATCH (u:User {role: 'hs'})
    OPTIONAL MATCH (u)-[s:STUDIED]->(l:Lesson)
    WITH u, count(DISTINCT l) AS studied, max(s.at) AS lastStudy
    OPTIONAL MATCH (u)-[a:ATTEMPTED]->(e:Exercise)
    WITH u, studied, lastStudy, count(DISTINCT CASE WHEN a.correct THEN e ELSE null END) AS done, max(a.at) AS lastTry
    OPTIONAL MATCH (u)-[:TOOK]->(r:Result)
    WITH u, studied, done, lastStudy, lastTry, avg(r.score) AS average, count(r) AS tests, max(r.at) AS lastTest
    RETURN u.id AS id, u.name AS name, u.lop AS lop, studied, done, average, tests, lastStudy, lastTry, lastTest
    ORDER BY u.lop, u.name`);
}

async function recentResults() {
  const rows = await run(`
    MATCH (u:User)-[:TOOK]->(r:Result)
    RETURN u.name AS student, r AS result
    ORDER BY r.at DESC
    LIMIT 10`);
  return rows.map(r => ({ student: r.student, ...r.result }));
}

async function graphStats() {
  const [nodes, rels] = await Promise.all([
    run('MATCH (n) RETURN labels(n)[0] AS label, count(*) AS total ORDER BY label'),
    run('MATCH ()-[r]->() RETURN type(r) AS relType, count(*) AS total ORDER BY relType'),
  ]);
  return { nodes, rels };
}

// Toàn bộ đồ thị để xuất bản sao lưu.
async function exportGraph() {
  const [nodes, rels] = await Promise.all([
    run('MATCH (n) RETURN labels(n)[0] AS label, properties(n) AS props ORDER BY label, n.id'),
    run('MATCH (a)-[r]->(b) RETURN a.id AS fromId, type(r) AS relType, b.id AS toId, properties(r) AS props ORDER BY relType'),
  ]);
  return { nodes, rels };
}

module.exports = {
  findUserByEmail, findUserById, createUser, updateProfile, listUsers, setRole, deleteUser,
  listTopics, topicExists, ancestors, lessonsOfTopic, allLessons, markStudied, saveLesson,
  listExercises, getExercise, existingExerciseIds, recordAttempt, saveExercise, counts,
  listTests, getTest, testQuestions, saveTest, setPublished, saveResult, remove,
  topicProgress, history, suggestions, students, recentResults, graphStats, exportGraph,
};
