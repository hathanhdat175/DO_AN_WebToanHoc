// Xác thực (JWT) và phân quyền theo vai trò: hs = học sinh, gv = giáo viên, qt = quản trị viên.
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { HttpError, h } = require('./http');

const ROLES = ['hs', 'gv', 'qt'];
const secret = () => process.env.JWT_SECRET || 'chua-dat-JWT_SECRET-trong-file-env';

const hashPassword = password => bcrypt.hashSync(password, 10);          // NFR-03: không lưu mật khẩu dạng văn bản thuần
const checkPassword = (password, hash) => !!hash && bcrypt.compareSync(password, hash);
const sign = user => jwt.sign({ sub: user.id }, secret(), { expiresIn: '7d' });
const publicUser = u => ({ id: u.id, name: u.name, email: u.email, role: u.role, lop: u.lop || '' });

// Middleware: đọc token trong header "Authorization: Bearer <token>" và nạp người dùng vào req.user.
const authenticate = repo => h(async (req, res, next) => {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  if (!m) throw new HttpError(401, 'Bạn cần đăng nhập.');
  let payload;
  try { payload = jwt.verify(m[1], secret()); }
  catch (e) { throw new HttpError(401, 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.'); }
  const user = await repo.findUserById(payload.sub);
  if (!user) throw new HttpError(401, 'Tài khoản không còn tồn tại. Hãy đăng nhập lại.');
  req.user = user;
  next();
});

// Middleware: chỉ cho các vai trò được liệt kê đi tiếp.
const allow = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : next(new HttpError(403, 'Tài khoản của bạn không có quyền thực hiện thao tác này.'));

module.exports = { ROLES, hashPassword, checkPassword, sign, publicUser, authenticate, allow };
