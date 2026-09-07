import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRun,
  firepower,
  applyGate,
  addRelic,
  restoreRun,
  stats,
} from '../lib/game.ts';
import {
  BALANCE,
  createBattle,
  stepBattle,
  movePlayer,
  setMoveAxis,
  worldY,
  makeGate,
  gateAt,
  seededRandom,
  activateSkill,
  damagePlayer,
  attackDamage,
} from '../lib/combat.ts';

function battle(classId = 'knight', floor = 0) {
  const run = createRun(classId, 734);
  run.floor = floor;
  run.phase = 'battle';
  run.node = {
    id: `${floor}-1`,
    floor,
    col: 1,
    kind: floor % 4 === 3 ? 'boss' : 'battle',
  };
  return createBattle(run);
}
function advance(b, seconds) {
  for (let i = 0; i < Math.round(seconds * 100); i++) stepBattle(b, 0.01);
}
function isolate(b, target) {
  for (const e of b.entities)
    if (e !== target) {
      e.start += 1000;
      e.arrival += 1000;
    }
}

test('movement is continuous, speed limited, bounded, and stops on release', () => {
  const b = battle();
  movePlayer(b, 0.67);
  stepBattle(b, 0.05);
  assert.ok(Math.abs(b.x - BALANCE.moveSpeed * 0.05) < 1e-9);
  advance(b, 0.5);
  assert.equal(b.x, 0.67);
  setMoveAxis(b, -1);
  advance(b, 0.2);
  assert.ok(b.x > 0 && b.x < 0.67);
  setMoveAxis(b, 0);
  const stopped = b.x;
  advance(b, 0.2);
  assert.equal(b.x, stopped);
  movePlayer(b, -20);
  advance(b, 2);
  assert.equal(b.x, BALANCE.minX);
});

test('overhead travel has equal displacement far away and near the player', () => {
  const e = battle().entities.find((e) => e.kind === 'gate');
  const far = worldY(e, e.start + 0.5) - worldY(e, e.start);
  const near = worldY(e, e.arrival) - worldY(e, e.arrival - 0.5);
  assert.ok(Math.abs(far - near) < 1e-9);
  assert.ok(Math.abs(worldY(e, e.arrival) - 0.8) < 1e-9);
});

test('seeded gates include unequal two/three choices; gaps do not claim two gates', () => {
  const random = seededRandom(11);
  const groups = Array.from({ length: 60 }, () => makeGate(random, 2, 4));
  assert.ok(groups.some((g) => g.length === 2));
  assert.ok(groups.some((g) => g.length === 3));
  for (const gates of groups) {
    assert.ok(
      new Set(gates.map((g) => (g.right - g.left).toFixed(2))).size > 1,
    );
    gates.forEach((g) =>
      assert.equal(gateAt(gates, (g.left + g.right) / 2), g),
    );
    assert.equal(
      gateAt(gates, (gates[0].right + gates[1].left) / 2),
      undefined,
    );
  }
});

test('a crossing uses the commander position once and never snaps to a lane', () => {
  const b = battle();
  const gate = b.entities.find((e) => e.kind === 'gate');
  isolate(b, gate);
  const selected = gate.gate.at(-1);
  movePlayer(b, (selected.left + selected.right) / 2);
  const expected = structuredClone(b.player);
  applyGate(expected, selected, b.shield);
  advance(b, gate.arrival + 0.1);
  assert.equal(b.player.squad, expected.squad);
  assert.equal(b.player.gates, 1);
  advance(b, 0.5);
  assert.equal(b.player.gates, 1);
});

test('army size has diminishing firepower returns without the old 999 cap', () => {
  const r = createRun('knight');
  r.phase = 'map';
  r.squad = 1200;
  const before = firepower(r);
  applyGate(r, { op: '×', value: 2 }, 0);
  assert.equal(r.squad, 2400);
  assert.ok(firepower(r).dps > before.dps);
  assert.ok(firepower(r).dps < before.dps * 1.3);
  assert.equal(firepower(r).volley, stats(r).damage * firepower(r).multiplier);
  assert.equal(restoreRun(JSON.stringify(r)).squad, 2400);
  assert.equal(restoreRun(JSON.stringify({ ...r, version: 1 })), null);
});

