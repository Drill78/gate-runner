import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import {
  createRun,
  createRunMap,
  restoreRun,
  availableNodes,
  enterNode,
  completeRoom,
  beginEpilogue,
  chooseReward,
} from '../lib/game.ts';
import {
  emptyCollection,
  parseCollection,
  mergeCollection,
  getAchievementStates,
} from '../lib/collection.ts';
import { chronicleHandler } from '../lib/chronicle-server.ts';
import { trackChronicle, flushChronicle, sealTitle } from '../lib/chronicle.ts';

function oldRun(floor) {
  const run = {
    ...createRun('ranger', 721604, 'endless'),
    phase: 'map',
    floor,
    runId: crypto.randomUUID(),
    nodes: createRunMap(721604, 'endless', floor),
  };
  delete run.ruleset;
  return run;
}

test('legacy collection depth remains readable without unlocking new rounds, checkpoints or ascension', () => {
  const legacy = emptyCollection();
  delete legacy.progressRuleset;
  legacy.records = {
    endlessDepth: 150,
    goldEarned: 6000,
    revivalsUsed: 3,
    angelTrials: 8,
  };
  legacy.secrets = ['forbidden-key', 'ascension'];
  legacy.wins.ranger = 2;
  const migrated = parseCollection(JSON.stringify(legacy));
  assert.equal(migrated.progressRuleset, 'ascension-v1');
  assert.equal(migrated.records.legacyEndlessDepth, 150);
  assert.equal(migrated.records.endlessDepth || 0, 0);
  assert.equal(migrated.records.goldEarned, 6000);
  assert.equal(migrated.wins.ranger, 2);
  assert.deepEqual(migrated.secrets, ['forbidden-key']);
  for (const id of [
    'night-first',
    'night-third',
    'night-sixth',
    'angel-first',
    'rebirth-first',
    'ascension',
  ])
    assert.equal(
      getAchievementStates(migrated).find((a) => a.id === id).unlocked,
      false,
    );
  assert.deepEqual(parseCollection(JSON.stringify(migrated)), migrated);
  const newProgress = mergeCollection(migrated, {
    ...createRun('ranger', 1, 'endless'),
    floor: 45,
    phase: 'reward',
  });
  assert.equal(newProgress.records.endlessDepth, 45);
  assert.equal(newProgress.records.legacyEndlessDepth, 150);
  assert.equal(
    getAchievementStates(newProgress).find((a) => a.id === 'night-third')
      .unlocked,
    true,
  );
  assert.deepEqual(parseCollection(JSON.stringify(newProgress)), newProgress);
});

test('carried builds get a fresh private identity and must defeat the replacement 45th or 90th boss', () => {
  for (const [oldFloor, checkpoint] of [
    [45, 45],
    [60, 45],
    [89, 45],
    [90, 90],
    [150, 90],
  ]) {
    const old = oldRun(oldFloor);
    old.gold = 6789;
    old.relics = { steel: 3, hunter: 1 };
    const next = restoreRun(JSON.stringify(old));
    assert.ok(next);
    assert.notEqual(next.runId, old.runId);
    assert.match(next.runId, /^[a-f0-9-]{36}$/);
    assert.equal(next.ruleset, 'ascension-v1');
    assert.equal(next.legacyContinuation, true);
    assert.equal(next.floor, checkpoint - 1);
    assert.equal(next.legacyPendingCheckpoint, checkpoint);
    assert.equal(next.gold, old.gold);
    assert.deepEqual(next.relics, old.relics);
    assert.match(next.log[0], /旧长夜的誓装已保留/);
    assert.equal(next.revivalCoins, 0);
    const roundtrip = restoreRun(JSON.stringify(next));
    assert.ok(roundtrip);
    assert.equal(roundtrip.runId, next.runId);
    const before = mergeCollection(emptyCollection(), roundtrip);
    assert.equal(before.records.endlessDepth || 0, 0);
    const options = availableNodes(roundtrip);
    assert.equal(options.length, 1);
    assert.equal(options[0].floor, checkpoint - 1);
    assert.equal(options[0].kind, 'boss');
    const completed = completeRoom(enterNode(roundtrip, options[0].id));
    assert.equal(completed.floor, checkpoint);
    assert.equal(new Set(completed.reward).size, completed.reward.length);
    assert.equal(completed.legacyPendingCheckpoint, undefined);
    assert.equal(
      mergeCollection(before, completed).records.endlessDepth,
      checkpoint,
    );
    assert.ok(restoreRun(JSON.stringify(completed)));
  }
  for (const floor of [0, 30]) {
    const old = oldRun(floor),
      next = restoreRun(JSON.stringify(old));
    assert.equal(next.floor, floor);
    assert.equal(next.legacyPendingCheckpoint, undefined);
    assert.equal(next.legacyContinuation, true);
    assert.notEqual(next.runId, old.runId);
  }
  const normal = {
    ...createRun('knight', 1, 'normal'),
    phase: 'map',
    runId: crypto.randomUUID(),
  };
  delete normal.ruleset;
  assert.equal(restoreRun(JSON.stringify(normal)).runId, normal.runId);
  const invalid = {
    ...createRun('mage', 1, 'endless'),
    phase: 'map',
    legacyPendingCheckpoint: 45,
  };
  assert.equal(restoreRun(JSON.stringify(invalid)), null);
});

