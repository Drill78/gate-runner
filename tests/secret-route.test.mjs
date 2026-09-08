import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRun,
  availableNodes,
  enterNode,
  shopBuy,
  completeRoom,
  chooseReward,
  restoreRun,
} from '../lib/game.ts';
import { createBattle } from '../lib/combat.ts';

function keyShop(classId = 'knight', nextKind = 'elite') {
  // Find an actual first-act route from a shop to a connected elite.
  for (let seed = 0; seed < 100; seed++) {
    const run = createRun(classId, seed);
    run.phase = 'map';
    run.gold = 666;
    for (const first of availableNodes(run)) {
      const next = completeRoom(enterNode(run, first.id), false);
      const shop = availableNodes(next).find((node) => node.kind === 'shop');
      if (!shop) continue;
      const after = completeRoom(enterNode(next, shop.id), false);
      if (availableNodes(after).some((node) => node.kind === nextKind))
        return enterNode(next, shop.id);
    }
  }
  assert.fail(
    'a seeded shop route reaches an elite through explicit map edges',
  );
}

function unlockedMap(classId = 'knight', nextKind = 'elite') {
  const bought = shopBuy(keyShop(classId, nextKind), 'relic-square_key');
  assert.equal(bought.relics.square_key, 1);
  return completeRoom(bought, false);
}

function enchantedRoom(run) {
  const node = availableNodes(run).find((entry) => entry.kind === 'elite');
  assert.ok(node?.enchanted);
  const entered = enterNode(run, node.id);
  assert.equal(entered.phase, 'battle');
  assert.equal(
    entered.squareGateSeen,
    true,
    'the entry transition spends the attempt',
  );
  return entered;
}

test('buying the key upgrades connected elite nodes without adding a route or spending the attempt in preview', () => {
  const withoutKey = completeRoom(keyShop(), false);
  const ordinary = availableNodes(withoutKey);
  assert.ok(ordinary.some((node) => node.kind === 'elite'));
  const run = unlockedMap();
  const original = structuredClone(run);
  for (let i = 0; i < 3; i++) {
    const choices = availableNodes(run);
    assert.deepEqual(
      choices.map((node) => node.id),
      ordinary.map((node) => node.id),
    );
    assert.deepEqual(
      choices.map((node) => node.next),
      ordinary.map((node) => node.next),
    );
    assert.ok(choices.every((node) => node.kind !== 'superelite'));
    assert.ok(
      choices.every(
        (node) => Boolean(node.enchanted) === (node.kind === 'elite'),
      ),
    );
  }
  assert.deepEqual(run, original);
  assert.equal(
    enterNode(run, `secret-${run.floor}`),
    run,
    'removed secret node IDs are not enterable',
  );
  const entered = enchantedRoom(run);
  assert.equal(run.squareGateSeen, false);
  assert.equal(
    entered.node.id,
    ordinary.find((node) => node.kind === 'elite').id,
  );
  assert.ok(
    !run.nodes.flat().some((node) => node.enchanted),
    'canonical map nodes remain unchanged',
  );
  const battle = createBattle(entered);
  assert.equal(battle.entities.filter((entity) => entity.trialStep).length, 5);
  assert.equal(battle.entities.filter((entity) => entity.trialFinal).length, 1);
  assert.equal(
    createBattle(entered).entities.filter((entity) => entity.trialFinal).length,
    1,
    'recreating this already-enchanted battle must retain its mandatory gates',
  );
});

test('enhanced elite victory advances the original floor and path exactly once', () => {
  const map = unlockedMap();
  const entered = enchantedRoom(map);
  const reward = completeRoom(createBattle(entered).player);
  assert.equal(reward.phase, 'reward');
  assert.equal(reward.floor, map.floor + 1);
  assert.deepEqual(reward.path, [...map.path, entered.node.id]);
  assert.equal(reward.squareGateSeen, true);
  assert.ok(reward.reward.length > 0);
  assert.equal(
    completeRoom(reward),
    reward,
    'cannot reroll a completed elite battle',
  );
  const after = chooseReward(reward, reward.reward[0]);
  assert.equal(after.phase, 'map');
  assert.equal(after.floor, map.floor + 1);
  assert.deepEqual(after.path, reward.path);
  assert.equal(enterNode(after, entered.node.id), after);
  assert.equal(completeRoom(after), after);
  let later = after;
  while (later.floor < 5)
    later = completeRoom(enterNode(later, availableNodes(later)[0].id), false);
  const nextElite = availableNodes(later).find((node) => node.kind === 'elite');
  assert.ok(nextElite);
  assert.equal(Boolean(nextElite.enchanted), false);
  const nextBattle = createBattle(enterNode(later, nextElite.id));
  assert.ok(
    !nextBattle.entities.some(
      (entity) => entity.trialStep || entity.trialFinal,
    ),
  );
});

