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

test('new migrations retain pre-existing v1.1 scores and initialize scientific ranking and favorites', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync('drizzle/0000_daily_carnage.sql', 'utf8'));
  db.exec("INSERT INTO travellers VALUES ('legacy', 'hash', '旧旅人', 0)");
  db.exec(
    "INSERT INTO expeditions (id, traveller_id, mode, class_id, seed, started_at, status, peak_squad, title) VALUES ('old-run', 'legacy', 'normal', 'ranger', 1, 0, 'won', 9007199254740991, '旧日的王')",
  );
  for (const path of readdirSync('drizzle')
    .filter((p) => p.endsWith('.sql') && !p.startsWith('0000'))
    .sort())
    db.exec(readFileSync(`drizzle/${path}`, 'utf8'));
  const row = db.prepare('SELECT * FROM expeditions').get();
  assert.equal(row.favorite, 0);
  assert.equal(row.peak_exponent, 15);
  assert.ok(Math.abs(row.peak_mantissa - 9.007199254740991) < 1e-14);
  assert.equal(row.peak_squad, 9007199254740991);
  assert.equal(row.title, '旧日的王');
  db.close();
});
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
    { id: runId, mode, classId: 'knight', seed: 42, ruleset: 'ascension-v1' },
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

test('ascension settles at 100, permanently marks the name, and epilogue cannot replace the ranked result', async () => {
  const env = database();
  await call(env, 'profile', { name: '最后的旅人' });
  const runId = id();
  assert.equal(
    (
      await call(env, 'start', {
        id: runId,
        mode: 'endless',
        classId: 'ranger',
        seed: 17,
        ruleset: 'ascension-v1',
      })
    ).status,
    200,
  );
  for (let depth = 1; depth <= 100; depth++)
    assert.equal(
      (await call(env, 'checkpoint', { id: runId, depth })).status,
      200,
    );
  assert.equal(
    (await call(env, 'checkpoint', { id: runId, depth: 101 })).status,
    400,
  );
  env.sqlite
    .prepare('UPDATE expeditions SET started_at=started_at-60000 WHERE id=?')
    .run(runId);
  const payload = {
    id: runId,
    status: 'won',
    depth: 100,
    duration: 50,
    peakSquad: 1e20,
    gold: 9000,
    details,
    title: '破雾者',
  };
  assert.equal((await call(env, 'finish', payload)).data.ranked, true);
  assert.equal((await call(env, 'profile')).data.ascended, 1);
  await call(env, 'profile', { name: '新的名字' });
  const board = (await call(env, 'board?mode=endless&sort=duration')).data.rows;
  assert.equal(board.length, 1);
  assert.equal(board[0].name, '新的名字');
  assert.equal(board[0].ascended, 1);
  assert.equal(board[0].depth, 100);
  await call(env, 'finish', { ...payload, depth: 101, gold: 999999 });
  const row = (await call(env, 'history')).data.rows[0];
  assert.equal(row.depth, 100);
  assert.equal(row.gold, 9000);
  env.sqlite.close();
});

test('checkpoint starts require a real earned milestone and are ranked separately from full journeys', async () => {
  const env = database();
  await call(env, 'profile', { name: '篝火旅人' });
  const resume = {
    id: id(),
    mode: 'endless',
    classId: 'mage',
    seed: 19,
    ruleset: 'ascension-v1',
    startRoom: 46,
  };
  assert.equal((await call(env, 'start', resume)).status, 403);
  const original = id();
  await call(env, 'start', {
    id: original,
    mode: 'endless',
    classId: 'knight',
    seed: 1,
    ruleset: 'ascension-v1',
  });
  for (let depth = 1; depth <= 45; depth++)
    await call(env, 'checkpoint', { id: original, depth });
  assert.equal((await call(env, 'start', resume)).status, 200);
  assert.equal(
    env.sqlite
      .prepare('SELECT checkpoint FROM expeditions WHERE id=?')
      .get(resume.id).checkpoint,
    45,
  );
  assert.equal(
    (await call(env, 'start', { ...resume, id: id(), startRoom: 91 })).status,
    403,
  );
  for (let depth = 46; depth <= 100; depth++)
    await call(env, 'checkpoint', { id: resume.id, depth });
  env.sqlite
    .prepare('UPDATE expeditions SET started_at=started_at-60000 WHERE id=?')
    .run(resume.id);
  assert.equal(
    (
      await call(env, 'finish', {
        id: resume.id,
        status: 'won',
        depth: 100,
        duration: 45,
        peakSquad: 1e20,
        gold: 3000,
        details,
      })
    ).status,
    200,
  );
  assert.equal(
    (await call(env, 'board?mode=endless&sort=duration&route=1')).data.rows
      .length,
    0,
  );
  const board = (await call(env, 'board?mode=endless&sort=duration&route=46'))
    .data.rows;
  assert.equal(board.length, 1);
  assert.equal(board[0].start_room, 46);
  assert.equal(
    (await call(env, 'start', { ...resume, id: id(), startRoom: 91 })).status,
    200,
  );
  env.sqlite.close();
});

