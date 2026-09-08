import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACT_LENGTH,
  createRun,
  applyGate,
  troopMultiplier,
  availableNodes,
  enterNode,
} from '../lib/game.ts';
import {
  createBattle,
  makeGate,
  seededRandom,
  scaleGateNumbers,
  stepBattle,
  worldY,
  BALANCE,
  gateAt,
} from '../lib/combat.ts';
import { VIEW, screenY } from '../lib/view.ts';

test('addition and subtraction scale for five-digit armies from floor two, and remain fixed once visible', () => {
  const gates = [
    { op: '+', value: 9, left: -0.9, right: 0 },
    { op: '-', value: 6, left: 0, right: 0.9 },
  ];
  assert.deepEqual(scaleGateNumbers(gates, 10000, 0), gates);
  const second = scaleGateNumbers(gates, 10000, 1);
  const ninth = scaleGateNumbers(gates, 10000, 8);
  assert.ok(second.every((g) => g.value >= 1000));
  assert.ok(ninth[1].value > second[1].value);
  const run = createRun('knight');
  run.floor = 1;
  run.squad = 10000;
  run.node = { id: '1-0', floor: 1, col: 0, kind: 'battle' };
  const b = createBattle(run);
  const gate = b.entities.find((e) => e.gate);
  stepBattle(b, 0.01);
  const locked = structuredClone(gate.gate);
  b.player.squad = 1e8;
  stepBattle(b, 0.01);
  assert.deepEqual(
    gate.gate,
    locked,
    'an approaching gate cannot change under the player',
  );
});

test('only an explicit secret trial generates square gates, with an extremely narrow route', () => {
  const positions = new Set();
  for (let seed = 1; seed <= 30; seed++) {
    const gates = makeGate(seededRandom(seed * 887), 2, 2, false, true);
    assert.deepEqual(gates.map((g) => g.op).sort(), ['+', '²', '√'].sort());
    const square = gates.find((g) => g.op === '²'),
      root = gates.find((g) => g.op === '√');
    assert.ok(square.right - square.left < 0.15);
    assert.ok(root.right - root.left > (square.right - square.left) * 2);
    assert.ok(gates[0].left >= -0.97 && gates.at(-1).right <= 0.97 + 1e-9);
    for (let i = 1; i < gates.length; i++)
      assert.ok(gates[i - 1].right < gates[i].left);
    positions.add(gates.indexOf(square));
    for (const wave of [0, 2, 4, 6, 8, 10])
      assert.ok(
        makeGate(seededRandom(seed), wave, 4, true).every((g) => g.op !== '²'),
      );
  }
  assert.equal(positions.size, 3);
  assert.ok(
    makeGate(seededRandom(1), 2, 2).every((g) => !['²', '√'].includes(g.op)),
  );
});

