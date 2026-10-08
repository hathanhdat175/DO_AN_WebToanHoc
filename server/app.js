// Dựng ứng dụng Express: API ở /api, giao diện tĩnh ở thư mục public.
const path = require('path');
const express = require('express');
const { authenticate, allow } = require('./auth');
const { HttpError } = require('./http');

function createApp(repo) {
  const app = express();
  app.use(express.json({ limit: '200kb' }));

  const api = express.Router();
  const ctx = { repo, auth: authenticate(repo), allow };
  api.get('/health', (req, res) => res.json({ ok: true }));
  require('./routes/auth')(api, ctx);
  require('./routes/learn')(api, ctx);
  require('./routes/manage')(api, ctx);
  require('./routes/admin')(api, ctx);
  api.use((req, res, next) => next(new HttpError(404, 'Không có API này.')));
  app.use('/api', api);

  app.use(express.static(path.join(__dirname, '..', 'public')));

  // Xử lý lỗi tập trung: lỗi có status là lỗi của người dùng, còn lại là lỗi hệ thống.
  app.use((err, req, res, next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err && err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Dữ liệu gửi lên không phải JSON hợp lệ.' });
    console.error(`[LỖI] ${req.method} ${req.originalUrl}\n`, err);
    const neo4jDown = err && (err.code === 'ServiceUnavailable' || err.code === 'SessionExpired');
    res.status(neo4jDown ? 503 : 500).json({ error: neo4jDown ? 'Không kết nối được Neo4j. Kiểm tra database đã chạy chưa.' : 'Lỗi máy chủ. Xem cửa sổ Terminal để biết chi tiết.' });
  });
  return app;
}

module.exports = { createApp };
