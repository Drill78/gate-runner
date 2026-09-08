import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRun,
  createMap,
  stats,
  firepower,
  addRelic,
  effectiveGate,
  gateLabel,
  applyGate,
  eventChoices,
  eventAction,
  experience,
  chooseReward,
  RELICS,
} from '../lib/game.ts';
import {
  createBattle,
  activateSkill,
  stepBattle,
  combatStats,
  attackDamage,
  skipBattleUpgrade,
} from '../lib/combat.ts';
import { depthIncome } from '../lib/endless.ts';

function arena(classId, relic) {
  let run = createRun(classId, 734);
  run.phase = 'battle';
  run.node = run.nodes[0].find((node) => node.kind === 'battle');
  if (relic) run = addRelic(run, relic);
  const b = createBattle(run);
  // Keep the room alive with dormant enemies, without automatic attacks or hazards.
  for (const e of b.entities) {
    e.start += 1000;
    e.arrival += 1000;
  }
  b.shootTimer = Infinity;
  return b;
}
function advance(b, seconds) {
  for (let i = 0; i < Math.round(seconds / 0.01); i++) {
    while (b.levelChoices.length) skipBattleUpgrade(b);
    stepBattle(b, 0.01);
  }
}
function target(b, x, start = -1, hp = 1e6) {
  const e = b.entities.find((e) => e.kind === 'enemy' && e.start > 100);
  Object.assign(e, {
    x,
    start,
    arrival: start + 4,
    stationary: true,
    hp,
    maxHp: hp,
    armor: 0,
    lastAttack: Infinity,
    variant: 'soldier',
  });
  return e;
}
function event(id, floor = 2, classId = 'mage', difficulty = 'normal') {
  for (let seed = 0; seed < 100; seed++) {
    const r = createRun(classId, seed, difficulty);
    r.floor = floor;
    r.phase = 'event';
    r.nodes = createMap(seed, Math.floor(floor / 15) * 15);
    r.node = {
      ...r.nodes.find((row) => row[0].floor === floor)[0],
      kind: 'event',
    };
    r.gold = 1e8;
    if (eventChoices(r).some((o) => o.id === id)) return r;
  }
  throw Error(`Missing ${id}`);
}

