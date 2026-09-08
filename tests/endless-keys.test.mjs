import test from 'node:test';
import assert from 'node:assert/strict';
import { createCheckpointRun } from '../lib/presets.ts';
import {
  ENDLESS_KEY_PRICES,
  canLearnKeyLore,
  covenantChoices,
} from '../lib/endless.ts';
import {
  chooseReward,
  restoreRun,
  shopInventory,
  shopBuy,
} from '../lib/game.ts';

test('finite expeditions keep exactly three real key prices and never sell a fourth seal', () => {
  assert.deepEqual(ENDLESS_KEY_PRICES, [666, 6666, 66666]);
  const r = createCheckpointRun('ranger', 46, 734);
  r.phase = 'shop';
  r.gold = 1000000;
  r.squareGateSeen = true;
  for (const tier of [1, 2]) {
    r.endless.keysOpened = tier;
    r.endless.keyLore = tier;
    const key = shopInventory(r).find((i) => i.id === 'relic-square_key');
    assert.equal(key.cost, ENDLESS_KEY_PRICES[tier]);
    const bought = shopBuy(r, key.id);
    assert.equal(r.gold - bought.gold, key.cost);
  }
  for (const opened of [3, 4, 10]) {
    r.endless.keysOpened = opened;
    r.endless.keyLore = 10;
    assert.ok(!shopInventory(r).some((i) => i.id === 'relic-square_key'));
    assert.equal(shopBuy(r, 'relic-square_key'), r);
    r.squareGateSeen = false;
    assert.ok(
      !shopInventory(r).some((i) => i.id === 'relic-square_key'),
      'an old inconsistent seen flag must not resell the first key',
    );
    r.squareGateSeen = true;
  }
});
test('lore is offered only for the next unlocked seal and never after the final shop chapter', () => {
  const r = createCheckpointRun('ranger', 46, 734);
  for (const [opened, lore, expected] of [
    [0, 0, false],
    [1, 0, true],
    [1, 1, false],
    [2, 1, true],
    [2, 2, false],
    [3, 3, false],
  ]) {
    r.endless.keysOpened = opened;
    r.endless.keyLore = lore;
    assert.equal(canLearnKeyLore(r), expected);
  }
  r.endless.keysOpened = 2;
  r.endless.keyLore = 1;
  r.floor = 85;
  assert.equal(canLearnKeyLore(r), true, 'the room-87 shop remains reachable');
  r.floor = 90;
  assert.equal(canLearnKeyLore(r), false);
  for (let seed = 0; seed < 50; seed++) {
    r.seed = seed;
    assert.ok(!covenantChoices(r).includes('abyss-lore'));
  }
});
test('old three/four-layer lore saves stay readable and stale pending cards refresh without wasting a pick', () => {
  for (const lore of [3, 4]) {
    const r = createCheckpointRun('mage', 46, 734);
    r.endless.keyLore = lore;
    r.endless.keysOpened = 2;
    r.squareGateSeen = true;
    const restored = restoreRun(JSON.stringify(r));
    assert.ok(restored);
    assert.equal(restored.endless.keyLore, lore);
    assert.equal(
      shopInventory(restored).find((i) => i.id === 'relic-square_key').cost,
      66666,
    );
    restored.phase = 'reward';
    restored.reward = ['abyss-lore'];
    const next = chooseReward(restored, 'abyss-lore');
    assert.equal(next.phase, 'reward');
    assert.equal(next.endless.keyLore, lore);
    assert.ok(next.reward.length > 0 && !next.reward.includes('abyss-lore'));
    assert.equal(next.endless.power, restored.endless.power);
  }
});

test('exhausted lore and ally pools always leave three distinct contracts', () => {
  const r = createCheckpointRun('ranger', 91, 734);
  r.relics = {};
  r.endless.keysOpened = 3;
  r.endless.keyLore = 4;
  for (const floor of [20, 30, 40, 80, 85, 90, 95]) {
    r.floor = floor;
    const choices = covenantChoices(r);
    assert.equal(choices.length, 3);
    assert.equal(new Set(choices).size, 3, `unique contracts after room ${floor}`);
    assert.deepEqual(choices, ['abyss-flame', 'abyss-heart', 'abyss-legion']);
  }
});
