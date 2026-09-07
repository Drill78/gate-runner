import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, TOTAL_FLOORS } from '../lib/game.ts';
import {
  BALANCE,
  createBattle,
  kingPhase,
  movePlayer,
  stepBattle,
} from '../lib/combat.ts';

function encounter(phase = 1, attack = 0) {
  const run = createRun('ranger', 734);
  run.floor = TOTAL_FLOORS - 1;
  run.phase = 'battle';
  run.node = run.nodes[run.floor][0];
  const b = createBattle(run);
  const king = b.entities.find((e) => e.boss);
  for (const e of b.entities) if (e !== king) e.done = true;
  king.hp = king.maxHp * [1, 0.7, 0.35][phase - 1];
  king.attackIndex = attack;
  b.time = king.start + 0.6;
  b.shootTimer = Infinity;
  b.pressure = null;
  return { b, king };
}

test('the final king has extra durability, damage and faster phases without affecting early bosses', () => {
  const { b, king } = encounter();
  const oldBaseline =
    BALANCE.bossBaseHp *
    BALANCE.bossGrowth ** b.player.floor *
    BALANCE.bossActMultiplier[2];
  assert.equal(king.maxHp, oldBaseline * 1.6);
  assert.equal(king.volleyDamage, (17 + b.player.floor * 1.6) * 1.2);
  assert.deepEqual(
    [1, 2, 3].map((phase) => kingPhase(encounter(phase).king)),
    [1, 2, 3],
  );
  assert.deepEqual(BALANCE.finalBossAttackIntervals, [4, 3.5, 3]);
  for (const phase of [1, 2, 3]) {
    const state = encounter(phase);
    stepBattle(state.b, 0.01);
    assert.equal(state.king.phase, phase);
    assert.equal(state.b.projectiles.length, phase === 1 ? 7 : 13);
  }
});

test('both staggered crown volleys are dodgeable by changing gaps after the first impact', () => {
  for (const phase of [1, 2, 3]) {
    const { b, king } = encounter(phase);
    const hp = b.player.hp;
    movePlayer(b, 0.14);
    stepBattle(b, 0.01);
    king.lastAttack = Infinity;
    const firstImpact = b.projectiles[0].impactAt;
    for (let i = 0; i < 57; i++) {
      if (b.time > firstImpact + 0.03) movePlayer(b, 0);
      stepBattle(b, 0.05);
    }
    assert.equal(b.player.hp, hp);
    assert.ok(b.projectiles.every((p) => p.resolved));
  }
});

test('meteor corridors, crossfire and shortened final chant all retain a real safe solution', () => {
  for (const attack of [1, 2, 3]) {
    const { b, king } = encounter(3, attack);
    const hp = b.player.hp;
    stepBattle(b, 0.01);
    king.lastAttack = Infinity;
    if (attack === 1) {
      assert.equal(b.ritual.name, '终末敕令');
      assert.equal(b.ritual.safeWidth, 0.36);
      assert.ok(
        Math.abs(b.ritual.resolveAt - b.ritual.startedAt - 2.65) < 1e-9,
      );
      movePlayer(b, b.ritual.safeX);
    } else if (attack === 2) {
      assert.equal(b.threats.length, 3);
      assert.ok(b.threats.every((t) => t.name === '陨火葬城'));
      movePlayer(b, 0.35);
    } else {
      assert.equal(new Set(b.projectiles.map((p) => p.fromX)).size, 2);
      movePlayer(b, 0);
    }
    for (let i = 0; i < 58; i++) stepBattle(b, 0.05);
    assert.equal(b.player.hp, hp);
    assert.equal(b.ritual, null);
    assert.equal(b.threats.length, 0);
    assert.ok(b.projectiles.every((p) => p.resolved));
  }
});
