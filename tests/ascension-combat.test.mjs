import { armyMagnitude, powerMagnitude, setArmy } from '../lib/army.ts';
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
  syncEpiloguePlayback,
  skipBattleUpgrade,
  bossAttackInterval,
  DEITY_SKILLS,
  ASCENDANT_SOLAR_SKILLS,
  ASCENDANT_ECLIPSE_SKILLS,
} from '../lib/combat.ts';
import {
  EPILOGUE_DURATION_SECONDS,
  EPILOGUE_EVENT_LIFETIME,
} from '../lib/epilogue.ts';

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
  assert.ok(
    Math.abs(hp - e.hp - 20 * (1 - e.armor)) < 1e-6,
    'white wings absorb eighty percent of an otherwise unmitigated hit',
  );
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
  assert.ok(Math.abs(brokenHp - e.hp - 100 * (1 - e.armor)) < 1e-6);
  overwhelm(b, e);
  assert.equal(e.done, true);
});

for (const [id, spells, form] of [
  ['king-reborn', 5],
  ['king-ascendant', 6, 'solar'],
  ['king-ascendant', 6, 'eclipse'],
  ['deity', 11],
]) {
  test(`${id} ${form || ''} offers ${spells} distinct, fully telegraphed spell sequences with a reachable safe route`, () => {
    const names = new Set();
    for (let spell = 0; spell < spells; spell++) {
      const b = arena([id]),
        e = b.entities[0];
      if (form) e.ascendantForm = form;
      if (form === 'eclipse') e.life = 2;
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
  assert.equal(e.ascendantForm, 'eclipse');
  assert.equal(b.transition.form, 'eclipse');
  assert.equal(b.transition.entityId, e.id);
  advance(b, 4);
  overwhelm(b, e);
  assert.ok(e.hp > 0, 'the new life has a fresh shared budget');
});

test('the actual angelic king burns its crown directly after shattered wings without a third health pool', () => {
  const run = createRun('ranger', 721604, 'endless');
  run.floor = 97;
  run.phase = 'battle';
  run.nodes = createRunMap(run.seed, run.difficulty, run.floor);
  run.node = run.nodes.find((row) => row[0].floor === 97)[0];
  const b = createBattle(run),
    e = b.entities[0],
    originalHp = e.maxHp;
  b.time = e.start + 13;
  b.shootTimer = Infinity;
  b.pressure = null;
  assert.equal(e.encounterId, 'king');
  assert.equal(e.mutation, 'angelic');
  assert.equal(e.secondLife, true);
  overwhelm(b, e);
  e.lastAttack = Infinity;
  assert.equal(e.angelRevived, true);
  assert.equal(
    e.life,
    1,
    'angel revival does not consume the royal transformation',
  );
  assert.equal(e.pendingRebirth, true);
  while (!b.transition) stepBattle(b, 0.05);
  assert.equal(b.transition.kind, 'shatter');
  const frozen = b.time;
  while (b.transition?.kind === 'shatter') stepBattle(b, 0.05);
  assert.equal(b.transition.kind, 'revival');
  assert.equal(b.transition.duration, 4);
  assert.equal(e.encounterId, 'king-reborn');
  assert.equal(e.life, 2);
  assert.equal(e.hp, originalHp * 0.85);
  assert.equal(e.mutation, undefined);
  assert.equal(b.player.encountersDefeated.king, undefined);
  while (b.transition) stepBattle(b, 0.05);
  assert.equal(
    b.time,
    frozen,
    'shatter and portrait form one frozen transition',
  );
  b.time += 19;
  overwhelm(b, e);
  assert.equal(e.done, true);
  assert.equal(b.transition, null);
  assert.equal(b.player.encountersDefeated.king, 1);
});

test('simultaneous angelic kings queue every shatter and royal cutin without overwriting another', () => {
  const b = arena(['king', 'king'], ['angelic', 'angelic'], true),
    [a, z] = b.entities;
  b.time = a.start + 13;
  overwhelm(b, a);
  overwhelm(b, z);
  a.lastAttack = z.lastAttack = Infinity;
  while (!b.transition) stepBattle(b, 0.05);
  const frozen = b.time,
    seen = [];
  while (b.transition) {
    const { seq, entityId, kind } = b.transition;
    seen.push([entityId, kind]);
    for (let step = 0; step < 100 && b.transition?.seq === seq; step++)
      stepBattle(b, 0.05);
    assert.notEqual(b.transition?.seq, seq);
  }
  assert.deepEqual(seen, [
    [a.id, 'shatter'],
    [a.id, 'revival'],
    [z.id, 'shatter'],
    [z.id, 'revival'],
  ]);
  assert.equal(a.life, 2);
  assert.equal(z.life, 2);
  assert.equal(b.transitionQueue.length, 0);
  assert.equal(b.time, frozen);
  assert.equal(b.state, 'running');
});

test('the ascendant eclipse form replaces the solar skill pool, relocates the throne and accelerates its cadence', () => {
  const b = arena(['king-ascendant'], [], true),
    e = b.entities[0];
  const solar = bossAttackInterval(e);
  b.time = e.start + 25;
  overwhelm(b, e);
  assert.equal(e.ascendantForm, 'eclipse');
  assert.notEqual(e.x, 0);
  assert.ok(bossAttackInterval(e) < solar * 0.85);
  assert.equal(spectacleDuration(e), 30);
  while (b.transition) stepBattle(b, 0.05);
  e.lastAttack = -100;
  advance(b, 2.5);
  assert.ok(ASCENDANT_ECLIPSE_SKILLS.includes(e.castName));
  assert.equal(ASCENDANT_SOLAR_SKILLS.includes(e.castName), false);
  assert.equal(
    new Set(b.threats.map((t) => t.resolveAt)).size,
    3,
    'the opening oath has three movement beats',
  );
  assert.ok(e.castUntil > e.castStartedAt);
});

test('the deity performs all eleven oaths during its protected encounter window', () => {
  const b = arena(['deity']),
    e = b.entities[0],
    seen = new Set();
  e.lastAttack = -100;
  for (let i = 0; i < 1400; i++) {
    stepBattle(b, 0.05);
    if (e.castName) seen.add(e.castName);
  }
  assert.equal(b.state, 'running');
  assert.equal(b.pressure, null);
  assert.equal(b.enrage, false);
  assert.equal(DEITY_SKILLS.length, 11);
  assert.deepEqual([...seen], [...DEITY_SKILLS]);
  assert.ok(b.time - e.start < 72);
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

function epilogueArena(classId = 'mage') {
  const run = createRun(classId, 734, 'endless');
  run.floor = 100;
  run.phase = 'battle';
  run.relics.ambush = 3;
  run.relics.lifebloom = 2;
  run.node = { id: 'epilogue', floor: 100, col: 0, kind: 'treasure', next: [] };
  return { run, battle: createBattle(run) };
}

test('epilogue squares really grow the army before a safe display limit, preserving the settled score', () => {
  for (const classId of ['knight', 'ranger', 'mage']) {
    const { run, battle: b } = epilogueArena(classId);
    assert.deepEqual(b.player, run);
    const before = armyMagnitude(b.player);
    syncEpiloguePlayback(b, 3.2);
    stepBattle(b, 0.05);
    assert.equal(b.epilogueInfinity, false);
    assert.equal(b.epilogueSquares, 1);
    assert.deepEqual(armyMagnitude(b.player), powerMagnitude(before, 2));
    syncEpiloguePlayback(b, 40);
    stepBattle(b, 0.05);
    assert.equal(b.epilogueInfinity, true);
    const capped = structuredClone(b.player);
    syncEpiloguePlayback(b, 70);
    stepBattle(b, 0.05);
    assert.deepEqual(
      b.player,
      capped,
      'infinity never does additional arithmetic',
    );
    assert.equal(activateSkill(b), false);
    damagePlayer(b, 99999);
    assert.deepEqual(b.player, capped);
    syncEpiloguePlayback(b, EPILOGUE_DURATION_SECONDS, true);
    stepBattle(b, 0.05);
    assert.deepEqual(
      b.player,
      run,
      'hundred-room score and resources are restored at curtain call',
    );
  }
  const { run } = epilogueArena();
  setArmy(run, { mantissa: 2.55, exponent: 136 });
  const high = createBattle(run);
  syncEpiloguePlayback(high, 12);
  stepBattle(high, 0.05);
  assert.equal(high.epilogueSquares, 3);
  assert.equal(high.epilogueInfinity, false);
  assert.ok(armyMagnitude(high.player).exponent > 1000);
  syncEpiloguePlayback(high, 17);
  stepBattle(high, 0.05);
  assert.equal(high.epilogueInfinity, true);
});

test('epilogue time follows audio position and only an explicit music-ended signal can finish it', () => {
  const { battle: b } = epilogueArena();
  advance(b, 100);
  assert.equal(
    b.time,
    0,
    'animation frames cannot advance a paused or blocked song',
  );
  assert.equal(b.state, 'running');
  assert.equal(syncEpiloguePlayback(b, NaN, true), false);
  assert.equal(syncEpiloguePlayback(b, Infinity, true), false);
  assert.equal(syncEpiloguePlayback(b, -1, true), false);
  syncEpiloguePlayback(b, 70);
  stepBattle(b, 70);
  assert.equal(b.time, 70);
  assert.equal(b.state, 'running');
  syncEpiloguePlayback(b, 1);
  stepBattle(b, 100);
  assert.equal(
    b.time,
    70,
    'a stale playback sample cannot replay gates or boxes',
  );
  syncEpiloguePlayback(b, EPILOGUE_DURATION_SECONDS);
  stepBattle(b, 20);
  assert.equal(
    b.state,
    'running',
    'the known duration is not an independent victory timer',
  );
  for (const entity of b.entities) entity.done = true;
  advance(b, 50);
  assert.equal(
    b.state,
    'running',
    'clearing all scenery cannot finish the song',
  );
  const player = structuredClone(b.epilogueSettlement);
  syncEpiloguePlayback(b, EPILOGUE_DURATION_SECONDS, true);
  stepBattle(b, 0);
  assert.equal(b.state, 'won');
  assert.deepEqual(b.player, player);
  const ordinary = createBattle(createRun('mage', 123));
  assert.equal(
    syncEpiloguePlayback(ordinary, EPILOGUE_DURATION_SECONDS, true),
    false,
  );
  assert.equal(ordinary.state, 'running');
});

test('real epilogue volleys produce plentiful unique blessings while missed boxes produce no events', () => {
  for (const classId of ['knight', 'ranger', 'mage']) {
    const { run, battle: b } = epilogueArena(classId);
    syncEpiloguePlayback(b, 42);
    stepBattle(b, 42);
    assert.ok(
      b.blessingSeq >= 25,
      `${classId}: a stationary visitor keeps breaking center boxes`,
    );
    assert.ok(b.blessingEvents.length > 4 && b.blessingEvents.length <= 32);
    assert.equal(
      new Set(b.blessingEvents.map((event) => event.id)).size,
      b.blessingEvents.length,
    );
    for (const event of b.blessingEvents) {
      assert.ok(['恭喜', '谢谢'].includes(event.text));
      assert.ok(event.x >= 0.13 && event.x <= 0.87);
      assert.ok(event.y >= 0.2 && event.y <= 0.62);
      assert.ok(
        event.time <= b.time && b.time - event.time < EPILOGUE_EVENT_LIFETIME,
      );
    }
    const broken = b.entities.find(
      (entity) => entity.kind === 'chest' && entity.done && entity.hp === 0,
    );
    const seq = b.blessingSeq;
    hitEntity(b, broken, 1000000);
    assert.equal(
      b.blessingSeq,
      seq,
      'the same destroyed box cannot emit twice',
    );
    assert.deepEqual(b.epilogueSettlement, run);
    for (const key of ['gold', 'xp', 'chests', 'combatTime'])
      assert.equal(b.player[key], run[key]);
  }
  const { run, battle: missed } = epilogueArena();
  missed.shootTimer = Infinity;
  syncEpiloguePlayback(missed, 20);
  stepBattle(missed, 20);
  assert.ok(
    missed.entities.some((entity) => entity.kind === 'chest' && entity.done),
  );
  assert.equal(missed.blessingSeq, 0);
  assert.deepEqual(missed.blessingEvents, []);
  assert.deepEqual(missed.epilogueSettlement, run);
});

test('epilogue keeps central gifts flowing while side gifts build toward the finale and finish travelling in time', () => {
  const { battle: plan } = epilogueArena();
  const gates = plan.entities.filter((e) => e.kind === 'gate');
  for (let i = 1; i < gates.length; i++)
    assert.ok(Math.abs(gates[i].start - gates[i - 1].start - 4.05) < 1e-8);
  const boxes = plan.entities.filter((e) => e.kind === 'chest');
  assert.ok(boxes.every((e) => e.arrival <= EPILOGUE_DURATION_SECONDS));
  assert.ok(boxes.every((e) => e.start < EPILOGUE_DURATION_SECONDS - 2));
  const ranges = [
    [0, 18],
    [18, EPILOGUE_DURATION_SECONDS - 24],
    [EPILOGUE_DURATION_SECONDS - 24, EPILOGUE_DURATION_SECONDS],
  ];
  const density = (items, field) =>
    ranges.map(
      ([from, to]) =>
        items.filter((item) => item[field] >= from && item[field] < to).length /
        (to - from),
    );
  const spawnDensity = density(boxes, 'start');
  assert.ok(
    spawnDensity[0] < spawnDensity[1] && spawnDensity[1] < spawnDensity[2],
  );
  const central = boxes.filter((e) => e.x === 0);
  for (let i = 1; i < central.length; i++)
    assert.ok(Math.abs(central[i].start - central[i - 1].start - 1.35) < 1e-8);
  for (const classId of ['knight', 'ranger', 'mage']) {
    for (const moving of [false, true]) {
      const { run, battle: b } = epilogueArena(classId);
      const events = [];
      let previousId = 0;
      for (
        let frame = 1;
        frame <= Math.ceil(EPILOGUE_DURATION_SECONDS * 20);
        frame++
      ) {
        const time = Math.min(EPILOGUE_DURATION_SECONDS, frame / 20);
        if (moving) {
          const target = b.entities
            .filter(
              (e) =>
                e.kind === 'chest' &&
                !e.done &&
                e.start <= time &&
                e.arrival > time,
            )
            .sort((a, z) => a.arrival - z.arrival)[0];
          movePlayer(b, target?.x ?? 0);
        }
        syncEpiloguePlayback(b, time);
        stepBattle(b, 0.05);
        events.push(...b.blessingEvents.filter((e) => e.id > previousId));
        previousId = b.blessingSeq;
        assert.ok(b.blessingEvents.length <= 32);
      }
      assert.ok(
        events.length >= (moving ? 100 : 55),
        `${classId}: continuous actual hits`,
      );
      assert.ok(events.at(-1).time > EPILOGUE_DURATION_SECONDS - 6);
      const gaps = events
        .slice(1)
        .map((event, i) => event.time - events[i].time);
      assert.ok(
        Math.max(...gaps) <= 1.6,
        `${classId}: no empty stretch between gifts`,
      );
      if (moving) {
        const frequency = density(events, 'time');
        assert.ok(frequency[0] < frequency[1] && frequency[1] < frequency[2]);
      }
      assert.equal(b.state, 'running');
      assert.deepEqual(b.epilogueSettlement, run);
    }
  }
});

test('a delayed epilogue playback sample catches up the same hits and gates as continuous playback', () => {
  const { battle: delayed } = epilogueArena('ranger');
  const { battle: continuous } = epilogueArena('ranger');
  for (let frame = 1; frame <= 240; frame++) {
    syncEpiloguePlayback(continuous, frame / 20);
    stepBattle(continuous, 0.05);
  }
  delayed.inputLocked = true;
  syncEpiloguePlayback(delayed, 12);
  stepBattle(delayed, 12);
  assert.equal(delayed.time, 0);
  delayed.inputLocked = false;
  stepBattle(delayed, 12);
  assert.equal(delayed.time, continuous.time);
  assert.equal(delayed.epilogueInfinity, continuous.epilogueInfinity);
  assert.equal(delayed.blessingSeq, continuous.blessingSeq);
  assert.deepEqual(
    delayed.entities.filter((e) => e.done).map((e) => [e.id, e.hp]),
    continuous.entities.filter((e) => e.done).map((e) => [e.id, e.hp]),
  );
  assert.deepEqual(delayed.player, continuous.player);
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
  const sealed = structuredClone(celebration.player);
  syncEpiloguePlayback(celebration, EPILOGUE_DURATION_SECONDS, true);
  stepBattle(celebration, EPILOGUE_DURATION_SECONDS);
  assert.equal(celebration.state, 'won');
  assert.deepEqual(celebration.player, sealed);
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
