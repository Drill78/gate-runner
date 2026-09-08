import test from 'node:test';
import assert from 'node:assert/strict';
import { ACT_LENGTH, createRun } from '../lib/game.ts';
import { ENCOUNTERS, bossProfile } from '../lib/bosses.ts';
import { createBattle, movePlayer, stepBattle } from '../lib/combat.ts';

function encounterRun(id, floor) {
  const profile = ENCOUNTERS.find((entry) => entry.id === id);
  assert.ok(profile);
  for (let seed = 0; seed < 100; seed++) {
    const run = createRun('ranger', seed);
    run.floor = floor;
    run.node = run.nodes[floor].find((node) => node.kind === profile.kind);
    if (!run.node || bossProfile(run).id !== id) continue;
    run.phase = 'battle';
    return run;
  }
  assert.fail(`an actual map node selects ${id}`);
}

test('thirteen distinct profiles preserve five elites and 2 / 2 / 1 campaign pools plus three ascension forms', () => {
  assert.equal(ENCOUNTERS.length, 13);
  assert.equal(new Set(ENCOUNTERS.map((entry) => entry.id)).size, 13);
  assert.equal(new Set(ENCOUNTERS.map((entry) => entry.portrait)).size, 13);
  assert.equal(ENCOUNTERS.filter((entry) => entry.kind === 'elite').length, 5);
  assert.deepEqual(
    [0, 1, 2].map(
      (act) =>
        ENCOUNTERS.filter((entry) => entry.kind === 'boss' && entry.act === act)
          .length,
    ),
    [2, 2, 1],
  );
  for (const profile of ENCOUNTERS) {
    if (profile.kind === 'boss' && profile.act === undefined) continue;
    const floor =
      profile.kind === 'boss' ? (profile.act + 1) * ACT_LENGTH - 1 : 0;
    const run = encounterRun(profile.id, floor);
    assert.equal(bossProfile(run).id, profile.id);
    assert.deepEqual(
      bossProfile(run),
      bossProfile(structuredClone(run)),
      'selection is reproducible',
    );
    const final = createBattle(run).entities.find((entry) => entry.boss);
    assert.equal(final.encounterId, profile.id);
    assert.equal(final.name, profile.name);
  }
});

test('chapter rotations stay inside their act and the opening ordinary battle stays approachable', () => {
  const seen = [new Set(), new Set(), new Set()];
  for (let seed = 0; seed < 32; seed++) {
    const run = createRun('knight', seed);
    run.node = run.nodes[0].find((node) => node.kind === 'battle');
    assert.equal(bossProfile(run).id, 'executioner');
    for (let act = 0; act < 3; act++) {
      run.floor = (act + 1) * ACT_LENGTH - 1;
      run.node = run.nodes[run.floor].find((node) => node.kind === 'boss');
      seen[act].add(bossProfile(run).id);
    }
  }
  assert.deepEqual(
    [...seen[0]].sort((a, b) => a.localeCompare(b)),
    ['watcher', 'wyvern'],
  );
  assert.deepEqual(
    [...seen[1]].sort((a, b) => a.localeCompare(b)),
    ['lich', 'oracle'],
  );
  assert.deepEqual([...seen[2]], ['king']);
});

function firstAttack(id, floor) {
  const battle = createBattle(encounterRun(id, floor));
  const boss = battle.entities.find((entry) => entry.boss);
  // Isolate the actual first ordinary attack from earlier waves and the
  // separate chapter pressure mechanic. Both compared runs use this fixture.
  battle.entities = [boss];
  battle.pressure = null;
  battle.shootTimer = Infinity;
  battle.time = boss.start + 0.9;
  stepBattle(battle, 0.01);
  assert.equal(boss.attackIndex, 1);
  assert.ok(battle.threats.length || battle.projectiles.length);
  return battle;
}

for (const [id, floor, safeX, warning] of [
  ['hexblade', 0, 0.85, '咒刃烙印'],
  ['stonewarden', 0, 0.42, '裂地震击'],
  ['broodmother', 0, 0.9, '蛛网缠地'],
  ['wyvern', ACT_LENGTH - 1, 0.5, '风暴龙息'],
  ['oracle', ACT_LENGTH * 2 - 1, 0.66, '预言烙印'],
]) {
  test(`${id} ordinary attack hits its telegraphed position but can be dodged with actual movement`, () => {
    const stationary = firstAttack(id, floor);
    const dodging = firstAttack(id, floor);
    assert.ok(stationary.threats.some((threat) => threat.name === warning));
    const hp = dodging.player.hp;
    const squad = dodging.player.squad;
    movePlayer(dodging, safeX);
    for (let step = 0; step < 54; step++) {
      stepBattle(stationary, 0.05);
      stepBattle(dodging, 0.05);
    }
    assert.equal(dodging.x, safeX);
    assert.equal(
      dodging.entities[0].attackIndex,
      1,
      'checks one complete attack before the next cast',
    );
    assert.equal(
      dodging.threats.length,
      0,
      'all telegraphed hits have resolved',
    );
    assert.ok(dodging.projectiles.every((projectile) => projectile.resolved));
    assert.ok(
      stationary.player.hp < hp,
      'standing in the indicated danger takes damage',
    );
    assert.equal(
      dodging.player.hp,
      hp,
      'the visible safe position prevents all ordinary damage',
    );
    assert.equal(dodging.player.squad, squad);
  });
}
