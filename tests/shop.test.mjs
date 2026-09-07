import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RELICS,
  ACT_LENGTH,
  RELIC_BY_ID,
  SHOP_ITEMS,
  createRun,
  availableNodes,
  enterNode,
  completeRoom,
  shopInventory,
  shopItemAvailability,
  canBuyShopItem,
  shopBuy,
  restoreRun,
  stats,
  availableRelics,
  rollRelicRewards,
  rollRewards,
  chooseReward,
  troopMultiplier,
} from '../lib/game.ts';

function visitShop(run, floor = 1) {
  let map =
    run.phase === 'setup'
      ? { ...structuredClone(run), phase: 'map' }
      : run.phase === 'map'
        ? structuredClone(run)
        : completeRoom(run, false);
  const find = (node) => {
    if (node.floor === floor) return node.kind === 'shop' ? [node.id] : null;
    if (node.floor > floor) return null;
    for (const id of node.next) {
      const next = map.nodes[node.floor + 1].find((entry) => entry.id === id);
      const rest = find(next);
      if (rest) return [node.id, ...rest];
    }
    return null;
  };
  const route = availableNodes(map).map(find).find(Boolean);
  assert.ok(route, `seed ${run.seed}, floor ${floor}: reachable shop`);
  for (const id of route) {
    map = enterNode(map, id);
    if (map.floor !== floor) map = completeRoom(map, false);
  }
  assert.equal(map.phase, 'shop');
  return map;
}

function shop(classId = 'knight', seed = 42, floor = 1) {
  const run = createRun(classId, seed);
  run.gold = 2000;
  return visitShop(run, floor);
}

// Find actual seeded stock; never inject items or reset purchases in the same shop.
function stockedShop(ids, classId = 'knight', floors = [1]) {
  for (let seed = 0; seed < 2000; seed++) {
    let current = createRun(classId, seed);
    current.gold = 2000;
    let first;
    if (
      floors.every((floor) => {
        current = visitShop(current, floor);
        first ||= current;
        const inventory = shopInventory(current);
        return ids.every((id) => inventory.some((item) => item.id === id));
      })
    )
      return first;
  }
  assert.fail(
    `No seeded shops stock ${ids.join(', ')} on floors ${floors.join(', ')}`,
  );
}

function exhaustRelics(run) {
  for (const relic of RELICS)
    if (
      relic.id !== 'square_key' &&
      (relic.family === 'all' || relic.family === run.classId)
    )
      run.relics[relic.id] = relic.max;
}

test('each seeded shop shows five unique eligible items plus its separate 500-gold key', () => {
  assert.equal(
    new Set(SHOP_ITEMS.map((item) => item.id)).size,
    SHOP_ITEMS.length,
  );
  const seen = new Set();
  for (const classId of ['knight', 'ranger', 'mage']) {
    for (let seed = 0; seed < 24; seed++) {
      const run = shop(classId, seed);
      const inventory = shopInventory(run);
      const ids = inventory.map((item) => item.id);
      assert.equal(inventory.length, 6);
      assert.equal(new Set(ids).size, 6);
      assert.equal(ids.at(-1), 'relic-square_key');
      assert.equal(inventory.at(-1).cost, 500);
      assert.deepEqual(shopInventory(run), inventory);
      assert.deepEqual(
        shopInventory({ ...run, hp: 1, gold: 0, purchases: [ids[0]] }),
        inventory,
      );
      assert.deepEqual(
        shopInventory(restoreRun(JSON.stringify(run))),
        inventory,
      );
      seen.add(ids.slice(0, 5).join(','));
      for (const item of inventory.filter((entry) => entry.kind === 'relic')) {
        assert.ok(['all', classId].includes(RELIC_BY_ID[item.relicId].family));
      }
    }
    const coreId = {
      knight: 'relic-bash',
      ranger: 'relic-deadeye',
      mage: 'relic-echo',
    }[classId];
    const run = stockedShop([coreId], classId);
    const core = SHOP_ITEMS.find((item) => item.id === coreId);
    const bought = shopBuy(run, coreId);
    assert.equal(bought.relics[core.relicId], 1);
    assert.equal(bought.gold, run.gold - core.cost);
  }
  assert.ok(
    seen.size > 10,
    'different seeds genuinely produce different assortments',
  );
});

test('unlisted and foreign-class items cannot be bought even with enough gold', () => {
  for (const classId of ['knight', 'ranger', 'mage']) {
    const run = shop(classId);
    run.hp = 1;
    const ids = new Set(shopInventory(run).map((item) => item.id));
    for (const item of SHOP_ITEMS) {
      if (ids.has(item.id)) continue;
      const foreign =
        item.kind === 'relic' &&
        !['all', classId].includes(RELIC_BY_ID[item.relicId].family);
      assert.equal(
        shopItemAvailability(run, item.id).reason,
        foreign ? '该职业无法使用' : '本店未陈列',
      );
      assert.equal(canBuyShopItem(run, item.id), false);
      assert.equal(shopBuy(run, item.id), run);
    }
  }
});

