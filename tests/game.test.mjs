import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RELICS,
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
test('maps are seeded, contain 12 floors and three bosses, and reject disconnected nodes', () => {
  assert.deepEqual(createMap(123), createMap(123));
  assert.notDeepEqual(createMap(123), createMap(124));
  const run = createRun('knight', 123);
  run.phase = 'map';
  assert.equal(run.nodes.length, 12);
  assert.deepEqual(
    run.nodes
      .flat()
      .filter((n) => n.kind === 'boss')
      .map((n) => n.floor),
    [3, 7, 11],
  );
  const first = enterNode(run, '0-0');
  const next = completeRoom(first, false);
  assert.ok(!availableNodes(next).some((n) => n.id === '1-2'));
  assert.equal(enterNode(next, '1-2'), next);
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
    r.reward.some((id) => RELICS.find((x) => x.id === id).family === r.classId),
  );
  assert.equal(chooseReward(r, 'invalid'), r);
  const selected = chooseReward(r, r.reward[0]);
  assert.equal(selected.phase, 'map');
  assert.equal(chooseReward(selected, r.reward[0]), selected);
});
test('rest, shop and events enforce their costs and cannot skip floors twice', () => {
  const r = createRun('knight');
  r.floor = 2;
  r.path = ['0-1', '1-1'];
  r.phase = 'map';
  const restNode = r.nodes[2].find((n) => n.kind === 'rest');
  let rest = enterNode(r, restNode.id);
  rest.hp = 20;
  rest = restAction(rest, 'heal');
  assert.equal(rest.hp, 68);
  assert.equal(rest.floor, 3);
  assert.equal(restAction(rest, 'heal'), rest);
  const shopNode = r.nodes[2].find((n) => n.kind === 'shop');
  const shop = enterNode(r, shopNode.id);
  shop.gold = 200;
  const purchase = shopBuy(shop, 'weapon');
  assert.equal(purchase.weaponTier, 2);
  assert.equal(purchase.gold, 130);
  assert.equal(shopBuy(purchase, 'weapon'), purchase);
  shop.gold = 0;
  assert.equal(shopBuy(shop, 'relic'), shop);
  r.nodes[2][1].kind = 'event';
  r.nodes[2][1].id = '2-1';
  const event = enterNode(r, '2-1');
  event.hp = 18;
  assert.equal(eventAction(event, 'blood'), event);
  const leave = eventAction(event, 'leave');
  assert.equal(leave.gold, event.gold + 12);
  assert.equal(leave.floor, 3);
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
  assert.equal(restoreRun(JSON.stringify({ ...r, floor: 5 })), null);
});
