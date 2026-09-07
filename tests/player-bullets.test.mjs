import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, stats } from '../lib/game.ts';
import {
  createBattle,
  stepBattle,
  worldY,
  activateSkill,
} from '../lib/combat.ts';
import { VIEW } from '../lib/view.ts';

function arena(relics = {}, classId = 'ranger') {
  const run = createRun(classId, 887);
  run.phase = 'battle';
  run.node = { id: '0-1', floor: 0, col: 1, kind: 'battle' };
  run.relics = relics;
  const b = createBattle(run);
  const template = b.entities.find((e) => e.kind === 'enemy' && !e.boss);
  const sentinel = b.entities.find((e) => e.boss);
  sentinel.start = 10000;
  sentinel.arrival = 10004;
  const target = {
    ...template,
    id: 900,
    x: 0,
    start: 0,
    arrival: 10,
    hp: 1000,
    maxHp: 1000,
    armor: 0,
    lastAttack: Infinity,
  };
  b.entities = [sentinel, target];
  b.time = 2;
  b.random = () => 1;
  return { b, target };
}
function advance(b, seconds) {
  for (let n = 0; n < Math.round(seconds * 100); n++) stepBattle(b, 0.01);
}
function launchOnce(b) {
  stepBattle(b, 0.01);
  b.shootTimer = Infinity;
  return b.bullets[0];
}
function round(b, overrides = {}) {
  return {
    id: 10000,
    kind: 'arrow',
    x: 0,
    y: 0.7,
    vx: 0,
    vy: -1.7,
    radius: 0.025,
    damage: 100,
    critical: false,
    pierceLeft: 0,
    hitIds: [],
    spawnAt: b.time - 0.1,
    originX: 0,
    originY: VIEW.playerY,
    canProc: true,
    ...overrides,
  };
}

test('rounds launch without a target, travel forward, and can miss behind an enemy', () => {
  const { b, target } = arena();
  target.x = 0.7;
  const p = launchOnce(b);
  assert.ok(p);
  assert.equal(p.vx, 0);
  assert.equal(target.hp, 1000);
  advance(b, 0.5);
  assert.equal(target.hp, 1000);
  assert.equal(p.x, 0);
  assert.ok(
    p.y < worldY(target, b.time),
    'a missed round passes behind the enemy',
  );
  advance(b, 1);
  assert.equal(b.bullets.length, 0, 'offscreen rounds are retired');
});

test('a shot takes time to hit and never steers when a target moves', () => {
  const hit = arena();
  launchOnce(hit.b);
  assert.equal(hit.target.hp, 1000);
  advance(hit.b, 0.5);
  assert.ok(hit.target.hp < 1000);
  const miss = arena();
  const p = launchOnce(miss.b);
  miss.target.x = -0.7;
  advance(miss.b, 0.5);
  assert.equal(miss.target.hp, 1000);
  assert.equal(p.x, 0);
});

test('an in-flight round cannot kill a guardian on the exact portrait entrance frame', () => {
  const { b, target } = arena();
  target.boss = true;
  target.start = 3;
  target.arrival = 7;
  b.time = 2.95;
  b.shootTimer = Infinity;
  b.bullets.push(round(b, { y: -0.02, damage: 2000 }));
  stepBattle(b, 0.05);
  assert.equal(target.hp, 1000);
  b.inputLocked = true;
  advance(b, 1);
  assert.equal(target.hp, 1000);
  b.inputLocked = false;
  stepBattle(b, 0.01);
  assert.equal(target.done, true);
});

test('the nearest body blocks a shot; pierce reaches the rear body with 75% damage', () => {
  for (const piercing of [0, 1]) {
    const { b, target: rear } = arena({ pierce: piercing });
    const front = { ...rear, id: 901, start: -2, arrival: 8 };
    b.entities.push(front); // Reverse depth order deliberately.
    launchOnce(b);
    advance(b, 0.5);
    const first = 1000 - front.hp,
      second = 1000 - rear.hp;
    assert.ok(first > 0);
    assert.ok(Math.abs(second - first * (piercing ? 0.75 : 0)) < 1e-8);
  }
});