test('direct purchases spend once per shop and respect stack caps in genuinely stocked later shops', () => {
  const run = stockedShop(['relic-split'], 'knight', [1, 6, 11]);
  const item = SHOP_ITEMS.find((entry) => entry.id === 'relic-split');
  const stock = shopInventory(run);
  const bought = shopBuy(run, item.id);
  assert.equal(bought.gold, run.gold - item.cost);
  assert.equal(bought.relics.split, 1);
  assert.equal(stats(bought).extraPairs, 1);
  assert.equal(run.relics.split, undefined);
  assert.deepEqual(run.purchases, []);
  assert.deepEqual(
    shopInventory(bought),
    stock,
    'purchases do not reroll the assortment',
  );
  assert.equal(shopBuy(bought, item.id), bought);
  assert.equal(shopItemAvailability(bought, item.id).reason, '本店已购买');
  const later = visitShop(bought, 6);
  assert.deepEqual(later.purchases, []);
  const capped = shopBuy(later, item.id);
  assert.equal(capped.relics.split, 2);
  const anotherShop = visitShop(capped, 11);
  assert.equal(shopItemAvailability(anotherShop, item.id).reason, '强化已满层');
  assert.equal(shopBuy(anotherShop, item.id), anotherShop);
});

test('stocked but unusable or unaffordable goods never charge the player', () => {
  for (const id of ['potion', 'tonic']) {
    const full = stockedShop([id]);
    assert.equal(shopItemAvailability(full, id).reason, '生命已满');
    assert.equal(shopBuy(full, id), full);
  }
  const maxWeapon = { ...stockedShop(['weapon']), weaponTier: 10 };
  assert.equal(shopItemAvailability(maxWeapon, 'weapon').reason, '武器已满级');
  assert.equal(shopBuy(maxWeapon, 'weapon'), maxWeapon);
  for (const id of ['soldiers', 'company']) {
    const maxArmy = { ...stockedShop([id]), squad: Number.MAX_SAFE_INTEGER };
    assert.equal(shopItemAvailability(maxArmy, id).reason, '兵力已达上限');
    assert.equal(shopBuy(maxArmy, id), maxArmy);
  }
  const map = { ...stockedShop(['weapon']), phase: 'map' };
  assert.equal(shopBuy(map, 'weapon'), map);
  const poor = { ...stockedShop(['weapon']), gold: 69 };
  assert.equal(shopItemAvailability(poor, 'weapon').reason, '金币不足');
  assert.equal(shopBuy(poor, 'weapon'), poor);
  assert.equal(shopBuy(poor, 'missing-item'), poor);
});

test('a stocked random relic refuses an exhausted pool and falls back to the last eligible relic', () => {
  const run = stockedShop(['relic'], 'mage');
  exhaustRelics(run);
  assert.equal(shopItemAvailability(run, 'relic').reason, '可用强化已全部满层');
  assert.equal(shopBuy(run, 'relic'), run);
  run.relics.split = 1;
  const bought = shopBuy(run, 'relic');
  assert.equal(bought.relics.split, 2);
  assert.equal(bought.relics.square_key, undefined);
  assert.equal(bought.gold, run.gold - 85);
  assert.deepEqual(bought.purchases, ['relic']);
});

test('stocked health capacity, recruits and healing grant their listed effects without overflow', () => {
  const run = stockedShop(['relic-vitality', 'company', 'tonic']);
  const vitality = shopBuy(run, 'relic-vitality');
  assert.equal(vitality.maxHp, run.maxHp + 20);
  assert.equal(vitality.hp, run.hp + 20);
  assert.equal(vitality.relics.vitality, 1);
  assert.equal(vitality.gold, run.gold - 95);
  const company = shopBuy(run, 'company');
  assert.equal(company.squad, run.squad + 50);
  assert.equal(company.gold, run.gold - 100);
  assert.equal(shopBuy({ ...run, hp: 5 }, 'tonic').hp, 85);
  assert.equal(shopBuy({ ...run, hp: run.maxHp - 1 }, 'tonic').hp, run.maxHp);
  assert.equal(
    shopBuy({ ...run, squad: Number.MAX_SAFE_INTEGER - 2 }, 'company').squad,
    Number.MAX_SAFE_INTEGER,
  );
});

test('projectile traits bought from real later assortments retain their stated stack effects', () => {
  for (const id of [
    'split',
    'velocity',
    'heavy',
    'focus',
    'execute',
    'pierce',
    'blast',
  ]) {
    const floors = [1, 6, 11].slice(0, RELIC_BY_ID[id].max);
    let run = stockedShop([`relic-${id}`], 'mage', floors);
    const base = stats(run);
    for (const [index, floor] of floors.entries()) {
      if (index) run = visitShop(run, floor);
      run = shopBuy(run, `relic-${id}`);
      assert.equal(run.relics[id], index + 1);
    }
    const result = stats(run);
    if (id === 'split') assert.equal(result.extraPairs, 2);
    if (id === 'velocity')
      assert.ok(Math.abs(result.bulletSpeed - 2.55) < 1e-10);
    if (id === 'heavy') {
      assert.ok(Math.abs(result.damage / base.damage - 1.5) < 1e-10);
      assert.ok(Math.abs(result.rate / base.rate - 0.8) < 1e-10);
    }
    if (id === 'focus') {
      assert.ok(Math.abs(result.damage / base.damage - 1.2) < 1e-10);
      assert.ok(Math.abs(result.bulletRadius - 0.04) < 1e-10);
    }
    if (id === 'execute') assert.equal(result.execute, 2);
    if (id === 'pierce') assert.equal(result.pierceCount, 3);
    if (id === 'blast') assert.equal(result.blast, 3);
    assert.equal(result.synergy, false);
  }
});

