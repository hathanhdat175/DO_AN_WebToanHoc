// Điểm khởi động: đọc .env, kết nối Neo4j rồi mở website.
require('dotenv').config();
const db = require('./db');
const { createApp } = require('./app');

async function main() {
  db.connect();
  try {
    await db.verify();
  } catch (err) {
    console.error('\nKhông kết nối được Neo4j tại', process.env.NEO4J_URI || 'bolt://localhost:7687');
    console.error('  1. Database Neo4j đã được bật (Start) chưa?');
    console.error('  2. NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD trong file .env đã đúng chưa?');
    console.error('Chi tiết:', err.message, '\n');
    process.exit(1);
  }
  const port = Number(process.env.PORT) || 3000;
  createApp(require('./repo')).listen(port, () => {
    console.log(`\nGóc Tứ Giác đang chạy tại http://localhost:${port}`);
    console.log('Nhấn Ctrl + C để dừng.\n');
  });
}

process.on('SIGINT', async () => { await db.close(); process.exit(0); });
main();