test('knight gains its shield and exactly five seconds of 25% damage; paladin upgrades it to 40%', () => {
  for (const relic of [undefined, 'paladin']) {
    const b = arena('knight', relic);
    const before = b.shield;
    activateSkill(b);
    assert.equal(b.shield - before, relic ? 42 : 30);
    assert.equal(b.buffUntil, 5);
    assert.equal(b.cooldown, relic ? 8 : 12);
    assert.equal(
      attackDamage(b),
      firepower(b.player, b.shield).volley * (relic ? 1.4 : 1.25),
    );
    b.time = 5;
    assert.equal(attackDamage(b), firepower(b.player, b.shield).volley);
  }
});
test('ranger rain hits all visible targets; five-second haste guarantees criticals with overflow damage', () => {
  const b = arena('ranger');
  const a = target(b, -0.7),
    z = target(b, 0.7);
  const initial = stats(b.player);
  const damage = firepower(b.player).volley;
  activateSkill(b);
  assert.ok(Math.abs(a.maxHp - a.hp - damage * 4) < 1);
  assert.ok(Math.abs(z.maxHp - z.hp - damage * 4) < 1);
  assert.equal(combatStats(b).rate, initial.rate * 2);
  assert.equal(combatStats(b).crit, 1);
  assert.ok(Math.abs(combatStats(b).critMult - 2.2) < 1e-9);
  assert.equal(
    attackDamage(b),
    damage,
    'haste does not inherit the knight damage buff',
  );
  b.random = () => 0.999999;
  b.shootTimer = 0;
  stepBattle(b, 0.01);
  assert.ok(b.bullets[0].critical);
  assert.ok(Math.abs(b.bullets[0].damage - damage * 2.2) < 1e-9);
  b.time = 5;
  assert.deepEqual(combatStats(b), initial);
});
test('haste doubles actual volley frequency and freezes with the combat clock during an arrival', () => {
  const ordinary = arena('ranger'),
    haste = arena('ranger');
  ordinary.shootTimer = haste.shootTimer = 0;
  activateSkill(haste);
  advance(ordinary, 3.9);
  advance(haste, 3.9);
  assert.ok(Math.abs(haste.shots - ordinary.shots * 2) <= 1);
  const snapshot = [haste.time, haste.buffUntil, haste.cooldown, haste.shots];
  haste.inputLocked = true;
  advance(haste, 6);
  assert.deepEqual(
    [haste.time, haste.buffUntil, haste.cooldown, haste.shots],
    snapshot,
  );
});
test('hunter rain upgrade and critical runes retain their value during guaranteed criticals', () => {
  const b = arena('ranger', 'hunter');
  for (let i = 0; i < 3; i++) b.player = addRelic(b.player, 'keen');
  b.player = addRelic(b.player, 'deadeye');
  const e = target(b, 0.7);
  const damage = firepower(b.player).volley;
  activateSkill(b);
  assert.equal(b.cooldown, 8);
  assert.ok(Math.abs(e.maxHp - e.hp - damage * 6) < 1);
  assert.equal(combatStats(b).crit, 1);
  assert.ok(Math.abs(combatStats(b).critMult - 3.41) < 1e-9);
});
test('mage launches six tracking fireballs, scales with the reinforced army, and grows only once per cast', () => {
  for (const relic of [undefined, 'archmage']) {
    const b = arena('mage', relic);
    b.player.squad = 1000;
    const e = target(b, 0.7);
    activateSkill(b);
    assert.equal(b.player.squad, relic ? 1080 : 1050);
    assert.equal(b.player.peakSquad, b.player.squad);
    const count = relic ? 9 : 6;
    assert.equal(b.bullets.length, count);
    const perBall = firepower(b.player).volley * 1.5;
    assert.ok(
      b.bullets.every((p) => p.kind === 'fireball' && p.damage === perBall),
    );
    assert.equal(e.hp, e.maxHp, 'casting itself is not fullscreen damage');
    advance(b, 0.05);
    assert.equal(b.bullets[0].targetId, e.id);
    assert.ok(b.bullets[0].vx > 0);
    e.x = -0.7;
    advance(b, 1.8);
    assert.ok(
      e.hp < e.maxHp - perBall * (count - 0.1),
      'all fireballs follow the moving target',
    );
    assert.equal(b.player.squad, relic ? 1080 : 1050);
    assert.equal(activateSkill(b), false);
  }
});
test('mage reacquires the nearest living enemy, prioritizes enemies over chests, and ignores dormant waves', () => {
  const b = arena('mage');
  const near = target(b, 0.1),
    far = target(b, 0.8);
  const chest = b.entities.find((e) => e.kind === 'chest');
  Object.assign(chest, {
    x: 0,
    start: -1,
    arrival: 3,
    stationary: true,
    hp: 1e6,
    maxHp: 1e6,
  });
  activateSkill(b);
  advance(b, 0.02);
  assert.equal(b.bullets[0].targetId, near.id);
  near.hp = 0;
  near.done = true;
  advance(b, 0.02);
  assert.equal(b.bullets[0].targetId, far.id);
  far.hp = 0;
  far.done = true;
  advance(b, 0.02);
  assert.equal(b.bullets[0].targetId, chest.id);
  const empty = arena('mage');
  activateSkill(empty);
  advance(empty, 4);
  assert.equal(
    empty.bullets.length,
    0,
    'unclaimed fireballs expire without affecting future waves',
  );
  assert.ok(empty.entities.every((e) => e.hp === e.maxHp));
});
test('an already visible gate gains rune inscription and matching arithmetic once, without modifying its roll', () => {
  let run = createRun('ranger');
  run.squad = 1000;
  const gate = { op: '×', value: 1.45 };
  run = addRelic(run, 'mirror');
  assert.equal(gateLabel(effectiveGate(run, gate)), '×1.53');
  applyGate(run, gate, 0);
  assert.equal(run.squad, 1530);
  assert.match(run.log[0] + run.log.at(-1), /×1.53/);
  assert.deepEqual(gate, { op: '×', value: 1.45 });
  run = addRelic(run, 'mirror');
  run = addRelic(run, 'mirror');
  assert.equal(gateLabel(effectiveGate(run, gate)), '×1.69');
  assert.equal(gateLabel(effectiveGate(run, { op: '÷', value: 1.5 })), '÷1.5');
});
test('events offer stronger scaling recruits, proportional health, useful study and exactly advertised deep gold', () => {
  let r = event('gold', 12);
  r.squad = 1e8;
  assert.equal(eventAction(r, 'gold').squad, 180000000);
  r = event('oath', 12);
  r.maxHp = 1000;
  r.hp = 100;
  const healed = eventAction(r, 'oath');
  assert.equal(healed.maxHp, 1200);
  assert.equal(healed.hp, 570);
  r = event('study', 12);
  r.xp = 1200;
  assert.ok(experience(eventAction(r, 'study')).level > experience(r).level);
  for (const id of ['leave', 'cache']) {
    r = event(id, 52, 'mage', 'endless');
    const offered = eventChoices(r).find((o) => o.id === id);
    assert.equal(
      eventAction(r, id).gold - r.gold,
      Math.floor(offered.value * depthIncome(r)),
    );
  }
});
test('legendary inheritance adapts to every class and free drafts remain claimable with exhausted relics', () => {
  for (const [classId, relic] of Object.entries({
    knight: 'paladin',
    ranger: 'hunter',
    mage: 'archmage',
  })) {
    const r = event('legacy', 2, classId),
      next = eventAction(r, 'legacy');
    assert.equal(next.relics[relic], 1);
    assert.equal(next.floor, r.floor + 1);
    assert.equal(eventAction(next, 'legacy'), next);
  }
  let r = event('pilgrim');
  for (const relic of RELICS.filter(
    (r) => r.family === 'all' || r.family === 'mage',
  ))
    for (let i = 0; i < relic.max; i++) r = addRelic(r, relic.id);
  const next = eventAction(r, 'pilgrim');
  assert.equal(next.phase, 'reward');
  assert.equal(new Set(next.reward).size, 3);
  assert.equal(chooseReward(next, next.reward[0]).floor, next.floor);
});