test('v4 shop checkpoints preserve actual stock, purchases and acquired traits', () => {
  let run = stockedShop(['potion', 'relic', 'relic-pierce']);
  run.hp = 1;
  for (const id of ['potion', 'relic', 'relic-pierce']) run = shopBuy(run, id);
  const saved = restoreRun(JSON.stringify(run));
  assert.ok(saved);
  assert.equal(saved.version, 4);
  assert.ok(saved.relics.pierce >= 1);
  assert.deepEqual(saved.purchases, ['potion', 'relic', 'relic-pierce']);
  assert.deepEqual(shopInventory(saved), shopInventory(run));
  assert.equal(canBuyShopItem(saved, 'relic-pierce'), false);
  assert.equal(shopBuy(saved, 'relic-pierce'), saved);
});

function legacyReward(seed = 42) {
  let run = createRun('knight', seed);
  run.phase = 'map';
  for (let floor = 0; floor < ACT_LENGTH; floor++) {
    run = enterNode(run, availableNodes(run)[0].id);
    run = completeRoom(run, floor === ACT_LENGTH - 1);
  }
  return run;
}

test('the square key costs exactly 500 and is additional stock until owned or used', () => {
  assert.equal(RELICS.length, 33);
  assert.equal(RELIC_BY_ID.square_key.max, 1);
  const run = { ...shop(), gold: 500 };
  const ordinaryStock = shopInventory(run).slice(0, 5);
  const poor = { ...run, gold: 499 };
  assert.equal(
    shopItemAvailability(poor, 'relic-square_key').reason,
    '金币不足',
  );
  assert.equal(shopBuy(poor, 'relic-square_key'), poor);
  const bought = shopBuy(run, 'relic-square_key');
  assert.equal(bought.gold, 0);
  assert.equal(bought.relics.square_key, 1);
  assert.equal(bought.squareGateSeen, false);
  assert.deepEqual(shopInventory(bought), ordinaryStock);
  assert.equal(shopBuy(bought, 'relic-square_key'), bought);
  const later = visitShop(bought, 6);
  assert.equal(shopInventory(later).length, 5);
  assert.equal(canBuyShopItem(later, 'relic-square_key'), false);
  const used = { ...shop(), squareGateSeen: true };
  assert.equal(shopInventory(used).length, 5);
  assert.equal(shopItemAvailability(used, 'relic-square_key').reason, '已售罄');
  assert.equal(shopBuy(used, 'relic-square_key'), used);
});

test('neither ordinary nor elite rewards nor the random-relic pool can grant the shop-only key', () => {
  for (let seed = 0; seed < 200; seed++) {
    const run = legacyReward(seed);
    assert.ok(!availableRelics(run).some((relic) => relic.id === 'square_key'));
    for (const elite of [false, true]) {
      assert.ok(!rollRelicRewards(run, elite).includes('square_key'));
      assert.ok(!rollRewards(run, elite).includes('square_key'));
    }
    exhaustRelics(run);
    assert.deepEqual(rollRelicRewards(run, true), []);
    assert.ok(!rollRewards(run, true).includes('square_key'));
  }
});

test('old key reward candidates migrate deterministically and cannot be claimed directly', () => {
  for (const version of [2, 3]) {
    const old = legacyReward();
    old.version = version;
    old.floor = 4;
    old.path = ['0-1', '1-1', '2-1', '3-1'];
    old.node = { id: '3-1', floor: 3, col: 1, kind: 'boss' };
    old.reward = ['steel', 'square_key', 'pierce'];
    assert.equal(chooseReward(old, 'square_key'), old);
    const restored = restoreRun(JSON.stringify(old));
    assert.ok(restored);
    assert.equal(restored.version, 4);
    assert.equal(restored.floor, ACT_LENGTH);
    assert.deepEqual(restored.path, []);
    assert.ok(restored.reward.length > 0);
    assert.ok(!restored.reward.includes('square_key'));
    assert.deepEqual(restored.reward, rollRewards(restored, true));
    assert.deepEqual(restoreRun(JSON.stringify(restored)), restored);
    const selected = chooseReward(restored, restored.reward[0]);
    assert.equal(selected.phase, 'map');
    assert.equal(selected.relics.square_key, undefined);
  }
});

test('older checkpoints default to an unused trial while preserving valid ownership', () => {
  const run = createRun('mage');
  run.phase = 'map';
  const old = { ...run };
  delete old.squareGateSeen;
  for (const version of [2, 3]) {
    const restored = restoreRun(JSON.stringify({ ...old, version }));
    assert.ok(restored);
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
