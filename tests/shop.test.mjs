import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RELICS,
  RELIC_BY_ID,
  SHOP_ITEMS,
  createRun,
  availableNodes,
  enterNode,
  shopInventory,
  shopItemAvailability,
  canBuyShopItem,
  shopBuy,
  restoreRun,
  stats,
  rollRewards,
  chooseReward,
  troopMultiplier,
} from '../lib/game.ts';

function shop(classId = 'knight') {
  const run = createRun(classId, 42);
  run.floor = 2;
  run.path = ['0-1', '1-1'];
  run.phase = 'map';
  const node = availableNodes(run).find((entry) => entry.kind === 'shop');
  const result = enterNode(run, node.id);
  result.gold = 2000;
  return result;
}

function exhaustRelics(run) {
  for (const relic of RELICS)
    if (
      relic.id !== 'square_key' &&
      (relic.family === 'all' || relic.family === run.classId)
    )
      run.relics[relic.id] = relic.max;
}

test('shop stock has unique entries and hides other classes without granting purchase access', () => {
  assert.ok(SHOP_ITEMS.length >= 12);
  assert.equal(
    new Set(SHOP_ITEMS.map((item) => item.id)).size,
    SHOP_ITEMS.length,
  );
  for (const classId of ['knight', 'ranger', 'mage']) {
    const run = shop(classId);
    const inventory = shopInventory(run);
    for (const item of SHOP_ITEMS) {
      const foreign =
        item.kind === 'relic' &&
        RELIC_BY_ID[item.relicId].family !== 'all' &&
        RELIC_BY_ID[item.relicId].family !== classId;
      if (!foreign) continue;
      assert.ok(!inventory.some((entry) => entry.id === item.id));
      assert.equal(canBuyShopItem(run, item.id), false);
      assert.equal(shopItemAvailability(run, item.id).reason, '该职业无法使用');
      assert.equal(shopBuy(run, item.id), run);
    }
    const core = inventory.find(
      (item) =>
        item.kind === 'relic' && RELIC_BY_ID[item.relicId].family === classId,
    );
    const bought = shopBuy(run, core.id);
    assert.equal(bought.relics[core.relicId], 1);
    assert.equal(bought.gold, run.gold - core.cost);
  }
});

test('direct purchases spend once per shop and respect stack caps across later shops', () => {
  const run = shop();
  const item = SHOP_ITEMS.find((entry) => entry.id === 'relic-split');
  const bought = shopBuy(run, item.id);
  assert.equal(bought.gold, run.gold - item.cost);
  assert.equal(bought.relics.split, 1);
  assert.equal(stats(bought).extraPairs, 1);
  assert.equal(run.relics.split, undefined);
  assert.deepEqual(run.purchases, []);
  assert.equal(shopBuy(bought, item.id), bought);
  assert.equal(shopItemAvailability(bought, item.id).reason, '本店已购买');

  const later = { ...bought, purchases: [] };
  const capped = shopBuy(later, item.id);
  assert.equal(capped.relics.split, 2);
  const anotherShop = { ...capped, purchases: [] };
  assert.equal(canBuyShopItem(anotherShop, item.id), false);
  assert.equal(shopItemAvailability(anotherShop, item.id).reason, '强化已满层');
  assert.equal(shopBuy(anotherShop, item.id), anotherShop);
});

test('full health, capped weapons, capped armies, unavailable phases and insufficient gold never charge', () => {
  const full = shop();
  for (const id of ['potion', 'tonic']) {
    assert.equal(canBuyShopItem(full, id), false);
    assert.equal(shopItemAvailability(full, id).reason, '生命已满');
    assert.equal(shopBuy(full, id), full);
  }
  const maxWeapon = { ...shop(), weaponTier: 10 };
  assert.equal(shopBuy(maxWeapon, 'weapon'), maxWeapon);
  assert.equal(shopItemAvailability(maxWeapon, 'weapon').reason, '武器已满级');
  const maxArmy = { ...shop(), squad: Number.MAX_SAFE_INTEGER };
  for (const id of ['soldiers', 'company'])
    assert.equal(shopBuy(maxArmy, id), maxArmy);
  const map = { ...shop(), phase: 'map' };
  assert.equal(shopBuy(map, 'weapon'), map);
  const poor = { ...shop(), gold: 69 };
  assert.equal(shopBuy(poor, 'weapon'), poor);
  assert.equal(shopItemAvailability(poor, 'weapon').reason, '金币不足');
  assert.equal(shopBuy(full, 'missing-item'), full);
});

