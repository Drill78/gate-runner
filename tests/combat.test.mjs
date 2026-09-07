import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRun,
  firepower,
  applyGate,
  addRelic,
  restoreRun,
  stats,
  experience,
  grantExperience,
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
  projectilePosition,
} from '../lib/combat.ts';
import { VIEW, screenY } from '../lib/view.ts';

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
  assert.ok(Math.abs(b.x - BALANCE.pointerMaxSpeed * 0.05) < 1e-9);
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
    if (floor === 3) assert.ok(b.projectiles.some((p) => p.kind === 'axe'));
    if (floor === 7) assert.ok(b.projectiles.some((p) => p.kind === 'star'));
    if (floor === 11) assert.ok(b.projectiles.some((p) => p.kind === 'ember'));
    b.pressure = null;
    b.time = b.finalStart + BALANCE.enrageAfter + 0.1;
    b.threats = [];
    stepBattle(b, 0.01);
    assert.ok(b.enrage);
  }
});

test('expanded orthographic view exposes upcoming targets without entering firing range', () => {
  const b = battle(),
    e = b.entities.find((e) => e.kind === 'enemy');
  const far = screenY(worldY(e, e.start - 1), 844),
    near = screenY(worldY(e, e.start), 844);
  assert.ok(far > 0 && far < near);
  assert.ok(screenY(0.8, 844) > 844 * 0.65);
  assert.ok(
    screenY(0.8, 844) + 45 < 844 - 140,
    'army stays above the bottom controls',
  );
  assert.equal(VIEW.previewSeconds, 1.25);
  isolate(b, e);
  b.time = e.start - 1;
  b.x = e.x;
  const hp = e.hp;
  advance(b, 0.5);
  assert.equal(e.hp, hp);
});

test('experience grows attributes modestly, never restores a whole health bar', () => {
  const r = createRun('knight');
  r.hp = 50;
  const damage = stats(r).damage;
  assert.equal(grantExperience(r, 29), 0);
  assert.equal(grantExperience(r, 1), 1);
  assert.equal(experience(r).level, 2);
  assert.equal(r.maxHp, 122);
  assert.equal(r.hp, 52);
  assert.ok(Math.abs(stats(r).damage - damage * 1.02) < 1e-9);
  assert.equal(grantExperience(r, Infinity), 0);
  assert.equal(r.xp, 30);
});

test('v0.2 checkpoints migrate without losing the expedition; invalid XP is rejected', () => {
  const r = createRun('mage');
  r.phase = 'map';
  const old = { ...r, version: 2 };
  delete old.xp;
  const restored = restoreRun(JSON.stringify(old));
  assert.equal(restored.version, 3);
  assert.equal(restored.xp, 0);
  assert.equal(restored.seed, r.seed);
  assert.equal(restoreRun(JSON.stringify({ ...r, xp: -1 })), null);
  assert.equal(restoreRun(JSON.stringify({ ...r, xp: 2.5 })), null);
});

test('enemy kills award gold and XP once; leaked enemies award neither', () => {
  const b = battle('ranger'),
    e = b.entities.find((e) => e.kind === 'enemy' && !e.boss);
  isolate(b, e);
  b.time = e.start + 0.2;
  b.x = e.x;
  e.hp = 1;
  const gold = b.player.gold;
  stepBattle(b, 0.01);
  assert.equal(b.player.gold, gold + 4);
  assert.equal(b.player.xp, 6);
  advance(b, 0.2);
  assert.equal(b.player.xp, 6);
  const missed = battle('ranger'),
    leak = missed.entities.find((e) => e.kind === 'enemy' && !e.boss);
  isolate(missed, leak);
  missed.time = leak.arrival - 0.01;
  missed.x = leak.x > 0 ? -0.9 : 0.9;
  stepBattle(missed, 0.05);
  assert.ok(leak.done);
  assert.equal(missed.player.xp, 0);
  assert.equal(missed.player.gold, 40);
});

test('same projectile volley cannot multiply damage; swept crossings still resolve', () => {
  const b = battle('ranger');
  const p = {
    id: 1,
    volleyId: 1,
    kind: 'star',
    fromX: 0,
    fromY: 0.33,
    toX: 0,
    spawnAt: 0,
    impactAt: 0.04,
    radius: 0.04,
    damage: 20,
    sway: 0.1,
    phase: 0,
    resolved: false,
  };
  b.projectiles = [{ ...p }, { ...p, id: 2 }];
  stepBattle(b, 0.05);
  assert.equal(b.player.hp, 70);
  assert.ok(b.projectiles.every((p) => p.resolved));
  assert.ok(Math.abs(projectilePosition(p, p.impactAt).y - 0.8) < 1e-9);
  assert.ok(Math.abs(projectilePosition(p, p.impactAt).x) < 1e-9);
});

test('chapter bosses begin mechanics during their first second in range', () => {
  for (const floor of [3, 7, 11]) {
    const b = battle('ranger', floor),
      boss = b.entities.find((e) => e.boss);
    isolate(b, boss);
    b.x = 0.9;
    b.time = boss.start;
    advance(b, 1.1);
    assert.ok(b.projectiles.length > 0 || b.ritual !== null);
  }
});

test('focus fire interrupts the king chant without resetting its independent pressure clock', () => {
  const b = battle('mage', 11),
    e = b.entities.find((e) => e.boss);
  isolate(b, e);
  b.time = e.start + 0.5;
  const pressureAt = b.pressure.nextAt;
  b.ritual = {
    bossId: e.id,
    name: '末日敕令',
    startedAt: b.time,
    resolveAt: b.time + 3.2,
    damage: 20,
    interruptible: true,
    breakMax: 10,
    breakRemaining: 10,
  };
  activateSkill(b);
  assert.equal(b.ritual, null);
  assert.equal(b.pressure.nextAt, pressureAt);
});

