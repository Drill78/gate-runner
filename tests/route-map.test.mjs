import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACT_LENGTH,
  TOTAL_FLOORS,
  MAX_LEVEL,
  createMap,
  createRun,
  availableNodes,
  enterNode,
  completeRoom,
  addRelic,
  restoreRun,
  chooseReward,
  experience,
  grantExperience,
  rollLevelChoices,
  chooseLevelUpgrade,
  shopInventory,
  rollRewards,
} from '../lib/game.ts';

function fresh(seed = 123) {
  const run = createRun('knight', seed);
  run.phase = 'map';
  return run;
}

test('each seeded act has five depths, explicit next edges and one final boss', () => {
  assert.equal(ACT_LENGTH, 5);
  assert.equal(TOTAL_FLOORS, 15);
  assert.deepEqual(createMap(123), createMap(123));
  assert.notDeepEqual(createMap(123), createMap(124));
  for (const seed of [1, 42, 123, 734, 1743]) {
    const rows = createMap(seed);
    assert.equal(rows.length, TOTAL_FLOORS);
    assert.deepEqual(
      rows
        .flat()
        .filter((n) => n.kind === 'boss')
        .map((n) => n.floor),
      [4, 9, 14],
    );
    for (const [floor, row] of rows.entries()) {
      assert.deepEqual(
        row.map((n) => n.col),
        [[0, 2, 4], [0, 1, 3, 4], [0, 2, 4], [1, 3], [2]][floor % ACT_LENGTH],
      );
      for (const node of row) {
        assert.ok(Array.isArray(node.next));
        assert.equal(new Set(node.next).size, node.next.length);
        assert.ok(
          node.next.every((id) => rows[floor + 1]?.some((n) => n.id === id)),
        );
        assert.ok(
          node.kind === 'boss'
            ? node.next.length === (floor === TOTAL_FLOORS - 1 ? 0 : 3)
            : node.next.length >= 1 && node.next.length <= 2,
        );
      }
    }
  }
});

test('all routes are connected and edges never cross between rows', () => {
  for (let seed = 0; seed < 24; seed++) {
    const rows = createMap(seed);
    for (let floor = 0; floor < TOTAL_FLOORS - 1; floor++) {
      const edges = rows[floor].flatMap((from) =>
        from.next.map((id) => ({
          from,
          to: rows[floor + 1].find((node) => node.id === id),
        })),
      );
      for (const next of rows[floor + 1])
        assert.ok(
          edges.some((edge) => edge.to.id === next.id),
          `unreachable ${next.id}`,
        );
      for (const a of edges)
        for (const b of edges)
          assert.ok(
            (a.from.col - b.from.col) * (a.to.col - b.to.col) >= 0,
            `crossing ${a.from.id}/${a.to.id} and ${b.from.id}/${b.to.id}`,
          );
    }
  }
});

test('merchant, rest and combat branches differ and shops can be avoided', () => {
  for (let seed = 0; seed < 12; seed++) {
    const rows = createMap(seed);
    for (let act = 0; act < 3; act++) {
      const actRows = rows.slice(act * ACT_LENGTH, (act + 1) * ACT_LENGTH);
      const kinds = new Set(actRows.flat().map((node) => node.kind));
      for (const kind of [
        'battle',
        'elite',
        'treasure',
        'shop',
        'rest',
        'event',
        'boss',
      ])
        assert.ok(kinds.has(kind));
      let paths = actRows[0].map((node) => [node]);
      for (const row of actRows.slice(1))
        paths = paths.flatMap((path) =>
          path
            .at(-1)
            .next.map((id) => row.find((n) => n.id === id))
            .filter(Boolean)
            .map((node) => [...path, node]),
        );
      assert.ok(
        paths.some((path) => path.every((node) => node.kind !== 'shop')),
      );
      assert.ok(
        paths.some((path) => path.some((node) => node.kind === 'shop')),
      );
    }
  }
});

test('only explicit successors can be entered, bosses open the next act, and 15 completions win', () => {
  let run = fresh();
  assert.equal(availableNodes(run).length, 3);
  const opening = availableNodes(run).find((node) => node.col === 2);
  run = completeRoom(enterNode(run, opening.id), false);
  assert.deepEqual(
    availableNodes(run).map((n) => n.id),
    opening.next,
  );
  assert.equal(enterNode(run, '1-0'), run);
  assert.equal(completeRoom(run, false), run, 'cannot claim a room twice');
  while (run.floor < TOTAL_FLOORS) {
    const options = availableNodes(run);
    if (run.floor % ACT_LENGTH === 0) assert.equal(options.length, 3);
    const node = options[0];
    run = completeRoom(enterNode(run, node.id), false);
  }
  assert.equal(run.phase, 'victory');
  assert.equal(run.path.length, TOTAL_FLOORS);
  assert.deepEqual(availableNodes(run), []);
});

test('a held key enchants a real elite once and adds no side node', () => {
  let run = addRelic(fresh(), 'square_key');
  const options = availableNodes(run);
  assert.equal(options.length, run.nodes[0].length);
  assert.ok(options.every((node) => node.kind !== 'superelite'));
  const elite = options.find((node) => node.kind === 'elite');
  assert.equal(elite.enchanted, true);
  assert.equal(
    run.nodes[0].find((node) => node.id === elite.id).enchanted,
    undefined,
  );
  run = enterNode(run, elite.id);
  assert.equal(run.node.kind, 'elite');
  assert.equal(run.node.enchanted, true);
  assert.equal(run.squareGateSeen, true);
  assert.equal(
    run.secretDiscovered,
    false,
    'discovery waits for the actual secret preview',
  );
  run = completeRoom(run, false);
  assert.equal(run.floor, 1);
  assert.equal(run.path.length, 1);
  assert.ok(availableNodes(run).every((node) => !node.enchanted));
  const restored = restoreRun(JSON.stringify(run));
  assert.ok(restored);
  assert.equal(restored.node.enchanted, true);
  assert.equal(restored.squareGateSeen, true);
});

