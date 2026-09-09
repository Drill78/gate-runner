import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, stats, applyGate, effectiveGate } from '../lib/game.ts';
import {
  armyDefense,
  setArmy,
  armyMagnitude,
  compareMagnitude,
} from '../lib/army.ts';
import {
  createBattle,
  stepBattle,
  hitEntity,
  damagePlayer,
  makeGate,
  seededRandom,
  scaleGateNumbers,
} from '../lib/combat.ts';
import { eliteDamageReduction } from '../lib/encounter-tuning.ts';

function field(floor = 45) {
  const run = createRun('mage', 734, 'endless');
  Object.assign(run, {
    floor,
    phase: 'battle',
    node: { id: `${floor}-0`, floor, col: 0, kind: 'battle', next: [] },
  });
  return createBattle(run);
}
test('army formation uses bounded logarithmic defense and composes with equipment', () => {
  const run = createRun('knight', 42, 'endless');
  setArmy(run, { mantissa: 1, exponent: 3 });
  assert.equal(armyDefense(run), 0);
  setArmy(run, { mantissa: 2.55, exponent: 136 });
  const guard = armyDefense(run);
  assert.ok(guard > 0.338 && guard < 0.34);
  run.relics.plate = 3;
  const s = stats(run);
  assert.ok(
    Math.abs(s.armor - (1 - (1 - s.equipmentArmor) * (1 - guard))) < 1e-12,
  );
  const b = createBattle(run);
  b.shield = 0;
  const hp = b.player.hp;
  damagePlayer(b, 100, 0);
  assert.equal(hp - b.player.hp, Math.ceil(100 * (1 - s.armor)));
  for (const exponent of [1000, 1000000, Number.MAX_SAFE_INTEGER]) {
    setArmy(run, { mantissa: 2, exponent });
    assert.ok(Number.isFinite(stats(run).armor));
    assert.ok(armyDefense(run) <= 0.4 && armyDefense(run) > guard);
  }
});
test('chapter crowds get denser with bounded staggered bodies and no extra staircase mobs', () => {
  let previous = 0;
  for (const floor of [0, 5, 10, 15, 45, 75, 85]) {
    const b = field(floor);
    const swarm = b.entities.filter((e) => e.swarm);
    const density = swarm.length / b.totalWaves;
    assert.ok(density >= previous);
    previous = density;
    assert.ok(
      swarm.every(
        (e) =>
          Math.abs(e.x) < 0.94 &&
          e.width === 0.22 &&
          e.hp > 0 &&
          e.lastAttack === Infinity,
      ),
    );
    assert.deepEqual(b.entities, field(floor).entities);
    const elite = b.entities.find((e) => e.boss);
    assert.equal(elite.armor, eliteDamageReduction(b.player));
  }
  for (const floor of [90, 94, 98, 99])
    assert.equal(
      field(floor).entities.some((e) => e.swarm),
      false,
    );
});
test('swarm side misses are harmless and simultaneous contact cannot stack instant hits', () => {
  for (const touch of [false, true]) {
    const b = field(45),
      bodies = b.entities.filter((e) => e.swarm).slice(0, 5);
    for (const e of b.entities) e.done = !bodies.includes(e);
    b.shootTimer = Infinity;
    b.pressure = null;
    b.finalStart = Infinity;
    b.x = touch ? 0 : 0.9;
    b.shield = 0;
    for (const e of bodies) {
      e.x = 0;
      e.start = 0;
      e.arrival = 1;
    }
    b.time = 0.99;
    const hp = b.player.hp;
    stepBattle(b, 0.02);
    assert.ok(bodies.every((e) => e.done));
    if (touch) assert.ok(hp - b.player.hp > 0 && hp - b.player.hp < 50);
    else assert.equal(b.player.hp, hp);
  }
});
test('extra bodies share limited gold, XP and healing rather than multiplying the economy', () => {
  const b = field(85);
  b.player.xp = 1e6;
  b.player.maxHp = 1000;
  b.player.hp = 100;
  b.player.relics.vampire = 1;
  const swarm = b.entities.filter((e) => e.swarm && e.wave === 1);
  const start = { gold: b.player.gold, xp: b.player.xp, hp: b.player.hp };
  for (const e of swarm) hitEntity(b, e, e.hp * 10, false, false);
  assert.ok(b.player.xp - start.xp <= 3);
  assert.ok(Math.abs(b.player.hp - start.hp - 1.05) < 1e-8);
  // Per-wave base coins are at most two before normal depth income is applied.
  assert.ok(b.swarmGoldRemainder < 1 && b.swarmXpRemainder < 1);
});
test('mid-expedition elite opening armor prevents an instant kill and releases its hit cap after three seconds', () => {
  const b = field(75),
    elite = b.entities.find((e) => e.boss);
  b.time = elite.start + 0.1;
  hitEntity(b, elite, elite.maxHp * 100, false, false);
  assert.ok(elite.hp > elite.maxHp * 0.96);
  b.time = elite.start + 3.01;
  hitEntity(b, elite, elite.maxHp * 100, false, false);
  assert.equal(elite.done, true);
  assert.equal(
    field(10).entities.find((e) => e.boss).resilienceSeconds,
    undefined,
  );
});
test('rare positive gates occur deterministically and retain real scaled arithmetic', () => {
  const random = seededRandom(7316),
    seen = new Set();
  for (let i = 0; i < 2000; i++)
    for (const g of makeGate(random, 2, 10, false)) {
      if (g.rarity) {
        seen.add(g.rarity);
        assert.ok(g.op === '+' || g.op === '×');
        if (g.rarity === 'legendary') assert.equal(g.value, 5);
        if (g.rarity === 'epic') assert.equal(g.value, 2);
      }
    }
  assert.equal(seen.size, 3);
  const run = createRun('mage', 1, 'endless');
  run.relics.mirror = 2;
  setArmy(run, { mantissa: 2.55, exponent: 136 });
  assert.equal(
    effectiveGate(run, { op: '×', value: 5, rarity: 'legendary' }).value,
    5.16,
  );
  const gate = scaleGateNumbers(
    [{ op: '+', value: 48, rarity: 'rare', left: -1, right: 1 }],
    run,
    10,
  )[0];
  const before = armyMagnitude(run);
  applyGate(run, gate, 0);
  assert.ok(
    compareMagnitude(armyMagnitude(run), {
      mantissa: before.mantissa * 1.7,
      exponent: 136,
    }) > 0,
  );
});