test('historical duplicate legion drafts recover three claimable choices without weakening other reward validation', () => {
  for (const floor of [30, 90]) {
    const saved = {
      ...createRun('ranger', 721604, 'endless'),
      phase: 'reward',
      floor,
      gold: 6789,
      relics: { steel: 3, hunter: 1 },
      runId: crypto.randomUUID(),
      nodes: createRunMap(721604, 'endless', floor),
      reward: ['abyss-legion', 'abyss-heart', 'abyss-legion'],
    };
    const restored = restoreRun(JSON.stringify(saved));
    assert.ok(restored);
    assert.deepEqual(restored.reward, [
      'abyss-flame',
      'abyss-heart',
      'abyss-legion',
    ]);
    assert.equal(restored.runId, saved.runId);
    assert.equal(restored.floor, floor);
    assert.equal(restored.gold, saved.gold);
    assert.deepEqual(restored.relics, saved.relics);
    assert.deepEqual(restoreRun(JSON.stringify(restored)), restored);
    for (const id of restored.reward) {
      const claimed = chooseReward(restored, id);
      assert.equal(claimed.phase, 'map');
      assert.equal(claimed.endless.covenantAt, floor);
      assert.ok(restoreRun(JSON.stringify(claimed)));
    }
    for (const reward of [
      ['steel', 'steel'],
      ['abyss-heart', 'abyss-heart', 'abyss-legion'],
      ['abyss-legion', 'abyss-heart', 'unknown'],
    ])
      assert.equal(restoreRun(JSON.stringify({ ...saved, reward })), null);
  }
});

function browserFixture() {
  const saved = {
    localStorage: globalThis.localStorage,
    window: globalThis.window,
    fetch: globalThis.fetch,
  };
  const data = new Map();
  const sqlite = new DatabaseSync(':memory:');
  for (const p of readdirSync('drizzle')
    .filter((p) => p.endsWith('.sql'))
    .sort())
    sqlite.exec(readFileSync(`drizzle/${p}`, 'utf8'));
  const env = {
    DB: {
      prepare(sql) {
        const statement = sqlite.prepare(sql);
        let args = [];
        return {
          bind(...values) {
            args = values;
            return this;
          },
          async first() {
            return statement.get(...args) || null;
          },
          async all() {
            return { results: statement.all(...args) };
          },
          async run() {
            return { success: true, meta: statement.run(...args) };
          },
        };
      },
    },
  };
  const token = 'c'.repeat(64),
    requests = [];
  let online = true;
  data.set(
    'ashen-traveller-v1',
    JSON.stringify({ token, name: '迁移验证旅人' }),
  );
  globalThis.localStorage = {
    getItem: (k) => data.get(k) || null,
    setItem: (k, v) => data.set(k, v),
    removeItem: (k) => data.delete(k),
  };
  globalThis.window = { dispatchEvent() {} };
  globalThis.fetch = async (url, init) => {
    if (!online) throw new Error('simulated offline');
    const requestUrl =
      typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
    requests.push({
      action: requestUrl.split('/').at(-1),
      body: init?.body ? JSON.parse(init.body) : undefined,
    });
    return chronicleHandler(
      new Request(new URL(requestUrl, 'http://localhost:5173'), init),
      env,
    );
  };
  return {
    sqlite,
    data,
    requests,
    setOnline(value) {
      online = value;
    },
    async call(action, body) {
      const r = await chronicleHandler(
        new Request(`http://localhost:5173/api/chronicle/${action}`, {
          method: body === undefined ? 'GET' : 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        }),
        env,
      );
      return { status: r.status, data: await r.json() };
    },
    close() {
      Object.assign(globalThis, saved);
      sqlite.close();
    },
  };
}

