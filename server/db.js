// Kết nối Neo4j bằng neo4j-driver và hai hàm chạy Cypher dùng chung.
const neo4j = require('neo4j-driver');

let driver = null;

function connect() {
  const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
  const user = process.env.NEO4J_USER || 'neo4j';
  const password = process.env.NEO4J_PASSWORD || '';
  // disableLosslessIntegers: số nguyên của Neo4j trả về thành number của JavaScript.
  driver = neo4j.driver(uri, neo4j.auth.basic(user, password), { disableLosslessIntegers: true });
  return driver;
}

const sessionConfig = () => (process.env.NEO4J_DATABASE ? { database: process.env.NEO4J_DATABASE } : {});

// Đổi nút/quan hệ của Neo4j thành object thường chỉ gồm thuộc tính.
function plain(v) {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(plain);
  if (v.properties && (v.labels || v.type)) return plain(v.properties);
  const out = {};
  for (const [k, x] of Object.entries(v)) out[k] = plain(x);
  return out;
}
const toRows = result => result.records.map(r => plain(r.toObject()));

// Chạy một câu Cypher, trả về mảng các dòng kết quả.
async function run(cypher, params = {}) {
  const session = driver.session(sessionConfig());
  try { return toRows(await session.run(cypher, params)); }
  finally { await session.close(); }
}

// Chạy nhiều câu Cypher trong MỘT giao tác ghi: write(async q => { await q('...', {...}); })
async function write(work) {
  const session = driver.session(sessionConfig());
  try { return await session.executeWrite(tx => work(async (cypher, params = {}) => toRows(await tx.run(cypher, params)))); }
  finally { await session.close(); }
}

async function verify() { await driver.verifyConnectivity(); }
async function close() { if (driver) await driver.close(); }

module.exports = { connect, run, write, verify, close, int: neo4j.int };
