// Chức năng riêng của quản trị viên: tài khoản, phân quyền, sao lưu (FR-04, US-20, US-22).
const { h, bad, notFound } = require('../http');
const { ROLES, publicUser } = require('../auth');

// Viết một giá trị JavaScript thành literal Cypher.
const lit = v => typeof v === 'string' ? "'" + v.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, '\\n') + "'"
  : Array.isArray(v) ? '[' + v.map(lit).join(', ') + ']' : String(v);
const propsText = o => {
  const s = Object.entries(o || {}).filter(([, v]) => v !== null && v !== undefined).map(([k, v]) => `${k}: ${lit(v)}`).join(', ');
  return s ? ` {${s}}` : '';
};

function toCypher({ nodes, rels }) {
  const d = new Date();
  return [
    `// Góc Tứ Giác: bản sao lưu ngày ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`,
    `// ${nodes.length} nút, ${rels.length} quan hệ. Chạy trên một database trống.`,
    '',
    ...nodes.map(n => `CREATE (:${n.label}${propsText(n.props)});`),
    '',
    ...rels.map(r => `MATCH (a {id: ${lit(r.fromId)}}), (b {id: ${lit(r.toId)}}) CREATE (a)-[:${r.relType}${propsText(r.props)}]->(b);`),
    '',
  ].join('\n');
}

module.exports = (r, { repo, auth, allow }) => {
  const admin = [auth, allow('qt')];

  // GET /api/admin/users
  r.get('/admin/users', admin, h(async (req, res) => res.json((await repo.listUsers()).map(publicUser))));

  // PUT /api/admin/users/:id/role  { role: 'hs' | 'gv' | 'qt' }
  r.put('/admin/users/:id/role', admin, h(async (req, res) => {
    const role = (req.body || {}).role;
    if (!ROLES.includes(role)) bad('Vai trò không hợp lệ.');
    if (req.params.id === req.user.id) bad('Bạn không thể tự đổi vai trò của chính mình.');
    if (!(await repo.findUserById(req.params.id))) notFound('Không tìm thấy tài khoản.');
    await repo.setRole(req.params.id, role);
    res.json({ ok: true });
  }));

  // DELETE /api/admin/users/:id
  r.delete('/admin/users/:id', admin, h(async (req, res) => {
    if (req.params.id === req.user.id) bad('Bạn không thể xóa tài khoản đang đăng nhập.');
    await repo.deleteUser(req.params.id);
    res.json({ ok: true });
  }));

  // GET /api/admin/stats — số nút theo nhãn, số quan hệ theo loại
  r.get('/admin/stats', admin, h(async (req, res) => res.json(await repo.graphStats())));

  // GET /api/admin/backup — toàn bộ đồ thị dưới dạng lệnh Cypher
  r.get('/admin/backup', admin, h(async (req, res) => res.json({ cypher: toCypher(await repo.exportGraph()) })));
};
module.exports.toCypher = toCypher;