test('entering an enchanted original-map elite inserts five unavoidable red gates before the square choice', () => {
  const run = createRun('knight');
  run.floor = ACT_LENGTH;
  run.phase = 'map';
  const elite = availableNodes(run).find((node) => node.kind === 'elite');
  assert.ok(elite);
  assert.ok(
    createBattle(enterNode(run, elite.id)).entities.every(
      (e) => !e.trialStep && !e.trialFinal,
    ),
  );
  run.relics.square_key = 1;
  assert.ok(
    createBattle({ ...run, phase: 'battle', node: elite }).entities.every(
      (e) => !e.trialFinal,
    ),
  );
  const entered = enterNode(run, elite.id);
  assert.equal(entered.node.enchanted, true);
  assert.equal(entered.squareGateSeen, true);
  const b = createBattle(entered);
  const red = b.entities.filter((e) => e.trialStep);
  const secret = b.entities.find((e) => e.trialFinal);
  const boss = b.entities.find((e) => e.boss);
  assert.equal(red.length, 5);
  assert.ok(secret && boss.start > secret.arrival);
  assert.deepEqual(
    red.map((e) => e.gate[0].op),
    ['-', '÷', '-', '÷', '-'],
  );
  for (const e of red) {
    assert.equal(e.gate.length, 1);
    for (const x of [-0.9, -0.45, 0, 0.45, 0.9]) assert.ok(gateAt(e.gate, x));
  }
  assert.ok(red.at(-1).arrival < secret.arrival);
  assert.equal(b.player.squareGateSeen, true);
  assert.ok(
    createBattle(b.player).entities.some((e) => e.trialFinal),
    'the entry has spent the key flag but reconstructing this battle retains its trial',
  );
  const ordinary = {
    ...run,
    phase: 'battle',
    node: run.nodes[run.floor].find((node) => node.kind === 'battle'),
  };
  assert.ok(createBattle(ordinary).entities.every((e) => !e.trialFinal));

  // Isolate the actual crossing sequence after all ordinary waves are resolved.
  b.player.squad = 1000;
  b.shootTimer = Infinity;
  for (const e of b.entities)
    if (!e.trialStep && !e.trialFinal && !e.boss) e.done = true;
  b.time = red[0].start - VIEW.previewSeconds;
  stepBattle(b, 0.01);
  const values = red.map((e) => e.gate[0].value);
  assert.deepEqual(values, [140, 1.22, 120, 1.25, 94]);
  for (const [index, e] of red.entries()) {
    b.time = e.arrival - 0.01;
    b.x = [-0.9, 0, 0.9][index % 3];
    stepBattle(b, 0.02);
    assert.equal(e.done, true);
    assert.deepEqual(
      red.map((e) => e.gate[0].value),
      values,
      'the visible prices do not change mid-trial',
    );
  }
  assert.equal(b.player.squad, 373);
  const square = secret.gate.find((g) => g.op === '²');
  b.time = secret.arrival - 0.01;
  b.x = (square.left + square.right) / 2;
  stepBattle(b, 0.02);
  assert.equal(b.player.squad, 373 ** 2);
});

test('squaring keeps the original army firepower curve at every size', () => {
  for (const troops of [12, 1000, 10000, 1e8, 1e12, Number.MAX_SAFE_INTEGER])
    assert.equal(troopMultiplier(troops), 1 + Math.log2(1 + troops / 12));
});

test('square and root apply actual arithmetic beyond the old safe-integer army limit', () => {
  const knight = createRun('knight');
  knight.squad = 100;
  knight.relics.aegis = 1;
  assert.equal(applyGate(knight, { op: '²', value: 2 }, 0).shield, 6);
  assert.equal(knight.squad, 10000);
  assert.equal(applyGate(knight, { op: '√', value: 2 }, 0).shield, 0);
  assert.equal(knight.squad, 100);
  knight.squad = Number.MAX_SAFE_INTEGER;
  applyGate(knight, { op: '²', value: 2 }, 0);
  assert.ok(knight.squad > 8e31);
  const mage = createRun('mage');
  mage.squad = 101;
  applyGate(mage, { op: '√', value: 2 }, 0);
  assert.equal(mage.squad, 12, 'floor square root, then two summoned troops');
});

test('bosses stay in the upper third, retain attack patterns and receive the requested double base HP', () => {
  assert.equal(BALANCE.bossBaseHp, 3400);
  assert.equal(BALANCE.bossGrowth, 1.26);
  assert.equal(BALANCE.hpGrowth, 1.27);
  for (const floor of [4, 9, 14]) {
    const run = createRun('ranger');
    run.floor = floor;
    run.node = run.nodes[floor].find((node) => node.kind === 'boss');
    const b = createBattle(run),
      boss = b.entities.find((e) => e.boss);
    b.entities = [boss];
    b.pressure = null;
    b.time = boss.start + 1;
    b.x = 0.9;
    stepBattle(b, 0.01);
    const y = screenY(worldY(boss, b.time), 844);
    assert.ok(y < 844 * 0.34 && y > 844 * 0.25);
    assert.ok(b.projectiles.length > 0 || b.ritual !== null);
    assert.ok(worldY(boss, b.time) < VIEW.playerY);
  }
});
