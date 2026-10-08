/* Gọi REST API của máy chủ. Token đăng nhập (JWT) được giữ trong localStorage. */
const Api = (() => {
  const KEY = 'goctugiac.token';
  let token = '';
  try { token = localStorage.getItem(KEY) || ''; } catch (e) {}

  async function call(method, path, body) {
    let res;
    try {
      res = await fetch('/api' + path, {
        method,
        headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      throw new Error('Không kết nối được máy chủ. Kiểm tra lệnh "npm start" còn đang chạy.');
    }
    let data = null;
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) {
      const err = new Error((data && data.error) || `Máy chủ báo lỗi ${res.status}.`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  return {
    get: path => call('GET', path),
    post: (path, body = {}) => call('POST', path, body),
    put: (path, body = {}) => call('PUT', path, body),
    del: path => call('DELETE', path),
    hasToken: () => !!token,
    setToken(t) { token = t || ''; try { token ? localStorage.setItem(KEY, token) : localStorage.removeItem(KEY); } catch (e) {} },
  };
})();