test('old endless records remain in history without granting new honours or dominating the new finite board', async () => {
  const env = database();
  await call(env, 'profile', { name: '旧世旅人' });
  const legacy = id();
  await call(env, 'start', {
    id: legacy,
    mode: 'endless',
    classId: 'mage',
    seed: 2,
  });
  env.sqlite
    .prepare(
      'UPDATE expeditions SET checkpoint=150,started_at=started_at-60000 WHERE id=?',
    )
    .run(legacy);
  assert.equal(
    (
      await call(env, 'finish', {
        id: legacy,
        status: 'retired',
        depth: 150,
        duration: 45,
        peakSquad: 1e30,
        gold: 4000,
        details,
      })
    ).status,
    200,
  );
  assert.equal((await call(env, 'history')).data.rows.length, 1);
  assert.equal((await call(env, 'profile')).data.ascended, 0);
  assert.equal(
    (await call(env, 'board?mode=endless&sort=depth')).data.rows.length,
    0,
  );
  assert.equal(
    (
      await call(env, 'start', {
        id: id(),
        mode: 'endless',
        classId: 'mage',
        seed: 2,
        startRoom: 91,
        ruleset: 'ascension-v1',
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call(env, 'start', {
        id: id(),
        mode: 'endless',
        classId: 'mage',
        seed: 2,
        devMode: true,
      })
    ).status,
    400,
  );
  env.sqlite.close();
});

test('favorites persist privately, filter before pagination, reject outsiders and leave scores intact', async () => {
  const env = database();
  await call(env, 'profile', { name: '藏书人' });
  await call(env, 'profile', { name: '另一位旅人' }, tokenB);
  const { payload } = await result(env);
  await result(env, 'hard');
  assert.equal((await call(env, 'history')).data.rows[0].favorite, 0);
  assert.equal(
    (await call(env, 'favorite', { id: payload.id, favorite: true }, tokenB))
      .status,
    404,
  );
  assert.equal(
    (await call(env, 'favorite', { id: payload.id, favorite: 'true' })).status,
    400,
  );
  assert.equal(
    (await call(env, 'favorite', { id: payload.id, favorite: true })).status,
    200,
  );
  assert.equal(
    (await call(env, 'favorite', { id: payload.id, favorite: true })).status,
    200,
  );
  const favorite = (await call(env, 'history?favorite=1')).data.rows;
  assert.deepEqual(
    favorite.map((r) => r.id),
    [payload.id],
  );
  assert.equal(favorite[0].favorite, 1);
  assert.equal(
    (await call(env, 'history?favorite=1', undefined, tokenB)).data.rows.length,
    0,
  );
  assert.equal(
    (await call(env, 'history?favorite=1', undefined, null)).status,
    401,
  );
  const board = (await call(env, 'board?mode=normal', undefined, null)).data
    .rows;
  assert.equal(board[0].peak_squad, payload.peakSquad);
  assert.equal(
    'favorite' in board[0],
    false,
    'personal preference is not public leaderboard data',
  );
  await call(env, 'title', { id: payload.id, title: '珍藏的誓言' });
  assert.equal(
    (await call(env, 'history?favorite=1')).data.rows[0].favorite,
    1,
  );
  await call(env, 'favorite', { id: payload.id, favorite: false });
  assert.equal((await call(env, 'history?favorite=1')).data.rows.length, 0);
  assert.equal((await call(env, 'history')).data.rows.length, 2);
  const activeId = id();
  await call(env, 'start', {
    id: activeId,
    mode: 'endless',
    classId: 'mage',
    seed: 1,
  });
  assert.equal(
    (await call(env, 'favorite', { id: activeId, favorite: true })).status,
    409,
  );
  env.sqlite.close();
});

test('scientific army records rank by exponent and mantissa, remain favoritable and accept old clients', async () => {
  const env = database();
  await call(env, 'profile', { name: '远征者甲' });
  await call(env, 'profile', { name: '远征者乙' }, tokenB);
  await result(env, 'endless', tokenA, {
    peakSquad: 1e300,
    peakMagnitude: { mantissa: 1.2, exponent: 640 },
  });
  const large = await result(env, 'endless', tokenB, {
    peakSquad: 1e300,
    peakMagnitude: { mantissa: 9.8, exponent: 641 },
  });
  assert.equal(large.response.status, 200);
  const board = (await call(env, 'board?mode=endless&sort=army')).data.rows;
  assert.deepEqual(
    board.map((r) => r.peak_exponent),
    [641, 640],
  );
  assert.equal(board[0].peak_mantissa, 9.8);
  await call(env, 'favorite', { id: large.payload.id, favorite: true }, tokenB);
  assert.equal(
    (await call(env, 'history?favorite=1', undefined, tokenB)).data.rows[0]
      .peak_exponent,
    641,
  );
  assert.equal((await result(env, 'hard')).response.status, 200);
  assert.equal(
    (await call(env, 'board?mode=hard&sort=army')).data.rows[0].peak_exponent,
    4,
  );
  assert.equal(
    (
      await result(env, 'endless', tokenA, {
        peakMagnitude: { mantissa: 20, exponent: 100 },
      })
    ).response.status,
    400,
  );
  env.sqlite.close();
});
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