test('random relic purchase refuses an exhausted pool and safely falls back to an available universal relic', () => {
  const run = shop('mage');
  exhaustRelics(run);
  assert.equal(canBuyShopItem(run, 'relic'), false);
  assert.equal(shopItemAvailability(run, 'relic').reason, '可用强化已全部满层');
  assert.equal(shopBuy(run, 'relic'), run);

  run.relics.split = 1;
  assert.equal(canBuyShopItem(run, 'relic'), true);
  const bought = shopBuy(run, 'relic');
  assert.equal(bought.relics.split, 2);
  assert.equal(bought.gold, run.gold - 85);
  assert.deepEqual(bought.purchases, ['relic']);
});

test('health capacity, large recruits and healing grant their listed effects without overflow', () => {
  const run = shop();
  const vitality = shopBuy(run, 'relic-vitality');
  assert.equal(vitality.maxHp, run.maxHp + 20);
  assert.equal(vitality.hp, run.hp + 20);
  assert.equal(vitality.relics.vitality, 1);
  assert.equal(vitality.gold, run.gold - 95);

  const company = shopBuy(run, 'company');
  assert.equal(company.squad, run.squad + 50);
  assert.equal(company.gold, run.gold - 100);
  const wounded = { ...run, hp: 5 };
  assert.equal(shopBuy(wounded, 'tonic').hp, 85);
  const scratch = { ...run, hp: run.maxHp - 1 };
  assert.equal(shopBuy(scratch, 'tonic').hp, run.maxHp);
  const almostMax = { ...run, squad: Number.MAX_SAFE_INTEGER - 2 };
  assert.equal(shopBuy(almostMax, 'company').squad, Number.MAX_SAFE_INTEGER);
});

test('purchased projectile traits expose the agreed engine stats and heavy ammunition tradeoff', () => {
  let run = shop('mage');
  const base = stats(run);
  for (const id of [
    'split',
    'velocity',
    'heavy',
    'focus',
    'execute',
    'pierce',
    'blast',
  ]) {
    for (let layer = 0; layer < RELIC_BY_ID[id].max; layer++) {
      run = shopBuy({ ...run, gold: 2000, purchases: [] }, `relic-${id}`);
    }
  }
  const result = stats(run);
  assert.ok(Math.abs(result.damage / base.damage - 1.7) < 1e-10);
  assert.ok(Math.abs(result.rate / base.rate - 0.8) < 1e-10);
  assert.ok(Math.abs(result.bulletSpeed - 2.55) < 1e-10);
  assert.ok(Math.abs(result.bulletRadius - 0.04) < 1e-10);
  assert.equal(result.extraPairs, 2);
  assert.equal(result.pierceCount, 3);
  assert.equal(result.blast, 3);
  assert.equal(result.execute, 2);
  assert.equal(
    result.synergy,
    false,
    'universal projectile traits do not grant class synergy',
  );
});

test('v3 checkpoints preserve original shop IDs and new relic purchases without a migration', () => {
  const original = shop();
  original.purchases = ['potion', 'relic'];
  const bought = shopBuy(original, 'relic-pierce');
  const saved = restoreRun(JSON.stringify(bought));
  assert.ok(saved);
  assert.equal(saved.version, 3);
  assert.equal(saved.relics.pierce, 1);
  assert.deepEqual(saved.purchases, ['potion', 'relic', 'relic-pierce']);
  assert.equal(canBuyShopItem(saved, 'relic-pierce'), false);
});

function trialReward(seed = 42) {
  const run = createRun('knight', seed);
  run.floor = 4;
  run.phase = 'reward';
  run.node = run.nodes[3][0];
  run.path = ['0-1', '1-1', '2-1', '3-1'];
  return run;
}

