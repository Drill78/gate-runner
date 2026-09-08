import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRun,
  createRunMap,
  completeRoom,
  beginEpilogue,
  availableNodes,
} from '../lib/game.ts';
import {
  createBattle,
  hitEntity,
  stepBattle,
  damagePlayer,
  activateSkill,
  movePlayer,
  arrivalDuration,
  spectacleDuration,
  EPILOGUE_BLESSINGS,
  skipBattleUpgrade,
} from '../lib/combat.ts';

function arena(ids = ['king'], mutations = [], secondLives = false) {
  const run = createRun('ranger', 734, 'endless');
  run.floor = 44;
  run.node = { id: 'dev-arena', floor: 44, col: 0, kind: 'boss', next: [] };
  run.phase = 'battle';
  run.devMode = true;
  run.devEncounter = {
    name: '试炼',
    omen: '试炼',
    groups: [ids],
    mutations: [mutations],
    secondLives,
  };
  run.hp = run.maxHp = 10000;
  const b = createBattle(run);
  b.pressure = null;
  b.time = b.finalStart + 0.1;
  b.shootTimer = Infinity;
  for (const e of b.entities) e.lastAttack = Infinity;
  return b;
}
function advance(b, seconds) {
  for (let i = 0; i < Math.ceil(seconds / 0.05); i++) stepBattle(b, 0.05);
}
function overwhelm(b, e) {
  for (let i = 0; i < 40 && !e.done && !b.transition; i++)
    hitEntity(b, e, e.maxHp * 100, false, false, 0.9);
}

test('normal king has one life; designated kings revive once without rewarding a premature kill', () => {
  const ordinary = createRun('ranger', 734);
  ordinary.floor = 14;
  ordinary.node = ordinary.nodes[14][0];
  ordinary.phase = 'battle';
  const normal = createBattle(ordinary),
    king = normal.entities.find((e) => e.boss);
  normal.time = king.start + 1;
  hitEntity(normal, king, king.maxHp * 2);
  assert.equal(king.done, true);
  assert.equal(normal.transition, null);

  const b = arena(['king'], [], true),
    royal = b.entities[0];
  b.time = royal.start + 13;
  const hp = royal.maxHp,
    kills = b.player.kills;
  overwhelm(b, royal);
  assert.equal(royal.done, false);
  assert.equal(royal.life, 2);
  assert.equal(royal.encounterId, 'king-reborn');
  assert.equal(royal.hp, hp * 0.85);
  assert.equal(b.player.kills, kills);
  assert.equal(b.state, 'running');
  assert.equal(b.transition.duration, 4);
  assert.equal(spectacleDuration(royal), 18);
});

test('revival freezes battle time and inputs for all four seconds, then resumes', () => {
  const b = arena(['king'], [], true),
    e = b.entities[0];
  b.time = e.start + 13;
  overwhelm(b, e);
  const now = b.time,
    hp = e.hp;
  movePlayer(b, 0.8);
  assert.equal(b.targetX, null);
  assert.equal(activateSkill(b), false);
  hitEntity(b, e, hp * 3);
  assert.equal(e.hp, hp);
  advance(b, 3.9);
  assert.ok(b.transition);
  assert.equal(b.time, now);
  advance(b, 0.1);
  assert.equal(b.transition, null);
  assert.equal(b.time, now);
  stepBattle(b, 0.05);
  assert.ok(b.time > now);
  assert.equal(arrivalDuration('watcher'), 3);
  assert.equal(arrivalDuration('king'), 4);
  assert.equal(arrivalDuration('king-reborn'), 4);
});

test('two kings keep independent second lives and cannot prematurely advance a rush', () => {
  const b = arena(['king', 'king'], [], true),
    [left, right] = b.entities;
  b.time = left.start + 13;
  overwhelm(b, left);
  advance(b, 4);
  assert.equal(right.life, 1);
  overwhelm(b, right);
  advance(b, 4);
  assert.equal(left.life, 2);
  assert.equal(right.life, 2);
  b.time += 19;
  overwhelm(b, left);
  stepBattle(b, 0.01);
  assert.equal(b.state, 'running');
  while (b.levelChoices.length) skipBattleUpgrade(b);
  overwhelm(b, right);
  stepBattle(b, 0.01);
  while (b.levelChoices.length) skipBattleUpgrade(b);
  stepBattle(b, 0.01);
  assert.equal(b.state, 'won');
  assert.equal(b.player.encountersDefeated.king, 2);
});

test('a projectile-triggered revival safely clears the remaining volley', () => {
  const b = arena(['king'], [], true),
    e = b.entities[0];
  b.time = e.start + 15;
  e.hp = 1;
  const bullet = {
    id: 1,
    kind: 'arrow',
    x: 0,
    y: -0.04,
    vx: 0,
    vy: -3,
    radius: 0.04,
    damage: e.maxHp,
    critical: false,
    pierceLeft: 0,
    hitIds: [],
    spawnAt: b.time - 0.1,
    originX: 0,
    originY: 0.8,
    canProc: true,
  };
  b.bullets = [bullet, { ...bullet, id: 2, hitIds: [] }];
  assert.doesNotThrow(() => stepBattle(b, 0.05));
  assert.equal(e.life, 2);
  assert.equal(b.bullets.length, 0);
  assert.ok(b.transition);
});