test('each act increases wave count, travel speed, and enemy durability', () => {
  const rooms = [battle('knight', 0), battle('knight', 4), battle('knight', 8)];
  assert.deepEqual(
    rooms.map((b) => b.totalWaves),
    [8, 10, 12],
  );
  const targets = rooms.map((b) =>
    b.entities.find((e) => e.kind === 'enemy' && !e.boss),
  );
  assert.ok(targets[0].hp > attackDamage(rooms[0]) * 4);
  assert.ok(targets[2].hp > targets[1].hp && targets[1].hp > targets[0].hp);
  assert.ok(
    targets[2].arrival - targets[2].start <
      targets[0].arrival - targets[0].start,
  );
});

test('archers telegraph before leaving the battlefield', () => {
  const b = battle('ranger');
  const archer = b.entities.find((e) => e.variant === 'archer');
  isolate(b, archer);
  b.x = archer.x > 0 ? -0.9 : 0.9;
  b.time = archer.start;
  advance(b, 1.1);
  assert.ok(b.threats.some((t) => t.name === '弓手狙击'));
  assert.ok(b.threats[0].resolveAt < archer.arrival);
});

test('telegraphed attacks can be dodged; taking one damages health and troops', () => {
  const dodge = battle('ranger'),
    hit = battle('ranger');
  for (const b of [dodge, hit])
    b.threats.push({
      id: 99,
      x: 0,
      width: 0.3,
      resolveAt: 0.5,
      damage: 20,
      name: 'test',
    });
  movePlayer(dodge, 0.6);
  advance(dodge, 0.6);
  advance(hit, 0.6);
  assert.equal(dodge.player.hp, 90);
  assert.equal(dodge.player.squad, 15);
  assert.equal(hit.player.hp, 70);
  assert.ok(hit.player.squad < 15);
});

test('full shield absorption preserves troops and defeated battles stop ticking', () => {
  const b = battle();
  b.shield = 100;
  damagePlayer(b, 20);
  assert.equal(b.player.hp, 120);
  assert.equal(b.player.squad, 12);
  damagePlayer(b, 10000);
  assert.equal(b.state, 'lost');
  const time = b.time;
  advance(b, 1);
  assert.equal(b.time, time);
});

test('weapon and supply chests grant distinct rewards; expired chests give nothing', () => {
  for (const reward of ['weapon', 'gold']) {
    const b = battle('mage');
    const chest = b.entities.find(
      (e) => e.kind === 'chest' && e.reward === reward,
    );
    isolate(b, chest);
    b.time = chest.start + 0.1;
    b.x = chest.x;
    chest.hp = 1;
    const gold = b.player.gold,
      tier = b.player.weaponTier;
    stepBattle(b, 0.05);
    assert.equal(b.player.chests, 1);
    assert.equal(b.player.weaponTier, tier + (reward === 'weapon' ? 1 : 0));
    assert.equal(b.player.gold, gold + (reward === 'gold' ? 22 : 0));
  }
  const b = battle();
  const chest = b.entities.find((e) => e.kind === 'chest');
  isolate(b, chest);
  b.time = chest.arrival - 0.01;
  b.x = chest.x > 0 ? -0.9 : 0.9;
  stepBattle(b, 0.05);
  assert.ok(chest.done);
  assert.equal(b.player.chests, 0);
});

test('active skills respect cooldown and class effects, including the tuned knight shield', () => {
  const b = battle();
  const before = b.shield;
  assert.equal(activateSkill(b), true);
  assert.equal(b.shield, before + 18);
  assert.equal(activateSkill(b), false);
  assert.ok(attackDamage(b) > firepower(b.player, b.shield).volley);
  const mage = battle('mage');
  mage.player = addRelic(mage.player, 'archmage');
  activateSkill(mage);
  assert.equal(mage.player.squad, 21);
});

test('chapter bosses expose their unique warned patterns and eventually enrage', () => {
  for (const floor of [3, 7, 11]) {
    const b = battle('ranger', floor),
      boss = b.entities.find((e) => e.boss);
    isolate(b, boss);
    b.time = boss.start + 4.3;
    b.x = 0.9;
    stepBattle(b, 0.01);
    assert.equal(b.threats.length, floor === 3 ? 1 : 2);
    b.time = b.finalStart + BALANCE.enrageAfter + 0.1;
    b.threats = [];
    stepBattle(b, 0.01);
    assert.ok(b.enrage);
  }
});