test('legacy server history stays unchanged while migrated progress settles privately under the new rules', async () => {
  const f = browserFixture();
  try {
    await f.call('profile', { name: '迁移验证旅人' });
    const old = oldRun(60);
    await f.call('start', {
      id: old.runId,
      mode: 'endless',
      classId: old.classId,
      seed: old.seed,
    });
    f.sqlite
      .prepare(
        "UPDATE expeditions SET checkpoint=60,depth=60,status='retired',title='旧夜归客' WHERE id=?",
      )
      .run(old.runId);
    const run = restoreRun(JSON.stringify(old));
    trackChronicle(run);
    await flushChronicle();
    const registered = f.sqlite
      .prepare('SELECT * FROM expeditions WHERE id=?')
      .get(run.runId);
    assert.equal(registered.ruleset, 'ascension-v1');
    assert.equal(registered.ranked, 0);
    assert.equal(registered.checkpoint, 0);
    assert.equal(
      (
        await f.call('start', {
          id: crypto.randomUUID(),
          mode: 'endless',
          classId: 'mage',
          seed: 4,
          startRoom: 46,
          ruleset: 'ascension-v1',
        })
      ).status,
      403,
    );
    const crossed = completeRoom(enterNode(run, availableNodes(run)[0].id));
    trackChronicle(crossed);
    await flushChronicle();
    assert.equal(
      f.sqlite
        .prepare('SELECT checkpoint FROM expeditions WHERE id=?')
        .get(run.runId).checkpoint,
      45,
    );
    assert.equal(
      (
        await f.call('start', {
          id: crypto.randomUUID(),
          mode: 'endless',
          classId: 'mage',
          seed: 4,
          startRoom: 46,
          ruleset: 'ascension-v1',
        })
      ).status,
      200,
    );
    const crowned = {
      ...crossed,
      phase: 'ascension',
      ascended: true,
      floor: 100,
      combatTime: 60,
      path: [],
      node: null,
    };
    trackChronicle(crowned);
    await flushChronicle();
    const final = f.sqlite
      .prepare('SELECT * FROM expeditions WHERE id=?')
      .get(run.runId);
    assert.equal(final.status, 'won');
    assert.equal(final.depth, 100);
    assert.equal(final.ranked, 0);
    const preserved = f.sqlite
      .prepare('SELECT * FROM expeditions WHERE id=?')
      .get(old.runId);
    assert.equal(preserved.ruleset, 'legacy');
    assert.equal(preserved.depth, 60);
    assert.equal(preserved.title, '旧夜归客');
    assert.equal((await f.call('history')).data.rows.length, 2);
    assert.equal(JSON.parse(f.data.get('ashen-chronicle-outbox-v1')).length, 0);
  } finally {
    await flushChronicle();
    f.close();
  }
});

test('offline hundredth-room title and result survive reload, epilogue and repeated settlement tracking', async () => {
  const f = browserFixture();
  try {
    f.setOnline(false);
    const crowned = {
      ...createRun('mage', 721604, 'endless'),
      phase: 'ascension',
      ascended: true,
      floor: 100,
      path: [],
      node: null,
      runId: crypto.randomUUID(),
      combatTime: 60,
      goldEarned: 1234,
    };
    trackChronicle(crowned);
    await flushChronicle();
    await assert.rejects(sealTitle(crowned.runId, '破雾者'));
    const pending = () =>
      JSON.parse(f.data.get('ashen-chronicle-outbox-v1'))[0];
    const original = structuredClone(pending().result);
    assert.equal(original.title, '破雾者');
    trackChronicle(restoreRun(JSON.stringify(crowned)));
    await flushChronicle();
    trackChronicle({ ...crowned, goldEarned: 999999, weaponTier: 99 });
    await flushChronicle();
    const celebration = beginEpilogue(crowned);
    trackChronicle(celebration);
    trackChronicle(completeRoom(celebration));
    assert.deepEqual(pending().result, original);
    assert.equal(pending().depth, 100);
    f.setOnline(true);
    await flushChronicle();
    const finished = f.sqlite
      .prepare('SELECT * FROM expeditions WHERE id=?')
      .get(crowned.runId);
    assert.equal(finished.title, '破雾者');
    assert.equal(finished.gold, 1234);
    assert.equal(finished.depth, 100);
    assert.equal(JSON.parse(f.data.get('ashen-chronicle-outbox-v1')).length, 0);
    const finishes = f.requests.filter((r) => r.action === 'finish').length;
    trackChronicle(crowned);
    await flushChronicle();
    assert.equal(
      f.requests.filter((r) => r.action === 'finish').length,
      finishes,
    );
  } finally {
    await flushChronicle();
    f.close();
  }
});
