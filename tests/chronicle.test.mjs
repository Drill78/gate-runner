import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { chronicleHandler, cleanName } from '../lib/chronicle-server.ts';

function database() {
  const sqlite = new DatabaseSync(':memory:');
  for (const path of readdirSync('drizzle').filter((path) =>
    path.endsWith('.sql'),
  ))
    sqlite.exec(readFileSync(`drizzle/${path}`, 'utf8'));
  return {
    sqlite,
    DB: {
      prepare(sql) {
        const statement = sqlite.prepare(sql);
        let params = [];
        return {
          bind(...values) {
            params = values;
            return this;
          },
          async first() {
            return statement.get(...params) || null;
          },
          async all() {
            return { results: statement.all(...params) };
          },
          async run() {
            return { success: true, meta: statement.run(...params) };
          },
        };
      },
    },
  };
}
const tokenA = 'a'.repeat(64),
  tokenB = 'b'.repeat(64);
const id = () => crypto.randomUUID();
async function call(
  env,
  action,
  data,
  token = tokenA,
  method = data === undefined ? 'GET' : 'POST',
) {
  const response = await chronicleHandler(
    new Request(
      `https://gate-runner-seven.vercel.app/api/chronicle/${action}`,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
      },
    ),
    env,
  );
  return { status: response.status, data: await response.json() };
}
const details = {
  weaponTier: 20,
  maxHp: 240,
  kills: 120,
  chests: 20,
  gates: 35,
  doubleBossWins: 0,
  flawlessBosses: 1,
  reforges: 0,
  keysOpened: 0,
  power: 1,
  legion: 1,
  dps: 3000,
  allies: [],
  relics: { steel: 3 },
};
async function result(env, mode = 'normal', token = tokenA, override = {}) {
  const runId = id();
  await call(
    env,
    'start',
    { id: runId, mode, classId: 'knight', seed: 42 },
    token,
  );
  for (let depth = 1; depth <= 15; depth++)
    assert.equal(
      (await call(env, 'checkpoint', { id: runId, depth }, token)).status,
      200,
    );
  env.sqlite
    .prepare(
      'UPDATE expeditions SET started_at = started_at - 40000 WHERE id = ?',
    )
    .run(runId);
  const payload = {
    id: runId,
    status: mode === 'endless' ? 'retired' : 'won',
    depth: 15,
    duration: 32,
    peakSquad: 25000,
    gold: 1300,
    details,
    title: '守火人',
    ...override,
  };
  return { payload, response: await call(env, 'finish', payload, token) };
}
test('persistent leaderboard is public, history is private, and each traveller appears only once', async () => {
  const env = database();
  await call(env, 'profile', { name: '艾琳' });
  await call(env, 'profile', { name: '罗兰' }, tokenB);
  assert.equal((await result(env)).response.status, 200);
  assert.equal(
    (await result(env, 'normal', tokenA, { duration: 25 })).response.status,
    200,
  );
  assert.equal((await result(env, 'normal', tokenB)).response.status, 200);
  const board = await call(
    env,
    'board?mode=normal&sort=duration',
    undefined,
    null,
  );
  assert.equal(board.data.rows.length, 2);
  assert.equal(board.data.rows[0].name, '艾琳');
  assert.equal(board.data.rows[0].duration, 25);
  assert.ok(!JSON.stringify(board.data).includes('token_hash'));
  assert.equal(
    (await call(env, 'history', undefined, tokenB)).data.rows.length,
    1,
  );
  assert.equal((await call(env, 'history', undefined, null)).status, 401);
  env.sqlite.close();
});
test('mode filters, idempotent settlement, renaming and owned titles work against actual SQLite', async () => {
  const env = database();
  await call(env, 'profile', { name: '旅人' });
  const { payload } = await result(env, 'hard');
  await call(env, 'finish', { ...payload, gold: 99999 });
  assert.equal((await call(env, 'board?mode=normal')).data.rows.length, 0);
  let board = await call(env, 'board?mode=hard');
  assert.equal(board.data.rows[0].gold, 1300);
  await call(env, 'profile', { name: '新名字' });
  await call(env, 'title', { id: payload.id, title: '踏月归来' });
  board = await call(env, 'board?mode=hard');
  assert.equal(board.data.rows[0].name, '新名字');
  assert.equal(board.data.rows[0].title, '踏月归来');
  await call(env, 'profile', { name: '旁人' }, tokenB);
  assert.equal(
    (await call(env, 'title', { id: payload.id, title: '篡改' }, tokenB))
      .status,
    404,
  );
  assert.equal((await result(env, 'endless')).response.status, 200);
  assert.equal(
    (await call(env, 'board?mode=endless&sort=depth')).data.rows.length,
    1,
  );
  env.sqlite.close();
});
test('invalid metrics, missing checkpoints and SQL-like query parameters do not enter the public board', async () => {
  const env = database();
  await call(env, 'profile', { name: '测试旅人' });
  assert.equal(
    (await result(env, 'normal', tokenA, { peakSquad: -2 })).response.status,
    400,
  );
  assert.equal(
    (await result(env, 'normal', tokenA, { duration: 1e8 })).response.data
      .ranked,
    false,
  );
  assert.equal(
    (await call(env, 'board?sort=duration%3BDROP%20TABLE%20travellers')).status,
    400,
  );
  const runId = id();
  await call(env, 'start', {
    id: runId,
    mode: 'normal',
    classId: 'mage',
    seed: 1,
  });
  assert.equal(
    (await call(env, 'checkpoint', { id: runId, depth: 15 })).status,
    409,
  );
  assert.equal((await call(env, 'board?mode=normal')).data.rows.length, 0);
  assert.equal(cleanName(' <守火人>\u202e ', 16), '守火人');
  env.sqlite.close();
});