test('swept collision catches high speed shots and never hits the same body twice', () => {
  const { b, target } = arena();
  b.shootTimer = Infinity;
  b.bullets.push(round(b, { vy: -40 }));
  stepBattle(b, 0.05);
  assert.equal(target.hp, 900);
  b.bullets.push(
    round(b, { id: 10001, y: worldY(target, b.time), vy: 0, pierceLeft: 3 }),
  );
  stepBattle(b, 0.01);
  assert.equal(target.hp, 800);
  advance(b, 0.1);
  assert.equal(target.hp, 800);
});

test('scatter, velocity and focus change real round geometry; echo adds a delayed round', () => {
  const { b } = arena({ split: 2, velocity: 2, focus: 2, echo: 1 }, 'mage');
  b.shots = 2;
  launchOnce(b);
  assert.equal(b.bullets.length, 6);
  assert.equal(b.bullets.filter((p) => p.vx < 0).length, 2);
  assert.equal(b.bullets.filter((p) => p.vx > 0).length, 2);
  const main = b.bullets[0],
    echo = b.bullets.at(-1);
  assert.equal(main.radius, stats(b.player).bulletRadius);
  assert.equal(main.vy, -stats(b.player).bulletSpeed);
  assert.ok(Math.abs(echo.damage - main.damage * 0.8) < 1e-8);
  assert.ok(echo.spawnAt > b.time);
  stepBattle(b, 0.05);
  assert.equal(echo.y, echo.originY);
});

test('explosive impacts damage nearby bodies without making the original shot pierce', () => {
  const { b, target } = arena({ blast: 1 });
  const neighbor = { ...target, id: 901, x: 0.22 };
  const distant = { ...target, id: 902, x: 0.75 };
  b.entities.push(neighbor, distant);
  b.shootTimer = Infinity;
  b.bullets.push(round(b, { vy: -40 }));
  stepBattle(b, 0.05);
  assert.equal(target.hp, 900);
  assert.equal(neighbor.hp, 970);
  assert.equal(distant.hp, 1000);
  assert.equal(b.bullets.length, 0);
});

test('ricochet creates directional fragments after a critical hit, with no recursive procs', () => {
  const { b, target } = arena({ ricochet: 2 });
  b.shootTimer = Infinity;
  b.bullets.push(round(b, { critical: true, vy: -40 }));
  stepBattle(b, 0.05);
  assert.equal(target.hp, 900);
  assert.equal(b.bullets.length, 2);
  assert.ok(
    b.bullets.every((p) => p.kind === 'shard' && !p.canProc && p.damage === 60),
  );
  assert.ok(b.bullets[0].vx < 0 && b.bullets[1].vx > 0);
  advance(b, 0.1);
  assert.equal(
    target.hp,
    900,
    'fragments leave their source body without hitting it again',
  );
});

test('execute bonuses are evaluated per body, without being baked into ricochet twice', () => {
  const { b, target } = arena({ execute: 2, ricochet: 1, blast: 1 });
  target.hp = 200;
  const healthy = { ...target, id: 901, x: 0.22, hp: 1000 };
  b.entities.push(healthy);
  b.shootTimer = Infinity;
  b.bullets.push(round(b, { critical: true, vy: -40 }));
  stepBattle(b, 0.05);
  assert.equal(target.hp, 60);
  assert.equal(
    healthy.hp,
    970,
    'a healthy splash target gets no execute bonus',
  );
  assert.ok(b.bullets.every((p) => p.kind === 'shard' && p.damage === 30));
});

test('arrival input lock freezes bullets, and moving after firing cannot bypass the frontal shield', () => {
  const { b, target } = arena();
  target.guardUntil = b.time + 5;
  const p = launchOnce(b);
  const y = p.y;
  b.inputLocked = true;
  advance(b, 0.5);
  assert.equal(p.y, y);
  assert.equal(activateSkill(b), false);
  b.inputLocked = false;
  b.x = 0.8;
  advance(b, 0.5);
  // Compare with an identical shot fired from the center, without moving.
  const stable = arena();
  stable.target.guardUntil = stable.b.time + 5;
  launchOnce(stable.b);
  advance(stable.b, 0.5);
  assert.equal(target.hp, stable.target.hp);
});