test('angelic protection regenerates, revives once, rages for ten seconds, then shatters into vulnerability', () => {
  const b = arena(['executioner'], ['angelic']),
    e = b.entities[0];
  const hp = e.hp;
  hitEntity(b, e, 100, false, false);
  assert.ok(Math.abs(hp - e.hp - 58) < 1e-6);
  const wounded = e.hp;
  advance(b, 0.1);
  assert.ok(e.hp > wounded);
  b.time = e.start + 6.2;
  overwhelm(b, e);
  assert.equal(e.angelRevived, true);
  assert.equal(e.done, false);
  const rageHp = e.hp,
    rageStart = b.time;
  hitEntity(b, e, e.maxHp * 10);
  assert.equal(e.hp, rageHp);
  advance(b, 9.9);
  assert.equal(e.angelBroken, undefined);
  advance(b, 0.15);
  assert.equal(e.angelBroken, true);
  assert.equal(b.transition.kind, 'shatter');
  assert.ok(b.time - rageStart >= 10);
  assert.equal(b.lastSound, 'time-shatter');
  const frozen = b.time;
  advance(b, 1.1);
  assert.equal(b.time, frozen);
  advance(b, 0.1);
  const brokenHp = e.hp;
  hitEntity(b, e, 100, false, false);
  assert.ok(Math.abs(brokenHp - e.hp - 100) < 1e-6);
  overwhelm(b, e);
  assert.equal(e.done, true);
});

for (const [id, spells] of [
  ['king-reborn', 5],
  ['king-ascendant', 6],
  ['deity', 6],
]) {
  test(`${id} offers ${spells} distinct, fully telegraphed spell sequences with a reachable safe route`, () => {
    const names = new Set();
    for (let spell = 0; spell < spells; spell++) {
      const b = arena([id]),
        e = b.entities[0];
      e.attackIndex = spell;
      e.lastAttack = -100;
      stepBattle(b, 0.05);
      e.lastAttack = Infinity;
      names.add(b.message);
      assert.ok(
        b.threats.length ||
          b.projectiles.length ||
          b.ritual ||
          b.entities.length > 1,
      );
      assert.ok(b.threats.every((t) => t.resolveAt - b.time >= 1.5));
      assert.ok(b.projectiles.every((p) => p.impactAt - b.time >= 2));
      const hp = b.player.hp;
      for (let tick = 0; tick < 125; tick++) {
        let best = b.x,
          risk = Infinity;
        for (let i = 0; i <= 60; i++) {
          const x = -0.9 + i * 0.03;
          let score = Math.abs(x - b.x) * 0.01;
          for (const t of b.threats)
            if (
              t.resolveAt - b.time < 0.5 &&
              Math.abs(x - t.x) < t.width / 2 + 0.05
            )
              score += 100;
          for (const p of b.projectiles)
            if (
              !p.resolved &&
              p.impactAt - b.time < 0.5 &&
              Math.abs(x - p.toX) < p.radius + 0.06
            )
              score += 100;
          for (const z of b.zones)
            if (
              z.startsAt - b.time < 0.5 &&
              z.endsAt > b.time &&
              Math.abs(x - z.x) < z.width / 2 + 0.05
            )
              score += 100;
          if (
            b.ritual &&
            b.ritual.resolveAt - b.time < 0.6 &&
            Math.abs(x - b.ritual.safeX) > b.ritual.safeWidth / 2 - 0.02
          )
            score += 100;
          if (score < risk) {
            risk = score;
            best = x;
          }
        }
        movePlayer(b, best);
        stepBattle(b, 0.05);
      }
      assert.equal(
        b.player.hp,
        hp,
        `spell ${spell} is avoidable by actual movement`,
      );
    }
    assert.equal(names.size, spells);
  });
}

test('bloodmoon lifesteal requires actual health damage and heals only the owning attacker over time', () => {
  const b = arena(['commander', 'lich'], ['frenzied', 'frenzied']),
    [a, z] = b.entities;
  a.hp *= 0.5;
  z.hp *= 0.5;
  const hp = a.hp,
    other = z.hp;
  b.shield = 100;
  damagePlayer(b, 20, 0, a.id);
  assert.equal(a.healingPool, undefined);
  b.shield = 0;
  damagePlayer(b, 20, 0, a.id);
  assert.ok(a.healingPool > 0);
  assert.equal(a.hp, hp, 'healing is gradual');
  advance(b, 0.2);
  assert.ok(a.hp > hp);
  assert.equal(z.hp, other);
  assert.ok(a.healingFlashUntil > b.time);
});

test('telegraphed attacks retain their source for bloodmoon recovery', () => {
  const b = arena(['commander'], ['frenzied']),
    e = b.entities[0];
  e.hp *= 0.5;
  e.attackIndex = 1;
  e.lastAttack = -100;
  stepBattle(b, 0.05);
  assert.ok(b.threats.length);
  assert.equal(b.threats[0].ownerId, e.id);
  e.lastAttack = Infinity;
  advance(b, 1.3);
  assert.ok(e.healingPool > 0);
});

