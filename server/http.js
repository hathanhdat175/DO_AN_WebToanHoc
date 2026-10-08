// Tiện ích dùng chung cho các route.

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// Bọc handler async để lỗi được chuyển tới middleware xử lý lỗi của Express.
const h = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Dừng xử lý và trả lỗi 400 kèm thông báo cho người dùng.
const bad = message => { throw new HttpError(400, message); };
const notFound = message => { throw new HttpError(404, message); };

const text = v => String(v ?? '').trim();
// Nhận mảng hoặc chuỗi nhiều dòng, trả về mảng các dòng không rỗng.
const lines = v => (Array.isArray(v) ? v : String(v ?? '').split('\n')).map(x => String(x).trim()).filter(Boolean);

module.exports = { HttpError, h, bad, notFound, text, lines };
