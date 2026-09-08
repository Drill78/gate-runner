import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRun,
  availableNodes,
  firepower,
  restoreRun,
  RELIC_BY_ID,
} from '../lib/game.ts';
import {
  endlessEncounter,
  ENDLESS_CURVE,
  healthGrowth,
  depthDamage,
  reforgeGain,
} from '../lib/endless.ts';
import {
  createCheckpointRun,
  createDeveloperRun,
  CHECKPOINT_PRESETS,
  DEVELOPER_PRESETS,
} from '../lib/presets.ts';

const encounter = (room, seed = 721604) =>
  endlessEncounter({ difficulty: 'endless', floor: room - 1, seed });
test('six round finales preserve the exact revival and simultaneous/rush roster design', () => {
  assert.deepEqual(encounter(15).groups, [['king']]);
  assert.deepEqual(encounter(30).groups, [['king'], ['king']]);
  assert.deepEqual(encounter(45).groups, [['king', 'king']]);
  const fourth = encounter(60);
  assert.equal(fourth.groups.length, 4);
  assert.ok(fourth.groups.every((group) => group.length === 2));
  assert.equal(new Set(fourth.mutations.map((group) => group[0])).size, 4);
  assert.deepEqual(encounter(75).groups, [['king'], ['king'], ['king']]);
  assert.equal(new Set(encounter(75).mutations.flat()).size, 3);
  assert.deepEqual(encounter(90).groups, [
    ['watcher', 'lich'],
    ['wyvern', 'oracle'],
    ['king', 'king', 'king'],
  ]);
  for (const room of [15, 30, 45, 60, 75, 90])
    assert.equal(encounter(room).secondLives, true);
});
test('the opening round uses hard-style pairs and round three introduces deterministic mutations', () => {
  assert.deepEqual(encounter(5).groups, [['watcher', 'wyvern']]);
  assert.deepEqual(encounter(10).groups, [['lich', 'oracle']]);
  for (const room of [5, 10, 20, 25])
    assert.equal(encounter(room).mutations, undefined);
  for (const room of [35, 40, 50, 55, 65, 70, 80, 85]) {
    const a = encounter(room);
    assert.deepEqual(a, encounter(room));
    assert.deepEqual(
      a.groups.map((g) => g.length),
      a.mutations.map((g) => g.length),
    );
    assert.ok(a.mutations.flat().every(Boolean));
    assert.ok(a.groups.every((g) => g.length <= 3));
  }
  assert.ok(encounter(50).groups.some((g) => g.length === 3));
  assert.notDeepEqual(encounter(35, 1), encounter(35, 2));
});
test('the final ten rooms are a finite, exact roster; angel revival does not stack king revival', () => {
  const expected = [
    [['executioner']],
    [['commander'], ['hexblade']],
    [['stonewarden', 'broodmother']],
    [['watcher']],
    [['wyvern']],
    [['lich']],
    [['oracle']],
    [['king']],
    [['king-ascendant']],
    [['deity']],
  ];
  for (let room = 91; room <= 100; room++) {
    const e = encounter(room);
    assert.deepEqual(e.groups, expected[room - 91]);
    assert.equal(e.mutation, room < 99 ? 'angelic' : undefined);
    assert.equal(e.secondLives, room === 99);
  }
  for (const room of [1, 6, 16, 101, 102, 1000])
    assert.equal(encounter(room), null);
  assert.equal(
    endlessEncounter({ difficulty: 'hard', floor: 14, seed: 1 }),
    null,
  );
});
test('round three and six are the steep cliffs and the deity lowers raw attack pressure', () => {
  const hp = (room) =>
    healthGrowth({ difficulty: 'endless', floor: room - 1 }, 1.26);
  const transitions = [16, 31, 46, 61, 76].map(
    (room) => hp(room) / hp(room - 1),
  );
  assert.ok(transitions[1] > 2.5 && transitions[4] > 2.4);
  assert.ok(
    [transitions[0], transitions[2], transitions[3]].every(
      (x) => x >= 1 && x < 1.4,
    ),
  );
  for (let floor = 16; floor < 89; floor++) {
    if (floor % 15 === 0) continue;
    const a = healthGrowth({ difficulty: 'endless', floor }, 1.26);
    const b = healthGrowth({ difficulty: 'endless', floor: floor - 1 }, 1.26);
    assert.ok(a >= b && a / b < 1.03);
  }
  assert.ok(
    depthDamage({ difficulty: 'endless', floor: 99 }) <
      depthDamage({ difficulty: 'endless', floor: 98 }),
  );
  assert.equal(ENDLESS_CURVE.bandSize, 15);
  assert.ok(Number.isFinite(hp(999999)));
  assert.equal(
    healthGrowth({ difficulty: 'normal', floor: 14 }, 1.26),
    1.26 ** 14,
  );
});
test('checkpoint presets offer working class builds without fabricating wins, honours or coins', () => {
  for (const start of [46, 91])
    for (const classId of ['knight', 'ranger', 'mage']) {
      const r = createCheckpointRun(classId, start, 734);
      assert.equal(r.floor, start - 1);
      assert.equal(r.phase, 'map');
      assert.equal(r.runId, '');
      assert.equal(r.ascended, false);
      assert.equal(r.revivalCoins, 0);
      assert.equal(r.revivalCoinsEarned, 0);
      assert.equal(r.checkpointStart, 0);
      assert.equal(r.devMode, undefined);
      assert.ok(availableNodes(r).length > 0);
      assert.ok(
        Math.abs(firepower(r).dps / CHECKPOINT_PRESETS[start].dps - 1) < 1e-10,
      );
      assert.ok(restoreRun(JSON.stringify(r)));
      for (const [id, n] of Object.entries(r.relics))
        assert.ok(n <= RELIC_BY_ID[id].max);
    }
});
test('developer launch creates isolated flagged builds and never becomes a normal restored save', () => {
  for (const preset of DEVELOPER_PRESETS) {
    const r = createDeveloperRun('ranger', preset);
    assert.equal(r.devMode, true);
    assert.equal(r.floor, preset.room - 1);
    assert.equal(restoreRun(JSON.stringify(r)), null);
    assert.ok(r.phase === 'battle' ? r.node : availableNodes(r).length > 0);
  }
  assert.equal(createRun('knight').devMode, undefined);
});
test('reforge rewards still grow with burned layers while repeated conversion has diminishing returns', () => {
  assert.equal(reforgeGain(20, 0), 1.6);
  assert.ok(reforgeGain(20, 1) < reforgeGain(20, 0));
  assert.ok(reforgeGain(20, 4) > 0);
  assert.ok(reforgeGain(30, 2) > reforgeGain(20, 2));
});
