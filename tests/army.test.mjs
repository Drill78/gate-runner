import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRun,
  applyGate,
  firepower,
  restoreRun,
  troopMultiplier,
} from '../lib/game.ts';
import {
  armyMagnitude,
  setArmy,
  multiplyArmy,
  formatArmy,
  projectMagnitude,
  validMagnitude,
  compareMagnitude,
  peakArmyMagnitude,
} from '../lib/army.ts';
import { createBattle, scaleGateNumbers, damagePlayer } from '../lib/combat.ts';
import { healthGrowth, depthDamage, ENDLESS_CURVE } from '../lib/endless.ts';

test('repeated squares grow past both safe integers and floating-point range and survive checkpoint reload', () => {
  let run = createRun('knight', 42, 'endless');
  run.phase = 'map';
  run.squad = 1e8;
  for (let i = 0; i < 12; i++) applyGate(run, { op: '²', value: 2 }, 0);
  assert.deepEqual(armyMagnitude(run), { mantissa: 1, exponent: 32768 });
  assert.equal(formatArmy(run), '1.00×10^32768');
  run = restoreRun(JSON.stringify(run));
  assert.ok(run);
  multiplyArmy(run, 1.05);
  assert.deepEqual(armyMagnitude(run), { mantissa: 1.05, exponent: 32768 });
  applyGate(run, { op: '√', value: 2 }, 0);
  assert.equal(armyMagnitude(run).exponent, 16384);
  assert.ok(Number.isFinite(firepower(run).dps));
  assert.equal(peakArmyMagnitude(run).exponent, 32768);
});
test('large red and positive gates keep relative amounts and damage never collapses the army to its projection', () => {
  const run = createRun('knight', 42, 'endless');
  run.phase = 'battle';
  run.node = run.nodes[0][0];
  setArmy(run, { mantissa: 2, exponent: 500 });
  const gates = scaleGateNumbers(
    [
      { op: '+', value: 10, left: -1, right: 0 },
      { op: '-', value: 10, left: 0, right: 1 },
    ],
    run,
    10,
  );
  assert.ok(
    gates.every(
      (g) => validMagnitude(g.armyValue) && g.armyValue.exponent >= 499,
    ),
  );
  const before = armyMagnitude(run);
  const gained = applyGate(run, gates[0], 0);
  assert.equal(compareMagnitude(armyMagnitude(run), before), 1);
  assert.match(gained.deltaLabel, /10\^499/);
  const b = createBattle(run);
  b.shield = 0;
  damagePlayer(b, 10, 0.1);
  assert.equal(armyMagnitude(b.player).exponent, 500);
  assert.ok(armyMagnitude(b.player).mantissa < armyMagnitude(run).mantissa);
});
test('malformed huge-army checkpoints are rejected while old v4 counts remain readable', () => {
  const run = createRun('mage', 1, 'endless');
  run.phase = 'map';
  assert.ok(restoreRun(JSON.stringify(run)));
  setArmy(run, { mantissa: 3, exponent: 400 });
  for (const bad of [
    { mantissa: 10, exponent: 400 },
    { mantissa: 2, exponent: -1 },
    { mantissa: 1, exponent: 0.5 },
  ])
    assert.equal(
      restoreRun(JSON.stringify({ ...run, squadMagnitude: bad })),
      null,
    );
  assert.equal(restoreRun(JSON.stringify({ ...run, squad: 100 })), null);
});
test('square approximately doubles high-army firepower instead of multiplying damage by the full army', () => {
  const run = createRun('knight');
  setArmy(run, { mantissa: 1, exponent: 40 });
  const before = troopMultiplier(run);
  applyGate(run, { op: '²', value: 2 }, 0);
  assert.ok(
    troopMultiplier(run) / before > 2 && troopMultiplier(run) / before < 2.1,
  );
  assert.ok(projectMagnitude(armyMagnitude(run)) > 1e79);
});
test('endless difficulty steps after three chapter bosses (15 rooms), independently of army size', () => {
  assert.equal(ENDLESS_CURVE.bandSize, 15);
  const r = createRun('ranger', 734, 'endless');
  r.floor = 15;
  const a = healthGrowth(r, 1.27);
  r.floor = 18;
  assert.ok(
    healthGrowth(r, 1.27) / a < 1.03,
    'three rooms do not trigger a new difficulty tier',
  );
  r.floor = 30;
  assert.ok(
    Math.abs(healthGrowth(r, 1.27) / a - ENDLESS_CURVE.earlyStep) < 1e-9,
  );
  assert.ok(depthDamage(r) > depthDamage({ ...r, floor: 15 }));
  const unchanged = healthGrowth(r, 1.27);
  setArmy(r, { mantissa: 1, exponent: 10000 });
  assert.equal(healthGrowth(r, 1.27), unchanged);
});
