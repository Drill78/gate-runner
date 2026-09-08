import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRun,
  createMap,
  availableNodes,
  enterNode,
  completeRoom,
  chooseReward,
  restoreRun,
  shopInventory,
  shopBuy,
  RELICS,
  firepower,
  retireEndless,
} from '../lib/game.ts';
import { createBattle, stepBattle, targetVisible } from '../lib/combat.ts';
import {
  endlessEncounter,
  covenantChoices,
  depthHealth,
} from '../lib/endless.ts';

function deepRun(floor = 19, seed = 42) {
  const run = createRun('knight', seed, 'endless');
  run.floor = floor;
  run.nodes = createMap(seed, Math.floor(floor / 15) * 15);
  run.node =
    run.nodes
      .find((row) => row[0].floor === floor)
      .find((node) => node.kind === 'boss') || run.nodes[0][0];
  run.phase = 'battle';
  run.xp = 3404;
  run.talentPicks = 14;
  return run;
}
test('endless maps roll over into one staircase and settle exactly at 100 rooms', () => {
  let run = createRun('mage', 791, 'endless');
  run.phase = 'map';
  for (let floor = 0; floor < 100; floor++) {
    const node = availableNodes(run)[0];
    assert.ok(node, `route at ${floor}`);
    run = completeRoom(enterNode(run, node.id));
    assert.notEqual(run.phase, 'victory');
    assert.ok(
      restoreRun(JSON.stringify(run)),
      `reward restore at ${floor + 1}`,
    );
    if (run.phase === 'reward') run = chooseReward(run, run.reward[0]);
    assert.ok(restoreRun(JSON.stringify(run)), `map restore at ${floor + 1}`);
    assert.ok(run.nodes.length <= 15 && run.path.length <= 15);
  }
  assert.equal(run.phase, 'ascension');
  assert.equal(run.ascended, true);
  assert.equal(run.floor, 100);
  assert.equal(retireEndless(run), run);
});
test('boss rush keeps future stages dormant, heals at the interval and only wins the final stage', () => {
  const b = createBattle(deepRun(74));
  assert.equal(b.rushStages, 3);
  b.time = b.finalStart + 0.1;
  for (const e of b.entities) if (!e.boss) e.done = true;
  b.player.hp = 30;
  assert.equal(
    b.entities.filter((e) => e.boss && targetVisible(e, b.time)).length,
    1,
  );
  b.entities.find((e) => e.boss && e.stage === 0).done = true;
  stepBattle(b, 0.05);
  assert.equal(b.state, 'running');
  assert.equal(b.rushStage, 1);
  assert.ok(b.player.hp > 30);
  assert.ok(b.entities.find((e) => e.stage === 1).start > b.time);
  b.entities.find((e) => e.stage === 1).done = true;
  stepBattle(b, 0.05);
  assert.equal(b.rushStage, 2);
  b.entities.find((e) => e.stage === 2).done = true;
  stepBattle(b, 0.05);
  assert.equal(b.state, 'won');
});
test('the encounter sequence includes twin kings, fusion, three simultaneous rulers and changing late waves', () => {
  const twin = createBattle(deepRun(44)).entities.filter((e) => e.boss);
  assert.deepEqual(
    twin.map((e) => e.encounterId),
    ['king', 'king'],
  );
  assert.ok(twin[0].lastAttack !== twin[1].lastAttack);
  assert.equal(
    createBattle(deepRun(59)).entities.find((e) => e.boss && e.stage === 3)
      .mutation,
    'fusion',
  );
  assert.equal(
    createBattle(deepRun(89)).entities.filter((e) => e.boss && e.stage === 2)
      .length,
    3,
  );
  const names = new Set(
    Array.from(
      { length: 16 },
      (_, i) => endlessEncounter(deepRun(4 + i * 5)).name,
    ),
  );
  assert.ok(names.size >= 6);
});
test('reforging preserves contracts, consumes ordinary rune layers and replenishes a working foundation', () => {
  const run = deepRun(24);
  run.floor = 25;
  run.phase = 'reward';
  for (const relic of RELICS.filter(
    (r) => r.family === 'all' && r.id !== 'square_key',
  ).slice(0, 10))
    run.relics[relic.id] = relic.max;
  run.relics.square_key = 1;
  while (!covenantChoices(run).includes('abyss-reforge')) run.seed++;
  run.reward = covenantChoices(run);
  const next = chooseReward(run, 'abyss-reforge');
  assert.equal(next.endless.reforges, 1);
  assert.ok(next.endless.power > run.endless.power);
  assert.equal(next.relics.square_key, 1);
  assert.equal(next.relics.steel, 3);
  assert.equal(next.weaponTier, run.weaponTier);
  assert.equal(next.maxHp, run.maxHp);
  assert.ok(Object.keys(next.relics).length < Object.keys(run.relics).length);
  assert.ok(firepower(next).dps > 0);
});
test('deeper keys require both prior passage and lore and debit exact escalating prices', () => {
  const run = deepRun();
  run.phase = 'shop';
  run.gold = 100000;
  run.squareGateSeen = true;
  assert.ok(!shopInventory(run).some((i) => i.id === 'relic-square_key'));
  run.endless.keysOpened = 1;
  assert.ok(!shopInventory(run).some((i) => i.id === 'relic-square_key'));
  run.endless.keyLore = 1;
  assert.equal(
    shopInventory(run).find((i) => i.id === 'relic-square_key').cost,
    6666,
  );
  const bought = shopBuy(run, 'relic-square_key');
  assert.equal(bought.gold, 93334);
  assert.equal(bought.squareGateSeen, false);
  assert.ok(!shopInventory(bought).some((i) => i.id === 'relic-square_key'));
  run.endless.keysOpened = run.endless.keyLore = 2;
  assert.equal(
    shopInventory(run).find((i) => i.id === 'relic-square_key').cost,
    66666,
  );
});
test('endless scaling stays finite at extreme depth and normal combat retains its health curve', () => {
  for (const floor of [15, 30, 100, 1000, 99999]) {
    const run = deepRun(floor);
    assert.ok(Number.isFinite(depthHealth(run)));
    for (const e of createBattle(run).entities)
      assert.ok(Number.isFinite(e.hp) && Number.isFinite(e.volleyDamage));
  }
  const normal = createRun('knight', 5);
  normal.phase = 'battle';
  normal.node = normal.nodes[0][0];
  const earlyEndless = { ...normal, difficulty: 'endless' };
  assert.deepEqual(
    createBattle(normal).entities,
    createBattle(earlyEndless).entities,
  );
});
