// Đăng ký, đăng nhập, hồ sơ cá nhân (FR-01, FR-02, FR-03).
const { randomUUID } = require('crypto');
const { h, bad, text, HttpError } = require('../http');
const { hashPassword, checkPassword, sign, publicUser } = require('../auth');

module.exports = (r, { repo, auth }) => {
  // POST /api/auth/register  { name, email, password, lop }
  r.post('/auth/register', h(async (req, res) => {
    const b = req.body || {};
    const name = text(b.name), email = text(b.email).toLowerCase(), password = String(b.password || ''), lop = text(b.lop);
    if (!name) bad('Hãy nhập họ tên.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) bad('Email chưa đúng dạng, ví dụ ten@truong.edu.vn.');
    if (password.length < 6) bad('Mật khẩu cần ít nhất 6 ký tự.');
    if (await repo.findUserByEmail(email)) bad('Email này đã có tài khoản. Hãy đăng nhập hoặc dùng email khác.');
    // Tài khoản mới luôn là học sinh; quyền giáo viên do quản trị viên cấp.
    const user = await repo.createUser({ id: randomUUID(), name, email, pass: hashPassword(password), role: 'hs', lop });
    res.status(201).json({ token: sign(user), user: publicUser(user) });
  }));

  // POST /api/auth/login  { email, password }
  r.post('/auth/login', h(async (req, res) => {
    const b = req.body || {};
    const user = await repo.findUserByEmail(text(b.email).toLowerCase());
    if (!user || !checkPassword(String(b.password || ''), user.pass)) throw new HttpError(401, 'Email hoặc mật khẩu không đúng.');
    res.json({ token: sign(user), user: publicUser(user) });
  }));

  // GET /api/me
  r.get('/me', auth, (req, res) => res.json(publicUser(req.user)));

  // PUT /api/me  { name, lop }
  r.put('/me', auth, h(async (req, res) => {
    const b = req.body || {}, name = text(b.name);
    if (!name) bad('Họ tên không được để trống.');
    res.json(publicUser(await repo.updateProfile(req.user.id, { name, lop: text(b.lop) })));
  }));
};
