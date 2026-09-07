import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HEROES,
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
  createBattle,
  stepBattle,
  activateSkill,
  damagePlayer,
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
function advance(b, seconds) {
  for (let i = 0; i < seconds * 20; i++) stepBattle(b, 0.05);
}
function gateValue(squad, g) {
  return g.op === '+'
    ? squad + g.value
    : g.op === '×'
      ? Math.floor(squad * g.value)
      : g.op === '-'
        ? squad - g.value
        : Math.floor(squad / g.value);
}
function pilot(b) {
  for (let steps = 0; steps < 10000 && b.state === 'running'; steps++) {
    const gate = b.entities.find(
      (e) => e.kind === 'gate' && !e.done && e.arrival - b.time < 0.35,
    );
    const hazard = b.entities.find(
      (e) => e.kind === 'hazard' && !e.done && e.arrival - b.time < 0.4,
    );
    const target = b.entities
      .filter((e) => !e.done && e.hp > 0 && e.start < b.time && e.lane !== 0)
      .sort((a, z) => a.arrival - z.arrival)[0];
    if (gate)
      b.lane =
        gateValue(b.player.squad, gate.gate[0]) >=
        gateValue(b.player.squad, gate.gate[1])
          ? -1
          : 1;
    else if (hazard) b.lane = -hazard.lane;
    else if (target) b.lane = target.lane;
    if (
      b.cooldown <= 0 &&
      b.entities.some((e) => e.hp > 0 && !e.done && e.start < b.time)
    )
      activateSkill(b);
    stepBattle(b, 0.05);
  }
  return b;
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
test('gates use the chosen operator, include build bonuses, and cap squad size', () => {
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
  assert.equal(r.squad, 36);
  applyGate(r, { op: '×', value: 1000 }, 0);
  assert.equal(r.squad, 999);
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
test('crossing gates selects left/right once and combat defeats advance to a terminal state', () => {
  const left = createBattle(room());
  const right = createBattle(room());
  right.lane = 1;
  advance(left, 6.05);
  advance(right, 6.05);
  assert.equal(left.player.squad, 22);
  assert.equal(right.player.squad, 24);
  assert.equal(left.player.gates, 1);
  advance(left, 0.1);
  assert.equal(left.player.gates, 1);
  damagePlayer(left, 10000);
  assert.equal(left.state, 'lost');
  const t = left.time;
  advance(left, 1);
  assert.equal(left.time, t);
});
test('chests grant actual weapon upgrades and skills respect cooldown', () => {
  const b = createBattle(room());
  const chest = b.entities.find((e) => e.kind === 'chest');
  b.lane = chest.lane;
  advance(b, 9);
  assert.ok(b.player.chests >= 1);
  assert.ok(b.player.weaponTier >= 2);
  assert.ok(b.player.gold > 40);
  const shield = b.shield;
  assert.equal(activateSkill(b), true);
  assert.ok(b.shield > shield);
  assert.equal(activateSkill(b), false);
  advance(b, 12.1);
  assert.equal(b.cooldown, 0);
});
test('missed treasure expires without granting upgrades', () => {
  const b = createBattle(room());
  const chest = b.entities.find((e) => e.kind === 'chest');
  b.lane = -chest.lane;
  advance(b, 10.1);
  assert.equal(chest.done, true);
  assert.equal(b.player.chests, 0);
  assert.equal(b.player.weaponTier, 1);
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

for (const hero of HEROES)
  test(`${hero.name}: full 12-floor seeded expedition reaches victory`, () => {
    let run = createRun(hero.id, 734);
    run.phase = 'map';
    let battles = 0;
    while (run.floor < 12 && run.phase !== 'defeat') {
      const choices = availableNodes(run);
      const node =
        choices.find((n) => n.kind === 'rest') ||
        choices.find((n) => n.kind === 'treasure') ||
        choices.find((n) => n.kind === 'battle') ||
        choices[0];
      run = enterNode(run, node.id);
      if (run.phase === 'battle') {
        const b = pilot(createBattle(run));
        assert.equal(
          b.state,
          'won',
          `${hero.id}, floor ${run.floor + 1}, hp ${b.player.hp}, squad ${b.player.squad}`,
        );
        run = completeRoom(b.player);
        battles++;
      } else if (run.phase === 'rest') run = restAction(run, 'heal');
      else if (run.phase === 'shop') {
        run = shopBuy(run, 'weapon');
        run = completeRoom(run, false);
      } else if (run.phase === 'event') run = eventAction(run, 'leave');
      if (run.phase === 'reward') run = chooseReward(run, run.reward[0]);
      assert.ok(run.floor <= 12);
      assert.ok(Number.isFinite(run.hp));
    }
    assert.equal(run.phase, 'victory');
    assert.equal(run.path.length, 12);
    assert.ok(battles >= 6);
    assert.ok(run.chests > 0);
    assert.ok(run.gates > 0);
    assert.ok(run.weaponTier > 1);
  });
