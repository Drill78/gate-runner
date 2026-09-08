import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RELICS,
  ACT_LENGTH,
  TOTAL_FLOORS,
  createRun,
  createMap,
  availableNodes,
  enterNode,
  completeRoom,
  chooseReward,
  addRelic,
  stats,
  familyCount,
  applyGate,
  restAction,
  shopBuy,
  shopInventory,
  eventAction,
  restoreRun,
} from '../lib/game.ts';

function room(classId = 'knight', seed = 42, kind = 'battle') {
  const r = createRun(classId, seed);
  r.phase = 'map';
  const node =
    availableNodes(r).find((n) => n.kind === kind) || availableNodes(r)[0];
  return enterNode(r, node.id);
}
test('maps are seeded, contain 15 floors and three bosses, and reject disconnected real nodes', () => {
  assert.deepEqual(createMap(123), createMap(123));
  assert.notDeepEqual(createMap(123), createMap(124));
  const run = createRun('knight', 123);
  run.phase = 'map';
  assert.equal(ACT_LENGTH, 5);
  assert.equal(TOTAL_FLOORS, 15);
  assert.equal(run.nodes.length, TOTAL_FLOORS);
  assert.deepEqual(
    run.nodes
      .flat()
      .filter((n) => n.kind === 'boss')
      .map((n) => n.floor),
    [4, 9, 14],
  );
  const first = enterNode(run, '0-0');
  const next = completeRoom(first, false);
  const disconnected = run.nodes[1].find(
    (node) => !first.node.next.includes(node.id),
  );
  assert.ok(
    disconnected,
    'the rejected target is a real node on another branch',
  );
  assert.ok(!availableNodes(next).some((n) => n.id === disconnected.id));
  assert.equal(enterNode(next, disconnected.id), next);
  assert.equal(
    completeRoom(next, false),
    next,
    'a completed room cannot advance twice',
  );
});
test('gates use the chosen operator, include build bonuses, and allow armies larger than 999', () => {
  let r = createRun('knight');
  applyGate(r, { op: '+', value: 10 }, 0);
  assert.equal(r.squad, 22);
  applyGate(r, { op: '×', value: 2 }, 0);
  assert.equal(r.squad, 44);
  applyGate(r, { op: '÷', value: 2 }, 0);
  assert.equal(r.squad, 22);
  applyGate(r, { op: '-', value: 999 }, 0);
  assert.equal(r.squad, 1);
  r = addRelic(r, 'recruit');
  applyGate(r, { op: '+', value: 10 }, 0);
  assert.equal(r.squad, 16);
  r = addRelic(r, 'mirror');
  applyGate(r, { op: '×', value: 2 }, 0);
  assert.equal(r.squad, 33);
  applyGate(r, { op: '×', value: 1000 }, 0);
  assert.equal(r.squad, 33002);
  const mage = createRun('mage');
  applyGate(mage, { op: '+', value: 10 }, 0);
  assert.equal(mage.squad, 22);
});
test('three class stacks activate synergy; relic effects and stack caps are real', () => {
  let r = createRun('ranger');
  const before = stats(r);
  for (let i = 0; i < 3; i++) r = addRelic(r, 'keen');
  assert.equal(familyCount(r), 3);
  assert.equal(stats(r).synergy, true);
  assert.ok(stats(r).crit > before.crit + 0.45);
  assert.equal(addRelic(r, 'keen'), r);
  const knight = addRelic(createRun('knight'), 'bash');
  assert.ok(stats(knight, 30).damage > stats(knight, 0).damage);
  const mage = addRelic(createRun('mage'), 'surge');
  assert.ok(stats(mage).damage > stats(createRun('mage')).damage);
  r.hp = 25;
  const healed = addRelic(r, 'vitality');
  assert.equal(healed.hp, 45);
  assert.equal(healed.maxHp, 110);
});
test('reward selection rejects invalid/repeated claims and guarantees class options', () => {
  const r = completeRoom(room());
  assert.equal(r.phase, 'reward');
  assert.equal(new Set(r.reward).size, 3);
  assert.ok(
    r.reward.some(
      (id) => RELICS.find((x) => x.id === id)?.family === r.classId,
    ),
  );
  assert.equal(chooseReward(r, 'invalid'), r);
  const selected = chooseReward(r, r.reward[0]);
  assert.equal(selected.phase, 'map');
  assert.equal(chooseReward(selected, r.reward[0]), selected);
});
function specialRoom(kind, seed = 42) {
  let run = createRun('knight', seed);
  run.phase = 'map';
  const find = (node) => {
    if (node.kind === kind) return [node.id];
    for (const id of node.next) {
      const next = run.nodes[node.floor + 1].find((entry) => entry.id === id);
      const rest = find(next);
      if (rest) return [node.id, ...rest];
    }
    return null;
  };
  const path = availableNodes(run).map(find).find(Boolean);
  assert.ok(path);
  for (const id of path) {
    run = enterNode(run, id);
    if (id !== path.at(-1)) run = completeRoom(run, false);
  }
  assert.equal(run.phase, kind);
  return run;
}

test('rest, shop and events enforce their costs and cannot skip floors twice', () => {
  let rest = specialRoom('rest');
  const restFloor = rest.floor;
  rest.hp = 20;
  rest = restAction(rest, 'heal');
  assert.equal(rest.hp, 68);
  assert.equal(rest.floor, restFloor + 1);
  assert.equal(restAction(rest, 'heal'), rest);
  let shop;
  for (let seed = 0; seed < 100; seed++) {
    const candidate = specialRoom('shop', seed);
    if (shopInventory(candidate).some((item) => item.id === 'weapon')) {
      shop = candidate;
      break;
    }
  }
  assert.ok(shop, 'a real reachable shop stocks the weapon');
  shop.gold = 200;
  const purchase = shopBuy(shop, 'weapon');
  assert.equal(purchase.weaponTier, 2);
  assert.equal(purchase.gold, 130);
  assert.equal(shopBuy(purchase, 'weapon'), purchase);
  shop.gold = 0;
  assert.equal(shopBuy(shop, 'relic'), shop);
  const event = specialRoom('event');
  event.hp = 1;
  assert.equal(eventAction(event, 'blood'), event);
  const leave = eventAction(event, 'leave');
  assert.equal(leave.gold, event.gold + 70 + event.floor * 12);
  assert.equal(leave.floor, event.floor + 1);
  assert.equal(eventAction(leave, 'leave'), leave);
});
test('checkpoints restore only valid bounded non-combat state', () => {
  const r = createRun('mage');
  r.phase = 'map';
  assert.deepEqual(restoreRun(JSON.stringify(r)), r);
  assert.equal(restoreRun('{oops'), null);
  assert.equal(restoreRun(JSON.stringify({ ...r, hp: -5 })), null);
  assert.equal(restoreRun(JSON.stringify({ ...r, phase: 'battle' })), null);
  assert.equal(
    restoreRun(JSON.stringify({ ...r, relics: { unknown: 5 } })),
    null,
  );
  assert.equal(restoreRun(JSON.stringify({ ...r, floor: 1 })), null);
  for (const floor of [5, 10]) {
    const checkpoint = restoreRun(JSON.stringify({ ...r, floor }));
    assert.ok(checkpoint, 'empty paths are valid only at migrated act starts');
    assert.equal(availableNodes(checkpoint).length, 3);
  }
});