test('finishing without a reward follows the same connected mainline and cannot complete twice', () => {
  const map = unlockedMap();
  const entered = enchantedRoom(map);
  const after = completeRoom(createBattle(entered).player, false);
  assert.equal(after.phase, 'map');
  assert.equal(after.floor, map.floor + 1);
  assert.deepEqual(after.path, [...map.path, entered.node.id]);
  assert.deepEqual(after.reward, []);
  assert.deepEqual(
    availableNodes(after).map((node) => node.id),
    entered.node.next,
  );
  assert.equal(completeRoom(after, false), after);
});

test('ordinary rooms retain the key while only an explicitly enchanted elite receives a trial', () => {
  const normalMap = unlockedMap('knight', 'treasure');
  const normal = availableNodes(normalMap).find(
    (node) => node.kind === 'treasure',
  );
  assert.ok(normal);
  const normalEntry = enterNode(normalMap, normal.id);
  assert.equal(normalEntry.squareGateSeen, false);
  assert.equal(Boolean(normalEntry.node.enchanted), false);
  assert.equal(completeRoom(normalEntry, false).squareGateSeen, false);
  const run = unlockedMap();
  const originalElite = run.nodes[run.floor].find(
    (node) => node.kind === 'elite',
  );
  const ordinary = { ...run, phase: 'battle', node: originalElite };
  const ordinaryBattle = createBattle(ordinary);
  assert.equal(ordinaryBattle.player.squareGateSeen, false);
  assert.ok(
    !ordinaryBattle.entities.some(
      (entity) => entity.trialStep || entity.trialFinal,
    ),
  );
  assert.ok(
    !ordinaryBattle.entities.some((entity) =>
      entity.gate?.some((gate) => gate.op === '²'),
    ),
  );
  const entered = enchantedRoom(run);
  const enhancedBattle = createBattle(entered);
  assert.equal(enhancedBattle.totalWaves, ordinaryBattle.totalWaves + 2);
  assert.ok(
    enhancedBattle.entities.find((entity) => entity.boss).maxHp >
      ordinaryBattle.entities.find((entity) => entity.boss).maxHp,
  );
});

test('v4 checkpoints preserve unused ownership and the consumed enhanced encounter on the original graph', () => {
  const bought = shopBuy(keyShop('mage'), 'relic-square_key');
  const savedShop = restoreRun(JSON.stringify(bought));
  assert.ok(savedShop);
  assert.equal(savedShop.version, 4);
  assert.equal(savedShop.relics.square_key, 1);
  assert.equal(savedShop.squareGateSeen, false);
  assert.equal(savedShop.gold, 0);
  const map = restoreRun(JSON.stringify(completeRoom(savedShop, false)));
  assert.ok(map);
  assert.ok(availableNodes(map).some((node) => node.enchanted));
  const entered = enchantedRoom(map);
  const reward = completeRoom(createBattle(entered).player);
  const savedReward = restoreRun(JSON.stringify(reward));
  assert.ok(savedReward);
  assert.deepEqual(savedReward, reward);
  assert.equal(savedReward.node.kind, 'elite');
  assert.equal(savedReward.node.enchanted, true);
  const chosen = chooseReward(savedReward, savedReward.reward[0]);
  const restored = restoreRun(JSON.stringify(chosen));
  assert.ok(restored);
  assert.equal(restored.floor, map.floor + 1);
  assert.deepEqual(restored.path, [...map.path, entered.node.id]);
  assert.equal(restored.squareGateSeen, true);
  assert.ok(!availableNodes(restored).some((node) => node.enchanted));
  assert.equal(completeRoom(restored), restored);
  for (const invalid of [
    { ...reward, squareGateSeen: false },
    { ...reward, relics: {} },
    { ...reward, node: { ...reward.node, enchanted: 'true' } },
    { ...reward, node: { ...reward.node, id: 'secret-11' } },
  ])
    assert.equal(restoreRun(JSON.stringify(invalid)), null);
});