test('the watcher frontal shield rewards firing from a flank', () => {
  const b = battle('ranger', 3),
    e = b.entities.find((e) => e.boss);
  isolate(b, e);
  b.time = e.start + 0.3;
  e.guardUntil = b.time + 3;
  b.random = () => 1;
  let hp = e.hp;
  stepBattle(b, 0.01);
  const front = hp - e.hp;
  b.x = 0.4;
  b.shootTimer = 0;
  hp = e.hp;
  stepBattle(b, 0.01);
  const side = hp - e.hp;
  assert.ok(side > front * 3);
  assert.ok(front > 0);
});

// Pressure is a separate, time-based DPS check, independent of the normal attack rotation.
test('boss pressure grants its full grace period then repeats and escalates without troop loss', () => {
  for (const floor of [3, 7, 11])
    for (const x of [-0.9, 0, 0.9]) {
      const b = battle('ranger', floor),
        boss = b.entities.find((e) => e.boss),
        act = Math.floor(floor / 4);
      isolate(b, boss);
      boss.lastAttack = Infinity;
      b.shootTimer = Infinity;
      b.x = x;
      b.player.hp = b.player.maxHp = 500;
      const first = b.pressure.nextAt,
        squad = b.player.squad;
      assert.equal(first, b.finalStart + BALANCE.pressureGrace[act]);
      b.time = first - 0.1;
      stepBattle(b, 0.05);
      assert.equal(b.player.hp, 500);
      stepBattle(b, 0.05);
      stepBattle(b, 0.001);
      assert.equal(b.player.hp, 500 - BALANCE.pressureDamage[act]);
      assert.equal(b.pressure.pulses, 1);
      assert.equal(b.player.squad, squad);
      b.time = b.pressure.nextAt - 0.001;
      stepBattle(b, 0.01);
      assert.equal(
        b.player.hp,
        500 - 2 * BALANCE.pressureDamage[act] - BALANCE.pressureRamp[act],
      );
      assert.equal(b.pressure.pulses, 2);
      assert.equal(b.player.squad, squad);
    }
});
test('class shields and armor still mitigate pressure; killing before the deadline cancels it', () => {
  const b = battle('knight', 11),
    boss = b.entities.find((e) => e.boss);
  isolate(b, boss);
  boss.lastAttack = Infinity;
  b.shootTimer = Infinity;
  b.x = 0.9;
  b.time = b.pressure.nextAt - 0.01;
  const hp = b.player.hp,
    shield = b.shield;
  stepBattle(b, 0.02);
  assert.equal(b.player.hp, hp - Math.max(0, Math.ceil(20 * 0.88) - shield));
  const kill = battle('ranger', 11),
    target = kill.entities.find((e) => e.boss);
  isolate(kill, target);
  target.lastAttack = Infinity;
  target.hp = 1;
  kill.x = 0;
  kill.time = kill.pressure.nextAt - 0.01;
  stepBattle(kill, 0.02);
  assert.equal(kill.state, 'won');
  assert.equal(kill.pressure, null);
  assert.equal(kill.player.hp, kill.player.maxHp);
});
test('first gatekeeper pressures the player with five axes and a second half-health volley', () => {
  const b = battle('ranger'),
    boss = b.entities.find((e) => e.boss);
  isolate(b, boss);
  b.x = 0.9;
  b.time = boss.start;
  advance(b, 1.01);
  assert.equal(boss.maxHp, 430);
  assert.equal(b.projectiles.length, 5);
  boss.hp = boss.maxHp * 0.49;
  boss.attackIndex = 2;
  boss.lastAttack = b.time - 4;
  b.projectiles = [];
  stepBattle(b, 0.01);
  assert.equal(b.projectiles.length, 8);
  assert.ok(b.projectiles.at(-1).spawnAt > b.projectiles[0].spawnAt);
});
test('later boss scaling is stronger without inflating first-floor common enemies or chests', () => {
  const first = battle(),
    later = battle('knight', 11);
  assert.equal(BALANCE.enemyActMultiplier[0], 1);
  assert.ok(BALANCE.bossActMultiplier[2] > BALANCE.bossActMultiplier[1]);
  assert.ok(later.entities.find((e) => e.boss).maxHp > 45000);
  assert.equal(first.entities.find((e) => e.kind === 'chest').hp, 60);
});

test('arrival locks all combat inputs and timers even before the UI snapshot updates', () => {
  const b = battle('knight', 11);
  b.inputLocked = true;
  const time = b.time,
    shield = b.shield,
    pressureAt = b.pressure.nextAt;
  assert.equal(activateSkill(b), false);
  movePlayer(b, 0.8);
  setMoveAxis(b, 1);
  stepBattle(b, 0.05);
  assert.equal(b.x, 0);
  assert.equal(b.targetX, null);
  assert.equal(b.inputAxis, 0);
  assert.equal(b.time, time);
  assert.equal(b.cooldown, 0);
  assert.equal(b.shield, shield);
  assert.equal(b.pressure.nextAt, pressureAt);
  b.inputLocked = false;
  movePlayer(b, 0.8);
  stepBattle(b, 0.05);
  assert.ok(b.x > 0);
  assert.ok(b.time > time);
  assert.ok(activateSkill(b));
});
