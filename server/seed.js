// Nạp dữ liệu mẫu: chạy db/schema.cypher rồi db/seed.cypher.
// CẢNH BÁO: lệnh này XÓA toàn bộ dữ liệu đang có trong database trước khi nạp.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./db');
const { hashPassword } = require('./auth');

// Tách file .cypher thành từng câu lệnh (mỗi câu kết thúc bằng dấu ; ở cuối dòng), bỏ dòng chú thích.
function statements(file) {
  const textContent = fs.readFileSync(path.join(__dirname, '..', 'db', file), 'utf8');
  return textContent.split(/;[ \t]*(?:\r?\n|$)/)
    .map(s => s.split(/\r?\n/).filter(line => !line.trim().startsWith('//')).join('\n').trim())
    .filter(Boolean);
}

async function main() {
  db.connect();
  await db.verify();
  console.log('Đã kết nối Neo4j.');

  await db.run('MATCH (n) DETACH DELETE n');
  console.log('Đã xóa dữ liệu cũ.');

  for (const s of statements('schema.cypher')) await db.run(s);
  console.log('Đã tạo ràng buộc (constraint).');

  const list = statements('seed.cypher');
  for (const s of list) await db.run(s);
  console.log(`Đã chạy ${list.length} câu lệnh trong db/seed.cypher.`);

  // Mật khẩu của các tài khoản mẫu là 123456, lưu dưới dạng băm bcrypt.
  await db.run('MATCH (u:User) SET u.pass = $pass', { pass: hashPassword('123456') });

  const [nodes] = await db.run('MATCH (n) RETURN count(n) AS total');
  const [rels] = await db.run('MATCH ()-[r]->() RETURN count(r) AS total');
  console.log(`Xong: ${nodes.total} nút, ${rels.total} quan hệ.`);
  console.log('Tài khoản mẫu (mật khẩu 123456): an@hocsinh.example, lan@giaovien.example, admin@truong.example');
  await db.close();
}

main().catch(async err => {
  console.error('\nNạp dữ liệu thất bại:', err.message);
  console.error('Kiểm tra Neo4j đã chạy và file .env đã đúng thông tin kết nối.\n');
  await db.close();
  process.exit(1);
});