test('golden mutation has a timed invulnerable interval followed by a breakable shield', () => {
  const b = arena(['executioner'], ['golden']),
    e = b.entities[0];
  e.lastAttack = -100;
  stepBattle(b, 0.05);
  const hp = e.hp;
  assert.ok(e.invulnerableUntil > b.time);
  hitEntity(b, e, hp * 100);
  assert.equal(e.hp, hp);
  e.lastAttack = Infinity;
  advance(b, 2.3);
  assert.ok(e.mutationShield > 0);
  const shield = e.mutationShield;
  hitEntity(b, e, shield * 0.5, false, false, 0.9);
  assert.equal(e.hp, hp);
  hitEntity(b, e, shield, false, false, 0.9);
  assert.equal(e.mutationShield, 0);
  assert.ok(e.hp < hp);
});

test('royal stage budgets are shared across damage sources and ascendant has two distinct lives', () => {
  const b = arena(['king-ascendant'], [], true),
    e = b.entities[0];
  b.time = e.start + 1;
  overwhelm(b, e);
  assert.ok(e.hp >= e.maxHp * 0.95);
  b.time = e.start + 25;
  overwhelm(b, e);
  assert.equal(e.life, 2);
  assert.equal(e.encounterId, 'king-ascendant');
  advance(b, 4);
  overwhelm(b, e);
  assert.ok(e.hp > 0, 'the new life has a fresh shared budget');
});

test('the deity cannot be burst skipped and floating point remnants do not make it immortal', () => {
  const b = arena(['deity']),
    e = b.entities[0];
  assert.equal(b.pressure, null);
  assert.ok(e.width > 1.8);
  b.time = e.start + 1;
  overwhelm(b, e);
  assert.ok(e.hp >= e.maxHp * 0.98);
  for (let i = 1; i <= 1450 && !e.done; i++) {
    b.time = e.start + i * 0.05;
    hitEntity(b, e, e.maxHp * 100, false, false);
  }
  assert.equal(e.done, true);
  assert.ok(b.time - e.start >= 72);
});

test('the peaceful epilogue contains only positive gates and blessings and ends after its procession', () => {
  const run = createRun('mage', 734, 'endless');
  run.floor = 100;
  run.phase = 'battle';
  run.node = { id: 'epilogue', floor: 100, col: 0, kind: 'treasure', next: [] };
  const b = createBattle(run),
    hp = b.player.hp;
  assert.ok(b.epilogue);
  assert.ok(b.entities.every((e) => e.kind === 'chest' || e.kind === 'gate'));
  assert.ok(
    b.entities
      .filter((e) => e.gate)
      .every((e) => e.gate.every((g) => g.op === '×' && g.value > 1)),
  );
  assert.equal(
    b.entities.filter((e) => e.blessing).length,
    EPILOGUE_BLESSINGS.length,
  );
  stepBattle(b, 0.05);
  assert.equal(b.state, 'running');
  damagePlayer(b, 99999);
  assert.equal(b.player.hp, hp);
  advance(b, 35);
  assert.equal(b.state, 'won');
  assert.match(b.message, /绿色咸咸圈&GPT-6 Astra/);
});

test('actual final-battle output crosses the ascension screen into a finite epilogue', () => {
  const run = createRun('ranger', 721604, 'endless');
  run.floor = 99;
  run.phase = 'battle';
  run.hp = run.maxHp = 1000;
  run.nodes = createRunMap(run.seed, run.difficulty, run.floor);
  run.node = run.nodes.at(-1)[0];
  const b = createBattle(run),
    deity = b.entities[0];
  b.time = deity.start + 73;
  b.shootTimer = Infinity;
  deity.lastAttack = Infinity;
  overwhelm(b, deity);
  while (b.levelChoices.length) skipBattleUpgrade(b);
  stepBattle(b, 0.01);
  while (b.levelChoices.length) skipBattleUpgrade(b);
  stepBattle(b, 0.01);
  assert.equal(b.state, 'won');
  const crowned = completeRoom(b.player);
  assert.equal(crowned.phase, 'ascension');
  assert.equal(crowned.floor, 100);
  const celebration = createBattle(beginEpilogue(crowned));
  advance(celebration, 35);
  assert.equal(celebration.state, 'won');
  const ending = completeRoom(celebration.player);
  assert.equal(ending.phase, 'victory');
  assert.equal(ending.floor, 101);
  assert.equal(availableNodes(ending).length, 0);
  assert.equal(ending.encountersDefeated.deity, 1);
});

test('direct reborn-form developer selection starts on its final life', () => {
  const b = arena(['king-reborn'], [], true),
    e = b.entities[0];
  assert.equal(e.life, 2);
  assert.equal(e.secondLife, false);
  b.time = e.start + 19;
  overwhelm(b, e);
  assert.equal(e.done, true);
  assert.equal(b.transition, null);
  assert.equal(b.encounterKills['king-reborn'], 1);
});