test('key remains shop-only at 500 beside five randomized items', () => {
  const run = fresh();
  const stock = shopInventory(run);
  assert.equal(stock.length, 6);
  assert.equal(stock.find((item) => item.relicId === 'square_key').cost, 500);
  assert.equal(new Set(stock.map((item) => item.id)).size, 6);
  for (let seed = 0; seed < 50; seed++) {
    const candidate = fresh(seed);
    assert.ok(!rollRewards(candidate, true).includes('square_key'));
    grantExperience(candidate, 30);
    assert.ok(!rollLevelChoices(candidate).includes('square_key'));
  }
});

test('XP keeps the early curve, slows later levels and caps at 15 with 14 talent picks', () => {
  let run = fresh();
  let total = 0;
  assert.equal(MAX_LEVEL, 15);
  for (let level = 1; level < MAX_LEVEL; level++) {
    const required = 30 + 14 * (level - 1) + 6 * Math.max(0, level - 5) ** 2;
    assert.equal(experience(run).needed, required);
    total += required;
    assert.equal(grantExperience(run, required), 1);
    assert.equal(experience(run).level, level + 1);
    const offered = rollLevelChoices(run);
    assert.equal(offered.length, 3);
    run = chooseLevelUpgrade(run, offered[0]);
    assert.equal(run.talentPicks, level);
  }
  assert.equal(total, 3404);
  assert.equal(run.talentPicks, 14);
  assert.equal(grantExperience(run, 10000), 0);
  assert.equal(experience(run).progress, 100);
  assert.deepEqual(rollLevelChoices(run), []);
});

function legacy(floor = 7, version = 3) {
  const run = fresh();
  run.version = version;
  run.floor = floor;
  run.path = Array.from({ length: floor }, (_, i) => `${i}-1`);
  run.xp = 900;
  run.talentPicks = 10;
  run.relics = { steel: 2, split: 1 };
  run.gold = 563;
  run.squad = 18273;
  delete run.encountersDefeated;
  delete run.secretDiscovered;
  return run;
}

test('v2/v3 saves migrate to their act checkpoint with build, currency and earned XP intact', () => {
  for (const [oldFloor, checkpoint] of [
    [0, 0],
    [3, 0],
    [4, 5],
    [7, 5],
    [8, 10],
    [11, 10],
  ]) {
    for (const version of [2, 3]) {
      const old = legacy(oldFloor, version);
      const restored = restoreRun(JSON.stringify(old));
      assert.ok(restored);
      assert.equal(restored.version, 4);
      assert.equal(restored.floor, checkpoint);
      assert.deepEqual(restored.path, []);
      assert.equal(restored.node, null);
      assert.equal(restored.phase, 'map');
      for (const key of [
        'gold',
        'squad',
        'xp',
        'talentPicks',
        'hp',
        'maxHp',
        'weaponTier',
      ])
        assert.equal(restored[key], old[key]);
      assert.deepEqual(restored.relics, old.relics);
      assert.deepEqual(restored.encountersDefeated, {});
      assert.equal(restored.secretDiscovered, false);
      assert.match(restored.log[0], /旧存档已迁移/);
      assert.equal(availableNodes(restored).length, 3);
      const advanced = completeRoom(
        enterNode(restored, availableNodes(restored)[0].id),
        false,
      );
      assert.ok(
        restoreRun(JSON.stringify(advanced)),
        'checkpoint offset remains valid after progress',
      );
    }
  }
});

test('migration retains pending loot and grandfathered picks until the new level catches up', () => {
  const old = legacy();
  old.phase = 'reward';
  old.reward = ['steel', 'supply-weapon', 'vampire'];
  let restored = restoreRun(JSON.stringify(old));
  assert.equal(restored.phase, 'reward');
  assert.deepEqual(restored.reward, old.reward);
  assert.ok(restored.talentPicks > experience(restored).level - 1);
  assert.deepEqual(rollLevelChoices(restored), []);
  restored = chooseReward(restored, 'supply-weapon');
  assert.equal(restored.weaponTier, old.weaponTier + 1);
  assert.equal(restored.floor, 5);
  assert.equal(restored.phase, 'map');
  assert.ok(restoreRun(JSON.stringify(restored)));
});

test('v4 restore rejects disconnected paths, invalid checkpoints and malformed achievement counters', () => {
  const disconnected = fresh();
  disconnected.floor = 2;
  disconnected.path = ['0-0', '1-4'];
  assert.equal(restoreRun(JSON.stringify(disconnected)), null);
  const skipped = fresh();
  skipped.floor = 1;
  assert.equal(restoreRun(JSON.stringify(skipped)), null);
  for (const patch of [
    { talentPicks: 15 },
    { encountersDefeated: { archer: -1 } },
    { encountersDefeated: { archer: 0.5 } },
    { encountersDefeated: { archer: 1000001 } },
    { encountersDefeated: [] },
    { secretDiscovered: 'true' },
    { reward: ['constructor'] },
  ])
    assert.equal(restoreRun(JSON.stringify({ ...fresh(), ...patch })), null);
  const valid = fresh();
  valid.encountersDefeated = { archer: 15, watcher: 1 };
  valid.secretDiscovered = true;
  assert.deepEqual(
    restoreRun(JSON.stringify(valid)).encountersDefeated,
    valid.encountersDefeated,
  );
});