test('square key is a rare third choice only after eligible elite or boss battles', () => {
  assert.equal(RELICS.length, 33);
  assert.equal(RELIC_BY_ID.square_key.max, 1);
  assert.equal(RELIC_BY_ID.square_key.rarity, '史诗');
  assert.equal(SHOP_ITEMS.length, 17);
  assert.ok(
    !SHOP_ITEMS.some(
      (item) => item.kind === 'relic' && item.relicId === 'square_key',
    ),
  );
  let offered = 0;
  for (let seed = 0; seed < 1000; seed++) {
    const run = trialReward(seed);
    const choices = rollRewards(run, true);
    assert.equal(new Set(choices).size, choices.length);
    assert.deepEqual(rollRewards(run, true), choices);
    if (choices.includes('square_key')) {
      offered++;
      assert.equal(choices[2], 'square_key');
      assert.equal(RELIC_BY_ID[choices[0]].family, 'knight');
      assert.notEqual(RELIC_BY_ID[choices[1]].rarity, '普通');
    }
    assert.ok(!rollRewards(run, false).includes('square_key'));
    assert.ok(!rollRewards({ ...run, floor: 3 }, true).includes('square_key'));
    assert.ok(
      !rollRewards(
        { ...run, node: { ...run.node, kind: 'battle' } },
        true,
      ).includes('square_key'),
    );
    for (const phase of ['shop', 'event', 'map', 'battle'])
      assert.ok(!rollRewards({ ...run, phase }, true).includes('square_key'));
  }
  assert.ok(
    offered >= 80 && offered <= 160,
    `expected a rare offer near 12%, received ${offered}/1000`,
  );
  assert.ok(
    Array.from({ length: 100 }, (_, seed) => {
      const run = trialReward(seed);
      run.node = { ...run.node, kind: 'elite' };
      return rollRewards(run, true).includes('square_key');
    }).some(Boolean),
  );
});

test('square key fills a short reward pool and cannot be offered after ownership or trial activation', () => {
  for (const remaining of [[], ['steel'], ['steel', 'pierce']]) {
    let found = null;
    for (let seed = 0; seed < 100; seed++) {
      const run = trialReward(seed);
      exhaustRelics(run);
      for (const id of remaining) delete run.relics[id];
      run.reward = rollRewards(run, true);
      if (run.reward.includes('square_key')) {
        found = run;
        break;
      }
    }
    assert.ok(
      found,
      'rare key remains available when fewer than three ordinary choices exist',
    );
    assert.equal(found.reward.length, remaining.length + 1);
    assert.equal(found.reward.at(-1), 'square_key');
    assert.equal(new Set(found.reward).size, found.reward.length);
    const selected = chooseReward(found, 'square_key');
    assert.equal(selected.relics.square_key, 1);
    assert.equal(
      selected.squareGateSeen,
      false,
      'claiming the key does not start the trial',
    );
    for (let seed = 0; seed < 100; seed++) {
      assert.ok(
        !rollRewards({ ...selected, seed, phase: 'reward' }, true).includes(
          'square_key',
        ),
      );
      assert.ok(
        !rollRewards({ ...found, seed, squareGateSeen: true }, true).includes(
          'square_key',
        ),
      );
    }
  }
  const soldOut = shop();
  exhaustRelics(soldOut);
  assert.equal(soldOut.relics.square_key, undefined);
  assert.equal(
    canBuyShopItem(soldOut, 'relic'),
    false,
    'an unowned key is not stock in the random shop pool',
  );
  assert.equal(shopBuy(soldOut, 'relic'), soldOut);
});

test('trial activation survives saves while older checkpoints default to an unused trial', () => {
  const run = createRun('mage');
  run.phase = 'map';
  assert.equal(run.squareGateSeen, false);
  const old = { ...run };
  delete old.squareGateSeen;
  for (const version of [2, 3]) {
    const restored = restoreRun(JSON.stringify({ ...old, version }));
    assert.ok(restored);
    assert.equal(restored.version, 3);
    assert.equal(restored.squareGateSeen, false);
  }
  const active = restoreRun(
    JSON.stringify({ ...run, squareGateSeen: true, relics: { square_key: 1 } }),
  );
  assert.ok(active);
  assert.equal(active.squareGateSeen, true);
  assert.equal(active.relics.square_key, 1);
  for (const invalid of [null, 0, 1, 'true', 'false', [], {}])
    assert.equal(
      restoreRun(JSON.stringify({ ...run, squareGateSeen: invalid })),
      null,
    );
});

test('troop firepower preserves the original formula through very large armies', () => {
  for (const squad of [
    1,
    12,
    36,
    10000,
    10001,
    1e6,
    1e12,
    Number.MAX_SAFE_INTEGER,
  ])
    assert.equal(troopMultiplier(squad), 1 + Math.log2(1 + squad / 12));
  assert.ok(troopMultiplier(Number.MAX_SAFE_INTEGER) > 50);
});
